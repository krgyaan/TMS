import {
    Inject,
    Injectable,
    Logger,
    BadRequestException,
    ForbiddenException,
} from '@nestjs/common';
import { google, drive_v3 } from 'googleapis';
import { and, eq } from 'drizzle-orm';
import googleConfig, { type GoogleConfig, DRIVE_SCOPES } from '@config/google.config';
import googleDriveConfig, { type GoogleDriveConfig, type TeamDriveConfig } from '@config/google-drive.config';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { oauthAccounts } from '@db/schemas/auth/oauth-accounts.schema';

export type CreateSheetResult = {
    sheetId: string;
    sheetUrl: string;
    sheetTitle: string;
    folderId: string;
};

export type DuplicateCheckResult = {
    isDuplicate: boolean;
    existingSheetUrl?: string;
    existingSheetId?: string;
    suggestedName?: string;
};

type OAuth2Client = InstanceType<typeof google.auth.OAuth2>;

@Injectable()
export class GoogleDriveService {
    private readonly logger = new Logger(GoogleDriveService.name);

    constructor(
        @Inject(googleConfig.KEY) private readonly config: GoogleConfig,
        @Inject(googleDriveConfig.KEY) private readonly driveConfig: GoogleDriveConfig,
        @Inject(DRIZZLE) private readonly db: DbInstance,
    ) { }

    /**
     * Get team configuration by team ID
     */
    getTeamConfig(teamId: number): TeamDriveConfig | null {
        return this.driveConfig.teams[teamId] || null;
    }

    /**
     * Check if user has required Drive scopes
     */
    async checkUserHasDriveScopes(userId: number): Promise<{
        hasScopes: boolean;
        missingScopes: string[];
        grantedScopes: string[];
    }> {
        const account = await this.db
            .select()
            .from(oauthAccounts)
            .where(
                and(
                    eq(oauthAccounts.userId, userId),
                    eq(oauthAccounts.provider, 'google'),
                ),
            )
            .limit(1);

        if (!account.length) {
            return {
                hasScopes: false,
                missingScopes: this.driveConfig.requiredScopes,
                grantedScopes: [],
            };
        }

        const grantedScopes = account[0].scopes
            ? account[0].scopes.split(/\s+/).filter(Boolean)
            : [];

        const missingScopes = this.driveConfig.requiredScopes.filter(
            (scope) => !grantedScopes.includes(scope),
        );

        return {
            hasScopes: missingScopes.length === 0,
            missingScopes,
            grantedScopes,
        };
    }

    /**
     * Get authenticated OAuth2 client for a user
     */
    private async getAuthenticatedClient(userId: number): Promise<OAuth2Client> {
        const account = await this.db
            .select()
            .from(oauthAccounts)
            .where(
                and(
                    eq(oauthAccounts.userId, userId),
                    eq(oauthAccounts.provider, 'google'),
                ),
            )
            .limit(1);

        if (!account.length) {
            throw new ForbiddenException(
                'Google account not connected. Please connect your Google account first.',
            );
        }

        const oauthAccount = account[0];

        // Check if token is expired
        const now = new Date();
        const expiresAt = oauthAccount.expiresAt;
        const isExpired = expiresAt && expiresAt < now;

        const client = new google.auth.OAuth2(
            this.config.clientId,
            this.config.clientSecret,
            this.config.redirectUri,
        );

        if (isExpired && oauthAccount.refreshToken) {
            // Refresh the token
            this.logger.log(`Refreshing expired token for user ${userId}`);

            client.setCredentials({
                refresh_token: oauthAccount.refreshToken,
            });

            try {
                const { credentials } = await client.refreshAccessToken();

                // Update stored tokens
                await this.db
                    .update(oauthAccounts)
                    .set({
                        accessToken: credentials.access_token!,
                        expiresAt: credentials.expiry_date
                            ? new Date(credentials.expiry_date)
                            : null,
                        updatedAt: new Date(),
                    })
                    .where(eq(oauthAccounts.id, oauthAccount.id));

                client.setCredentials(credentials);
            } catch (error) {
                this.logger.error(`Failed to refresh token for user ${userId}:`, error);
                throw new ForbiddenException(
                    'Google token expired and refresh failed. Please reconnect your Google account.',
                );
            }
        } else {
            client.setCredentials({
                access_token: oauthAccount.accessToken,
                refresh_token: oauthAccount.refreshToken || undefined,
            });
        }

        return client;
    }

