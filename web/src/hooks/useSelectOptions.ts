import { useMemo } from 'react';
import { useTeams } from './api/useTeams';
import { useOrganizations } from './api/useOrganizations';
import { useLocations } from './api/useLocations';
import { useWebsites } from './api/useWebsites';
import { useItems } from './api/useItems';
import { useStatuses } from './api/useStatuses';
import { useGetTeamMembers } from './api/useUsers';
import { usePqrs } from './api/usePqrs';
import { useFinanceDocuments } from './api/useFinanceDocuments';

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

export function useUserOptions(teamId?: number) {
    const { data: users = [] } = useGetTeamMembers(teamId ?? 2);
    console.log("users", users);
    return useMemo(
        () => users.map((u) => ({ id: String(u.id), name: u.name })),
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

export function useDnbStatusOptions() {
    const { data: statuses = [] } = useStatuses();

    return useMemo(
        () => statuses
            .filter((s) => s.tenderCategory === 'dnb' && s.status === true)
            .map((s) => ({ value: String(s.id), label: s.name })),
        [statuses]
    );
}

export function usePqrOptions() {
    const { data: apiResponse } = usePqrs();

    return useMemo(
        () => {
            const pqrs = apiResponse?.data ?? [];
            return pqrs.map((pqr) => {
                const label = pqr.projectName
                    ? (pqr.item ? `${pqr.projectName} - ${pqr.item}` : pqr.projectName)
                    : `PQR ${pqr.id}`;
                return { value: String(pqr.id), label };
            });
        },
        [apiResponse]
    );
}

export function useFinanceDocumentOptions() {
    const { data: apiResponse } = useFinanceDocuments();

    return useMemo(
        () => {
            const documents = apiResponse?.data ?? [];
            return documents.map((doc) => ({
                value: String(doc.id),
                label: doc.documentName || `Document ${doc.id}`,
            }));
        },
        [apiResponse]
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
