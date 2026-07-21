export const ASSET_STATUS_KEYS = {
  ASSIGNED: "assigned",
  AVAILABLE: "available",
  UNDER_REPAIR: "under_repair",
  DAMAGED: "damaged",
  LOST: "lost",
  RETURNED: "returned",
  DISPOSED: "disposed",
} as const;

export const ASSET_STATUS: Record<string, string> = {
  assigned: "Assigned",
  available: "Available",
  under_repair: "Under Repair",
  damaged: "Damaged",
  lost: "Lost",
  returned: "Returned",
  disposed: "Disposed",
}

export const ASSET_CONDITION: Record<string, string> = {
  new: "New",
  good: "Good",
  fair: "Fair",
  poor: "Poor",
  damaged: "Damaged",
};

export const ASSET_TYPE: Record<string, string> = {
  laptop: "Laptop",
  desktop: "Desktop",
  mobile: "Mobile",
  monitor: "Monitor",
  keyboard: "Keyboard",
  mouse: "Mouse",
  printer: "Printer",
  id_card: "ID Card",
  access_card: "Access Card",
  sim_card: "SIM Card",
  other: "Other",
  car: "Car",
  bike: "Bike",
  scooter: "Scooter",
  bus: "Bus",
};

export const ASSET_CATEGORY: Record<string, string> = {
  it_equipment: "IT Equipment",
  vehicle: "Vehicle",
  documents: "Documents",
};

export const ASSET_LOCATION: Record<string, string> = {
  office: "Office",
  home: "Home",
  field: "Field",
  warehouse: "Warehouse",
  repair_center: "Repair Center",
};

export const DAMAGE_TYPE: Record<string, string> = {
  physical: "Physical Damage",
  water: "Water Damage",
  electrical: "Electrical Damage",
  software: "Software/System Failure",
  other: "Other",
};

export const DISPOSAL_TYPE: Record<string, string> = {  
  sold: "Sold",
  scrapped: "Scrapped",
  donated: "Donated",
  destroyed: "Destroyed",
  write_off: "Write-off",
  returned_to_vendor: "Returned to Vendor",
};

export const CATEGORY_TYPES: Record<string, string[]> = {
  it_equipment: ["laptop", "desktop", "mobile", "monitor", "keyboard", "mouse", "printer", "sim_card", "other"],
  vehicle: ["car", "bike", "scooter", "bus"],
  documents: ["id_card", "access_card"],
};

export const getTypesForCategory = (category?: string) =>
  toOptions(ASSET_TYPE).filter(({ value }) =>
    category ? (CATEGORY_TYPES[category] ?? []).includes(value) : true
  );

export const toOptions = (obj: Record<string, string>) =>
  Object.entries(obj).map(([value, label]) => ({ value, label }));

export const toValue = (obj: Record<string, string>, label: string) =>
  Object.keys(obj).find((key) => obj[key] === label) ?? "";