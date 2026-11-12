import { ForbiddenException } from "@nestjs/common";
import { assertLiveMailAllowed } from "./follow-up.mail-environment";

describe("assertLiveMailAllowed", () => {
    const original = {
        nodeEnv: process.env.NODE_ENV,
        mailMode: process.env.MAIL_MODE,
    };

    afterEach(() => {
        if (original.nodeEnv === undefined) {
            delete process.env.NODE_ENV;
        } else {
            process.env.NODE_ENV = original.nodeEnv;
        }

        if (original.mailMode === undefined) {
            delete process.env.MAIL_MODE;
        } else {
            process.env.MAIL_MODE = original.mailMode;
        }
    });

    it("blocks live mail in development when MAIL_MODE is not sandbox", () => {
        process.env.NODE_ENV = "development";
        delete process.env.MAIL_MODE;

        expect(() => assertLiveMailAllowed()).toThrow(ForbiddenException);
    });

    it("allows sandbox mail in development", () => {
        process.env.NODE_ENV = "development";
        process.env.MAIL_MODE = "sandbox";

        expect(() => assertLiveMailAllowed()).not.toThrow();
    });

    it("allows live mail in production", () => {
        process.env.NODE_ENV = "production";
        process.env.MAIL_MODE = "production";

        expect(() => assertLiveMailAllowed()).not.toThrow();
    });
});
