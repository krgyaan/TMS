// Group JID constants
// Update these with JIDs from your OpenWA instance (GET /groups)
export const GROUPS = {
  TENDERING: '120363419594712519@g.us',
  ACCOUNTS_TEAM: '8448592019@g.us',
  CRM: '120363403804245399@g.us',
} as const;

export type GroupKey = keyof typeof GROUPS;