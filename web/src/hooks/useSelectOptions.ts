import { useMemo, useState } from 'react';
import { useTeams } from './api/useTeams';
import { useOrganizations } from './api/useOrganizations';
import { useLocations } from './api/useLocations';
import { useWebsites } from './api/useWebsites';
import { useItems } from './api/useItems';
import { useStatuses } from './api/useStatuses';
import { useGetTeamMembers } from './api/useUsers';
import { usePqrsAll } from './api/usePqrs';
import { useFinanceDocumentsAll } from './api/useFinanceDocuments';
import { useProjectsMaster } from './api/useProjects';
import { useLoanParties } from './api/useLoanParties';
import { useSellerOptions, useShipToOptions } from './api/usePurchaseOrders';
import { useDebouncedSearch } from './useDebouncedSearch';

const toSearchableIds = (selectedId?: string): number[] => {
    if (!selectedId || selectedId === '__create_new__') return [];
    const parsed = Number(selectedId);
    return Number.isInteger(parsed) && parsed > 0 ? [parsed] : [];
};

/**
 * Turn the current form value into the `ids` the server must always return.
 * Without it a loaded page would drop its own selection the moment the query
 * stopped matching it, and the trigger would lose its label.
 */
const useSelectedPartyId = (selectedId?: string) =>
    useMemo(() => toSearchableIds(selectedId), [selectedId]);

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
    const { data: apiResponse } = usePqrsAll();

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
    const { data: apiResponse } = useFinanceDocumentsAll();

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

export function useProjectOptions() {
    const { data: projects = [] } = useProjectsMaster();

    return useMemo(
        () => {
            const seen = new Set<string>();
            return projects
                .filter((p) => {
                    if (seen.has(p.projectName)) return false;
                    seen.add(p.projectName);
                    return true;
                })
                .map((p) => ({
                    id: p.projectName,
                    name: p.projectName,
                }));
        },
        [projects]
    );
}

export function useLoanPartyOptions() {
    const { data: projects = [] } = useLoanParties();

    return useMemo(
        () =>
            projects.map((p) => ({
                id: p.name,
                name: p.name,
            })),
        [projects]
    );
}

/**
 * Seller / ship-to pickers for PO, VWO and Sale Invoice.
 *
 * Unlike the master-data hooks above these are server-searched: the form never
 * downloads all 482 sellers, it asks for one page matching the query. The
 * returned `onSearch` goes straight into `AsyncSelectField`, which lifts its
 * keystrokes here so this hook owns the debounce.
 *
 * `keywords` carries the fields the server filters on but the row does not
 * display (gst, pan, address) so the client-side pass still keeps a row the
 * server matched by something invisible in the panel.
 */
export function useSellerSelectOptions(selectedId?: string) {
    const [query, setQuery] = useState('');
    const debouncedQuery = useDebouncedSearch(query, 300);
    const ids = useSelectedPartyId(selectedId);

    const { data: rows = [], isLoading } = useSellerOptions(debouncedQuery, ids);

    const options = useMemo(
        () =>
            rows.map((p) => ({
                id: String(p.id),
                name: p.alias ? `${p.name} (${p.alias})` : p.name,
                keywords: [p.name, p.alias, p.gstNo, p.pan, p.msme, p.address]
                    .filter(Boolean)
                    .join(' '),
            })),
        [rows]
    );

    // `rows` feeds the pages' auto-fill effect: the effect must find the row
    // backing the current id, which is always present because `ids` pins it.
    return { options, rows, onSearch: setQuery, isLoading };
}

export function useShipToSelectOptions(selectedId?: string) {
    const [query, setQuery] = useState('');
    const debouncedQuery = useDebouncedSearch(query, 300);
    const ids = useSelectedPartyId(selectedId);

    const { data: rows = [], isLoading } = useShipToOptions(debouncedQuery, ids);

    const options = useMemo(
        () =>
            rows.map((p) => ({
                id: String(p.id),
                name: p.alias ? `${p.name} (${p.alias})` : p.name,
                keywords: [p.name, p.alias, p.gstNo, p.pan, p.address].filter(Boolean).join(' '),
            })),
        [rows]
    );

    return { options, rows, onSearch: setQuery, isLoading };
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
