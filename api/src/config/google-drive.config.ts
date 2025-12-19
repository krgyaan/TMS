import { registerAs } from '@nestjs/config';
import { z } from 'zod';

export type TeamDriveConfig = {
    teamId: number;
    teamName: string;
    folderId: string | null;
    templateId: string | null;
};

export type GoogleDriveConfig = {
    teams: Record<number, TeamDriveConfig>;
    requiredScopes: string[];
};

const googleDriveEnvSchema = z.object({
    // Team 1 - AC
    GOOGLE_DRIVE_FOLDER_TEAM_1: z.string().optional(),
    GOOGLE_TEMPLATE_TEAM_1: z.string().optional(),
    // Team 2 - DC
    GOOGLE_DRIVE_FOLDER_TEAM_2: z.string().optional(),
    GOOGLE_TEMPLATE_TEAM_2: z.string().optional(),
    // Team 7 - Private
    GOOGLE_DRIVE_FOLDER_TEAM_7: z.string().optional(),
    GOOGLE_TEMPLATE_TEAM_7: z.string().optional(),
});

export default registerAs('googleDrive', (): GoogleDriveConfig => {
    const env = googleDriveEnvSchema.parse(process.env);

    return {
        teams: {
            1: {
                teamId: 1,
                teamName: 'AC',
                folderId: env.GOOGLE_DRIVE_FOLDER_TEAM_1 || null,
                templateId: env.GOOGLE_TEMPLATE_TEAM_1 || null,
            },
            2: {
                teamId: 2,
                teamName: 'DC',
                folderId: env.GOOGLE_DRIVE_FOLDER_TEAM_2 || null,
                templateId: env.GOOGLE_TEMPLATE_TEAM_2 || null,
            },
            7: {
                teamId: 7,
                teamName: 'Private',
                folderId: env.GOOGLE_DRIVE_FOLDER_TEAM_7 || null,
                templateId: env.GOOGLE_TEMPLATE_TEAM_7 || null,
            },
        },
        requiredScopes: [
            'https://www.googleapis.com/auth/drive.file',
            'https://www.googleapis.com/auth/spreadsheets',
        ],
    };
});
