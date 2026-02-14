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
    profile: "/profile",

    // ==================== TENDERING ====================
    tendering: {
        tenders: "/tendering/tenders",
        tenderCreate: "/tendering/tenders/create",
        tenderEdit: (id: number | string) => `/tendering/tenders/${id}/edit`,
        tenderView: (id: number | string) => `/tendering/tenders/${id}`,
        infoSheetCreate: (tenderId: number | string) => `/tendering/info-sheet/create/${tenderId}`,
        infoSheetEdit: (tenderId: number | string) => `/tendering/info-sheet/edit/${tenderId}`,
        tenderApproval: "/tendering/tender-approval",
        tenderApprovalCreate: (tenderId: number | string) => `/tendering/tender-approval/create/${tenderId}`,
        tenderApprovalView: (tenderId: number | string) => `/tendering/tender-approval/${tenderId}`,
        physicalDocs: "/tendering/physical-docs",
        physicalDocsCreate: (tenderId: number | string) => `/tendering/physical-docs/create/${tenderId}`,
        physicalDocsEdit: (tenderId: number | string) => `/tendering/physical-docs/${tenderId}/edit`,
        physicalDocsView: (tenderId: number | string) => `/tendering/physical-docs/${tenderId}`,
        rfqs: "/tendering/rfqs",
        rfqsCreate: (tenderId: number | string) => `/tendering/rfqs/create/${tenderId}`,
        rfqsEdit: (tenderId: number | string) => `/tendering/rfqs/${tenderId}/edit`,
        rfqsView: (tenderId: number | string) => `/tendering/rfqs/${tenderId}`,
        rfqsResponseNew: (rfqId: number | string) => `/tendering/rfqs/response/new/${rfqId}`,
        rfqsResponses: "/tendering/rfqs/responses",
        rfqsResponseList: (rfqId: number | string) => `/tendering/rfqs/${rfqId}/responses`,
        rfqResponseView: (responseId: number | string) => `/tendering/rfqs/response/${responseId}`,
        emdsTenderFees: "/tendering/emds-tenderfees",
        emdsTenderFeesCreate: (tenderId: number | string) => `/tendering/emds-tenderfees/create/${tenderId}`,
        oldEmdsTenderFeesCreate: () => `/tendering/emds-tenderfees/old-entries/create`,
        biOtherThanEmdsCreate: () => `/tendering/emds-tenderfees/bi-other-than-emds/create`,
        emdsTenderFeesEdit: (tenderId: number | string) => `/tendering/emds-tenderfees/${tenderId}/edit`,
        emdsTenderFeesView: (tenderId: number | string) => `/tendering/emds-tenderfees/${tenderId}`,
        checklists: "/tendering/document-checklists",
        documentChecklistCreate: (tenderId: number | string) => `/tendering/document-checklists/create/${tenderId}`,
        documentChecklistEdit: (tenderId: number | string) => `/tendering/document-checklists/edit/${tenderId}`,
        documentChecklistView: (tenderId: number | string) => `/tendering/document-checklists/${tenderId}`,
        costingSheets: "/tendering/costing-sheets",
        costingSheetCreate: (tenderId: number | string) => `/tendering/costing-sheets/create/${tenderId}`,
        costingSheetSubmit: (tenderId: number | string) => `/tendering/costing-sheets/submit/${tenderId}`,
        costingSheetEdit: (tenderId: number | string) => `/tendering/costing-sheets/edit/${tenderId}`,
        costingSheetResubmit: (tenderId: number | string) => `/tendering/costing-sheets/resubmit/${tenderId}`,
        costingSheetView: (tenderId: number | string) => `/tendering/costing-sheets/${tenderId}`,
        costingApprovals: "/tendering/costing-approvals",
        costingApprove: (costingSheetId: number) => `/tendering/costing-approvals/approve/${costingSheetId}`,
        costingReject: (costingSheetId: number) => `/tendering/costing-approvals/reject/${costingSheetId}`,
        costingEditApproval: (costingSheetId: number) => `/tendering/costing-approvals/edit/${costingSheetId}`,
        costingApprovalView: (tenderId: number) => `/tendering/costing-approvals/view/${tenderId}`,
        bidSubmissions: "/tendering/bid-submissions",
        bidSubmit: (tenderId: number) => `/tendering/bid-submissions/submit/${tenderId}`,
        bidEdit: (bidSubmissionId: number) => `/tendering/bid-submissions/edit/${bidSubmissionId}`,
        bidMarkMissed: (tenderId: number) => `/tendering/bid-submissions/mark-missed/${tenderId}`,
        bidEditMissed: (bidSubmissionId: number) => `/tendering/bid-submissions/edit-missed/${bidSubmissionId}`,
        bidView: (tenderId: number) => `/tendering/bid-submissions/view/${tenderId}`,
        tqManagement: "/tendering/tq-management",
        tqReceived: (tenderId: number) => `/tendering/tq-management/received/${tenderId}`,
        tqEditReceived: (tqId: number) => `/tendering/tq-management/edit-received/${tqId}`,
        tqReplied: (tqId: number) => `/tendering/tq-management/replied/${tqId}`,
        tqEditReplied: (tqId: number) => `/tendering/tq-management/edit-replied/${tqId}`,
        tqMissed: (tqId: number) => `/tendering/tq-management/missed/${tqId}`,
        tqEditMissed: (tqId: number) => `/tendering/tq-management/edit-missed/${tqId}`,
        tqView: (tqId: number) => `/tendering/tq-management/view/${tqId}`,
        tqViewAll: (tenderId: number) => `/tendering/tq-management/view-all/${tenderId}`,
        ras: "/tendering/reverse-auctions",
        rasSchedule: (tenderId: number) => `/tendering/reverse-auctions/schedule/${tenderId}`,
        rasUploadResult: (raId: number) => `/tendering/reverse-auctions/upload-result/${raId}`,
        rasShow: (tenderId: number) => `/tendering/reverse-auctions/${tenderId}`,
        rasEdit: (id: number) => `/tendering/reverse-auctions/${id}/edit`,
        results: "/tendering/results",
        resultsUpload: (tenderId: number) => `/tendering/results/upload/${tenderId}`,
        resultsShow: (tenderId: number) => `/tendering/results/${tenderId}`,
        resultsEdit: (id: number) => `/tendering/results/${id}/edit`,
    },

    // ==================== OPERATIONS ====================
    operations: {
        workOrder: "/operations/work-order",
        kickOff: "/operations/kick-off",
        contractAgreement: "/operations/contract-agreement",

        projectDashboard: "/operations/project-dashboard",
        raisePoForm: "/operations/project-dashboard/purchase-order/create",
        viewPoPage: (id: number) => `/operations/project-dashboard/purchase-order/view/${id}`,
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
        demandDraftView: (requestId: number) => `/bi-dashboard/demand-draft/details/${requestId}`,
        demandDraftAction: (id: number) => `/bi-dashboard/demand-draft/action/${id}`,
        fdr: "/bi-dashboard/fdr",
        fdrView: (requestId: number) => `/bi-dashboard/fdr/details/${requestId}`,
        fdrAction: (id: number) => `/bi-dashboard/fdr/action/${id}`,
        cheque: "/bi-dashboard/cheque",
        chequeView: (requestId: number) => `/bi-dashboard/cheque/details/${requestId}`,
        chequeAction: (id: number) => `/bi-dashboard/cheque/action/${id}`,
        bankGuarantee: "/bi-dashboard/bank-guarantee",
        bankGuaranteeView: (requestId: number) => `/bi-dashboard/bank-guarantee/details/${requestId}`,
        bankGuaranteeAction: (id: number) => `/bi-dashboard/bank-guarantee/action/${id}`,
        bankTransfer: "/bi-dashboard/bank-transfer",
        bankTransferView: (requestId: number) => `/bi-dashboard/bank-transfer/details/${requestId}`,
        bankTransferAction: (id: number) => `/bi-dashboard/bank-transfer/action/${id}`,
        payOnPortal: "/bi-dashboard/pay-on-portal",
        payOnPortalView: (requestId: number) => `/bi-dashboard/pay-on-portal/details/${requestId}`,
        payOnPortalAction: (id: number) => `/bi-dashboard/pay-on-portal/action/${id}`,
    },

    // ==================== ACCOUNTS ====================
    accounts: {
        imprests: "/accounts/imprests",
        imprestsUserView: (id: number) => `/accounts/imprests/user/${id}`,
        imprestPaymentHistory: (id: number) => `/accounts/imprests/payment-history/${id}`,
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

        permissions: "/master/permissions",

        industries: "/master/industries",
        industries_create: "/master/industries/create",
        industries_edit: (id: number | string) => `/master/industries/${id}/edit`,

        tqTypes: "/master/tq-types",
        tqTypes_create: "/master/tq-types/create",
        tqTypes_edit: (id: number | string) => `/master/tq-types/${id}/edit`,

        loanParties: "/master/loan-parties",
        loanParties_create: "/master/loan-parties/create",
        loanParties_edit: (id: number | string) => `/master/loan-parties/${id}/edit`,

        states: "/master/states",
        states_create: "/master/states/create",
        states_edit: (id: number | string) => `/master/states/${id}/edit`,

        teams: "/master/teams",
        teams_create: "/master/teams/create",
        teams_edit: (id: number | string) => `/master/teams/${id}/edit`,

        leadTypes: "/master/lead-types",
        leadTypes_create: "/master/lead-types/create",
        leadTypes_edit: (id: number | string) => `/master/lead-types/${id}/edit`,
    },

    // ==================== SHARED ====================
    shared: {
        followUp: "/shared/follow-ups",
        followUpCreate: "/shared/follow-up/create",
        followUpEdit: (id: number) => `/shared/follow-up/edit/${id}`,
        followUpShow: (id: number) => `/shared/follow-up/show/${id}`,

        couriers: "/shared/couriers",
        courierDispatch: "/shared/couriers/dispatch",
        courierCreate: "/shared/couriers/create",
        courierView: (id: number) => `/shared/couriers/show/${id}`,
        courierEdit: (id: number) => `/shared/couriers/edit/${id}`,

        imprest: "/shared/imprests",
        imprestUser: (id: number) => `/shared/imprests/user/${id}`,
        imprestCreate: "/shared/imprests/create",
        imprestVoucher: "/shared/imprests/voucher",
        imprestVoucherByUser: (id: number) => `/shared/imprests/voucher?userId=${id}`,
        imprestVoucherView: (params: { userId: number; from: string; to: string }) =>
            `/shared/imprests/voucher/view?userId=${params.userId}&from=${encodeURIComponent(params.from)}&to=${encodeURIComponent(params.to)}`,
    },

    // ==================== DOCUMENT DASHBOARD ====================
    documentDashboard: {
        pqr: "/document-dashboard/pqr",
        pqrCreate: "/document-dashboard/pqr/create",
        pqrEdit: (id: number | string) => `/document-dashboard/pqr/${id}/edit`,
        pqrView: (id: number | string) => `/document-dashboard/pqr/${id}`,
        financeDocument: "/document-dashboard/finance-document",
        financeDocumentCreate: "/document-dashboard/finance-document/create",
        financeDocumentEdit: (id: number | string) => `/document-dashboard/finance-document/${id}/edit`,
        financeDocumentView: (id: number | string) => `/document-dashboard/finance-document/${id}`,
        projects: "/document-dashboard/projects",
        projectsCreate: "/document-dashboard/projects/create",
        projectsEdit: (id: number | string) => `/document-dashboard/projects/${id}/edit`,
        projectsView: (id: number | string) => `/document-dashboard/projects/${id}`,
    },
};
