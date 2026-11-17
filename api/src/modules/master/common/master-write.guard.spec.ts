import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { RoleName } from "@/common/constants/roles.constant";
import type { ValidatedUser } from "@/modules/auth/strategies/jwt.strategy";
import { MasterWriteGuard } from "./master-write.guard";

function createContext(method: string, user?: Partial<ValidatedUser> | null): ExecutionContext {
    return {
        switchToHttp: () => ({
            getRequest: () => ({ method, user }),
        }),
    } as unknown as ExecutionContext;
}

describe("MasterWriteGuard", () => {
    const guard = new MasterWriteGuard();

    it("allows read requests without a user", () => {
        expect(guard.canActivate(createContext("GET"))).toBe(true);
        expect(guard.canActivate(createContext("HEAD"))).toBe(true);
        expect(guard.canActivate(createContext("OPTIONS"))).toBe(true);
    });

    it("rejects write requests without a user", () => {
        expect(() => guard.canActivate(createContext("POST"))).toThrow(ForbiddenException);
    });

    it("allows Admin and Super User writes", () => {
        expect(guard.canActivate(createContext("POST", { sub: 1, role: RoleName.ADMIN }))).toBe(true);

        expect(guard.canActivate(createContext("PATCH", { sub: 2, role: RoleName.SUPER_USER }))).toBe(true);
    });

    it("allows user id 7 even without an admin role", () => {
        expect(guard.canActivate(createContext("DELETE", { sub: 7, role: RoleName.EXECUTIVE }))).toBe(true);
    });

    it("rejects writes from other non-admin users", () => {
        expect(() => guard.canActivate(createContext("POST", { sub: 8, role: RoleName.EXECUTIVE }))).toThrow(ForbiddenException);

        expect(() => guard.canActivate(createContext("PATCH", { sub: 13, role: RoleName.TEAM_LEADER }))).toThrow(ForbiddenException);
    });
});
