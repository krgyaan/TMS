import { lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { RouteWrapper } from '../components/RouteWrapper';

// ==================== LAZY IMPORTS ====================
// Users
const Master_User = lazy(() => import('@/modules/master/user'));
const Master_User_Create = lazy(() => import('@/modules/master/user/create'));
const Master_User_Edit = lazy(() => import('@/modules/master/user/edit'));

// Statuses
const Master_Status = lazy(() => import('@/modules/master/status'));
const Master_Status_Create = lazy(() => import('@/modules/master/status/create'));
const Master_Status_Edit = lazy(() => import('@/modules/master/status/edit'));

// Organizations
const Master_Organization = lazy(() => import('@/modules/master/organization'));
const Master_Organization_Create = lazy(() => import('@/modules/master/organization/create'));
const Master_Organization_Edit = lazy(() => import('@/modules/master/organization/edit'));

// Companies
const Master_Companies = lazy(() => import('@/modules/master/company'));

// Items
const Master_Item = lazy(() => import('@/modules/master/item'));
const Master_Item_Create = lazy(() => import('@/modules/master/item/create'));
const Master_Item_Edit = lazy(() => import('@/modules/master/item/edit'));

// Vendors
const Master_Vendor = lazy(() => import('@/modules/master/vendor'));
const Master_Vendor_Create = lazy(() => import('@/modules/master/vendor/create'));
const Master_Vendor_Edit = lazy(() => import('@/modules/master/vendor/edit'));

// Websites
const Master_Website = lazy(() => import('@/modules/master/website'));
const Master_Website_Create = lazy(() => import('@/modules/master/website/create'));
const Master_Website_Edit = lazy(() => import('@/modules/master/website/edit'));

// Locations
const Master_Location = lazy(() => import('@/modules/master/location'));
const Master_Location_Create = lazy(() => import('@/modules/master/location/create'));
const Master_Location_Edit = lazy(() => import('@/modules/master/location/edit'));

// Document Submitted
const Master_DocumentSubmitted = lazy(() => import('@/modules/master/document-submitted'));
const Master_DocumentSubmitted_Create = lazy(() => import('@/modules/master/document-submitted/create'));
const Master_DocumentSubmitted_Edit = lazy(() => import('@/modules/master/document-submitted/edit'));

// Imprest Categories
const Master_ImprestCategory = lazy(() => import('@/modules/master/imprest-category'));
const Master_ImprestCategory_Create = lazy(() => import('@/modules/master/imprest-category/create'));
const Master_ImprestCategory_Edit = lazy(() => import('@/modules/master/imprest-category/edit'));

// Document Type
const Master_DocumentType = lazy(() => import('@/modules/master/document-type'));
const Master_DocumentType_Create = lazy(() => import('@/modules/master/document-type/create'));
const Master_DocumentType_Edit = lazy(() => import('@/modules/master/document-type/edit'));

// Financial Years
const Master_FinancialYear = lazy(() => import('@/modules/master/financial-year'));
const Master_FinancialYear_Create = lazy(() => import('@/modules/master/financial-year/create'));
const Master_FinancialYear_Edit = lazy(() => import('@/modules/master/financial-year/edit'));

// Followup Categories
const Master_FollowupCategory = lazy(() => import('@/modules/master/followup-category'));
const Master_FollowupCategory_Create = lazy(() => import('@/modules/master/followup-category/create'));
const Master_FollowupCategory_Edit = lazy(() => import('@/modules/master/followup-category/edit'));

// EMD Responsibilities
const Master_EMDResponsibility = lazy(() => import('@/modules/master/emd-responsibility'));
const Master_EMDResponsibility_Create = lazy(() => import('@/modules/master/emd-responsibility/create'));
const Master_EMDResponsibility_Edit = lazy(() => import('@/modules/master/emd-responsibility/edit'));

// Designations
const Master_Designation = lazy(() => import('@/modules/master/designation'));

// Roles
const Master_Role = lazy(() => import('@/modules/master/role'));

// Permissions
const Master_Permissions = lazy(() => import('@/modules/master/permissions'));

// Industries
const Master_Industry = lazy(() => import('@/modules/master/industry'));
const Master_Industry_Create = lazy(() => import('@/modules/master/industry/create'));
const Master_Industry_Edit = lazy(() => import('@/modules/master/industry/edit'));

// TQ Types
const Master_TqType = lazy(() => import('@/modules/master/tq-type'));
const Master_TqType_Create = lazy(() => import('@/modules/master/tq-type/create'));
const Master_TqType_Edit = lazy(() => import('@/modules/master/tq-type/edit'));

// Loan Parties
const Master_LoanParty = lazy(() => import('@/modules/master/loan-party'));
const Master_LoanParty_Create = lazy(() => import('@/modules/master/loan-party/create'));
const Master_LoanParty_Edit = lazy(() => import('@/modules/master/loan-party/edit'));

// Projects
const Master_Project = lazy(() => import('@/modules/master/project'));
const Master_Project_Create = lazy(() => import('@/modules/master/project/create'));
const Master_Project_Edit = lazy(() => import('@/modules/master/project/edit'));

// States
const Master_State = lazy(() => import('@/modules/master/state'));
const Master_State_Create = lazy(() => import('@/modules/master/state/create'));
const Master_State_Edit = lazy(() => import('@/modules/master/state/edit'));

// Teams
const Master_Team = lazy(() => import('@/modules/master/team'));

// Lead Types
const Master_LeadType = lazy(() => import('@/modules/master/lead-type'));
const Master_LeadType_Create = lazy(() => import('@/modules/master/lead-type/create'));
const Master_LeadType_Edit = lazy(() => import('@/modules/master/lead-type/edit'));

// Vendor Accounts
const Master_VendorAcc = lazy(() => import('@/modules/master/vendor-account'));
const Master_VendorAcc_Create = lazy(() => import('@/modules/master/vendor-account/create'));
const Master_VendorAcc_Edit = lazy(() => import('@/modules/master/vendor-account/edit'));

// Vendor GSTs
const Master_VendorGst = lazy(() => import('@/modules/master/vendor-gst'));
const Master_VendorGst_Create = lazy(() => import('@/modules/master/vendor-gst/create'));
const Master_VendorGst_Edit = lazy(() => import('@/modules/master/vendor-gst/edit'));

// Vendor Files
const Master_VendorFile = lazy(() => import('@/modules/master/vendor-file'));
const Master_VendorFile_Create = lazy(() => import('@/modules/master/vendor-file/create'));
const Master_VendorFile_Edit = lazy(() => import('@/modules/master/vendor-file/edit'));

// Vendor Organizations
const Master_VendorOrganization = lazy(() => import('@/modules/master/vendor-organization'));
const Master_VendorOrganization_Create = lazy(() => import('@/modules/master/vendor-organization/create'));
const Master_VendorOrganization_Edit = lazy(() => import('@/modules/master/vendor-organization/edit'));

// ==================== ROUTES ====================
export default function MasterRoutes() {
    return (
        <Routes>
            {/* Users */}
            <Route path="users">
                <Route index element={<RouteWrapper><Master_User /></RouteWrapper>} />
                <Route path="create" element={<RouteWrapper><Master_User_Create /></RouteWrapper>} />
                <Route path=":id/edit" element={<RouteWrapper><Master_User_Edit /></RouteWrapper>} />
            </Route>

            {/* Statuses */}
            <Route path="statuses">
                <Route index element={<RouteWrapper><Master_Status /></RouteWrapper>} />
                <Route path="create" element={<RouteWrapper><Master_Status_Create /></RouteWrapper>} />
                <Route path=":id/edit" element={<RouteWrapper><Master_Status_Edit /></RouteWrapper>} />
            </Route>

            {/* Organizations */}
            <Route path="organizations">
                <Route index element={<RouteWrapper><Master_Organization /></RouteWrapper>} />
                <Route path="create" element={<RouteWrapper><Master_Organization_Create /></RouteWrapper>} />
                <Route path=":id/edit" element={<RouteWrapper><Master_Organization_Edit /></RouteWrapper>} />
            </Route>

            {/* Companies */}
            <Route path="companies" element={<RouteWrapper><Master_Companies /></RouteWrapper>} />

            {/* Items */}
            <Route path="items">
                <Route index element={<RouteWrapper><Master_Item /></RouteWrapper>} />
                <Route path="create" element={<RouteWrapper><Master_Item_Create /></RouteWrapper>} />
                <Route path=":id/edit" element={<RouteWrapper><Master_Item_Edit /></RouteWrapper>} />
            </Route>

            {/* Vendors */}
            <Route path="vendors">
                <Route index element={<RouteWrapper><Master_Vendor /></RouteWrapper>} />
                <Route path="create" element={<RouteWrapper><Master_Vendor_Create /></RouteWrapper>} />
                <Route path=":id/edit" element={<RouteWrapper><Master_Vendor_Edit /></RouteWrapper>} />
            </Route>

            {/* Websites */}
            <Route path="websites">
                <Route index element={<RouteWrapper><Master_Website /></RouteWrapper>} />
                <Route path="create" element={<RouteWrapper><Master_Website_Create /></RouteWrapper>} />
                <Route path=":id/edit" element={<RouteWrapper><Master_Website_Edit /></RouteWrapper>} />
            </Route>

            {/* Locations */}
            <Route path="locations">
                <Route index element={<RouteWrapper><Master_Location /></RouteWrapper>} />
                <Route path="create" element={<RouteWrapper><Master_Location_Create /></RouteWrapper>} />
                <Route path=":id/edit" element={<RouteWrapper><Master_Location_Edit /></RouteWrapper>} />
            </Route>

            {/* Document Submitted */}
            <Route path="document-submitted">
                <Route index element={<RouteWrapper><Master_DocumentSubmitted /></RouteWrapper>} />
                <Route path="create" element={<RouteWrapper><Master_DocumentSubmitted_Create /></RouteWrapper>} />
                <Route path=":id/edit" element={<RouteWrapper><Master_DocumentSubmitted_Edit /></RouteWrapper>} />
            </Route>

            {/* Imprest Categories */}
            <Route path="imprest-categories">
                <Route index element={<RouteWrapper><Master_ImprestCategory /></RouteWrapper>} />
                <Route path="create" element={<RouteWrapper><Master_ImprestCategory_Create /></RouteWrapper>} />
                <Route path=":id/edit" element={<RouteWrapper><Master_ImprestCategory_Edit /></RouteWrapper>} />
            </Route>

            {/* Document Type */}
            <Route path="document-type">
                <Route index element={<RouteWrapper><Master_DocumentType /></RouteWrapper>} />
                <Route path="create" element={<RouteWrapper><Master_DocumentType_Create /></RouteWrapper>} />
                <Route path=":id/edit" element={<RouteWrapper><Master_DocumentType_Edit /></RouteWrapper>} />
            </Route>

            {/* Financial Years */}
            <Route path="financial-years">
                <Route index element={<RouteWrapper><Master_FinancialYear /></RouteWrapper>} />
                <Route path="create" element={<RouteWrapper><Master_FinancialYear_Create /></RouteWrapper>} />
                <Route path=":id/edit" element={<RouteWrapper><Master_FinancialYear_Edit /></RouteWrapper>} />
            </Route>

            {/* Followup Categories */}
            <Route path="followup-categories">
                <Route index element={<RouteWrapper><Master_FollowupCategory /></RouteWrapper>} />
                <Route path="create" element={<RouteWrapper><Master_FollowupCategory_Create /></RouteWrapper>} />
                <Route path=":id/edit" element={<RouteWrapper><Master_FollowupCategory_Edit /></RouteWrapper>} />
            </Route>

            {/* EMD Responsibilities */}
            <Route path="emds-responsibilities">
                <Route index element={<RouteWrapper><Master_EMDResponsibility /></RouteWrapper>} />
                <Route path="create" element={<RouteWrapper><Master_EMDResponsibility_Create /></RouteWrapper>} />
                <Route path=":id/edit" element={<RouteWrapper><Master_EMDResponsibility_Edit /></RouteWrapper>} />
            </Route>

            {/* Designations */}
            <Route path="designations" element={<RouteWrapper><Master_Designation /></RouteWrapper>} />

            {/* Roles */}
            <Route path="roles" element={<RouteWrapper><Master_Role /></RouteWrapper>} />

            {/* Permissions */}
            <Route path="permissions" element={<RouteWrapper><Master_Permissions /></RouteWrapper>} />

            {/* Industries */}
            <Route path="industries">
                <Route index element={<RouteWrapper><Master_Industry /></RouteWrapper>} />
                <Route path="create" element={<RouteWrapper><Master_Industry_Create /></RouteWrapper>} />
                <Route path=":id/edit" element={<RouteWrapper><Master_Industry_Edit /></RouteWrapper>} />
            </Route>

            {/* TQ Types */}
            <Route path="tq-types">
                <Route index element={<RouteWrapper><Master_TqType /></RouteWrapper>} />
                <Route path="create" element={<RouteWrapper><Master_TqType_Create /></RouteWrapper>} />
                <Route path=":id/edit" element={<RouteWrapper><Master_TqType_Edit /></RouteWrapper>} />
            </Route>

            {/* Loan Parties */}
            <Route path="loan-parties">
                <Route index element={<RouteWrapper><Master_LoanParty /></RouteWrapper>} />
                <Route path="create" element={<RouteWrapper><Master_LoanParty_Create /></RouteWrapper>} />
                <Route path=":id/edit" element={<RouteWrapper><Master_LoanParty_Edit /></RouteWrapper>} />
            </Route>

            {/* Projects */}
            <Route path="projects">
                <Route index element={<RouteWrapper><Master_Project /></RouteWrapper>} />
                <Route path="create" element={<RouteWrapper><Master_Project_Create /></RouteWrapper>} />
                <Route path=":id/edit" element={<RouteWrapper><Master_Project_Edit /></RouteWrapper>} />
            </Route>

            {/* States */}
            <Route path="states">
                <Route index element={<RouteWrapper><Master_State /></RouteWrapper>} />
                <Route path="create" element={<RouteWrapper><Master_State_Create /></RouteWrapper>} />
                <Route path=":id/edit" element={<RouteWrapper><Master_State_Edit /></RouteWrapper>} />
            </Route>

            {/* Teams */}
            <Route path="teams" element={<RouteWrapper><Master_Team /></RouteWrapper>} />

            {/* Lead Types */}
            <Route path="lead-types">
                <Route index element={<RouteWrapper><Master_LeadType /></RouteWrapper>} />
                <Route path="create" element={<RouteWrapper><Master_LeadType_Create /></RouteWrapper>} />
                <Route path=":id/edit" element={<RouteWrapper><Master_LeadType_Edit /></RouteWrapper>} />
            </Route>

            {/* Vendor Accounts */}
            <Route path="vendor-accounts">
                <Route index element={<RouteWrapper><Master_VendorAcc /></RouteWrapper>} />
                <Route path="create" element={<RouteWrapper><Master_VendorAcc_Create /></RouteWrapper>} />
                <Route path=":id/edit" element={<RouteWrapper><Master_VendorAcc_Edit /></RouteWrapper>} />
            </Route>

            {/* Vendor GSTs */}
            <Route path="vendor-gsts">
                <Route index element={<RouteWrapper><Master_VendorGst /></RouteWrapper>} />
                <Route path="create" element={<RouteWrapper><Master_VendorGst_Create /></RouteWrapper>} />
                <Route path=":id/edit" element={<RouteWrapper><Master_VendorGst_Edit /></RouteWrapper>} />
            </Route>

            {/* Vendor Files */}
            <Route path="vendor-files">
                <Route index element={<RouteWrapper><Master_VendorFile /></RouteWrapper>} />
                <Route path="create" element={<RouteWrapper><Master_VendorFile_Create /></RouteWrapper>} />
                <Route path=":id/edit" element={<RouteWrapper><Master_VendorFile_Edit /></RouteWrapper>} />
            </Route>

            {/* Vendor Organizations */}
            <Route path="vendor-organizations">
                <Route index element={<RouteWrapper><Master_VendorOrganization /></RouteWrapper>} />
                <Route path="create" element={<RouteWrapper><Master_VendorOrganization_Create /></RouteWrapper>} />
                <Route path=":id/edit" element={<RouteWrapper><Master_VendorOrganization_Edit /></RouteWrapper>} />
            </Route>
        </Routes>
    );
}
