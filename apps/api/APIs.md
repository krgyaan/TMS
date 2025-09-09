# API Endpoints

Base URL prefix is configurable via `API_PREFIX` (default: `api/v1`). All routes below assume the default prefix.

- GET `/api/v1` — Root hello endpoint (default Nest controller)
  - Response: `"Hello World!"` (plain string)

- GET `/api/v1/health` — Health check
  - Response: `{ status: "ok", timestamp: string }`

- GET `/api/v1/users` — List users
  - Response: `User[]`

- POST `/api/v1/users` — Create a user
  - Body: `{ email: string (email), name?: string }`
  - Response: `User`

- GET `/api/v1/roles` — List roles
  - Response: `Role[]`

- POST `/api/v1/roles` — Create a role
  - Body: `{ name: string, guardName?: string }`
  - Response: `Role`

- GET `/api/v1/designations` — List designations
  - Response: `Designation[]`

- POST `/api/v1/designations` — Create a designation
  - Body: `{ name: string, description?: string }`
  - Response: `Designation`

- GET `/api/v1/teams` — List teams
  - Response: `Team[]`

- POST `/api/v1/teams` — Create a team
  - Body: `{ name: string, parentId?: number }`
  - Response: `Team`

- GET `/api/v1/user-profiles` — List user profiles
  - Response: `UserProfile[]`

- POST `/api/v1/user-profiles` — Create a user profile
  - Body: `{ userId: number, firstName?: string, lastName?: string, dateOfBirth?: string, gender?: string, employeeCode?: string, designationId?: number, primaryTeamId?: number, altEmail?: string (email), emergencyContactName?: string, emergencyContactPhone?: string, image?: string, signature?: string, dateOfJoining?: string, dateOfExit?: string, timezone?: string, locale?: string }`
  - Response: `UserProfile`

- GET `/api/v1/oauth-accounts` — List OAuth accounts
  - Response: `OauthAccount[]`

- POST `/api/v1/oauth-accounts` — Create an OAuth account
  - Body: `{ userId: number, provider: string, providerUserId: string, providerEmail?: string (email), avatar?: string, accessToken: string, refreshToken?: string, expiresAt?: string (ISO date), scopes?: string, rawPayload?: any }`
  - Response: `OauthAccount`

Types
- `User`:
  - `id`: number
  - `email`: string
  - `name?`: string | null
  - `isActive`: boolean
  - `createdAt`: string (ISO date)
  - `updatedAt`: string (ISO date)

- `Role`: `{ id: number, name: string, guardName?: string | null, isActive: boolean, createdAt: string, updatedAt: string }`
- `Designation`: `{ id: number, name: string, description?: string | null, isActive: boolean, createdAt: string, updatedAt: string }`
- `Team`: `{ id: number, name: string, parentId?: number | null, isActive: boolean, createdAt: string, updatedAt: string }`
- `UserProfile`: `{ id: number, userId: number, firstName?: string | null, lastName?: string | null, dateOfBirth?: string | null, gender?: string | null, employeeCode?: string | null, designationId?: number | null, primaryTeamId?: number | null, altEmail?: string | null, emergencyContactName?: string | null, emergencyContactPhone?: string | null, image?: string | null, signature?: string | null, dateOfJoining?: string | null, dateOfExit?: string | null, timezone?: string | null, locale?: string | null, isActive: boolean, createdAt: string, updatedAt: string }`
- `OauthAccount`: `{ id: number, userId: number, provider: string, providerUserId: string, providerEmail?: string | null, avatar?: string | null, accessToken: string, refreshToken?: string | null, expiresAt?: string | null, scopes?: string | null, rawPayload?: any | null, isActive: boolean, createdAt: string, updatedAt: string }`
