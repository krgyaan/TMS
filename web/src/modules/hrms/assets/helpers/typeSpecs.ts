export interface TypeSpecField {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "date";
  placeholder?: string;
  options?: { value: string; label: string }[];
}

export const TYPE_SPECS: Record<string, TypeSpecField[]> = {
  laptop: [
    { key: "ram", label: "RAM", type: "text", placeholder: "e.g. 16GB DDR5" },
    { key: "storage", label: "Storage", type: "text", placeholder: "e.g. 512GB SSD" },
    { key: "processor", label: "Processor", type: "text", placeholder: "e.g. Apple M3 Pro" },
    { key: "screenSize", label: "Screen Size", type: "text", placeholder: "e.g. 14-inch" },
    { key: "os", label: "Operating System", type: "text", placeholder: "e.g. macOS Sonoma" },
    { key: "gpu", label: "GPU", type: "text", placeholder: "e.g. Integrated" },
  ],
  desktop: [
    { key: "ram", label: "RAM", type: "text", placeholder: "e.g. 32GB DDR5" },
    { key: "storage", label: "Storage", type: "text", placeholder: "e.g. 1TB NVMe SSD" },
    { key: "processor", label: "Processor", type: "text", placeholder: "e.g. Intel Core i7-14700K" },
    { key: "os", label: "Operating System", type: "text", placeholder: "e.g. Windows 11 Pro" },
    { key: "gpu", label: "GPU", type: "text", placeholder: "e.g. NVIDIA RTX 4080" },
    {
      key: "formFactor", label: "Form Factor", type: "select",
      options: [
        { value: "tower", label: "Tower" },
        { value: "mini", label: "Mini" },
        { value: "all-in-one", label: "All-in-One" },
        { value: "laptop", label: "Laptop" },
        { value: "thin-client", label: "Thin Client" },
        { value: "nuc", label: "NUC" },
      ],
    },
  ],
  mobile: [
    { key: "ram", label: "RAM", type: "text", placeholder: "e.g. 8GB LPDDR5" },
    { key: "storage", label: "Storage", type: "text", placeholder: "e.g. 256GB" },
    { key: "screenSize", label: "Screen Size", type: "text", placeholder: "e.g. 6.7-inch" },
    { key: "os", label: "Operating System", type: "text", placeholder: "e.g. Android 14" },
    { key: "batteryCapacity", label: "Battery Capacity", type: "text", placeholder: "e.g. 5000mAh" },
    { key: "processor", label: "Processor", type: "text", placeholder: "e.g. Snapdragon 8 Gen 3" },
  ],
  monitor: [
    { key: "screenSize", label: "Screen Size", type: "text", placeholder: "e.g. 27-inch" },
    { key: "resolution", label: "Resolution", type: "text", placeholder: "e.g. 3840x2160" },
    { key: "refreshRate", label: "Refresh Rate", type: "text", placeholder: "e.g. 144Hz" },
    {
      key: "panelType", label: "Panel Type", type: "select",
      options: [
        { value: "ips", label: "IPS" },
        { value: "va", label: "VA" },
        { value: "tn", label: "TN" },
        { value: "oled", label: "OLED" },
        { value: "mini-led", label: "Mini-LED" },
      ],
    },
  ],
  keyboard: [
    {
      key: "switchType", label: "Switch Type", type: "select",
      options: [
        { value: "mechanical", label: "Mechanical" },
        { value: "membrane", label: "Membrane" },
        { value: "scissor", label: "Scissor Switch" },
        { value: "optical", label: "Optical" },
      ],
    },
    { key: "layout", label: "Layout", type: "text", placeholder: "e.g. ANSI 104-key" },
    {
      key: "connection", label: "Connection", type: "select",
      options: [
        { value: "wired", label: "Wired (USB)" },
        { value: "wireless-2.4", label: "Wireless 2.4GHz" },
        { value: "bluetooth", label: "Bluetooth" },
      ],
    },
  ],
  mouse: [
    {
      key: "connection", label: "Connection", type: "select",
      options: [
        { value: "wired", label: "Wired (USB)" },
        { value: "wireless-2.4", label: "Wireless 2.4GHz" },
        { value: "bluetooth", label: "Bluetooth" },
      ],
    },
    { key: "dpi", label: "DPI", type: "text", placeholder: "e.g. 1600 DPI" },
    { key: "buttons", label: "Number of Buttons", type: "number", placeholder: "e.g. 6" },
  ],
  printer: [
    {
      key: "printerType", label: "Printer Type", type: "select",
      options: [
        { value: "laser", label: "Laser" },
        { value: "inkjet", label: "Inkjet" },
        { value: "dot-matrix", label: "Dot Matrix" },
        { value: "thermal", label: "Thermal" },
      ],
    },
    { key: "speed", label: "Print Speed", type: "text", placeholder: "e.g. 30 ppm" },
    {
      key: "colorSupport", label: "Color Support", type: "select",
      options: [
        { value: "color", label: "Color" },
        { value: "mono", label: "Monochrome" },
      ],
    },
    {
      key: "connection", label: "Connection", type: "select",
      options: [
        { value: "usb", label: "USB" },
        { value: "ethernet", label: "Ethernet" },
        { value: "wifi", label: "WiFi" },
        { value: "bluetooth", label: "Bluetooth" },
      ],
    },
  ],
  vehicle: [
    { key: "licensePlate", label: "License Plate", type: "text", placeholder: "e.g. MH-01-AB-1234" },
    {
      key: "fuelType", label: "Fuel Type", type: "select",
      options: [
        { value: "petrol", label: "Petrol" },
        { value: "diesel", label: "Diesel" },
        { value: "cng", label: "CNG" },
        { value: "ev", label: "Electric" },
        { value: "hybrid", label: "Hybrid" },
      ],
    },
    { key: "color", label: "Color", type: "text", placeholder: "e.g. White" },
    { key: "year", label: "Year", type: "number", placeholder: "e.g. 2024" },
    { key: "engineNumber", label: "Engine Number", type: "text" },
    { key: "chassisNumber", label: "Chassis Number", type: "text" },
  ],
  id_card: [
    { key: "employeeName", label: "Employee Name", type: "text" },
    { key: "designation", label: "Designation", type: "text" },
    { key: "validFrom", label: "Valid From", type: "date" },
    { key: "validUntil", label: "Valid Until", type: "date" },
  ],
  access_card: [
    { key: "accessLevel", label: "Access Level", type: "text", placeholder: "e.g. Level 3" },
    { key: "zones", label: "Accessible Zones", type: "text", placeholder: "e.g. Floor 1-5, Server Room" },
    { key: "validFrom", label: "Valid From", type: "date" },
    { key: "validUntil", label: "Valid Until", type: "date" },
  ],
  sim_card: [
    { key: "phoneNumber", label: "Phone Number", type: "text", placeholder: "e.g. +91 98765 43210" },
    { key: "networkProvider", label: "Network Provider", type: "text", placeholder: "e.g. Airtel, Jio" },
    { key: "imei", label: "SIM IMEI", type: "number", placeholder: "Written on SIM Card" }
  ],
  other: [],
  car: [
    { key: "licensePlate", label: "License Plate", type: "text", placeholder: "e.g. MH-01-AB-1234" },
    { key: "fuelType", label: "Fuel Type", type: "select", options: [
      { value: "petrol", label: "Petrol" },
      { value: "diesel", label: "Diesel" },
      { value: "cng", label: "CNG" },
      { value: "ev", label: "Electric" },
      { value: "hybrid", label: "Hybrid" },
    ]},
    { key: "color", label: "Color", type: "text", placeholder: "e.g. White" },
    { key: "year", label: "Year", type: "number", placeholder: "e.g. 2024" },
    { key: "engineNumber", label: "Engine Number", type: "text" },
    { key: "chassisNumber", label: "Chassis Number", type: "text" },
  ],
  bike: [
    { key: "licensePlate", label: "License Plate", type: "text", placeholder: "e.g. MH-01-AB-1234" },
    { key: "fuelType", label: "Fuel Type", type: "select", options: [
      { value: "petrol", label: "Petrol" },
      { value: "ev", label: "Electric" },
    ]},
    { key: "color", label: "Color", type: "text", placeholder: "e.g. Red" },
    { key: "cc", label: "Engine CC", type: "text", placeholder: "e.g. 150cc" },
  ],
  scooter: [
    { key: "licensePlate", label: "License Plate", type: "text", placeholder: "e.g. MH-01-AB-1234" },
    { key: "fuelType", label: "Fuel Type", type: "select", options: [
      { value: "petrol", label: "Petrol" },
      { value: "ev", label: "Electric" },
    ]},
    { key: "color", label: "Color", type: "text", placeholder: "e.g. Blue" },
    { key: "batteryCapacity", label: "Battery Capacity", type: "text", placeholder: "e.g. 3 kWh" },
  ],
  bus: [
    { key: "licensePlate", label: "License Plate", type: "text", placeholder: "e.g. MH-01-AB-1234" },
    { key: "fuelType", label: "Fuel Type", type: "select", options: [
      { value: "diesel", label: "Diesel" },
      { value: "cng", label: "CNG" },
      { value: "ev", label: "Electric" },
    ]},
    { key: "capacity", label: "Seating Capacity", type: "number", placeholder: "e.g. 40" },
    { key: "color", label: "Color", type: "text", placeholder: "e.g. White" },
    { key: "year", label: "Year", type: "number", placeholder: "e.g. 2024" },
  ],
};

export const getTypeSpecFields = (assetType: string): TypeSpecField[] => {
  return TYPE_SPECS[assetType] ?? [];
};
