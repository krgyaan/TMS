# Directory Structure

```
📂 TMS
├── 📂 apps/                     # Directory
│   ├── 📂 api/                     # API routes and endpoints
│   │   ├── 📂 drizzle/                     # API endpoints
│   │   │   ├── 📂 meta/                     # API endpoints
│   │   │   │   ├── 📄 _journal.json                     # JSON configuration
│   │   │   │   └── 📄 0000_snapshot.json                     # JSON configuration
│   │   │   ├── 📄 .gitkeep                     # File
│   │   │   └── 📄 0000_faithful_power_man.sql                     # SQL script
│   │   ├── 📂 src/                     # Source code
│   │   │   ├── 📂 config/                     # Configuration files
│   │   │   │   ├── 📄 app.config.ts                     # TypeScript file
│   │   │   │   └── 📄 db.config.ts                     # TypeScript file
│   │   │   ├── 📂 db/                     # API endpoints
│   │   │   │   ├── 📄 database.module.ts                     # TypeScript file
│   │   │   │   ├── 📄 designations.schema.ts                     # TypeScript file
│   │   │   │   ├── 📄 index.ts                     # TypeScript file
│   │   │   │   ├── 📄 oauth-accounts.schema.ts                     # TypeScript file
│   │   │   │   ├── 📄 roles.schema.ts                     # TypeScript file
│   │   │   │   ├── 📄 schema.ts                     # TypeScript file
│   │   │   │   ├── 📄 seed.ts                     # TypeScript file
│   │   │   │   ├── 📄 teams.schema.ts                     # TypeScript file
│   │   │   │   ├── 📄 user-profiles.schema.ts                     # TypeScript file
│   │   │   │   └── 📄 users.schema.ts                     # TypeScript file
│   │   │   ├── 📂 modules/                     # API endpoints
│   │   │   │   ├── 📂 designations/                     # API endpoints
│   │   │   │   │   ├── 📄 designations.controller.ts                     # TypeScript file
│   │   │   │   │   ├── 📄 designations.module.ts                     # TypeScript file
│   │   │   │   │   └── 📄 designations.service.ts                     # TypeScript file
│   │   │   │   ├── 📂 health/                     # API endpoints
│   │   │   │   │   ├── 📄 health.controller.ts                     # TypeScript file
│   │   │   │   │   └── 📄 health.module.ts                     # TypeScript file
│   │   │   │   ├── 📂 oauth-accounts/                     # API endpoints
│   │   │   │   │   ├── 📄 oauth-accounts.controller.ts                     # TypeScript file
│   │   │   │   │   ├── 📄 oauth-accounts.module.ts                     # TypeScript file
│   │   │   │   │   └── 📄 oauth-accounts.service.ts                     # TypeScript file
│   │   │   │   ├── 📂 roles/                     # API endpoints
│   │   │   │   │   ├── 📄 roles.controller.ts                     # TypeScript file
│   │   │   │   │   ├── 📄 roles.module.ts                     # TypeScript file
│   │   │   │   │   └── 📄 roles.service.ts                     # TypeScript file
│   │   │   │   ├── 📂 teams/                     # API endpoints
│   │   │   │   │   ├── 📄 teams.controller.ts                     # TypeScript file
│   │   │   │   │   ├── 📄 teams.module.ts                     # TypeScript file
│   │   │   │   │   └── 📄 teams.service.ts                     # TypeScript file
│   │   │   │   ├── 📂 user-profiles/                     # API endpoints
│   │   │   │   │   ├── 📄 user-profiles.controller.ts                     # TypeScript file
│   │   │   │   │   ├── 📄 user-profiles.module.ts                     # TypeScript file
│   │   │   │   │   └── 📄 user-profiles.service.ts                     # TypeScript file
│   │   │   │   └── 📂 users/                     # API endpoints
│   │   │   │       ├── 📄 users.controller.ts                     # TypeScript file
│   │   │   │       ├── 📄 users.module.ts                     # TypeScript file
│   │   │   │       └── 📄 users.service.ts                     # TypeScript file
│   │   │   ├── 📄 app.controller.spec.ts                     # TypeScript file
│   │   │   ├── 📄 app.controller.ts                     # TypeScript file
│   │   │   ├── 📄 app.module.ts                     # TypeScript file
│   │   │   ├── 📄 app.service.ts                     # TypeScript file
│   │   │   └── 📄 main.ts                     # TypeScript file
│   │   ├── 📂 test/                     # Test files
│   │   │   ├── 📄 app.e2e-spec.ts                     # TypeScript file
│   │   │   └── 📄 jest-e2e.json                     # JSON configuration
│   │   ├── 📄 .env.example                     # Environment variables template
│   │   ├── 📄 .gitignore                     # Git ignore rules
│   │   ├── 📄 .prettierrc                     # File
│   │   ├── 📄 APIs.md                     # Markdown documentation
│   │   ├── 📄 drizzle.config.ts                     # TypeScript file
│   │   ├── 📄 eslint.config.mjs                     # File
│   │   ├── 📄 nest-cli.json                     # JSON configuration
│   │   ├── 📄 package.json                     # NPM package configuration
│   │   ├── 📄 pnpm-lock.yaml                     # YAML configuration
│   │   ├── 📄 README.md                     # Project documentation
│   │   ├── 📄 tsconfig.build.json                     # JSON configuration
│   │   └── 📄 tsconfig.json                     # TypeScript configuration
│   ├── 📂 ml-extract/                     # Directory
│   │   ├── 📄 main.py                     # Python script
│   │   └── 📄 requirements.txt                     # Text file
│   ├── 📂 ml-ocr/                     # Directory
│   │   ├── 📄 main.py                     # Python script
│   │   └── 📄 requirements.txt                     # Text file
│   └── 📂 web/                     # Directory
│       ├── 📂 public/                     # Static assets and public files
│       │   ├── 📄 ve_favicon.png                     # PNG image
│       │   └── 📄 ve_logo.png                     # PNG image
│       ├── 📂 src/                     # Source code
│       │   ├── 📂 app/                     # Application pages and routing
│       │   │   ├── 📂 layout/                     # Layout components
│       │   │   │   └── 📄 DashboardLayout.tsx                     # React TypeScript component
│       │   │   └── 📂 routes/                     # Application routes
│       │   │       ├── 📄 index.tsx                     # React TypeScript component
│       │   │       └── 📄 paths.ts                     # TypeScript file
│       │   ├── 📂 assets/                     # Project assets and resources
│       │   │   └── 📄 react.svg                     # SVG vector image
│       │   ├── 📂 components/                     # React components
│       │   │   ├── 📂 data-grid/                     # Component files
│       │   │   │   ├── 📂 renderers/                     # Component files
│       │   │   │   │   ├── 📄 ActionColumnRenderer.tsx                     # React TypeScript component
│       │   │   │   │   ├── 📄 BooleanIconCell.tsx                     # React TypeScript component
│       │   │   │   │   └── 📄 CompanyLogoCell.tsx                     # React TypeScript component
│       │   │   │   ├── 📄 columns.ts                     # TypeScript file
│       │   │   │   ├── 📄 formatters.ts                     # TypeScript file
│       │   │   │   ├── 📄 index.ts                     # TypeScript file
│       │   │   │   └── 📄 theme.ts                     # TypeScript file
│       │   │   ├── 📂 form/                     # Component files
│       │   │   │   ├── 📄 DateInput.tsx                     # React TypeScript component
│       │   │   │   ├── 📄 DateTimeInput.tsx                     # React TypeScript component
│       │   │   │   ├── 📄 FieldWrapper.tsx                     # React TypeScript component
│       │   │   │   ├── 📄 FileUploadField.tsx                     # React TypeScript component
│       │   │   │   ├── 📄 NumberInput.tsx                     # React TypeScript component
│       │   │   │   └── 📄 SelectField.tsx                     # React TypeScript component
│       │   │   ├── 📂 templates/                     # Component templates
│       │   │   │   └── 📄 IndexPageTemplate.tsx                     # React TypeScript component
│       │   │   ├── 📂 ui/                     # UI components
│       │   │   │   ├── 📄 ActionMenu.tsx                     # React TypeScript component
│       │   │   │   ├── 📄 avatar.tsx                     # React TypeScript component
│       │   │   │   ├── 📄 breadcrumb.tsx                     # React TypeScript component
│       │   │   │   ├── 📄 button.tsx                     # React TypeScript component
│       │   │   │   ├── 📄 card.tsx                     # React TypeScript component
│       │   │   │   ├── 📄 collapsible.tsx                     # React TypeScript component
│       │   │   │   ├── 📄 command.tsx                     # React TypeScript component
│       │   │   │   ├── 📄 data-table.tsx                     # React TypeScript component
│       │   │   │   ├── 📄 dialog.tsx                     # React TypeScript component
│       │   │   │   ├── 📄 dropdown-menu.tsx                     # React TypeScript component
│       │   │   │   ├── 📄 form.tsx                     # React TypeScript component
│       │   │   │   ├── 📄 input.tsx                     # React TypeScript component
│       │   │   │   ├── 📄 label.tsx                     # React TypeScript component
│       │   │   │   ├── 📄 popover.tsx                     # React TypeScript component
│       │   │   │   ├── 📄 separator.tsx                     # React TypeScript component
│       │   │   │   ├── 📄 sheet.tsx                     # React TypeScript component
│       │   │   │   ├── 📄 sidebar.tsx                     # React TypeScript component
│       │   │   │   ├── 📄 skeleton.tsx                     # React TypeScript component
│       │   │   │   ├── 📄 tabs.tsx                     # React TypeScript component
│       │   │   │   └── 📄 tooltip.tsx                     # React TypeScript component
│       │   │   ├── 📄 app-sidebar.tsx                     # React TypeScript component
│       │   │   ├── 📄 document-title.tsx                     # React TypeScript component
│       │   │   ├── 📄 login-form.tsx                     # React TypeScript component
│       │   │   ├── 📄 mode-toggle.tsx                     # React TypeScript component
│       │   │   ├── 📄 nav-main.tsx                     # React TypeScript component
│       │   │   ├── 📄 nav-user.tsx                     # React TypeScript component
│       │   │   ├── 📄 ProtectedRoute.tsx                     # React TypeScript component
│       │   │   ├── 📄 PublicOnlyRoute.tsx                     # React TypeScript component
│       │   │   ├── 📄 team-switcher.tsx                     # React TypeScript component
│       │   │   └── 📄 theme-provider.tsx                     # React TypeScript component
│       │   ├── 📂 hooks/                     # Custom React hooks
│       │   │   ├── 📄 use-mobile.ts                     # TypeScript file
│       │   │   └── 📄 usFetchJson.tsx                     # React TypeScript component
│       │   ├── 📂 lib/                     # Utility functions and libraries
│       │   │   ├── 📄 auth.ts                     # TypeScript file
│       │   │   └── 📄 utils.ts                     # TypeScript file
│       │   ├── 📂 modules/                     # Directory
│       │   │   ├── 📂 accounts/                     # Directory
│       │   │   │   ├── 📂 financial-docs/                     # Directory
│       │   │   │   │   └── 📄 index.tsx                     # React TypeScript component
│       │   │   │   ├── 📂 fixed-expenses/                     # Directory
│       │   │   │   │   └── 📄 index.tsx                     # React TypeScript component
│       │   │   │   ├── 📂 gst-checklists/                     # Directory
│       │   │   │   │   └── 📄 index.tsx                     # React TypeScript component
│       │   │   │   ├── 📂 imprests/                     # Directory
│       │   │   │   │   └── 📄 index.tsx                     # React TypeScript component
│       │   │   │   ├── 📂 loan-advances/                     # Directory
│       │   │   │   │   └── 📄 index.tsx                     # React TypeScript component
│       │   │   │   ├── 📂 task-checlkists/                     # Directory
│       │   │   │   │   └── 📄 index.tsx                     # React TypeScript component
│       │   │   │   └── 📂 tds-checklists/                     # Directory
│       │   │   │       └── 📄 index.tsx                     # React TypeScript component
│       │   │   ├── 📂 auth/                     # Directory
│       │   │   │   └── 📄 login.tsx                     # React TypeScript component
│       │   │   ├── 📂 bi-dashboard/                     # Directory
│       │   │   │   ├── 📂 bank-guarantee/                     # Directory
│       │   │   │   │   └── 📄 index.tsx                     # React TypeScript component
│       │   │   │   ├── 📂 bank-tranfer/                     # Directory
│       │   │   │   │   └── 📄 index.tsx                     # React TypeScript component
│       │   │   │   ├── 📂 cheque/                     # Directory
│       │   │   │   │   └── 📄 index.tsx                     # React TypeScript component
│       │   │   │   ├── 📂 demand-draft/                     # Directory
│       │   │   │   │   └── 📄 index.tsx                     # React TypeScript component
│       │   │   │   ├── 📂 fdr/                     # Directory
│       │   │   │   │   └── 📄 index.tsx                     # React TypeScript component
│       │   │   │   └── 📂 pay-on-portal/                     # Directory
│       │   │   │       └── 📄 index.tsx                     # React TypeScript component
│       │   │   ├── 📂 crm/                     # Directory
│       │   │   │   ├── 📂 costings/                     # Directory
│       │   │   │   │   └── 📄 index.tsx                     # React TypeScript component
│       │   │   │   ├── 📂 enquiries/                     # Directory
│       │   │   │   │   └── 📄 index.tsx                     # React TypeScript component
│       │   │   │   ├── 📂 leads/                     # Directory
│       │   │   │   │   └── 📄 index.tsx                     # React TypeScript component
│       │   │   │   └── 📂 quotations/                     # Directory
│       │   │   │       └── 📄 index.tsx                     # React TypeScript component
│       │   │   ├── 📂 master/                     # Directory
│       │   │   │   ├── 📂 user/                     # Directory
│       │   │   │   │   ├── 📄 create.tsx                     # React TypeScript component
│       │   │   │   │   └── 📄 users.tsx                     # React TypeScript component
│       │   │   │   ├── 📄 document-submitted.tsx                     # React TypeScript component
│       │   │   │   ├── 📄 document-type.tsx                     # React TypeScript component
│       │   │   │   ├── 📄 emds-responsibilities.tsx                     # React TypeScript component
│       │   │   │   ├── 📄 financial-year.tsx                     # React TypeScript component
│       │   │   │   ├── 📄 followup-categories.tsx                     # React TypeScript component
│       │   │   │   ├── 📄 imprest-category.tsx                     # React TypeScript component
│       │   │   │   ├── 📄 items.tsx                     # React TypeScript component
│       │   │   │   ├── 📄 locations.tsx                     # React TypeScript component
│       │   │   │   ├── 📄 organizations.tsx                     # React TypeScript component
│       │   │   │   ├── 📄 statuses.tsx                     # React TypeScript component
│       │   │   │   ├── 📄 vendors.tsx                     # React TypeScript component
│       │   │   │   └── 📄 websites.tsx                     # React TypeScript component
│       │   │   ├── 📂 operations/                     # Directory
│       │   │   │   ├── 📂 contract-agreement/                     # Directory
│       │   │   │   │   └── 📄 index.tsx                     # React TypeScript component
│       │   │   │   ├── 📂 kick-off/                     # Directory
│       │   │   │   │   └── 📄 index.tsx                     # React TypeScript component
│       │   │   │   └── 📂 work-order/                     # Directory
│       │   │   │       └── 📄 index.tsx                     # React TypeScript component
│       │   │   ├── 📂 performance/                     # Directory
│       │   │   │   ├── 📄 account-team.tsx                     # React TypeScript component
│       │   │   │   ├── 📄 business-dashboard.tsx                     # React TypeScript component
│       │   │   │   ├── 📄 customer-dashboard.tsx                     # React TypeScript component
│       │   │   │   ├── 📄 location-dashboard.tsx                     # React TypeScript component
│       │   │   │   ├── 📄 oem-dashboard.tsx                     # React TypeScript component
│       │   │   │   ├── 📄 operation-team.tsx                     # React TypeScript component
│       │   │   │   ├── 📄 team-leader.tsx                     # React TypeScript component
│       │   │   │   └── 📄 tender-executive.tsx                     # React TypeScript component
│       │   │   ├── 📂 services/                     # Directory
│       │   │   │   ├── 📂 amc/                     # Directory
│       │   │   │   │   └── 📄 index.tsx                     # React TypeScript component
│       │   │   │   ├── 📂 conference/                     # Directory
│       │   │   │   │   └── 📄 index.tsx                     # React TypeScript component
│       │   │   │   ├── 📂 customer/                     # Directory
│       │   │   │   │   └── 📄 index.tsx                     # React TypeScript component
│       │   │   │   └── 📂 visit/                     # Directory
│       │   │   │       └── 📄 index.tsx                     # React TypeScript component
│       │   │   ├── 📂 shared/                     # Directory
│       │   │   │   ├── 📂 courier/                     # Directory
│       │   │   │   │   └── 📄 index.tsx                     # React TypeScript component
│       │   │   │   └── 📂 follow-ups/                     # Directory
│       │   │   │       └── 📄 index.tsx                     # React TypeScript component
│       │   │   ├── 📂 tendering/                     # Directory
│       │   │   │   ├── 📂 bid-submissions/                     # Directory
│       │   │   │   │   └── 📄 index.tsx                     # React TypeScript component
│       │   │   │   ├── 📂 checklists/                     # Directory
│       │   │   │   │   └── 📄 index.tsx                     # React TypeScript component
│       │   │   │   ├── 📂 costing-sheets/                     # Directory
│       │   │   │   │   └── 📄 index.tsx                     # React TypeScript component
│       │   │   │   ├── 📂 emds-tenderfees/                     # Directory
│       │   │   │   │   └── 📄 index.tsx                     # React TypeScript component
│       │   │   │   ├── 📂 info-sheet/                     # Directory
│       │   │   │   │   └── 📄 index.tsx                     # React TypeScript component
│       │   │   │   ├── 📂 phydocs/                     # Directory
│       │   │   │   │   └── 📄 index.tsx                     # React TypeScript component
│       │   │   │   ├── 📂 ras/                     # Directory
│       │   │   │   │   └── 📄 index.tsx                     # React TypeScript component
│       │   │   │   ├── 📂 results/                     # Directory
│       │   │   │   │   └── 📄 index.tsx                     # React TypeScript component
│       │   │   │   ├── 📂 rfqs/                     # Directory
│       │   │   │   │   └── 📄 index.tsx                     # React TypeScript component
│       │   │   │   ├── 📂 tenders/                     # Directory
│       │   │   │   │   ├── 📄 create.tsx                     # React TypeScript component
│       │   │   │   │   └── 📄 index.tsx                     # React TypeScript component
│       │   │   │   └── 📂 tqs/                     # Directory
│       │   │   │       └── 📄 index.tsx                     # React TypeScript component
│       │   │   └── 📄 dashboard.tsx                     # React TypeScript component
│       │   ├── 📄 App.tsx                     # React TypeScript component
│       │   ├── 📄 index.css                     # Stylesheet
│       │   ├── 📄 main.tsx                     # React TypeScript component
│       │   └── 📄 vite-env.d.ts                     # TypeScript file
│       ├── 📄 .gitignore                     # Git ignore rules
│       ├── 📄 components.json                     # Component configuration
│       ├── 📄 eslint.config.js                     # ESLint configuration
│       ├── 📄 index.html                     # HTML page
│       ├── 📄 package.json                     # NPM package configuration
│       ├── 📄 pnpm-lock.yaml                     # YAML configuration
│       ├── 📄 README.md                     # Project documentation
│       ├── 📄 tsconfig.app.json                     # JSON configuration
│       ├── 📄 tsconfig.json                     # TypeScript configuration
│       ├── 📄 tsconfig.node.json                     # JSON configuration
│       └── 📄 vite.config.ts                     # TypeScript file
└── 📄 .gitignore                     # Git ignore rules
```
