
import { SetMetadata } from '@nestjs/common';
import { BYPASS_TEAM_CHECK_KEY } from '../guards/team.guard';

export const BypassTeamCheck = () => SetMetadata(BYPASS_TEAM_CHECK_KEY, true);
