export const paths = {
    // ==================== AUTH ====================
    auth: {
        login: "/login",
        googleCallback: "/auth/google/callback",
    },

    // ==================== INTEGRATIONS ====================
    integrations: {
        google: "/integrations/google",
        googleStatus: "/integrations/google/status",
    },

    // ==================== TENDERING ====================

    dashboard: "/",

    // ==================== TENDERING ====================
    tendering: {
        tenders: "/tendering/tenders",
        tenderCreate: "/tendering/tenders/create",
        tenderEdit: (id: number | string) => `/tendering/tenders/${id}/edit`,
        tenderView: (id: number | string) => `/tendering/tenders/${id}`,
        infoSheetCreate: (tenderId: number | string) => `/tendering/info-sheet/create/${tenderId}`,
        infoSheetEdit: (tenderId: number | string) => `/tendering/info-sheet/edit/${tenderId}`,
        tenderApproval: '/tendering/tender-approval',
        tenderApprovalCreate: (tenderId: number | string) => `/tendering/tender-approval/create/${tenderId}`,
        phydocs: '/tendering/phydocs',
        rfqs: '/tendering/rfqs',
        emdsTenderFees: '/tendering/emds-tenderfees',
        checklists: '/tendering/checklists',
        costingSheets: '/tendering/costing-sheets',
        costingApproval: '/tendering/costing-approval',
        bidSubmissions: '/tendering/bid-submissions',
        tqs: '/tendering/tqs',
        ras: '/tendering/ras',
        results: '/tendering/results',
    },

    // ==================== OPERATIONS ====================
    operations: {
        workOrder: "/operations/work-order",
        kickOff: "/operations/kick-off",
        contractAgreement: "/operations/contract-agreement",
    },

    // ==================== SERVICES ====================
    services: {
        customer: "/services/customer",
        conference: "/services/conference",
        visit: "/services/visit",
        amc: "/services/amc",
    },

    // ==================== BI DASHBOARD ====================
    bi: {
        demandDraft: "/bi-dashboard/demand-draft",
        fdr: "/bi-dashboard/fdr",
        cheque: "/bi-dashboard/cheque",
        bankGuarantee: "/bi-dashboard/bank-guarantee",
        bankTransfer: "/bi-dashboard/bank-transfer",
        payOnPortal: "/bi-dashboard/pay-on-portal",
    },

    // ==================== ACCOUNTS ====================
    accounts: {
        imprests: "/accounts/imprests",
        financialDocs: "/accounts/financial-docs",
        loanAdvances: "/accounts/loan-advances",
        accountChecklists: "/accounts/account-checklists",
        gstChecklists: "/accounts/gst-checklists",
        fixedExpenses: "/accounts/fixed-expenses",
        projects: "/projects",
        tdsChecklists: "/accounts/tds-checklists",
    },

    // ==================== CRM ====================
    crm: {
        leads: "/crm/leads",
        enquiries: "/crm/enquiries",
        costings: "/crm/costings",
        quotations: "/crm/quotations",
    },

    // ==================== PERFORMANCE ====================
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

    // ==================== MASTER ====================
    master: {
        users: "/master/users",
        users_create: "/master/users/create",
        users_edit: (id: number | string) => `/master/users/${id}/edit`,

        statuses: "/master/statuses",
        statuses_create: "/master/statuses/create",
        statuses_edit: (id: number | string) => `/master/statuses/${id}/edit`,

        organizations: "/master/organizations",
        organizations_create: "/master/organizations/create",
        organizations_edit: (id: number | string) => `/master/organizations/${id}/edit`,

        companies: "/master/companies",

        items: "/master/items",
        items_create: "/master/items/create",
        items_edit: (id: number | string) => `/master/items/${id}/edit`,

        vendors: "/master/vendors",
        vendors_create: "/master/vendors/create",
        vendors_edit: (id: number | string) => `/master/vendors/${id}/edit`,

        websites: "/master/websites",
        websites_create: "/master/websites/create",
        websites_edit: (id: number | string) => `/master/websites/${id}/edit`,

        locations: "/master/locations",
        locations_create: "/master/locations/create",
        locations_edit: (id: number | string) => `/master/locations/${id}/edit`,

        documentSubmitted: "/master/document-submitted",
        documentSubmitted_create: "/master/document-submitted/create",
        documentSubmitted_edit: (id: number | string) => `/master/document-submitted/${id}/edit`,

        imprestCategories: "/master/imprest-categories",
        imprestCategories_create: "/master/imprest-categories/create",
        imprestCategories_edit: (id: number | string) => `/master/imprest-categories/${id}/edit`,

        documentType: "/master/document-type",
        documentType_create: "/master/document-type/create",
        documentType_edit: (id: number | string) => `/master/document-type/${id}/edit`,

        financialYears: "/master/financial-years",
        financialYears_create: "/master/financial-years/create",
        financialYears_edit: (id: number | string) => `/master/financial-years/${id}/edit`,

        followupCategories: "/master/followup-categories",
        followupCategories_create: "/master/followup-categories/create",
        followupCategories_edit: (id: number | string) => `/master/followup-categories/${id}/edit`,

        emdsResponsibilities: "/master/emds-responsibilities",
        emdsResponsibilities_create: "/master/emds-responsibilities/create",
        emdsResponsibilities_edit: (id: number | string) => `/master/emds-responsibilities/${id}/edit`,

        designations: "/master/designations",
        designations_create: "/master/designations/create",
        designations_edit: (id: number | string) => `/master/designations/${id}/edit`,

        roles: "/master/roles",
        roles_create: "/master/roles/create",
        roles_edit: (id: number | string) => `/master/roles/${id}/edit`,

        industries: "/master/industries",
        industries_create: "/master/industries/create",
        industries_edit: (id: number | string) => `/master/industries/${id}/edit`,

        tqTypes: "/master/tq-types",
        tqTypes_create: "/master/tq-types/create",
        tqTypes_edit: (id: number | string) => `/master/tq-types/${id}/edit`,

        loanParties: "/master/loan-parties",
        loanParties_create: "/master/loan-parties/create",
        loanParties_edit: (id: number | string) => `/master/loan-parties/${id}/edit`,

        projects: "/master/projects",
        projects_create: "/master/projects/create",
        projects_edit: (id: number | string) => `/master/projects/${id}/edit`,

        states: "/master/states",
        states_create: "/master/states/create",
        states_edit: (id: number | string) => `/master/states/${id}/edit`,

        teams: "/master/teams",
        teams_create: "/master/teams/create",
        teams_edit: (id: number | string) => `/master/teams/${id}/edit`,

        leadTypes: "/master/lead-types",
        leadTypes_create: "/master/lead-types/create",
        leadTypes_edit: (id: number | string) => `/master/lead-types/${id}/edit`,

        vendorAccs: "/master/vendor-accounts",
        vendorAccs_create: "/master/vendor-accounts/create",
        vendorAccs_edit: (id: number | string) => `/master/vendor-accounts/${id}/edit`,

        vendorGsts: "/master/vendor-gsts",
        vendorGsts_create: "/master/vendor-gsts/create",
        vendorGsts_edit: (id: number | string) => `/master/vendor-gsts/${id}/edit`,

        vendorFiles: "/master/vendor-files",
        vendorFiles_create: "/master/vendor-files/create",
        vendorFiles_edit: (id: number | string) => `/master/vendor-files/${id}/edit`,

        vendorOrganizations: "/master/vendor-organizations",
        vendorOrganizations_create: "/master/vendor-organizations/create",
        vendorOrganizations_edit: (id: number | string) => `/master/vendor-organizations/${id}/edit`,
    },

    // ==================== SHARED ====================
    shared: {
        followUps: "/shared/follow-ups",
        followUpsCreate: "/shared/follow-ups/create",
        followUpsEdit: "/shared/follow-up/edit",
        followUpsShow: "/shared/follow-up/show",
        couriers: "/shared/couriers",
        courierDispatch: "/shared/couriers/dispatch",
        courierCreate: "/shared/couriers/create",
        imprests: "/shared/imprests",
    },
};
