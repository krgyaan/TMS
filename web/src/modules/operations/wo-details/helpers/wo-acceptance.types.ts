
export interface WoAcceptanceFormValues {
  decision: 'accepted' | 'amendment_needed';
  remarks?: string;
  amendments?: Array<{
    pageNo?: string;
    clauseNo?: string;
    currentStatement?: string;
    correctedStatement?: string;
  }>;
  initiateFollowUp?: string; 
  oeSiteVisitId?: string | null;
  oeDocsPrepId?: string | null;
  signedWoFilePath?: string | null;
}
