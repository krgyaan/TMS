import { Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import PublicOnlyRoute from "@/components/PublicOnlyRoute";
import DashboardLayout from "@/app/layout/DashboardLayout";
import Login from "@/modules/auth/login";
import Dashboard from "@/modules/dashboard";
import { paths } from "@/app/routes/paths";


const Auth_GoogleCallback = lazy(() => import("@/modules/auth/google-callback"));
// Integrations
const Integrations_Google = lazy(() => import("@/modules/integrations/google"));
const Integrations_GoogleStatus = lazy(() => import("@/modules/integrations/google/status"));

// Tendering
const Tendering_Tenders = lazy(() => import("@/modules/tendering/tenders"));
const Tender_Create = lazy(() => import("@/modules/tendering/tenders/create"));
const Tendering_InfoSheet = lazy(() => import("@/modules/tendering/info-sheet"));
const Tendering_TenderApproval = lazy(() => import("@/modules/tendering/tenders"));
const Tendering_PhysDocs = lazy(() => import("@/modules/tendering/phydocs"));
const Tendering_RFQs = lazy(() => import("@/modules/tendering/rfqs"));
const Tendering_EMD = lazy(() => import("@/modules/tendering/emds-tenderfees"));
const Tendering_DocChecklist = lazy(() => import("@/modules/tendering/checklists"));
const Tendering_CostingSheets = lazy(() => import("@/modules/tendering/costing-sheets"));
const Tendering_CostingApproval = lazy(() => import("@/modules/tendering/costing-sheets"));
const Tendering_BidSubmissions = lazy(() => import("@/modules/tendering/bid-submissions"));
const Tendering_TQs = lazy(() => import("@/modules/tendering/tqs"));
const Tendering_RAs = lazy(() => import("@/modules/tendering/ras"));
const Tendering_Results = lazy(() => import("@/modules/tendering/results"));

// Operations
const Operations_WorkOrder = lazy(() => import("@/modules/operations/work-order"));
const Operations_KickOff = lazy(() => import("@/modules/operations/kick-off"));
const Operations_ContractAgreement = lazy(() => import("@/modules/operations/contract-agreement"));

// Services
const Services_Customer = lazy(() => import("@/modules/services/customer"));
const Services_Conference = lazy(() => import("@/modules/services/conference"));
const Services_Visit = lazy(() => import("@/modules/services/visit"));
const Services_AMC = lazy(() => import("@/modules/services/amc"));

// BI Dashboard
const BI_DemandDraft = lazy(() => import("@/modules/bi-dashboard/demand-draft"));
const BI_FDR = lazy(() => import("@/modules/bi-dashboard/fdr"));
const BI_Cheque = lazy(() => import("@/modules/bi-dashboard/cheque"));
const BI_BankGuarantee = lazy(() => import("@/modules/bi-dashboard/bank-guarantee"));
const BI_BankTransfer = lazy(() => import("@/modules/bi-dashboard/bank-tranfer"));
const BI_PayOnPortal = lazy(() => import("@/modules/bi-dashboard/pay-on-portal"));

// Accounts
const Accounts_Imprests = lazy(() => import("@/modules/accounts/imprests"));
const Accounts_FinancialDocs = lazy(() => import("@/modules/accounts/financial-docs"));
const Accounts_LoanAdvances = lazy(() => import("@/modules/accounts/loan-advances"));
const Accounts_TaskChecklists = lazy(() => import("@/modules/accounts/task-checlkists"));
const Accounts_GSTChecklists = lazy(() => import("@/modules/accounts/gst-checklists"));
const Accounts_FixedExpenses = lazy(() => import("@/modules/accounts/fixed-expenses"));

// CRM
const CRM_Leads = lazy(() => import("@/modules/crm/leads"));
const CRM_Enquiries = lazy(() => import("@/modules/crm/enquiries"));
const CRM_Costings = lazy(() => import("@/modules/crm/costings"));
const CRM_Quotations = lazy(() => import("@/modules/crm/quotations"));

// Performance (files, not folders)
const Perf_TenderExecutive = lazy(() => import("@/modules/performance/tender-executive"));
const Perf_TeamLeader = lazy(() => import("@/modules/performance/team-leader"));
const Perf_OperationTeam = lazy(() => import("@/modules/performance/operation-team"));
const Perf_AccountTeam = lazy(() => import("@/modules/performance/account-team"));
const Perf_OEM = lazy(() => import("@/modules/performance/oem-dashboard"));
const Perf_Business = lazy(() => import("@/modules/performance/business-dashboard"));
const Perf_Customer = lazy(() => import("@/modules/performance/customer-dashboard"));
const Perf_Location = lazy(() => import("@/modules/performance/location-dashboard"));

// Master (files, not folders)
const Master_Users = lazy(() => import("@/modules/master/user/users"));
const Master_Users_Create = lazy(() => import("@/modules/master/user/create"));
const Master_Users_Edit = lazy(() => import("@/modules/master/user/create"));
const Master_Statuses = lazy(() => import("@/modules/master/statuses"));
const Master_Statuses_Create = lazy(() => import("@/modules/master/statuses"));
const Master_Statuses_Edit = lazy(() => import("@/modules/master/statuses"));
const Master_Organizations = lazy(() => import("@/modules/master/organizations"));
const Master_Organizations_Create = lazy(() => import("@/modules/master/organizations"));
const Master_Organizations_Edit = lazy(() => import("@/modules/master/organizations"));
const Master_Companies = lazy(() => import("@/modules/master/companies"));
const Master_Items = lazy(() => import("@/modules/master/items"));
const Master_Items_Create = lazy(() => import("@/modules/master/items"));
const Master_Items_Edit = lazy(() => import("@/modules/master/items"));
const Master_Vendors = lazy(() => import("@/modules/master/vendors"));
const Master_Vendors_Create = lazy(() => import("@/modules/master/vendors"));
const Master_Vendors_Edit = lazy(() => import("@/modules/master/vendors"));
const Master_Websites = lazy(() => import("@/modules/master/websites"));
const Master_Websites_Create = lazy(() => import("@/modules/master/websites"));
const Master_Websites_Edit = lazy(() => import("@/modules/master/websites"));
const Master_Locations = lazy(() => import("@/modules/master/locations"));
const Master_Locations_Create = lazy(() => import("@/modules/master/locations"));
const Master_Locations_Edit = lazy(() => import("@/modules/master/locations"));
const Master_DocumentSubmitted = lazy(() => import("@/modules/master/document-submitted"));
const Master_DocumentSubmitted_Create = lazy(() => import("@/modules/master/document-submitted"));
const Master_DocumentSubmitted_Edit = lazy(() => import("@/modules/master/document-submitted"));
const Master_ImprestCategory = lazy(() => import("@/modules/master/imprest-category"));
const Master_ImprestCategory_Create = lazy(() => import("@/modules/master/imprest-category"));
const Master_ImprestCategory_Edit = lazy(() => import("@/modules/master/imprest-category"));
const Master_DocumentType = lazy(() => import("@/modules/master/document-type"));
const Master_DocumentType_Create = lazy(() => import("@/modules/master/document-type"));
const Master_DocumentType_Edit = lazy(() => import("@/modules/master/document-type"));
const Master_FinancialYear = lazy(() => import("@/modules/master/financial-year"));
const Master_FinancialYear_Create = lazy(() => import("@/modules/master/financial-year"));
const Master_FinancialYear_Edit = lazy(() => import("@/modules/master/financial-year"));
const Master_FollowupCategories = lazy(() => import("@/modules/master/followup-categories"));
const Master_FollowupCategories_Create = lazy(() => import("@/modules/master/followup-categories"));
const Master_FollowupCategories_Edit = lazy(() => import("@/modules/master/followup-categories"));
const Master_EMDResponsibilities = lazy(() => import("@/modules/master/emds-responsibilities"));
const Master_EMDResponsibilities_Create = lazy(() => import("@/modules/master/emds-responsibilities"));
const Master_EMDResponsibilities_Edit = lazy(() => import("@/modules/master/emds-responsibilities"));

// Shared
const Shared_FollowUps = lazy(() => import("@/modules/shared/follow-ups"));
const Shared_Courier = lazy(() => import("@/modules/shared/courier"));

const Loading = () => <div style={{ padding: 12 }}>Loading...</div>;

export default function AppRoutes() {
    return (
        <Routes>
            <Route path={paths.auth.googleCallback} element={<Suspense fallback={<Loading />}><Auth_GoogleCallback /></Suspense>} />
            <Route element={<PublicOnlyRoute />}>
                <Route path="/login" element={<Login />} />
            </Route>
            <Route path={paths.integrations.googleStatus} element={<Suspense fallback={<Loading />}><Integrations_GoogleStatus /></Suspense>} />

            <Route element={<ProtectedRoute />}>
                <Route element={<DashboardLayout />}>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/dashboard" element={<Navigate to="/" replace />} />
                    {/* Integrations */}
                    <Route path={paths.integrations.google} element={<Suspense fallback={<Loading />}><Integrations_Google /></Suspense>} />
                    {/* Tendering */}
                    <Route path={paths.tendering.tenders} element={<Suspense fallback={<Loading />}><Tendering_Tenders /></Suspense>} />
                    <Route path={paths.tendering.tenderCreate} element={<Suspense fallback={<Loading />}><Tender_Create /></Suspense>} />
                    <Route path={paths.tendering.infoSheet} element={<Suspense fallback={<Loading />}><Tendering_InfoSheet /></Suspense>} />
                    <Route path={paths.tendering.tenderApproval} element={<Suspense fallback={<Loading />}><Tendering_TenderApproval /></Suspense>} />
                    <Route path={paths.tendering.phydocs} element={<Suspense fallback={<Loading />}><Tendering_PhysDocs /></Suspense>} />
                    <Route path={paths.tendering.rfqs} element={<Suspense fallback={<Loading />}><Tendering_RFQs /></Suspense>} />
                    <Route path={paths.tendering.emdsTenderFees} element={<Suspense fallback={<Loading />}><Tendering_EMD /></Suspense>} />
                    <Route path={paths.tendering.checklists} element={<Suspense fallback={<Loading />}><Tendering_DocChecklist /></Suspense>} />
                    <Route path={paths.tendering.costingSheets} element={<Suspense fallback={<Loading />}><Tendering_CostingSheets /></Suspense>} />
                    <Route path={paths.tendering.costingApproval} element={<Suspense fallback={<Loading />}><Tendering_CostingApproval /></Suspense>} />
                    <Route path={paths.tendering.bidSubmissions} element={<Suspense fallback={<Loading />}><Tendering_BidSubmissions /></Suspense>} />
                    <Route path={paths.tendering.tqs} element={<Suspense fallback={<Loading />}><Tendering_TQs /></Suspense>} />
                    <Route path={paths.tendering.ras} element={<Suspense fallback={<Loading />}><Tendering_RAs /></Suspense>} />
                    <Route path={paths.tendering.results} element={<Suspense fallback={<Loading />}><Tendering_Results /></Suspense>} />

                    {/* Operations */}
                    <Route path={paths.operations.workOrder} element={<Suspense fallback={<Loading />}><Operations_WorkOrder /></Suspense>} />
                    <Route path={paths.operations.kickOff} element={<Suspense fallback={<Loading />}><Operations_KickOff /></Suspense>} />
                    <Route path={paths.operations.contractAgreement} element={<Suspense fallback={<Loading />}><Operations_ContractAgreement /></Suspense>} />

                    {/* Services */}
                    <Route path={paths.services.customer} element={<Suspense fallback={<Loading />}><Services_Customer /></Suspense>} />
                    <Route path={paths.services.conference} element={<Suspense fallback={<Loading />}><Services_Conference /></Suspense>} />
                    <Route path={paths.services.visit} element={<Suspense fallback={<Loading />}><Services_Visit /></Suspense>} />
                    <Route path={paths.services.amc} element={<Suspense fallback={<Loading />}><Services_AMC /></Suspense>} />

                    {/* BI Dashboard */}
                    <Route path={paths.bi.demandDraft} element={<Suspense fallback={<Loading />}><BI_DemandDraft /></Suspense>} />
                    <Route path={paths.bi.fdr} element={<Suspense fallback={<Loading />}><BI_FDR /></Suspense>} />
                    <Route path={paths.bi.cheque} element={<Suspense fallback={<Loading />}><BI_Cheque /></Suspense>} />
                    <Route path={paths.bi.bankGuarantee} element={<Suspense fallback={<Loading />}><BI_BankGuarantee /></Suspense>} />
                    <Route path={paths.bi.bankTransfer} element={<Suspense fallback={<Loading />}><BI_BankTransfer /></Suspense>} />
                    <Route path={paths.bi.payOnPortal} element={<Suspense fallback={<Loading />}><BI_PayOnPortal /></Suspense>} />

                    {/* Accounts */}
                    <Route path={paths.accounts.imprests} element={<Suspense fallback={<Loading />}><Accounts_Imprests /></Suspense>} />
                    <Route path={paths.accounts.financialDocs} element={<Suspense fallback={<Loading />}><Accounts_FinancialDocs /></Suspense>} />
                    <Route path={paths.accounts.loanAdvances} element={<Suspense fallback={<Loading />}><Accounts_LoanAdvances /></Suspense>} />
                    <Route path={paths.accounts.accountChecklists} element={<Suspense fallback={<Loading />}><Accounts_TaskChecklists /></Suspense>} />
                    <Route path={paths.accounts.gstChecklists} element={<Suspense fallback={<Loading />}><Accounts_GSTChecklists /></Suspense>} />
                    <Route path={paths.accounts.fixedExpenses} element={<Suspense fallback={<Loading />}><Accounts_FixedExpenses /></Suspense>} />

                    {/* CRM */}
                    <Route path={paths.crm.leads} element={<Suspense fallback={<Loading />}><CRM_Leads /></Suspense>} />
                    <Route path={paths.crm.enquiries} element={<Suspense fallback={<Loading />}><CRM_Enquiries /></Suspense>} />
                    <Route path={paths.crm.costings} element={<Suspense fallback={<Loading />}><CRM_Costings /></Suspense>} />
                    <Route path={paths.crm.quotations} element={<Suspense fallback={<Loading />}><CRM_Quotations /></Suspense>} />

                    {/* Performance */}
                    <Route path={paths.performance.tenderExecutive} element={<Suspense fallback={<Loading />}><Perf_TenderExecutive /></Suspense>} />
                    <Route path={paths.performance.teamLeader} element={<Suspense fallback={<Loading />}><Perf_TeamLeader /></Suspense>} />
                    <Route path={paths.performance.operationTeam} element={<Suspense fallback={<Loading />}><Perf_OperationTeam /></Suspense>} />
                    <Route path={paths.performance.accountTeam} element={<Suspense fallback={<Loading />}><Perf_AccountTeam /></Suspense>} />
                    <Route path={paths.performance.oemDashboard} element={<Suspense fallback={<Loading />}><Perf_OEM /></Suspense>} />
                    <Route path={paths.performance.businessDashboard} element={<Suspense fallback={<Loading />}><Perf_Business /></Suspense>} />
                    <Route path={paths.performance.customerDashboard} element={<Suspense fallback={<Loading />}><Perf_Customer /></Suspense>} />
                    <Route path={paths.performance.locationDashboard} element={<Suspense fallback={<Loading />}><Perf_Location /></Suspense>} />

                    {/* Master */}
                    <Route path={paths.master.users} element={<Suspense fallback={<Loading />}><Master_Users /></Suspense>} />
                    <Route path={paths.master.users_create} element={<Suspense fallback={<Loading />}><Master_Users_Create /></Suspense>} />
                    <Route path={paths.master.users_edit} element={<Suspense fallback={<Loading />}><Master_Users_Edit /></Suspense>} />
                    <Route path={paths.master.statuses} element={<Suspense fallback={<Loading />}><Master_Statuses /></Suspense>} />
                    <Route path={paths.master.statuses_create} element={<Suspense fallback={<Loading />}><Master_Statuses_Create /></Suspense>} />
                    <Route path={paths.master.statuses_edit} element={<Suspense fallback={<Loading />}><Master_Statuses_Edit /></Suspense>} />
                    <Route path={paths.master.organizations} element={<Suspense fallback={<Loading />}><Master_Organizations /></Suspense>} />
                    <Route path={paths.master.organizations_create} element={<Suspense fallback={<Loading />}><Master_Organizations_Create /></Suspense>} />
                    <Route path={paths.master.organizations_edit} element={<Suspense fallback={<Loading />}><Master_Organizations_Edit /></Suspense>} />
                    <Route path={paths.master.companies} element={<Suspense fallback={<Loading />}><Master_Companies /></Suspense>} />
                    <Route path={paths.master.items} element={<Suspense fallback={<Loading />}><Master_Items /></Suspense>} />
                    <Route path={paths.master.items_create} element={<Suspense fallback={<Loading />}><Master_Items_Create /></Suspense>} />
                    <Route path={paths.master.items_edit} element={<Suspense fallback={<Loading />}><Master_Items_Edit /></Suspense>} />
                    <Route path={paths.master.vendors} element={<Suspense fallback={<Loading />}><Master_Vendors /></Suspense>} />
                    <Route path={paths.master.vendors_create} element={<Suspense fallback={<Loading />}><Master_Vendors_Create /></Suspense>} />
                    <Route path={paths.master.vendors_edit} element={<Suspense fallback={<Loading />}><Master_Vendors_Edit /></Suspense>} />
                    <Route path={paths.master.websites} element={<Suspense fallback={<Loading />}><Master_Websites /></Suspense>} />
                    <Route path={paths.master.websites_create} element={<Suspense fallback={<Loading />}><Master_Websites_Create /></Suspense>} />
                    <Route path={paths.master.websites_edit} element={<Suspense fallback={<Loading />}><Master_Websites_Edit /></Suspense>} />
                    <Route path={paths.master.locations} element={<Suspense fallback={<Loading />}><Master_Locations /></Suspense>} />
                    <Route path={paths.master.locations_create} element={<Suspense fallback={<Loading />}><Master_Locations_Create /></Suspense>} />
                    <Route path={paths.master.locations_edit} element={<Suspense fallback={<Loading />}><Master_Locations_Edit /></Suspense>} />
                    <Route path={paths.master.documentSubmitted} element={<Suspense fallback={<Loading />}><Master_DocumentSubmitted /></Suspense>} />
                    <Route path={paths.master.documentSubmitted_create} element={<Suspense fallback={<Loading />}><Master_DocumentSubmitted_Create /></Suspense>} />
                    <Route path={paths.master.documentSubmitted_edit} element={<Suspense fallback={<Loading />}><Master_DocumentSubmitted_Edit /></Suspense>} />
                    <Route path={paths.master.imprestCategory} element={<Suspense fallback={<Loading />}><Master_ImprestCategory /></Suspense>} />
                    <Route path={paths.master.imprestCategory_create} element={<Suspense fallback={<Loading />}><Master_ImprestCategory_Create /></Suspense>} />
                    <Route path={paths.master.imprestCategory_edit} element={<Suspense fallback={<Loading />}><Master_ImprestCategory_Edit /></Suspense>} />
                    <Route path={paths.master.documentType} element={<Suspense fallback={<Loading />}><Master_DocumentType /></Suspense>} />
                    <Route path={paths.master.documentType_create} element={<Suspense fallback={<Loading />}><Master_DocumentType_Create /></Suspense>} />
                    <Route path={paths.master.documentType_edit} element={<Suspense fallback={<Loading />}><Master_DocumentType_Edit /></Suspense>} />
                    <Route path={paths.master.financialYear} element={<Suspense fallback={<Loading />}><Master_FinancialYear /></Suspense>} />
                    <Route path={paths.master.financialYear_create} element={<Suspense fallback={<Loading />}><Master_FinancialYear_Create /></Suspense>} />
                    <Route path={paths.master.financialYear_edit} element={<Suspense fallback={<Loading />}><Master_FinancialYear_Edit /></Suspense>} />
                    <Route path={paths.master.followupCategories} element={<Suspense fallback={<Loading />}><Master_FollowupCategories /></Suspense>} />
                    <Route path={paths.master.followupCategories_create} element={<Suspense fallback={<Loading />}><Master_FollowupCategories_Create /></Suspense>} />
                    <Route path={paths.master.followupCategories_edit} element={<Suspense fallback={<Loading />}><Master_FollowupCategories_Edit /></Suspense>} />
                    <Route path={paths.master.emdsResponsibilities} element={<Suspense fallback={<Loading />}><Master_EMDResponsibilities /></Suspense>} />
                    <Route path={paths.master.emdsResponsibilities_create} element={<Suspense fallback={<Loading />}><Master_EMDResponsibilities_Create /></Suspense>} />
                    <Route path={paths.master.emdsResponsibilities_edit} element={<Suspense fallback={<Loading />}><Master_EMDResponsibilities_Edit /></Suspense>} />

                    {/* Shared */}
                    <Route path={paths.shared.followUps} element={<Suspense fallback={<Loading />}><Shared_FollowUps /></Suspense>} />
                    <Route path={paths.shared.couriers} element={<Suspense fallback={<Loading />}><Shared_Courier /></Suspense>} />
                </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}
