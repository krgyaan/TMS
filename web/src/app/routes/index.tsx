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
const Master_User = lazy(() => import("@/modules/master/user"));
const Master_User_Create = lazy(() => import("@/modules/master/user/create"));
const Master_User_Edit = lazy(() => import("@/modules/master/user/edit"));

const Master_Status = lazy(() => import("@/modules/master/status"));
const Master_Status_Create = lazy(() => import("@/modules/master/status/create"));
const Master_Status_Edit = lazy(() => import("@/modules/master/status/edit"));

const Master_Organization = lazy(() => import("@/modules/master/organization"));
const Master_Organization_Create = lazy(() => import("@/modules/master/organization/create"));
const Master_Organization_Edit = lazy(() => import("@/modules/master/organization/edit"));

const Master_Companies = lazy(() => import("@/modules/master/company"));

const Master_Item = lazy(() => import("@/modules/master/item"));
const Master_Item_Create = lazy(() => import("@/modules/master/item/create"));
const Master_Item_Edit = lazy(() => import("@/modules/master/item/edit"));

const Master_Vendor = lazy(() => import("@/modules/master/vendor"));
const Master_Vendor_Create = lazy(() => import("@/modules/master/vendor/create"));
const Master_Vendor_Edit = lazy(() => import("@/modules/master/vendor/edit"));

const Master_Website = lazy(() => import("@/modules/master/website"));
const Master_Website_Create = lazy(() => import("@/modules/master/website/create"));
const Master_Website_Edit = lazy(() => import("@/modules/master/website/edit"));

const Master_Location = lazy(() => import("@/modules/master/location"));
const Master_Location_Create = lazy(() => import("@/modules/master/location/create"));
const Master_Location_Edit = lazy(() => import("@/modules/master/location/edit"));

const Master_DocumentSubmitted = lazy(() => import("@/modules/master/document-submitted"));
const Master_DocumentSubmitted_Create = lazy(() => import("@/modules/master/document-submitted/create"));
const Master_DocumentSubmitted_Edit = lazy(() => import("@/modules/master/document-submitted/edit"));

const Master_ImprestCategory = lazy(() => import("@/modules/master/imprest-category"));
const Master_ImprestCategory_Create = lazy(() => import("@/modules/master/imprest-category/create"));
const Master_ImprestCategory_Edit = lazy(() => import("@/modules/master/imprest-category/edit"));

const Master_DocumentType = lazy(() => import("@/modules/master/document-type"));
const Master_DocumentType_Create = lazy(() => import("@/modules/master/document-type/create"));
const Master_DocumentType_Edit = lazy(() => import("@/modules/master/document-type/edit"));

const Master_FinancialYear = lazy(() => import("@/modules/master/financial-year"));
const Master_FinancialYear_Create = lazy(() => import("@/modules/master/financial-year/create"));
const Master_FinancialYear_Edit = lazy(() => import("@/modules/master/financial-year/edit"));

const Master_FollowupCategory = lazy(() => import("@/modules/master/followup-category"));
const Master_FollowupCategory_Create = lazy(() => import("@/modules/master/followup-category/create"));
const Master_FollowupCategory_Edit = lazy(() => import("@/modules/master/followup-category/edit"));

const Master_EMDResponsibility = lazy(() => import("@/modules/master/emd-responsibility"));
const Master_EMDResponsibility_Create = lazy(() => import("@/modules/master/emd-responsibility/create"));
const Master_EMDResponsibility_Edit = lazy(() => import("@/modules/master/emd-responsibility/edit"));

const Master_Designation = lazy(() => import("@/modules/master/designation"));
const Master_Designation_Create = lazy(() => import("@/modules/master/designation/create"));
const Master_Designation_Edit = lazy(() => import("@/modules/master/designation/edit"));

const Master_Role = lazy(() => import("@/modules/master/role"));
const Master_Role_Create = lazy(() => import("@/modules/master/role/create"));
const Master_Role_Edit = lazy(() => import("@/modules/master/role/edit"));

const Master_Industry = lazy(() => import("@/modules/master/industry"));
const Master_Industry_Create = lazy(() => import("@/modules/master/industry/create"));
const Master_Industry_Edit = lazy(() => import("@/modules/master/industry/edit"));

const Master_TqType = lazy(() => import("@/modules/master/tq-type"));
const Master_TqType_Create = lazy(() => import("@/modules/master/tq-type/create"));
const Master_TqType_Edit = lazy(() => import("@/modules/master/tq-type/edit"));

