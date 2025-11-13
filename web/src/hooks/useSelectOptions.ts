import { useMemo } from 'react';
import { useTeams } from './api/useTeams';
import { useOrganizations } from './api/useOrganizations';
import { useUsers } from './api/useUsers';
import { useLocations } from './api/useLocations';
import { useWebsites } from './api/useWebsites';
import { useItems } from './api/useItems';
import { useStatuses } from './api/useStatuses';

export function useTeamOptions(ids: Array<number> = []) {
    const { data: teams = [] } = useTeams();

    return useMemo(
        () => teams.filter((t) => ids.includes(t.id)).map((t) => ({ id: String(t.id), name: t.name })),
        [teams, ids]
    );
}

export function useOrganizationOptions(status: boolean = true) {
    const { data: organizations = [] } = useOrganizations();

    return useMemo(
        () => organizations.filter((o) => o.status === status).map((o) => ({ id: String(o.id), name: o.acronym })),
        [organizations]
    );
}

export function useUserOptions(status: boolean = true) {
    const { data: users = [] } = useUsers();

    return useMemo(
        () => users.filter((u) => u.isActive === status).map((u) => ({ id: String(u.id), name: u.name })),
        [users]
    );
}

export function useLocationOptions(status: boolean = true) {
    const { data: locations = [] } = useLocations();

    return useMemo(
        () => locations.filter((l) => l.status === status).map((l) => ({ id: String(l.id), name: l.name })),
        [locations]
    );
}

export function useWebsiteOptions(status: boolean = true) {
    const { data: websites = [] } = useWebsites();

    return useMemo(
        () => websites.filter((w) => w.status === status).map((w) => ({ id: String(w.id), name: w.name })),
        [websites]
    );
}

export function useItemOptions(status: boolean = true) {
    const { data: items = [] } = useItems();

    return useMemo(
        () => items.filter((i) => i.status === status).map((i) => ({ id: String(i.id), name: i.name })),
        [items]
    );
}

export function useStatusOptions(status: boolean = true) {
    const { data: statuses = [] } = useStatuses();

    return useMemo(
        () => statuses.filter((s) => s.status === status).map((s) => ({ id: String(s.id), name: s.name })),
        [statuses]
    );
}

export function useAllSelectOptions() {
    const teamOptions = useTeamOptions();
    const organizationOptions = useOrganizationOptions();
    const userOptions = useUserOptions();
    const locationOptions = useLocationOptions();
    const websiteOptions = useWebsiteOptions();
    const itemOptions = useItemOptions();
    const statusOptions = useStatusOptions();

    return {
        teamOptions,
        organizationOptions,
        userOptions,
        locationOptions,
        websiteOptions,
        itemOptions,
        statusOptions,
    };
}
