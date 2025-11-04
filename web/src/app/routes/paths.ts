export const paths = {
    root: "/",
    auth: {
        login: "/login",
        googleCallback: "/login/google",
    },
    integrations: {
        google: "/integrations/google",
        googleStatus: "/integrations/google/status",
    },
    tendering: {
        tenders: "/tendering/tenders",
        tenderCreate: "/tendering/tender/create",
        infoSheet: "/tendering/info-sheet",
        tenderApproval: "/tendering/tender-approval",
        phydocs: "/tendering/phydocs",
        rfqs: "/tendering/rfqs",
        emdsTenderFees: "/tendering/emds-tenderfees",
        checklists: "/tendering/checklists",
        costingSheets: "/tendering/costing-sheets",
        costingApproval: "/tendering/costing-approval",
        bidSubmissions: "/tendering/bid-submissions",
        tqs: "/tendering/tqs",
        ras: "/tendering/ras",
        results: "/tendering/results",
    },
    operations: {
        workOrder: "/operations/work-order",
        kickOff: "/operations/kick-off",
        contractAgreement: "/operations/contract-agreement",
    },
    services: {
        customer: "/services/customer",
        conference: "/services/conference",
        visit: "/services/visit",
        amc: "/services/amc",
    },
    bi: {
        demandDraft: "/bi-dashboard/demand-draft",
        fdr: "/bi-dashboard/fdr",
        cheque: "/bi-dashboard/cheque",
        bankGuarantee: "/bi-dashboard/bank-guarantee",
        bankTransfer: "/bi-dashboard/bank-tranfer",
        payOnPortal: "/bi-dashboard/pay-on-portal",
    },
    accounts: {
        imprests: "/accounts/imprests",
        financialDocs: "/accounts/financial-docs",
        loanAdvances: "/accounts/loan-advances",
        projects: "/accounts/projects",
        accountChecklists: "/accounts/task-checlkists",
        tdsChecklists: "/accounts/tds-checklists",
        gstChecklists: "/accounts/gst-checklists",
        fixedExpenses: "/accounts/fixed-expenses",
    },
    crm: {
        leads: "/crm/leads",
        enquiries: "/crm/enquiries",
        costings: "/crm/costings",
        quotations: "/crm/quotations",
    },
    performance: {
        tenderExecutive: "/performance/tender-executive",
        teamLeader: "/performance/team-leader",
        operationTeam: "/performance/operation-team",
        accountTeam: "/performance/account-team",
        oemDashboard: "/performance/oem-dashboard",
        businessDashboard: "/performance/business-dashboard",
        customerDashboard: "/performance/customer-dashboard",
        locationDashboard: "/performance/location-dashboard",
    },
    master: {
        users: "/master/user",
        users_create: "/master/user/create",
        users_edit: "/master/user/edit",

        statuses: "/master/status",
        statuses_create: "/master/status/create",
        statuses_edit: "/master/status/edit",

        organizations: "/master/organization",
        organizations_create: "/master/organization/create",
        organizations_edit: "/master/organization/edit",

        companies: "/master/company",

        items: "/master/item",
        items_create: "/master/item/create",
        items_edit: "/master/item/edit",

        vendors: "/master/vendor",
        vendors_create: "/master/vendor/create",
        vendors_edit: "/master/vendor/edit",

        websites: "/master/website",
        websites_create: "/master/website/create",
        websites_edit: "/master/website/edit",

        locations: "/master/location",
        locations_create: "/master/location/create",
        locations_edit: "/master/location/edit",

        documentSubmitted: "/master/document-submitted",
        documentSubmitted_create: "/master/document-submitted/create",
        documentSubmitted_edit: "/master/document-submitted/edit",

        imprestCategories: "/master/imprest-category",
        imprestCategories_create: "/master/imprest-category/create",
        imprestCategories_edit: "/master/imprest-category/edit",

        documentType: "/master/document-type",
        documentType_create: "/master/document-type/create",
        documentType_edit: "/master/document-type/edit",

        financialYears: "/master/financial-year",
        financialYears_create: "/master/financial-year/create",
        financialYears_edit: "/master/financial-year/edit",

        followupCategories: "/master/followup-category",
        followupCategories_create: "/master/followup-category/create",
        followupCategories_edit: "/master/followup-category/edit",

        emdsResponsibilities: "/master/emd-responsibility",
        emdsResponsibilities_create: "/master/emd-responsibility/create",
        emdsResponsibilities_edit: "/master/emd-responsibility/edit",

        designations: "/master/designation",
        designations_create: "/master/designation/create",
        designations_edit: "/master/designation/edit",

        roles: "/master/role",
        roles_create: "/master/role/create",
        roles_edit: "/master/role/edit",

        industries: "/master/industry",
        industries_create: "/master/industry/create",
        industries_edit: "/master/industry/edit",

        leadTypes: "/master/lead-type",
        leadTypes_create: "/master/lead-type/create",
        leadTypes_edit: "/master/lead-type/edit",

        loanParties: "/master/loan-party",
        loanParties_create: "/master/loan-party/create",
        loanParties_edit: "/master/loan-party/edit",

        projects: "/master/project",
        projects_create: "/master/project/create",
        projects_edit: "/master/project/edit",

        states: "/master/state",
        states_create: "/master/state/create",
        states_edit: "/master/state/edit",

        teams: "/master/team",
        teams_create: "/master/team/create",
        teams_edit: "/master/team/edit",

        tqTypes: "/master/tq-type",
        tqTypes_create: "/master/tq-type/create",
        tqTypes_edit: "/master/tq-type/edit",

        vendorAccs: "/master/vendor-account",
        vendorAccs_create: "/master/vendor-account/create",
        vendorAccs_edit: "/master/vendor-account/edit",

        vendorGsts: "/master/vendor-gst",
        vendorGsts_create: "/master/vendor-gst/create",
        vendorGsts_edit: "/master/vendor-gst/edit",

        vendorFiles: "/master/vendor-file",
        vendorFiles_create: "/master/vendor-file/create",
        vendorFiles_edit: "/master/vendor-file/edit",

        vendorOrganizations: "/master/vendor-organization",
        vendorOrganizations_create: "/master/vendor-organization/create",
        vendorOrganizations_edit: "/master/vendor-organization/edit",
    },
    shared: {
        followUps: "/shared/follow-ups",
        couriers: "/shared/courier",
    },
} as const;
