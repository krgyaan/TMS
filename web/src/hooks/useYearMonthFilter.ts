import { useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

const ALL = 'all';

export const MONTH_LABELS = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
];

const YEAR_RANGE = 6;

export interface YearMonthOption {
    value: string;
    label: string;
}

export interface YearMonthFilterResult {
    year: string;
    month: string;
    filterYear?: number;
    filterMonth?: number;
    yearOptions: YearMonthOption[];
    monthOptions: YearMonthOption[];
    description: string;
    setYear: (year: string) => void;
    setMonth: (month: string) => void;
}

export function useYearMonthFilter(): YearMonthFilterResult {
    const [searchParams, setSearchParams] = useSearchParams();

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const year = searchParams.get('year') ?? String(currentYear);
    const monthParam = searchParams.get('month') ?? String(currentMonth);
    const month = year === ALL ? ALL : monthParam;

    useEffect(() => {
        const next = new URLSearchParams(searchParams);
        next.set('year', year);
        next.set('month', month);
        if (next.toString() !== searchParams.toString()) {
            setSearchParams(next, { replace: true });
        }
    }, [year, month, searchParams, setSearchParams]);

    const yearOptions = useMemo<YearMonthOption[]>(() => {
        const options: YearMonthOption[] = [{ value: ALL, label: 'All Years' }];
        for (let y = currentYear; y >= currentYear - YEAR_RANGE; y--) {
            options.push({ value: String(y), label: String(y) });
        }
        return options;
    }, [currentYear]);

    const monthOptions = useMemo<YearMonthOption[]>(
        () => [
            { value: ALL, label: 'All Months' },
            ...MONTH_LABELS.map((label, index) => ({ value: String(index + 1), label })),
        ],
        []
    );

    const setYear = useCallback(
        (value: string) => {
            const next = new URLSearchParams(searchParams);
            next.set('year', value);
            if (value === ALL) {
                next.set('month', ALL);
            }
            setSearchParams(next, { replace: true });
        },
        [searchParams, setSearchParams]
    );

    const setMonth = useCallback(
        (value: string) => {
            const next = new URLSearchParams(searchParams);
            next.set('month', value);
            setSearchParams(next, { replace: true });
        },
        [searchParams, setSearchParams]
    );

    let description: string;
    if (year === ALL) {
        description = 'Select year and month';
    } else if (month === ALL) {
        description = 'Select month';
    } else {
        description = `Showing ${MONTH_LABELS[Number(month) - 1]} ${year}`;
    }

    return {
        year,
        month,
        filterYear: year === ALL ? undefined : Number(year),
        filterMonth: year === ALL || month === ALL ? undefined : Number(month),
        yearOptions,
        monthOptions,
        description,
        setYear,
        setMonth,
    };
}