const Master_LoanParty = lazy(() => import("@/modules/master/loan-party"));
const Master_LoanParty_Create = lazy(() => import("@/modules/master/loan-party/create"));
const Master_LoanParty_Edit = lazy(() => import("@/modules/master/loan-party/edit"));

const Master_Project = lazy(() => import("@/modules/master/project"));
const Master_Project_Create = lazy(() => import("@/modules/master/project/create"));
const Master_Project_Edit = lazy(() => import("@/modules/master/project/edit"));

const Master_State = lazy(() => import("@/modules/master/state"));
const Master_State_Create = lazy(() => import("@/modules/master/state/create"));
const Master_State_Edit = lazy(() => import("@/modules/master/state/edit"));

const Master_Team = lazy(() => import("@/modules/master/team"));
const Master_Team_Create = lazy(() => import("@/modules/master/team/create"));
const Master_Team_Edit = lazy(() => import("@/modules/master/team/edit"));

const Master_LeadType = lazy(() => import("@/modules/master/lead-type"));
const Master_LeadType_Create = lazy(() => import("@/modules/master/lead-type/create"));
const Master_LeadType_Edit = lazy(() => import("@/modules/master/lead-type/edit"));

const Master_VendorAcc = lazy(() => import("@/modules/master/vendor-account"));
const Master_VendorAcc_Create = lazy(() => import("@/modules/master/vendor-account/create"));
const Master_VendorAcc_Edit = lazy(() => import("@/modules/master/vendor-account/edit"));

const Master_VendorGst = lazy(() => import("@/modules/master/vendor-gst"));
const Master_VendorGst_Create = lazy(() => import("@/modules/master/vendor-gst/create"));
const Master_VendorGst_Edit = lazy(() => import("@/modules/master/vendor-gst/edit"));

const Master_VendorFile = lazy(() => import("@/modules/master/vendor-file"));
const Master_VendorFile_Create = lazy(() => import("@/modules/master/vendor-file/create"));
const Master_VendorFile_Edit = lazy(() => import("@/modules/master/vendor-file/edit"));

