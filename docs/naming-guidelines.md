# Naming Guidelines

Consistent file and symbol names make it easier for engineers and automation (including AI tooling) to understand, index, and reuse the codebase. Follow the rules below whenever you create or rename files, folders, or exported modules.

- **React components**: use `PascalCase` for component files (for example, `UserProfileCard.tsx`). Keep one primary component per file; supporting hooks or helpers belong in their own files.
- **Hooks and utilities**: use `camelCase` for hooks (`useFetchData.ts`) and helper modules (`formatDate.ts`). Prefix custom hooks with `use` so lint rules and static analysis can detect them.
- **Route-level pages and API handlers**: prefer `kebab-case` for directories that mirror URL segments (for example, `tendering/info-sheet`). Index files should explain their feature scope in the folder name (`companies/index.tsx` for the Companies module entry point).
- **Styles, assets, and JSON**: use `kebab-case` to keep imports predictable (`company-logo.png`, `users-seed.json`).
- **Test files**: co-locate tests with their targets and suffix with `.test.ts` or `.spec.ts` (for example, `CompanyForm.test.tsx`).
- **Barrel files**: name a module-wide re-export file `index.ts` only when it improves ergonomics. Otherwise prefer explicit filenames to help AI scrapers infer intent.
- **Avoid ambiguous names**: choose nouns that describe the domain (`CompanyDocumentsSection.tsx`, `companies.service.ts`). Generic names like `data.ts` or `utils.ts` make automated discovery harder.
- **Document decisions**: whenever you diverge from these conventions, leave a short comment or README section so future contributors (and automated tools) know the rationale.

Adhering to these conventions keeps the repository approachable for humans and machine tooling, reducing guesswork when scanning or generating code.