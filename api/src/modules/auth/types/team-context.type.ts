import { DataScope } from '@/common/constants/roles.constant';

export interface TeamContext {
    userId: number;
    teamId: number | null;
    dataScope: DataScope;
    canSwitchTeams: boolean;
}

declare global {
    namespace Express {
        interface Request {
            teamContext?: TeamContext;
        }
    }
}
