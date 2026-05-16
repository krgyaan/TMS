import { useAuth } from '@/contexts/AuthContext';

export const useTenderingPermissions = () => {
    const { isSuperUser, isAdmin, isTeamLeader, teamId } = useAuth();

    // Tender Lead logic: Team Leader of specific teams (1 or 2)
    const isTenderLead = isTeamLeader && (teamId === 1 || teamId === 2); 
    
    // Global tendering permission: Tender Lead, Admin, or Super User
    const hasTenderingPermission = !!(isTenderLead || isAdmin || isSuperUser);

    return {
        isSuperUser,
        isAdmin,
        isTeamLeader,
        teamId,
        isTenderLead,
        hasTenderingPermission,
    };
};
