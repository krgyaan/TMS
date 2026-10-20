import {
    repointCsvIdList,
    csvIdListContains,
    repointIdArray,
    idArrayContains,
    parseLooseIdList,
    looseIdListContains,
    repointLooseIdList,
    NO_CSV_SENTINELS,
} from "./vendor-merge.util";

describe("repointCsvIdList", () => {
    it("returns empty-ish inputs unchanged", () => {
        expect(repointCsvIdList(null, 1, 2)).toBeNull();
        expect(repointCsvIdList(undefined, 1, 2)).toBeUndefined();
        expect(repointCsvIdList("", 1, 2)).toBe("");
    });

    it("passes sentinel values through untouched", () => {
        expect(repointCsvIdList("0", 1, 2)).toBe("0");
        expect(repointCsvIdList("1", 1, 2)).toBe("1");
    });

    it("returns the same reference when the drop id is absent", () => {
        const csv = "5,6,7";
        expect(repointCsvIdList(csv, 4, 9)).toBe(csv);
    });

    it("replaces the drop id with the keep id", () => {
        expect(repointCsvIdList("5,6,7", 6, 9)).toBe("5,9,7");
    });

    it("de-duplicates when keep id is already present", () => {
        expect(repointCsvIdList("5,6,9", 6, 9)).toBe("5,9");
        expect(repointCsvIdList("6,6,6", 6, 9)).toBe("9");
    });

    it("tolerates surrounding whitespace", () => {
        expect(repointCsvIdList(" 5 , 6 , 7 ", 6, 9)).toBe("5,9,7");
    });
});

describe("csvIdListContains", () => {
    it("matches a token, not a substring", () => {
        expect(csvIdListContains("15,26", 5)).toBe(false);
        expect(csvIdListContains("15,26", 15)).toBe(true);
        expect(csvIdListContains("15,26,5", 5)).toBe(true);
    });

    it("ignores sentinels and empty values", () => {
        expect(csvIdListContains("0", 0)).toBe(false);
        expect(csvIdListContains("1", 1)).toBe(false);
        expect(csvIdListContains(null, 1)).toBe(false);
    });

    it("applies sentinels only when the caller passes them", () => {
        expect(csvIdListContains("1", 1, NO_CSV_SENTINELS)).toBe(true);
        expect(csvIdListContains("1", 1)).toBe(false);
        expect(repointCsvIdList("1", 1, 9, NO_CSV_SENTINELS)).toBe("9");
        expect(repointCsvIdList("1", 1, 9)).toBe("1");
    });
});

describe("parseLooseIdList", () => {
    it("parses every real stored encoding", () => {
        expect(parseLooseIdList("0")).toEqual(["0"]);
        expect(parseLooseIdList("1")).toEqual(["1"]);
        expect(parseLooseIdList("3")).toEqual(["3"]);
        expect(parseLooseIdList("4,13")).toEqual(["4", "13"]);
        expect(parseLooseIdList("2,4,13")).toEqual(["2", "4", "13"]);
        expect(parseLooseIdList('{"44"}')).toEqual(["44"]);
        expect(parseLooseIdList('{"3"}')).toEqual(["3"]);
        expect(parseLooseIdList("{4,13}")).toEqual(["4", "13"]);
        expect(parseLooseIdList("{}")).toEqual([]);
        expect(parseLooseIdList("")).toEqual([]);
        expect(parseLooseIdList(null)).toEqual([]);
        expect(parseLooseIdList(undefined)).toEqual([]);
    });
});

describe("looseIdListContains", () => {
    it("matches across encodings without substring false positives", () => {
        expect(looseIdListContains("3", 3)).toBe(true);
        expect(looseIdListContains("4,13", 4)).toBe(true);
        expect(looseIdListContains("4,13", 13)).toBe(true);
        expect(looseIdListContains('{"44"}', 44)).toBe(true);
        expect(looseIdListContains('{"44"}', 4)).toBe(false);
        expect(looseIdListContains("4,13", 5)).toBe(false);
        expect(looseIdListContains("15,26", 5)).toBe(false);
        expect(looseIdListContains("{}", 0)).toBe(false);
        expect(looseIdListContains(null, 1)).toBe(false);
    });
});

describe("repointLooseIdList", () => {
    it("returns empty-ish inputs unchanged", () => {
        expect(repointLooseIdList(null, 1, 2)).toBeNull();
        expect(repointLooseIdList(undefined, 1, 2)).toBeUndefined();
        expect(repointLooseIdList("", 1, 2)).toBe("");
    });

    it("returns the same string when the drop id is absent", () => {
        expect(repointLooseIdList("4,13", 65, 9)).toBe("4,13");
        expect(repointLooseIdList('{"44"}', 65, 9)).toBe('{"44"}');
        expect(repointLooseIdList("3", 4, 9)).toBe("3");
        expect(repointLooseIdList("{}", 3, 9)).toBe("{}");
        expect(repointLooseIdList("0", 1, 9)).toBe("0");
    });

    it("preserves the bare encoding", () => {
        expect(repointLooseIdList("3", 3, 65)).toBe("65");
        expect(repointLooseIdList("1", 1, 65)).toBe("65");
    });

    it("preserves the CSV encoding and de-duplicates", () => {
        expect(repointLooseIdList("4,13", 13, 65)).toBe("4,65");
        expect(repointLooseIdList("2,4,13", 4, 13)).toBe("2,13");
        expect(repointLooseIdList("4,13,65", 13, 65)).toBe("4,65");
        expect(repointLooseIdList("13,13", 13, 65)).toBe("65");
    });

    it("preserves the pg-array encoding (quoted)", () => {
        expect(repointLooseIdList('{"44"}', 44, 65)).toBe('{"65"}');
        expect(repointLooseIdList('{"3","44"}', 44, 65)).toBe('{"3","65"}');
        expect(repointLooseIdList("{4,13}", 13, 65)).toBe('{"4","65"}');
    });

    it("round-trips through parseLooseIdList", () => {
        for (const [raw, drop] of [
            ["3", 3],
            ["4,13", 13],
            ['{"44"}', 44],
        ] as Array<[string, number]>) {
            const next = repointLooseIdList(raw, drop, 99) as string;
            expect(parseLooseIdList(next)).toEqual(parseLooseIdList(raw).map(t => (Number(t) === drop ? "99" : t)));
        }
    });
});

describe("repointIdArray", () => {
    it("works for jsonb number arrays", () => {
        expect(repointIdArray([10, 20, 30], 20, 99)).toEqual([10, 99, 30]);
        expect(repointIdArray([20, 20], 20, 99)).toEqual([99]);
    });

    it("works for text arrays of id strings", () => {
        expect(repointIdArray(["10", "20"], 20, 99)).toEqual(["10", "99"]);
    });

    it("returns the same reference when unchanged", () => {
        const arr = [1, 2, 3];
        expect(repointIdArray(arr, 9, 8)).toBe(arr);
    });

    it("handles null/undefined", () => {
        expect(repointIdArray(null, 1, 2)).toBeNull();
        expect(repointIdArray(undefined, 1, 2)).toBeUndefined();
    });
});

describe("idArrayContains", () => {
    it("matches numbers and numeric strings", () => {
        expect(idArrayContains([1, 2, 3], 2)).toBe(true);
        expect(idArrayContains(["1", "2"], 2)).toBe(true);
        expect(idArrayContains(["1", "2"], 3)).toBe(false);
        expect(idArrayContains(null, 1)).toBe(false);
    });
});
