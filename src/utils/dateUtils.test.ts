import { describe, it, expect } from "vitest";
import { formatDateDisplay, formatDateReadable } from "./dateUtils";

describe("dateUtils", () => {
    describe("formatDateDisplay", () => {
        it("should format a valid Date object to DD/MM/YYYY", () => {
            const date = new Date(2026, 5, 27); // June 27, 2026 (Month is 0-indexed)
            expect(formatDateDisplay(date)).toBe("27/06/2026");
        });

        it("should format a valid date string to DD/MM/YYYY", () => {
            expect(formatDateDisplay("2026-06-27")).toBe("27/06/2026");
        });

        it("should return empty string for null, undefined or empty input", () => {
            expect(formatDateDisplay(null)).toBe("");
            expect(formatDateDisplay(undefined)).toBe("");
            expect(formatDateDisplay("")).toBe("");
        });

        it("should return empty string for invalid date strings", () => {
            expect(formatDateDisplay("invalid-date")).toBe("");
        });
    });

    describe("formatDateReadable", () => {
        it("should format a valid Date object to DD MMM YYYY", () => {
            const date = new Date(2026, 0, 9); // Jan 9, 2026
            expect(formatDateReadable(date)).toBe("09 Jan 2026");
        });

        it("should format a valid date string to DD MMM YYYY", () => {
            expect(formatDateReadable("2026-01-09")).toBe("09 Jan 2026");
        });

        it("should return empty string for null, undefined or empty input", () => {
            expect(formatDateReadable(null)).toBe("");
            expect(formatDateReadable(undefined)).toBe("");
            expect(formatDateReadable("")).toBe("");
        });

        it("should return empty string for invalid date strings", () => {
            expect(formatDateReadable("invalid-date")).toBe("");
        });
    });
});
