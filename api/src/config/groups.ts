// Group JID constants
// Update these with JIDs from your OpenWA instance (GET /groups)
export const GROUPS = {
  TENDERING: '120363419594712519@g.us',
  ACCOUNTS_TEAM: '8448592019@g.us',
  CRM: '120363403804245399@g.us',
  PAYMENTS: '120363241486533861@g.us',
  WORKORDER: '120363429417767050@g.us',
  PAYMENTADVICE: '120363430359406441@g.us',
  POVWO: '120363413647073332@g.us',
  ACTENDERSEARCH: '120363430908513558@g.us',
  DCTENDERSEARCH: '120363413973655798@g.us',
} as const;

export type GroupKey = keyof typeof GROUPS;

// Tender allocation notification groups per team.
// Team 1 - AC -> ACTENDERSEARCH, Team 2 - DC -> DCTENDERSEARCH.
// Adjust keys if the real teams.id values differ (or key by teams.name).
export const TEAM_TENDER_GROUPS: Record<number, string> = {
  1: GROUPS.ACTENDERSEARCH,
  2: GROUPS.DCTENDERSEARCH,
};