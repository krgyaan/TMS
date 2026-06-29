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


    training: {
        root: "/training",
        // Add future nested training paths here
    },

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
        oldEmdsForDD: () => `/tendering/emds-tenderfees/old-entries/create?mode=DD`,
        oldEmdsForFDR: () => `/tendering/emds-tenderfees/old-entries/create?mode=FDR`,
        oldEmdsForBG: () => `/tendering/emds-tenderfees/old-entries/create?mode=BG`,
        oldEmdsForCHEQUE: () => `/tendering/emds-tenderfees/old-entries/create?mode=CHEQUE`,
        biOtherThanEmdsCreate: () => `/tendering/emds-tenderfees/bi-other-than-emds/create`,
        emdsTenderFeesEdit: (id: number | string) => `/tendering/emds-tenderfees/${id}/edit`,
        emdsTenderFeesView: (tenderId: number | string) => `/tendering/emds-tenderfees/${tenderId}`,
        emdsTenderFeesFollowUp: (id: number | string) => `/tendering/emds-tenderfees/follow-up/${id}`,
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
        costingEditApproval: (costingSheetId: number) => `/tendering/costing-approvals/edit/${costingSheetId}`,
        costingApprovalView: (tenderId: number) => `/tendering/costing-approvals/view/${tenderId}`,
        bidSubmissions: "/tendering/bid-submissions",
        bidSubmit: (tenderId: number) => `/tendering/bid-submissions/submit/${tenderId}`,
        bidEdit: (bidSubmissionId: number) => `/tendering/bid-submissions/edit/${bidSubmissionId}`,
        bidMarkMissed: (tenderId: number) => `/tendering/bid-submissions/mark-missed/${tenderId}`,
        bidMissedGlobal: (tenderId: number, stage: string) => `/tendering/bid-submissions/mark-missed/${tenderId}/${stage}`,
        bidEditMissed: (bidSubmissionId: number) => `/tendering/bid-submissions/edit-missed/${bidSubmissionId}`,
        bidView: (tenderId: number) => `/tendering/bid-submissions/view/${tenderId}`,
        tqManagement: "/tendering/tq-management",
        tqReceived: (tenderId: number) => `/tendering/tq-management/received/${tenderId}`,
        tqEditReceived: (tenderId: number) => `/tendering/tq-management/edit-received/${tenderId}`,
        tqReplied: (tenderId: number) => `/tendering/tq-management/replied/${tenderId}`,
        tqEditReplied: (tenderId: number) => `/tendering/tq-management/edit-replied/${tenderId}`,
        tqMissed: (tenderId: number) => `/tendering/tq-management/missed/${tenderId}`,
        tqEditMissed: (tenderId: number) => `/tendering/tq-management/edit-missed/${tenderId}`,
        tqView: (tenderId: number) => `/tendering/tq-management/view/${tenderId}`,
        ras: "/tendering/reverse-auctions",
        rasSchedule: (tenderId: number) => `/tendering/reverse-auctions/schedule/${tenderId}`,
        rasUploadResult: (raId: number) => `/tendering/reverse-auctions/upload-result/${raId}`,
        rasShow: (tenderId: number) => `/tendering/reverse-auctions/${tenderId}`,
        rasEdit: (id: number) => `/tendering/reverse-auctions/${id}/edit`,
        results: "/tendering/results",
        resultsUpload: (tenderId: number) => `/tendering/results/upload/${tenderId}`,
        resultsShow: (tenderId: number) => `/tendering/results/${tenderId}`,
        resultsEdit: (id: number) => `/tendering/results/${id}/edit`,
        requestExtension: "/tendering/request-extension",
        requestExtensionCreate: (tenderId: number) => `/tendering/request-extension/${tenderId}/create`,
        requestExtensionEdit: (tenderId: number, id: number) => `/tendering/request-extension/${tenderId}/edit/${id}`,
        requestExtensionView: (tenderId: number, id: number) => `/tendering/request-extension/${tenderId}/view/${id}`,
        submitQuery: "/tendering/submit-queries",
        submitQueryCreate: (tenderId: number) => `/tendering/submit-queries/${tenderId}/create`,
        submitQueryEdit: (tenderId: number, id: number) => `/tendering/submit-queries/${tenderId}/edit/${id}`,
        submitQueryView: (tenderId: number, id: number) => `/tendering/submit-queries/${tenderId}/view/${id}`,
    },

    // ==================== OPERATIONS ====================
    operations: {
        woBasicDetailListPage: "/operations/work-order/details/basic",
        woBasicDetailCreatePage: "/operations/work-order/details/basic/create",
        woBasicDetailEditPage: (id: number) => `/operations/work-order/details/basic/${id}/edit`,
        woBasicDetailShowPage: (id: number) => `/operations/work-order/details/basic/${id}`,
        woAssignOePage: (id: number) => `/operations/work-order/details/assign-oe/${id}`,
        woDetailCreatePage: (woBasicDetailId: number) => `/operations/work-order/details/full/create/${woBasicDetailId}`,
        woDetailEditPage: (id: number) => `/operations/work-order/details/full/${id}/edit`,
        woDetailShowPage: (id: number) => `/operations/work-order/details/full/${id}`,
        woDetailAcceptanceListPage: "/operations/work-order/acceptance",
        woAcceptancePage: (id: number) => `/operations/work-order/acceptance/${id}`,
        woAcceptanceEditPage: (id: number) => `/operations/work-order/acceptance/${id}/edit`,
        woRaiseQueryPage: (id: number) => `/operations/work-order/acceptance/raise-query/${id}`,
        woRaiseQueryEditPage: (id: number) => `/operations/work-order/acceptance/raise-query/${id}/edit`,
        woUploadPage: (id: number) => `/operations/work-order/acceptance/upload/${id}`,

        woKickOffListPage: "/operations/work-order/kick-off",
        woKickOffCreatePage: (id: number) => `/operations/work-order/kick-off/create/${id}`,
        woKickOffShowPage: (id: number) => `/operations/work-order/kick-off/${id}`,

        contractAgreementListPage: "/operations/work-order/contract-agreement",
        contractAgreementShowPage: (id: number) => `/operations/work-order/contract-agreement/${id}`,

        projectDashboard: (id?: number) => id ? `/operations/project-dashboard/${id}` : "/operations/project-dashboard",
        projectShowPage: (id: number) => `/operations/project-dashboard/show/${id}`,
        raisePoForm: (projectId: number) => `/operations/project-dashboard/${projectId}/purchase-order/create`,
        viewPoPage: (poId: number, projectId: number) => `/operations/project-dashboard/${projectId}/purchase-order/${poId}`,
        editPoPage: (poId: number, projectId: number) => `/operations/project-dashboard/${projectId}/purchase-order/${poId}/edit`,
        poPdfVersions: (poId: number, projectId: number) => `/operations/project-dashboard/${projectId}/purchase-order/${poId}/pdf-versions`,
        purchaseOrders: "/operations/purchase-orders",

        vendorWorkOrders: "/operations/vendor-work-orders",
        raiseVendorWoForm: (projectId: number) => `/operations/project-dashboard/${projectId}/vendor-work-order/create`,
        editVendorWoPage: (woId: number, projectId: number) => `/operations/project-dashboard/${projectId}/vendor-work-order/${woId}/edit`,
        vendorWoPdfVersions: (woId: number, projectId: number) => `/operations/project-dashboard/${projectId}/vendor-work-order/${woId}/pdf-versions`,

        raiseProjectPurchaseInvoiceForm: (projectId: number) => `/operations/project-dashboard/${projectId}/project-purchase-invoice/create`,
        editProjectPurchaseInvoicePage: (piId: number, projectId: number) => `/operations/project-dashboard/${projectId}/project-purchase-invoice/${piId}/edit`,
        raiseProjectPaymentRequestForm: (projectId: number) => `/operations/project-dashboard/${projectId}/project-payment-request/create`,
        editProjectPaymentRequestPage: (prId: number, projectId: number) => `/operations/project-dashboard/${projectId}/project-payment-request/${prId}/edit`,
        paymentRequests: "/operations/payment-requests",
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
        DDMeetingRemarks: (id: number) => `/bi-dashboard/demand-draft/meeting-remarks/${id}`,
        fdr: "/bi-dashboard/fdr",
        fdrView: (requestId: number) => `/bi-dashboard/fdr/details/${requestId}`,
        fdrAction: (id: number) => `/bi-dashboard/fdr/action/${id}`,
        FdrMeetingRemarksPage: (id: number) => `/bi-dashboard/fdr/meeting-remarks/${id}`,
        cheque: "/bi-dashboard/cheque",
        chequeView: (requestId: number) => `/bi-dashboard/cheque/details/${requestId}`,
        chequeAction: (id: number) => `/bi-dashboard/cheque/action/${id}`,
        chequeMeetingRemarks: (id: number) => `/bi-dashboard/cheque/meeting-remarks/${id}`,
        bankGuarantee: "/bi-dashboard/bank-guarantee",
        bankGuaranteeView: (requestId: number) => `/bi-dashboard/bank-guarantee/details/${requestId}`,
        bankGuaranteeAction: (id: number) => `/bi-dashboard/bank-guarantee/action/${id}`,
        bankGuaranteeEdit: (id: number) => `/bi-dashboard/bank-guarantee/edit/${id}`,
        bankGuaranteeMeetingRemarks: (id: number) => `/bi-dashboard/bank-guarantee/meeting-remarks/${id}`,
        bankTransfer: "/bi-dashboard/bank-transfer",
        bankTransferView: (requestId: number) => `/bi-dashboard/bank-transfer/details/${requestId}`,
        bankTransferAction: (id: number) => `/bi-dashboard/bank-transfer/action/${id}`,
        bankTransferMeetingRemarks: (id: number) => `/bi-dashboard/bank-transfer/meeting-remarks/${id}`,
        payOnPortal: "/bi-dashboard/pay-on-portal",
        payOnPortalView: (requestId: number) => `/bi-dashboard/pay-on-portal/details/${requestId}`,
        payOnPortalAction: (id: number) => `/bi-dashboard/pay-on-portal/action/${id}`,
        payOnPortalMeetingRemarks: (id: number) => `/bi-dashboard/pay-on-portal/meeting-remarks/${id}`,
        tenderFee: "/bi-dashboard/tender-fee",
        tenderFeeView: (type: string, id: number) => `/bi-dashboard/tender-fee/details/${type}/${id}`,
        tenderFeeAction: (type: string, id: number) => `/bi-dashboard/tender-fee/action/${type}/${id}`,
    },

    // ==================== ACCOUNTS ====================
    accounts: {
        imprests: "/accounts/imprests",
        imprestsUserView: (id: number) => `/accounts/imprests/user/${id}`,
        financialDocs: "/accounts/financial-docs",
        loanAdvances: "/accounts/loan-advances",
        loanAdvancesCreate: "/accounts/loan-advances/create",
        loanAdvancesEdit: (id: number) => `/accounts/loan-advances/${id}/edit`,
        loanAdvancesView: (id: number) => `/accounts/loan-advances/${id}`,
        loanEmiPayment: (id: number) => `/accounts/loan-advances/emis/${id}`,
        loanTdsRecovery: (id: number) =>`/accounts/loan-advances/tds/${id}`,
        loanClosure: (id: number) =>`/accounts/loan-advances/closure/${id}`,
        accountChecklists: "/accounts/account-checklists",
        gstChecklists: "/accounts/gst-checklists",
        fixedExpenses: "/accounts/fixed-expenses",
        projects: "/projects",
        tdsChecklists: "/accounts/tds-checklists",

        taskChecklists: "/accounts/task-checklists",
        taskChecklistsCreate: "/accounts/task-checklists/create",

        taskChecklistsEdit: (id: number) => `/accounts/task-checklists/${id}/edit`,
        taskChecklistsView: (id: number) => `/accounts/task-checklists/${id}`,
        taskChecklistsReport:(id: number) => `/accounts/task-checklists/${id}/report`,

        delegation: "/accounts/delegation",
        delegationAdd: "/accounts/delegation/add",
        delegationView: (id: string) => `/accounts/delegation/${id}`,
        delegationUpdate: (id: string) => `/accounts/delegation/${id}/update`,
        purchaseOrders: "/accounts/purchase-orders",
        paymentRequests: "/accounts/payment-requests",
        makerRequestCreate: "/accounts/maker-requests/create",
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

        circulars : "/master/circular",
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
        imprestEdit: (id: number) => `/shared/imprests/${id}/edit`,
        imprestPaymentHistory: "/shared/imprests/payment-history",
        imprestPaymentHistoryByUser: (id: number) => `/shared/imprests/payment-history?userId=${id}`,

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
        clientDirectory: "/document-dashboard/client-directory",
    },

    // ==================== HRMS ====================
    hrms: {
        employeeRegistration: "/hrms/employees/register",
        employeeProfile: (id: number | string) => `/hrms/employees/${id}`,

        
        myAssets: "/hrms/assets/my",
        
        dashboard: "/hrms/admin",
        
        assetAdminDashboard: "/hrms/admin/assets",
        assignAsset: "/hrms/admin/assets/assign",
        assetEdit: (id: number) => `/hrms/admin/assets/edit/${id}`,
        assetStatus: (id: number) => `/hrms/admin/assets/status/${id}`,
        assetView: (id: number) => `/hrms/admin/assets/view/${id}`,
        
        //================ onboarding  ==============================//
        onboardingDashboard: "/hrms/onboarding/dashboard",
        profileDetailsDashboard: "/hrms/onboarding/profile-details",
        documentDashboard: "/hrms/onboarding/documents",
        approvalDashboard: "/hrms/onboarding/approval",
        inductionDashboard: "/hrms/onboarding/induction",

        // =========================training =======================//
        trainingDashboard: "/hrms/training",
        uploadVideo: "/hrms/training/upload-video"
    },
};
