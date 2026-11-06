import { METHOD_METADATA, PATH_METADATA } from "@nestjs/common/constants";
import { PERMISSIONS_KEY } from "@/modules/auth/guards/permission.guard";
import { AccountsInventoryItemsController } from "./inventory-items.controller";
import { OperationsInventoryItemsController } from "./operations-inventory-items.controller";
import { SettingsInventoryItemsController } from "./settings-inventory-items.controller";

const methodPermission = (controller: Function, method: string) =>
    Reflect.getMetadata(PERMISSIONS_KEY, controller.prototype[method as keyof typeof controller.prototype]);

describe("Item Master API permission separation", () => {
    it.each([
        [AccountsInventoryItemsController, "list"],
        [AccountsInventoryItemsController, "get"],
    ])("limits Accounts %s to read permission", (controller, method) => {
        expect(methodPermission(controller, method)).toEqual([{ module: "accounts.item-master", action: "read" }]);
    });

    it.each([
        [OperationsInventoryItemsController, "list"],
        [OperationsInventoryItemsController, "get"],
    ])("limits Operations %s to read permission", (controller, method) => {
        expect(methodPermission(controller, method)).toEqual([{ module: "operations.item-master", action: "read" }]);
    });

    it.each([
        ["list", "read"], ["get", "read"], ["create", "create"], ["update", "update"], ["delete", "delete"],
    ])("protects Settings %s with master.item-master:%s", (method, action) => {
        expect(methodPermission(SettingsInventoryItemsController, method)).toEqual([{ module: "master.item-master", action }]);
    });

    it("registers write routes only on the Settings controller", () => {
        const path = (controller: Function) => Reflect.getMetadata(PATH_METADATA, controller);
        expect(path(AccountsInventoryItemsController)).toBe("accounts/item-master");
        expect(path(OperationsInventoryItemsController)).toBe("operations/item-master");
        expect(path(SettingsInventoryItemsController)).toBe("master/item-master");
        for (const controller of [AccountsInventoryItemsController, OperationsInventoryItemsController]) {
            for (const method of Object.getOwnPropertyNames(controller.prototype)) {
                if (method === "constructor") continue;
                expect(Reflect.getMetadata(METHOD_METADATA, controller.prototype[method as keyof typeof controller.prototype])).toBe(0);
            }
        }
    });
});
