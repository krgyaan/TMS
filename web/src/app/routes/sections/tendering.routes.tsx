import { lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { RouteWrapper } from '../components/RouteWrapper';

// Lazy imports
const Tendering_Tenders = lazy(() => import('@/modules/tendering/tenders/TenderListPage'));
const Tender_Create = lazy(() => import('@/modules/tendering/tenders/TenderCreatePage'));
const Tender_Edit = lazy(() => import('@/modules/tendering/tenders/TenderEditPage'));
const Tender_View = lazy(() => import('@/modules/tendering/tenders/TenderShowPage'));
const Tendering_TenderApproval = lazy(() => import('@/modules/tendering/tender-approval/TenderApprovalListPage'));
const Tendering_TenderApproval_Create = lazy(() => import('@/modules/tendering/tender-approval/TenderApprovalCreatePage'));
const Tendering_TenderApproval_Show = lazy(() => import('@/modules/tendering/tender-approval/TenderApprovalShowPage'));
const InfoSheet_Create = lazy(() => import('@/modules/tendering/info-sheet/TenderInfoSheetCreatePage'));
const InfoSheet_Edit = lazy(() => import('@/modules/tendering/info-sheet/TenderInfoSheetEditPage'));
const Tendering_PhysicalDocs = lazy(() => import('@/modules/tendering/physical-docs/PhysicalDocsListPage'));
const Tendering_PhysicalDocs_Create = lazy(() => import('@/modules/tendering/physical-docs/PhysicalDocsCreatePage'));
const Tendering_PhysicalDocs_Edit = lazy(() => import('@/modules/tendering/physical-docs/PhysicalDocsEditPage'));
const Tendering_PhysicalDocs_Show = lazy(() => import('@/modules/tendering/physical-docs/PhysicalDocsShowPage'));
const Tendering_RFQs = lazy(() => import('@/modules/tendering/rfqs/RfqListPage'));
const Tendering_RFQs_Create = lazy(() => import('@/modules/tendering/rfqs/RfqCreatePage'));
const Tendering_RFQs_Edit = lazy(() => import('@/modules/tendering/rfqs/RfqEditPage'));
const Tendering_RFQs_Show = lazy(() => import('@/modules/tendering/rfqs/RfqShowPage'));
const Tendering_RFQs_Response_New = lazy(() => import('@/modules/tendering/rfqs/RfqResponseCreatePage'));
const Tendering_EMD = lazy(() => import('@/modules/tendering/emds-tenderfees/EmdListPage'));
const Tendering_EMD_Create = lazy(() => import('@/modules/tendering/emds-tenderfees/EmdCreatePage'));
const Tendering_EMD_Edit = lazy(() => import('@/modules/tendering/emds-tenderfees/EmdEditPage'));
const Tendering_EMD_Show = lazy(() => import('@/modules/tendering/emds-tenderfees/EmdShowPage'));
const Tendering_OldEmd_Create = lazy(() => import('@/modules/tendering/emds-tenderfees/OldEmdCreatePage'));
const Tendering_BiOtherThanEmd_Create = lazy(() => import('@/modules/tendering/emds-tenderfees/BiOtherThanEmdCreatePage'));
const Tendering_DocumentChecklist = lazy(() => import('@/modules/tendering/checklists/DocumentChecklistListPage'));
const Tendering_DocumentChecklist_Create = lazy(() => import('@/modules/tendering/checklists/DocumentChecklistCreatePage'));
const Tendering_DocumentChecklist_Edit = lazy(() => import('@/modules/tendering/checklists/DocumentChecklistEditPage'));
const Tendering_DocumentChecklist_Show = lazy(() => import('@/modules/tendering/checklists/DocumentChecklistShowPage'));
const Tendering_CostingSheets = lazy(() => import('@/modules/tendering/costing-sheets/CostingSheetListPage'));
const Tendering_CostingSheetSubmit = lazy(() => import('@/modules/tendering/costing-sheets/CostingSubmissionPage'));
const Tendering_CostingSheetEdit = lazy(() => import('@/modules/tendering/costing-sheets/CostingSubmissionPage'));
const Tendering_CostingSheetResubmit = lazy(() => import('@/modules/tendering/costing-sheets/CostingSubmissionPage'));
const Tendering_CostingSheetShow = lazy(() => import('@/modules/tendering/costing-sheets/CostingSheetShowPage'));
const CostingApprovalListPage = lazy(() => import('@/modules/tendering/costing-approvals/CostingApprovalListPage'));
const CostingApprovePage = lazy(() => import('@/modules/tendering/costing-approvals/CostingApprovePage'));
const CostingRejectPage = lazy(() => import('@/modules/tendering/costing-approvals/CostingRejectPage'));
const CostingEditApprovalPage = lazy(() => import('@/modules/tendering/costing-approvals/CostingEditApprovalPage'));
const CostingApprovalViewPage = lazy(() => import('@/modules/tendering/costing-approvals/CostingApprovalViewPage'));
const BidSubmissionListPage = lazy(() => import('@/modules/tendering/bid-submissions/BidSubmissionListPage'));
const BidSubmitPage = lazy(() => import('@/modules/tendering/bid-submissions/BidSubmitPage'));
const BidEditPage = lazy(() => import('@/modules/tendering/bid-submissions/BidEditPage'));
const BidMarkMissedPage = lazy(() => import('@/modules/tendering/bid-submissions/BidMarkMissedPage'));
const BidEditMissedPage = lazy(() => import('@/modules/tendering/bid-submissions/BidEditMissedPage'));
const BidSubmissionViewPage = lazy(() => import('@/modules/tendering/bid-submissions/BidSubmissionShowPage'));
const TqManagementListPage = lazy(() => import('@/modules/tendering/tq-management/TqManagementListPage'));
const TqReceivedPage = lazy(() => import('@/modules/tendering/tq-management/TqReceivedPage'));
const TqEditReceivedPage = lazy(() => import('@/modules/tendering/tq-management/TqEditReceivedPage'));
const TqRepliedPage = lazy(() => import('@/modules/tendering/tq-management/TqRepliedPage'));
const TqEditRepliedPage = lazy(() => import('@/modules/tendering/tq-management/TqEditRepliedPage'));
const TqMissedPage = lazy(() => import('@/modules/tendering/tq-management/TqMissedPage'));
const TqEditMissedPage = lazy(() => import('@/modules/tendering/tq-management/TqEditMissedPage'));
const TqViewPage = lazy(() => import('@/modules/tendering/tq-management/TqViewPage'));
const TqViewAllPage = lazy(() => import('@/modules/tendering/tq-management/TqViewAllPage'));
const Tendering_RAs = lazy(() => import('@/modules/tendering/ras/RaListPage'));
const Tendering_RA_Show = lazy(() => import('@/modules/tendering/ras/RaShowPage'));
const Tendering_RA_Edit = lazy(() => import('@/modules/tendering/ras/RaEditPage'));
const Tendering_RA_Schedule = lazy(() => import('@/modules/tendering/ras/RaSchedulePage'));
const Tendering_RA_UploadResult = lazy(() => import('@/modules/tendering/ras/RaUploadResultPage'));
const Tendering_Results = lazy(() => import('@/modules/tendering/results/TenderResultListPage'));
const Tendering_Result_Show = lazy(() => import('@/modules/tendering/results/TenderResultShowPage'));
const Tendering_Result_Edit = lazy(() => import('@/modules/tendering/results/TenderResultEditPage'));
const Tendering_Result_Upload = lazy(() => import('@/modules/tendering/results/TenderResultUploadPage'));

export default function TenderingRoutes() {
    return (
        <Routes>
            <Route path="tenders" element={<RouteWrapper><Tendering_Tenders /></RouteWrapper>} />
            <Route path="tenders/create" element={<RouteWrapper><Tender_Create /></RouteWrapper>} />
            <Route path="tenders/:id/edit" element={<RouteWrapper><Tender_Edit /></RouteWrapper>} />
            <Route path="tenders/:id" element={<RouteWrapper><Tender_View /></RouteWrapper>} />
            <Route path="info-sheet/create/:tenderId" element={<RouteWrapper><InfoSheet_Create /></RouteWrapper>} />
            <Route path="info-sheet/edit/:tenderId" element={<RouteWrapper><InfoSheet_Edit /></RouteWrapper>} />
            <Route path="tender-approval" element={<RouteWrapper><Tendering_TenderApproval /></RouteWrapper>} />
            <Route path="tender-approval/create/:tenderId" element={<RouteWrapper><Tendering_TenderApproval_Create /></RouteWrapper>} />
            <Route path="tender-approval/:tenderId" element={<RouteWrapper><Tendering_TenderApproval_Show /></RouteWrapper>} />
            <Route path="physical-docs" element={<RouteWrapper><Tendering_PhysicalDocs /></RouteWrapper>} />
            <Route path="physical-docs/create/:tenderId" element={<RouteWrapper><Tendering_PhysicalDocs_Create /></RouteWrapper>} />
            <Route path="physical-docs/:tenderId/edit" element={<RouteWrapper><Tendering_PhysicalDocs_Edit /></RouteWrapper>} />
            <Route path="physical-docs/:tenderId" element={<RouteWrapper><Tendering_PhysicalDocs_Show /></RouteWrapper>} />
            <Route path="rfqs" element={<RouteWrapper><Tendering_RFQs /></RouteWrapper>} />
            <Route path="rfqs/response/new/:rfqId" element={<RouteWrapper><Tendering_RFQs_Response_New /></RouteWrapper>} />
            <Route path="rfqs/create/:tenderId" element={<RouteWrapper><Tendering_RFQs_Create /></RouteWrapper>} />
            <Route path="rfqs/:tenderId/edit" element={<RouteWrapper><Tendering_RFQs_Edit /></RouteWrapper>} />
            <Route path="rfqs/:tenderId" element={<RouteWrapper><Tendering_RFQs_Show /></RouteWrapper>} />
            <Route path="emds-tenderfees" element={<RouteWrapper><Tendering_EMD /></RouteWrapper>} />
            <Route path="emds-tenderfees/create/:tenderId" element={<RouteWrapper><Tendering_EMD_Create /></RouteWrapper>} />
            <Route path="emds-tenderfees/:id/edit" element={<RouteWrapper><Tendering_EMD_Edit /></RouteWrapper>} />
            <Route path="emds-tenderfees/:id" element={<RouteWrapper><Tendering_EMD_Show /></RouteWrapper>} />
            <Route path="document-checklists" element={<RouteWrapper><Tendering_DocumentChecklist /></RouteWrapper>} />
            <Route path="emds-tenderfees/old-entries/create" element={<RouteWrapper><Tendering_OldEmd_Create /></RouteWrapper>} />
            <Route path="emds-tenderfees/bi-other-than-emds/create" element={<RouteWrapper><Tendering_BiOtherThanEmd_Create /></RouteWrapper>} />
            <Route path="document-checklists/create/:tenderId" element={<RouteWrapper><Tendering_DocumentChecklist_Create /></RouteWrapper>} />
            <Route path="document-checklists/edit/:tenderId" element={<RouteWrapper><Tendering_DocumentChecklist_Edit /></RouteWrapper>} />
            <Route path="document-checklists/:tenderId" element={<RouteWrapper><Tendering_DocumentChecklist_Show /></RouteWrapper>} />
            <Route path="costing-sheets" element={<RouteWrapper><Tendering_CostingSheets /></RouteWrapper>} />
            <Route path="costing-sheets/:tenderId" element={<RouteWrapper><Tendering_CostingSheetShow /></RouteWrapper>} />
            <Route path="costing-sheets/submit/:tenderId" element={<RouteWrapper><Tendering_CostingSheetSubmit /></RouteWrapper>} />
            <Route path="costing-sheets/edit/:tenderId" element={<RouteWrapper><Tendering_CostingSheetEdit /></RouteWrapper>} />
            <Route path="costing-sheets/resubmit/:tenderId" element={<RouteWrapper><Tendering_CostingSheetResubmit /></RouteWrapper>} />
            <Route path="costing-approvals" element={<RouteWrapper><CostingApprovalListPage /></RouteWrapper>} />
            <Route path="costing-approvals/view/:tenderId" element={<RouteWrapper><CostingApprovalViewPage /></RouteWrapper>} />
            <Route path="costing-approvals/approve/:id" element={<RouteWrapper><CostingApprovePage /></RouteWrapper>} />
            <Route path="costing-approvals/reject/:id" element={<RouteWrapper><CostingRejectPage /></RouteWrapper>} />
            <Route path="costing-approvals/edit/:id" element={<RouteWrapper><CostingEditApprovalPage /></RouteWrapper>} />
            <Route path="bid-submissions" element={<RouteWrapper><BidSubmissionListPage /></RouteWrapper>} />
            <Route path="bid-submissions/submit/:tenderId" element={<RouteWrapper><BidSubmitPage /></RouteWrapper>} />
            <Route path="bid-submissions/edit/:id" element={<RouteWrapper><BidEditPage /></RouteWrapper>} />
            <Route path="bid-submissions/mark-missed/:tenderId" element={<RouteWrapper><BidMarkMissedPage /></RouteWrapper>} />
            <Route path="bid-submissions/edit-missed/:id" element={<RouteWrapper><BidEditMissedPage /></RouteWrapper>} />
            <Route path="bid-submissions/view/:tenderId" element={<RouteWrapper><BidSubmissionViewPage /></RouteWrapper>} />
            <Route path="tq-management" element={<RouteWrapper><TqManagementListPage /></RouteWrapper>} />
            <Route path="tq-management/received/:tenderId" element={<RouteWrapper><TqReceivedPage /></RouteWrapper>} />
            <Route path="tq-management/edit-received/:id" element={<RouteWrapper><TqEditReceivedPage /></RouteWrapper>} />
            <Route path="tq-management/replied/:id" element={<RouteWrapper><TqRepliedPage /></RouteWrapper>} />
            <Route path="tq-management/edit-replied/:id" element={<RouteWrapper><TqEditRepliedPage /></RouteWrapper>} />
            <Route path="tq-management/missed/:id" element={<RouteWrapper><TqMissedPage /></RouteWrapper>} />
            <Route path="tq-management/edit-missed/:id" element={<RouteWrapper><TqEditMissedPage /></RouteWrapper>} />
            <Route path="tq-management/view/:id" element={<RouteWrapper><TqViewPage /></RouteWrapper>} />
            <Route path="tq-management/view-all/:tenderId" element={<RouteWrapper><TqViewAllPage /></RouteWrapper>} />
            <Route path="reverse-auctions" element={<RouteWrapper><Tendering_RAs /></RouteWrapper>} />
            <Route path="reverse-auctions/schedule/:tenderId" element={<RouteWrapper><Tendering_RA_Schedule /></RouteWrapper>} />
            <Route path="reverse-auctions/upload-result/:raId" element={<RouteWrapper><Tendering_RA_UploadResult /></RouteWrapper>} />
            <Route path="reverse-auctions/:tenderId" element={<RouteWrapper><Tendering_RA_Show /></RouteWrapper>} />
            <Route path="reverse-auctions/:id/edit" element={<RouteWrapper><Tendering_RA_Edit /></RouteWrapper>} />
            <Route path="results" element={<RouteWrapper><Tendering_Results /></RouteWrapper>} />
            <Route path="results/upload/:tenderId" element={<RouteWrapper><Tendering_Result_Upload /></RouteWrapper>} />
            <Route path="results/:tenderId" element={<RouteWrapper><Tendering_Result_Show /></RouteWrapper>} />
            <Route path="results/:id/edit" element={<RouteWrapper><Tendering_Result_Edit /></RouteWrapper>} />
        </Routes>
    );
}
