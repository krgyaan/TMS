// src/pages/hrms/assets/constants.ts
export const ASSET_STATUS = {
  ASSIGNED: "1",
  AVAILABLE: "2",
  UNDER_REPAIR: "3",
  DAMAGED: "4",
  LOST: "5",
  RETURNED: "6",
} as const;

export const ASSET_STATUS_LABELS: Record<string, string> = {
  "1": "Assigned",
  "2": "Available",
  "3": "Under Repair",
  "4": "Damaged",
  "5": "Lost",
  "6": "Returned",
};

export const ASSET_CONDITION: Record<string, string> = {
  "1": "New",
  "2": "Good",
  "3": "Fair",
  "4": "Poor",
  "5": "Damaged",
};

export const ASSET_TYPE: Record<string, string> = {
  "1": "Laptop",
  "2": "Desktop",
  "3": "Mobile",
  "4": "Monitor",
  "5": "Keyboard",
  "6": "Mouse",
  "7": "Printer",
  "8": "Vehicle",
  "9": "ID Card",
  "10": "Access Card",
  "11": "SIM Card",
  "12": "Other",
};

export const ASSET_CATEGORY: Record<string, string> = {
  "1": "IT Equipment",
  "2": "Office Furniture",
  "3": "Vehicle",
  "4": "Stationery",
};

export const ASSET_LOCATION: Record<string, string> = {
  "1": "Office",
  "2": "Home",
  "3": "Field",
  "4": "Warehouse",
  "5": "Repair Center",
};

export const DAMAGE_TYPE: Record<string, string> = {
  "1": "Physical Damage",
  "2": "Water Damage",
  "3": "Electrical Damage",
  "4": "Software/System Failure",
  "5": "Other",
};

export const ACCESSORIES_LIST = [
  { id: "charger", label: "Charger" },
  { id: "battery", label: "Battery" },
  { id: "bag", label: "Bag/Case" },
  { id: "mouse", label: "Mouse" },
  { id: "keyboard", label: "Keyboard" },
  { id: "cables", label: "Cables" },
  { id: "adapter", label: "Adapter" },
  { id: "headphones", label: "Headphones" },
  { id: "stand", label: "Stand/Dock" },
  { id: "stylus", label: "Stylus/Pen" },
];

export const toOptions = (obj: Record<string, string>) =>
  Object.entries(obj).map(([value, label]) => ({ value, label }));

export const toValue = (obj: Record<string, string>, label: string) =>
  Object.keys(obj).find((key) => obj[key] === label) ?? "";