const Master_VendorOrganization = lazy(() => import("@/modules/master/vendor-organization"));
const Master_VendorOrganization_Create = lazy(() => import("@/modules/master/vendor-organization/create"));
const Master_VendorOrganization_Edit = lazy(() => import("@/modules/master/vendor-organization/edit"));
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
                    <Route path={paths.master.users} element={<Suspense fallback={<Loading />}><Master_User /></Suspense>} />
                    <Route path={paths.master.users_create} element={<Suspense fallback={<Loading />}><Master_User_Create /></Suspense>} />
                    <Route path={paths.master.users_edit} element={<Suspense fallback={<Loading />}><Master_User_Edit /></Suspense>} />
                    <Route path={paths.master.statuses} element={<Suspense fallback={<Loading />}><Master_Status /></Suspense>} />
                    <Route path={paths.master.statuses_create} element={<Suspense fallback={<Loading />}><Master_Status_Create /></Suspense>} />
                    <Route path={paths.master.statuses_edit} element={<Suspense fallback={<Loading />}><Master_Status_Edit /></Suspense>} />
                    <Route path={paths.master.organizations} element={<Suspense fallback={<Loading />}><Master_Organization /></Suspense>} />
                    <Route path={paths.master.organizations_create} element={<Suspense fallback={<Loading />}><Master_Organization_Create /></Suspense>} />
                    <Route path={paths.master.organizations_edit} element={<Suspense fallback={<Loading />}><Master_Organization_Edit /></Suspense>} />
                    <Route path={paths.master.companies} element={<Suspense fallback={<Loading />}><Master_Companies /></Suspense>} />
                    <Route path={paths.master.items} element={<Suspense fallback={<Loading />}><Master_Item /></Suspense>} />
                    <Route path={paths.master.items_create} element={<Suspense fallback={<Loading />}><Master_Item_Create /></Suspense>} />
                    <Route path={paths.master.items_edit} element={<Suspense fallback={<Loading />}><Master_Item_Edit /></Suspense>} />
                    <Route path={paths.master.vendors} element={<Suspense fallback={<Loading />}><Master_Vendor /></Suspense>} />
                    <Route path={paths.master.vendors_create} element={<Suspense fallback={<Loading />}><Master_Vendor_Create /></Suspense>} />
                    <Route path={paths.master.vendors_edit} element={<Suspense fallback={<Loading />}><Master_Vendor_Edit /></Suspense>} />
                    <Route path={paths.master.websites} element={<Suspense fallback={<Loading />}><Master_Website /></Suspense>} />
                    <Route path={paths.master.websites_create} element={<Suspense fallback={<Loading />}><Master_Website_Create /></Suspense>} />
                    <Route path={paths.master.websites_edit} element={<Suspense fallback={<Loading />}><Master_Website_Edit /></Suspense>} />
                    <Route path={paths.master.locations} element={<Suspense fallback={<Loading />}><Master_Location /></Suspense>} />
                    <Route path={paths.master.locations_create} element={<Suspense fallback={<Loading />}><Master_Location_Create /></Suspense>} />
                    <Route path={paths.master.locations_edit} element={<Suspense fallback={<Loading />}><Master_Location_Edit /></Suspense>} />
                    <Route path={paths.master.documentSubmitted} element={<Suspense fallback={<Loading />}><Master_DocumentSubmitted /></Suspense>} />
                    <Route path={paths.master.documentSubmitted_create} element={<Suspense fallback={<Loading />}><Master_DocumentSubmitted_Create /></Suspense>} />
                    <Route path={paths.master.documentSubmitted_edit} element={<Suspense fallback={<Loading />}><Master_DocumentSubmitted_Edit /></Suspense>} />
                    <Route path={paths.master.imprestCategories} element={<Suspense fallback={<Loading />}><Master_ImprestCategory /></Suspense>} />
                    <Route path={paths.master.imprestCategories_create} element={<Suspense fallback={<Loading />}><Master_ImprestCategory_Create /></Suspense>} />
                    <Route path={paths.master.imprestCategories_edit} element={<Suspense fallback={<Loading />}><Master_ImprestCategory_Edit /></Suspense>} />
                    <Route path={paths.master.documentType} element={<Suspense fallback={<Loading />}><Master_DocumentType /></Suspense>} />
                    <Route path={paths.master.documentType_create} element={<Suspense fallback={<Loading />}><Master_DocumentType_Create /></Suspense>} />
                    <Route path={paths.master.documentType_edit} element={<Suspense fallback={<Loading />}><Master_DocumentType_Edit /></Suspense>} />
                    <Route path={paths.master.financialYears} element={<Suspense fallback={<Loading />}><Master_FinancialYear /></Suspense>} />
                    <Route path={paths.master.financialYears_create} element={<Suspense fallback={<Loading />}><Master_FinancialYear_Create /></Suspense>} />
                    <Route path={paths.master.financialYears_edit} element={<Suspense fallback={<Loading />}><Master_FinancialYear_Edit /></Suspense>} />
                    <Route path={paths.master.followupCategories} element={<Suspense fallback={<Loading />}><Master_FollowupCategory /></Suspense>} />
                    <Route path={paths.master.followupCategories_create} element={<Suspense fallback={<Loading />}><Master_FollowupCategory_Create /></Suspense>} />
                    <Route path={paths.master.followupCategories_edit} element={<Suspense fallback={<Loading />}><Master_FollowupCategory_Edit /></Suspense>} />
                    <Route path={paths.master.emdsResponsibilities} element={<Suspense fallback={<Loading />}><Master_EMDResponsibility /></Suspense>} />
                    <Route path={paths.master.emdsResponsibilities_create} element={<Suspense fallback={<Loading />}><Master_EMDResponsibility_Create /></Suspense>} />
                    <Route path={paths.master.emdsResponsibilities_edit} element={<Suspense fallback={<Loading />}><Master_EMDResponsibility_Edit /></Suspense>} />
                    <Route path={paths.master.designations} element={<Suspense fallback={<Loading />}><Master_Designation /></Suspense>} />
                    <Route path={paths.master.designations_create} element={<Suspense fallback={<Loading />}><Master_Designation_Create /></Suspense>} />
                    <Route path={paths.master.designations_edit} element={<Suspense fallback={<Loading />}><Master_Designation_Edit /></Suspense>} />
                    <Route path={paths.master.roles} element={<Suspense fallback={<Loading />}><Master_Role /></Suspense>} />
                    <Route path={paths.master.roles_create} element={<Suspense fallback={<Loading />}><Master_Role_Create /></Suspense>} />
                    <Route path={paths.master.roles_edit} element={<Suspense fallback={<Loading />}><Master_Role_Edit /></Suspense>} />
                    <Route path={paths.master.industries} element={<Suspense fallback={<Loading />}><Master_Industry /></Suspense>} />
                    <Route path={paths.master.industries_create} element={<Suspense fallback={<Loading />}><Master_Industry_Create /></Suspense>} />
                    <Route path={paths.master.industries_edit} element={<Suspense fallback={<Loading />}><Master_Industry_Edit /></Suspense>} />
                    <Route path={paths.master.tqTypes} element={<Suspense fallback={<Loading />}><Master_TqType /></Suspense>} />
                    <Route path={paths.master.tqTypes_create} element={<Suspense fallback={<Loading />}><Master_TqType_Create /></Suspense>} />
                    <Route path={paths.master.tqTypes_edit} element={<Suspense fallback={<Loading />}><Master_TqType_Edit /></Suspense>} />
                    <Route path={paths.master.loanParties} element={<Suspense fallback={<Loading />}><Master_LoanParty /></Suspense>} />
                    <Route path={paths.master.loanParties_create} element={<Suspense fallback={<Loading />}><Master_LoanParty_Create /></Suspense>} />
                    <Route path={paths.master.loanParties_edit} element={<Suspense fallback={<Loading />}><Master_LoanParty_Edit /></Suspense>} />
                    <Route path={paths.master.projects} element={<Suspense fallback={<Loading />}><Master_Project /></Suspense>} />
                    <Route path={paths.master.projects_create} element={<Suspense fallback={<Loading />}><Master_Project_Create /></Suspense>} />
                    <Route path={paths.master.projects_edit} element={<Suspense fallback={<Loading />}><Master_Project_Edit /></Suspense>} />
                    <Route path={paths.master.states} element={<Suspense fallback={<Loading />}><Master_State /></Suspense>} />
                    <Route path={paths.master.states_create} element={<Suspense fallback={<Loading />}><Master_State_Create /></Suspense>} />
                    <Route path={paths.master.states_edit} element={<Suspense fallback={<Loading />}><Master_State_Edit /></Suspense>} />
                    <Route path={paths.master.teams} element={<Suspense fallback={<Loading />}><Master_Team /></Suspense>} />
                    <Route path={paths.master.teams_create} element={<Suspense fallback={<Loading />}><Master_Team_Create /></Suspense>} />
                    <Route path={paths.master.teams_edit} element={<Suspense fallback={<Loading />}><Master_Team_Edit /></Suspense>} />
                    <Route path={paths.master.leadTypes} element={<Suspense fallback={<Loading />}><Master_LeadType /></Suspense>} />
                    <Route path={paths.master.leadTypes_create} element={<Suspense fallback={<Loading />}><Master_LeadType_Create /></Suspense>} />
                    <Route path={paths.master.leadTypes_edit} element={<Suspense fallback={<Loading />}><Master_LeadType_Edit /></Suspense>} />
                    <Route path={paths.master.vendorAccs} element={<Suspense fallback={<Loading />}><Master_VendorAcc /></Suspense>} />
                    <Route path={paths.master.vendorAccs_create} element={<Suspense fallback={<Loading />}><Master_VendorAcc_Create /></Suspense>} />
                    <Route path={paths.master.vendorAccs_edit} element={<Suspense fallback={<Loading />}><Master_VendorAcc_Edit /></Suspense>} />
                    <Route path={paths.master.vendorGsts} element={<Suspense fallback={<Loading />}><Master_VendorGst /></Suspense>} />
                    <Route path={paths.master.vendorGsts_create} element={<Suspense fallback={<Loading />}><Master_VendorGst_Create /></Suspense>} />
                    <Route path={paths.master.vendorGsts_edit} element={<Suspense fallback={<Loading />}><Master_VendorGst_Edit /></Suspense>} />
                    <Route path={paths.master.vendorFiles} element={<Suspense fallback={<Loading />}><Master_VendorFile /></Suspense>} />
                    <Route path={paths.master.vendorFiles_create} element={<Suspense fallback={<Loading />}><Master_VendorFile_Create /></Suspense>} />
                    <Route path={paths.master.vendorFiles_edit} element={<Suspense fallback={<Loading />}><Master_VendorFile_Edit /></Suspense>} />
                    <Route path={paths.master.vendorOrganizations} element={<Suspense fallback={<Loading />}><Master_VendorOrganization /></Suspense>} />
                    <Route path={paths.master.vendorOrganizations_create} element={<Suspense fallback={<Loading />}><Master_VendorOrganization_Create /></Suspense>} />
                    <Route path={paths.master.vendorOrganizations_edit} element={<Suspense fallback={<Loading />}><Master_VendorOrganization_Edit /></Suspense>} />

                    {/* Shared */}
                    <Route path={paths.shared.followUps} element={<Suspense fallback={<Loading />}><Shared_FollowUps /></Suspense>} />
                    <Route path={paths.shared.couriers} element={<Suspense fallback={<Loading />}><Shared_Courier /></Suspense>} />
                </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}
