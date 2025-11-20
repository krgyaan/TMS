import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import appConfig, { validateAppEnv } from './config/app.config';
import authConfig, { validateAuthEnv } from './config/auth.config';
import googleConfig, { validateGoogleEnv } from './config/google.config';
import dbConfig, { validateDbEnv } from './config/db.config';
import { DatabaseModule } from './db/database.module';
import { UsersModule } from './modules/master/users/users.module';
import { HealthModule } from './modules/master/health/health.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RolesModule } from './modules/master/roles/roles.module';
import { DesignationsModule } from './modules/master/designations/designations.module';
import { TeamsModule } from './modules/master/teams/teams.module';
import { UserProfilesModule } from './modules/master/user-profiles/user-profiles.module';
import { OauthAccountsModule } from './modules/master/oauth-accounts/oauth-accounts.module';
import { TenderStatusModule } from './modules/master/tender-status/tender-status.module';
import { DocumentsSubmittedModule } from './modules/master/documents-submitted/documents-submitted.module';
import { FollowupCategoriesModule } from './modules/master/followup-categories/followup-categories.module';
import { ImprestCategoriesModule } from './modules/master/imprest-categories/imprest-categories.module';
import { IndustriesModule } from './modules/master/industries/industries.module';
import { ItemHeadingsModule } from './modules/master/item-headings/item-headings.module';
import { ItemsModule } from './modules/master/items/items.module';
import { LoanPartiesModule } from './modules/master/loan-parties/loan-parties.module';
import { LocationsModule } from './modules/master/locations/locations.module';
import { OrganizationsModule } from './modules/master/organizations/organizations.module';
import { CompaniesModule } from './modules/master/companies/companies.module';
import { StatusesModule } from './modules/master/statuses/statuses.module';
import { TqTypesModule } from './modules/master/tq-types/tq-types.module';
import { VendorOrganizationsModule } from './modules/master/vendor-organizations/vendor-organizations.module';
import { VendorsModule } from './modules/master/vendors/vendors.module';
import { GoogleIntegrationModule } from './modules/integrations/google/google.module';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { WebsitesModule } from './modules/master/websites/websites.module';
import { StatesModule } from './modules/master/states/states.module';
import { LeadTypesModule } from './modules/master/lead-types/lead-types.module';
import { TendersModule } from './modules/tendering/tenders/tenders.module';
import { TenderInfoSheetsModule } from './modules/tendering/info-sheets/info-sheets.module';
import { TenderApprovalModule } from './modules/tendering/tender-approval/tender-approval.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            expandVariables: true,
            load: [appConfig, dbConfig, googleConfig, authConfig],
            validate: (env) => ({
                ...validateAppEnv(env),
                ...validateDbEnv(env),
                ...validateGoogleEnv(env),
                ...validateAuthEnv(env),
            }),
        }),
        DatabaseModule,
        UsersModule,
        RolesModule,
        DesignationsModule,
        TeamsModule,
        UserProfilesModule,
        OauthAccountsModule,
        HealthModule,
        TenderStatusModule,
        DocumentsSubmittedModule,
        FollowupCategoriesModule,
        ImprestCategoriesModule,
        IndustriesModule,
        ItemHeadingsModule,
        ItemsModule,
        LoanPartiesModule,
        LocationsModule,
        OrganizationsModule,
        CompaniesModule,
        StatusesModule,
        TqTypesModule,
        VendorOrganizationsModule,
        VendorsModule,
        GoogleIntegrationModule,
        AuthModule,
        WebsitesModule,
        StatesModule,
        LeadTypesModule,
        TendersModule,
        TenderInfoSheetsModule,
        TenderApprovalModule
    ],
    controllers: [AppController],
    providers: [
        AppService,
        {
            provide: APP_GUARD,
            useClass: JwtAuthGuard,
        },
    ],
})
export class AppModule { }
