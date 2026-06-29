import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("./secureStore", () => {
    return {
        default: {
            getWhatsAppToken: vi.fn(),
            setWhatsAppToken: vi.fn(),
            WHATSAPP_TOKEN_KEY: "whatsapp_token",
            SERVICE_NAME: "SSMS_SecureStore"
        }
    };
});

import { getEnv, getRequiredEnv, isWhatsAppConfigured, getSafeConfig } from "./envLoader";

describe("envLoader", () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        vi.resetModules();
        process.env = { ...originalEnv };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    describe("getEnv", () => {
        it("should return the value of an existing environment variable", () => {
            process.env.TEST_VAR = "hello";
            expect(getEnv("TEST_VAR")).toBe("hello");
        });

        it("should return the default value if the environment variable is not set", () => {
            expect(getEnv("NON_EXISTENT_VAR", "default_val")).toBe("default_val");
        });

        it("should return the default value if the environment variable is empty string", () => {
            process.env.EMPTY_VAR = "";
            expect(getEnv("EMPTY_VAR", "default_val")).toBe("default_val");
        });
    });

    describe("getRequiredEnv", () => {
        it("should return the value if the environment variable is set", () => {
            process.env.REQUIRED_VAR = "important";
            expect(getRequiredEnv("REQUIRED_VAR")).toBe("important");
        });

        it("should throw an error if the environment variable is not set", () => {
            expect(() => getRequiredEnv("MISSING_VAR")).toThrow("Required environment variable MISSING_VAR is not set");
        });

        it("should throw an error if the environment variable is empty string", () => {
            process.env.EMPTY_REQUIRED_VAR = "";
            expect(() => getRequiredEnv("EMPTY_REQUIRED_VAR")).toThrow("Required environment variable EMPTY_REQUIRED_VAR is not set");
        });
    });

    describe("isWhatsAppConfigured", () => {
        it("should return true if both WHATSAPP_TOKEN and PHONE_NUMBER_ID are set", () => {
            process.env.WHATSAPP_TOKEN = "token123";
            process.env.PHONE_NUMBER_ID = "phone123";
            expect(isWhatsAppConfigured()).toBe(true);
        });

        it("should return false if WHATSAPP_TOKEN is missing", () => {
            delete process.env.WHATSAPP_TOKEN;
            process.env.PHONE_NUMBER_ID = "phone123";
            expect(isWhatsAppConfigured()).toBe(false);
        });

        it("should return false if PHONE_NUMBER_ID is missing", () => {
            process.env.WHATSAPP_TOKEN = "token123";
            delete process.env.PHONE_NUMBER_ID;
            expect(isWhatsAppConfigured()).toBe(false);
        });
    });

    describe("getSafeConfig", () => {
        it("should return application configuration safely without exposing sensitive tokens", () => {
            process.env.NODE_ENV = "test";
            process.env.APP_NAME = "Test App";
            process.env.APP_VERSION = "1.0.0";
            process.env.WHATSAPP_TOKEN = "secret_token";
            process.env.PHONE_NUMBER_ID = "phone_id";

            const safeConfig = getSafeConfig();
            expect(safeConfig).toEqual({
                nodeEnv: "test",
                appName: "Test App",
                appVersion: "1.0.0",
                isWhatsAppConfigured: true,
            });
            expect(safeConfig).not.toHaveProperty("WHATSAPP_TOKEN");
            expect(safeConfig).not.toHaveProperty("PHONE_NUMBER_ID");
        });
    });
});
