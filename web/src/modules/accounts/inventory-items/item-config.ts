import { ITEM_CATALOG, UNIT_OPTIONS, findCatalogItem } from "./item-catalog.ts";

export { UNIT_OPTIONS };
export type Unit = typeof UNIT_OPTIONS[number];
export const ITEM_GROUPS = ["Raw Materials", "Finished Goods", "Supplies"] as const;
export type ItemGroup = typeof ITEM_GROUPS[number];

export const categoryOptions = ITEM_CATALOG.map(category => ({ id: category.name, name: category.name }));
export const getCategory = (itemName?: string, categoryName?: string) => categoryName
    ? findCatalogItem(categoryName, itemName || "")
    : ITEM_CATALOG.find(category => category.items.some(item => item.name === itemName))?.items.find(item => item.name === itemName);

export const getCategoryNameForItem = (itemName?: string) => ITEM_CATALOG.find(category => category.items.some(item => item.name === itemName))?.name;
