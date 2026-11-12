jest.mock("./follow-up.mail-data", () => ({
    FollowupMailDataBuilder: class {
        async build() {
            return null;
        }
    },
}));

import { FollowUpService } from "./follow-up.service";
import { FollowupMailDataBuilder } from "./follow-up.mail-data";

describe("FollowUpService.processFollowupMail", () => {
    const payload = {
        template: { name: "followup-default", basePath: "modules/follow-up/mails" },
        context: {},
        to: ["recipient@example.com"],
        cc: [],
        subject: "Test follow-up",
        assignedToUserId: 1,
    };

    const createService = (row: Record<string, any> | null) => {
        const limit = jest.fn().mockResolvedValue(row ? [row] : []);
        const where = jest.fn().mockReturnValue({ limit });
        const from = jest.fn().mockReturnValue({ where });
        const select = jest.fn().mockReturnValue({ from });

        const db = { select } as any;
        const mailerService = { sendMail: jest.fn() } as any;
        const logger = { info: jest.fn(), warn: jest.fn(), debug: jest.fn(), error: jest.fn() } as any;

        const service = new FollowUpService(
            db,
            mailerService,
            {} as any,
            logger,
            {} as any,
            {} as any,
            {} as any
        );

        (service as any).resolveGoogleConnection = jest
            .fn()
            .mockResolvedValue({ userId: 1, hasRefreshToken: true });

        return { service, mailerService, logger };
    };

    const baseRow = {
        id: 1,
        assignmentStatus: "initiated",
        frequency: 1,
        startFrom: "2020-01-01",
        details: "<p>Hello</p>",
        deletedAt: null,
    };

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("rethrows mail send failures so BullMQ can retry", async () => {
        const { service, mailerService } = createService(baseRow);
        jest.spyOn(FollowupMailDataBuilder.prototype, "build").mockResolvedValue(payload as any);
        const markReminderSent = jest
            .spyOn(service, "markReminderSent")
            .mockImplementation(async () => undefined);

        mailerService.sendMail.mockRejectedValue(new Error("boom"));

        await expect(service.processFollowupMail(1, 1)).rejects.toThrow("boom");
        expect(markReminderSent).not.toHaveBeenCalled();
    });

    it("marks the reminder as sent after a successful send", async () => {
        const { service, mailerService } = createService(baseRow);
        jest.spyOn(FollowupMailDataBuilder.prototype, "build").mockResolvedValue(payload as any);
        const markReminderSent = jest
            .spyOn(service, "markReminderSent")
            .mockImplementation(async () => undefined);

        mailerService.sendMail.mockResolvedValue(undefined);

        await service.processFollowupMail(1, 1);

        expect(mailerService.sendMail).toHaveBeenCalledTimes(1);
        expect(markReminderSent).toHaveBeenCalledWith(1);
    });

    it("skips follow-ups that are not initiated", async () => {
        const { service, mailerService } = createService({ ...baseRow, assignmentStatus: "assigned" });
        const build = jest.spyOn(FollowupMailDataBuilder.prototype, "build").mockResolvedValue(payload as any);
        const markReminderSent = jest
            .spyOn(service, "markReminderSent")
            .mockImplementation(async () => undefined);

        await service.processFollowupMail(1, 1);

        expect(build).not.toHaveBeenCalled();
        expect(mailerService.sendMail).not.toHaveBeenCalled();
        expect(markReminderSent).not.toHaveBeenCalled();
    });

    it("skips when the mail body is empty", async () => {
        const { service, mailerService } = createService({ ...baseRow, details: "<p>&nbsp;</p>" });
        const build = jest.spyOn(FollowupMailDataBuilder.prototype, "build").mockResolvedValue(payload as any);
        const markReminderSent = jest
            .spyOn(service, "markReminderSent")
            .mockImplementation(async () => undefined);

        await service.processFollowupMail(1, 1);

        expect(build).not.toHaveBeenCalled();
        expect(mailerService.sendMail).not.toHaveBeenCalled();
        expect(markReminderSent).not.toHaveBeenCalled();
    });

    it("skips when the queued frequency no longer matches", async () => {
        const { service, mailerService } = createService({ ...baseRow, frequency: 4 });
        jest.spyOn(FollowupMailDataBuilder.prototype, "build").mockResolvedValue(payload as any);

        await service.processFollowupMail(1, 1);

        expect(mailerService.sendMail).not.toHaveBeenCalled();
    });

    it("throws when the Google connection has no refresh token", async () => {
        const { service } = createService(baseRow);
        jest.spyOn(FollowupMailDataBuilder.prototype, "build").mockResolvedValue(payload as any);
        (service as any).resolveGoogleConnection = jest
            .fn()
            .mockResolvedValue({ userId: 1, hasRefreshToken: false });

        await expect(service.processFollowupMail(1, 1)).rejects.toThrow("refresh token");
    });
});