    /**
     * Ensure year folder exists under team's root folder
     * Returns the folder ID
     */
    private async ensureYearFolder(
        drive: drive_v3.Drive,
        parentFolderId: string,
        year: number,
    ): Promise<string> {
        const yearFolderName = String(year);

        // Search for existing year folder
        const searchResponse = await drive.files.list({
            q: `'${parentFolderId}' in parents and name = '${yearFolderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
            fields: 'files(id, name)',
            spaces: 'drive',
        });

        if (searchResponse.data.files && searchResponse.data.files.length > 0) {
            this.logger.log(`Found existing year folder: ${yearFolderName}`);
            return searchResponse.data.files[0].id!;
        }

        // Create year folder
        this.logger.log(`Creating year folder: ${yearFolderName}`);
        const folderMetadata = {
            name: yearFolderName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [parentFolderId],
        };

        const folder = await drive.files.create({
            requestBody: folderMetadata,
            fields: 'id',
        });
        this.logger.log(`Created year folder: ${yearFolderName}`);
        return folder.data.id!;
    }

    /**
     * Check for duplicate sheet name in the team's root folder
     */
    async checkDuplicateInFolder(
        userId: number,
        teamId: number,
        sheetName: string,
    ): Promise<DuplicateCheckResult> {
        const teamConfig = this.getTeamConfig(teamId);
        if (!teamConfig || !teamConfig.folderId) {
            throw new BadRequestException(
                `Google Drive folder not configured for team ${teamId}`,
            );
        }

        const client = await this.getAuthenticatedClient(userId);
        const drive = google.drive({ version: 'v3', auth: client });

        try {
            // Search for existing file with same name in the team's root folder
            const searchResponse = await drive.files.list({
                q: `'${teamConfig.folderId}' in parents and name = '${sheetName}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`,
                fields: 'files(id, name, webViewLink)',
                spaces: 'drive',
            });

            if (searchResponse.data.files && searchResponse.data.files.length > 0) {
                const existingFile = searchResponse.data.files[0];

                // Find next available number suffix
                let suffix = 1;
                let suggestedName = `${sheetName} (${suffix})`;

                // Check for existing numbered versions
                try {
                    const numberedSearch = await drive.files.list({
                        q: `'${teamConfig.folderId}' in parents and name contains '${sheetName} (' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`,
                        fields: 'files(name)',
                        spaces: 'drive',
                    });

                    if (numberedSearch.data.files) {
                        const existingNumbers = numberedSearch.data.files
                            .map((f) => {
                                const match = f.name?.match(/\((\d+)\)$/);
                                return match ? parseInt(match[1], 10) : 0;
                            })
                            .filter((n) => n > 0);

                        if (existingNumbers.length > 0) {
                            suffix = Math.max(...existingNumbers) + 1;
                            suggestedName = `${sheetName} (${suffix})`;
                        }
                    }
                } catch (error: any) {
                    // If we can't check numbered versions, just use the base suggestion
                    this.logger.warn(`Could not check for numbered versions: ${error?.message || String(error)}`);
                }

                return {
                    isDuplicate: true,
                    existingSheetUrl: existingFile.webViewLink || undefined,
                    existingSheetId: existingFile.id || undefined,
                    suggestedName,
                };
            }

            return { isDuplicate: false };
        } catch (error: any) {
            const errorMessage = error?.message || String(error);
            const errorCode = error?.code || error?.response?.status;

            // Handle permission errors specifically
            // Note: drive.file scope may not allow listing files in shared folders
            // If we can't check for duplicates due to permissions, we'll proceed anyway
            // The sheet creation will fail if there are real permission issues
            if (errorMessage.includes('Insufficient Permission') || 
                errorMessage.includes('insufficient') ||
                errorCode === 403) {
                this.logger.warn(
                    `Cannot check for duplicates in folder ${teamConfig.folderId} for user ${userId} due to permissions. Proceeding with sheet creation. Error: ${errorMessage}`,
                );
                // Return no duplicate found - let the creation proceed
                // If there's a real duplicate, Google Drive will handle it during creation
                return { isDuplicate: false };
            }

            // Re-throw other errors
            this.logger.error(`Error checking for duplicate sheet: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Create a new Google Sheet (blank or from template)
     */
    async createSheet(
        userId: number,
        teamId: number,
        sheetName: string,
        options?: { useTemplate?: boolean },
    ): Promise<CreateSheetResult> {
        const teamConfig = this.getTeamConfig(teamId);
        if (!teamConfig) {
            throw new BadRequestException(
                `Team ${teamId} is not configured for Google Drive integration`,
            );
        }

        if (!teamConfig.folderId) {
            throw new BadRequestException(
                `Google Drive folder not configured for team "${teamConfig.teamName}"`,
            );
        }

        // Check scopes
        const scopeCheck = await this.checkUserHasDriveScopes(userId);
        if (!scopeCheck.hasScopes) {
            throw new ForbiddenException({
                statusCode: 403,
                message: 'Missing required Google Drive permissions',
                error: 'Forbidden',
                missingScopes: scopeCheck.missingScopes,
                requiresReconnect: true,
            });
        }

        const client = await this.getAuthenticatedClient(userId);
        const drive = google.drive({ version: 'v3', auth: client });

        let sheetId: string;
        let sheetUrl: string;

        const useTemplate = options?.useTemplate !== false && !!teamConfig.templateId;

        if (useTemplate && teamConfig.templateId) {
            // Copy from template
            this.logger.log(
                `Copying template ${teamConfig.templateId} for team ${teamConfig.teamName}`,
            );

            try {
                const copyResponse = await drive.files.copy({
                    fileId: teamConfig.templateId,
                    requestBody: {
                        name: sheetName,
                        parents: [teamConfig.folderId],
                    },
                    fields: 'id, webViewLink',
                });

                sheetId = copyResponse.data.id!;
                sheetUrl = copyResponse.data.webViewLink!;
            } catch (error: any) {
                if (error.code === 404) {
                    this.logger.warn(
                        `Template not found for team ${teamConfig.teamName}, creating blank sheet`,
                    );
                    // Fall back to blank sheet
                    return this.createBlankSheet(
                        drive,
                        sheetName,
                        teamConfig.folderId,
                    );
                }
                throw error;
            }
        } else {
            // Create blank sheet
            return this.createBlankSheet(drive, sheetName, teamConfig.folderId);
        }

        return {
            sheetId,
            sheetUrl,
            sheetTitle: sheetName,
            folderId: teamConfig.folderId,
        };
    }

    /**
     * Create a blank Google Sheet
     */
    private async createBlankSheet(
        drive: drive_v3.Drive,
        sheetName: string,
        folderId: string,
    ): Promise<CreateSheetResult> {
        this.logger.log(`Creating blank sheet: ${sheetName}`);

        const fileMetadata = {
            name: sheetName,
            mimeType: 'application/vnd.google-apps.spreadsheet',
            parents: [folderId],
        };

        const response = await drive.files.create({
            requestBody: fileMetadata,
            fields: 'id, webViewLink',
        });

        return {
            sheetId: response.data.id!,
            sheetUrl: response.data.webViewLink!,
            sheetTitle: sheetName,
            folderId,
        };
    }

    /**
     * Delete a Google Sheet (for cleanup/error recovery)
     */
    async deleteSheet(userId: number, sheetId: string): Promise<void> {
        try {
            const client = await this.getAuthenticatedClient(userId);
            const drive = google.drive({ version: 'v3', auth: client });

            await drive.files.delete({ fileId: sheetId });
            this.logger.log(`Deleted sheet: ${sheetId}`);
        } catch (error) {
            this.logger.error(`Failed to delete sheet ${sheetId}:`, error);
            // Don't throw - this is cleanup
        }
    }

    /**
     * Get sheet info by ID
     */
    async getSheetInfo(
        userId: number,
        sheetId: string,
    ): Promise<{ name: string; url: string } | null> {
        try {
            const client = await this.getAuthenticatedClient(userId);
            const drive = google.drive({ version: 'v3', auth: client });

            const response = await drive.files.get({
                fileId: sheetId,
                fields: 'name, webViewLink',
            });

            return {
                name: response.data.name || '',
                url: response.data.webViewLink || '',
            };
        } catch (error) {
            this.logger.error(`Failed to get sheet info ${sheetId}:`, error);
            return null;
        }
    }
}
