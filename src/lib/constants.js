import { Bike, Wrench, MapPin, Users, LayoutDashboard, Package, ClipboardCheck, Home, Droplets, CalendarCheck, Columns3, Building2, MapPinned } from "lucide-react";

// ─── Authentication & Role-Based Access Control ──────────────────────
export const ROLES = { owner: "owner", manager: "manager", tech: "tech", client: "client" };

/** Permission matrix per ROADMAP Phase 2.2 */
export const PERMISSIONS = {
  owner: {
    dashboardFull: true, dashboardQueue: true,
    bicyclesAll: true, bicyclesEdit: true,
    workOrdersAll: true, workOrdersReassign: true, workOrdersEdit: true,
    partsViewCost: true, partsRequest: true, partsApproveOrder: true,
    toolsAll: true, toolsEdit: true,
    clientsAll: true, clientsEdit: true,
    suppliesAll: true, suppliesEdit: true,
    reports: true, userManagement: true, trip: true,
    viewWholesaleCost: true, deleteRecords: true,
    bookingsView: true, bookingsManage: true, bookingsCreate: true,
    toolsCheckout: true, toolLocationView: true,
  },
  manager: {
    dashboardFull: true, dashboardQueue: true,
    bicyclesAll: true, bicyclesEdit: true,
    workOrdersAll: true, workOrdersReassign: true, workOrdersEdit: true,
    partsViewCost: true, partsRequest: true, partsApproveOrder: false,
    toolsAll: true, toolsEdit: true,
    clientsAll: true, clientsEdit: false,
    suppliesAll: true, suppliesEdit: true,
    reports: true, userManagement: false, trip: true,
    viewWholesaleCost: true, deleteRecords: true,
    bookingsView: true, bookingsManage: true, bookingsCreate: true,
    toolsCheckout: true, toolLocationView: true,
  },
  tech: {
    dashboardFull: false, dashboardQueue: true,
    bicyclesAll: true, bicyclesEdit: false,
    workOrdersAll: false, workOrdersReassign: false, workOrdersEdit: true,
    partsViewCost: false, partsRequest: true, partsApproveOrder: false,
    toolsAll: true, toolsEdit: false,
    clientsAll: false, clientsEdit: false,
    suppliesAll: true, suppliesEdit: false,
    reports: false, userManagement: false, trip: false,
    viewWholesaleCost: false, deleteRecords: false,
    bookingsView: false, bookingsManage: false, bookingsCreate: false,
    toolsCheckout: true, toolLocationView: true,
  },
  client: {
    dashboardFull: false, dashboardQueue: false,
    clientDashboard: true, clientReportIssue: true, bookingsCreate: true,
    bicyclesAll: false, bicyclesEdit: false,
    workOrdersAll: false, workOrdersReassign: false, workOrdersEdit: false,
    partsViewCost: false, partsRequest: false, partsApproveOrder: false,
    toolsAll: false, toolsEdit: false,
    clientsAll: false, clientsEdit: false,
    suppliesAll: false, suppliesEdit: false,
    reports: false, userManagement: false, trip: false,
    viewWholesaleCost: false, deleteRecords: false,
    bookingsView: false, bookingsManage: false,
    toolsCheckout: false, toolLocationView: false,
  },
};

export const CHECKLIST_CATEGORIES = {
  preArrival: { label: "Pre-Arrival & Logistics", icon: "MapPin", order: 0 },
  wheelsAndTires: { label: "Wheels & Tires", icon: "Gauge", order: 1 },
  drivetrain: { label: "Drivetrain", icon: "Cog", order: 2 },
  brakes: { label: "Brakes", icon: "ShieldCheck", order: 3 },
  suspension: { label: "Suspension", icon: "Activity", order: 4, bikeTypes: ["Mountain", "E-Bike", "E-Dirt Bike"] },
  cockpitAndFrame: { label: "Cockpit & Frame", icon: "Wrench", order: 5 },
  eVehicle: { label: "E-Vehicle Systems", icon: "Zap", order: 6, bikeTypes: ["E-Bike", "E-Dirt Bike"] },
};

export const CHECKLIST_ITEMS_BASE = [
  // ── Pre-Arrival & Logistics ──
  { id: "pre-01", category: "preArrival", label: "Property location and access instructions confirmed" },
  { id: "pre-02", category: "preArrival", label: "Required tools identified and availability verified" },
  { id: "pre-03", category: "preArrival", label: "Required parts/consumables packed or confirmed on-site" },
  { id: "pre-04", category: "preArrival", label: "Pre-existing cosmetic damage documented (photos)" },

  // ── Wheels & Tires ──
  { id: "wt-01", category: "wheelsAndTires", label: "Wheel trueness checked (lateral and radial)" },
  { id: "wt-02", category: "wheelsAndTires", label: "Spoke tension uniform and adequate" },
  { id: "wt-03", category: "wheelsAndTires", label: "Tire pressure set to specification" },
  { id: "wt-04", category: "wheelsAndTires", label: "Tire tread wear within acceptable limits" },
  { id: "wt-05", category: "wheelsAndTires", label: "Tire sidewalls inspected for cuts or damage" },
  { id: "wt-06", category: "wheelsAndTires", label: "Tubeless sealant level checked (if applicable)" },
  { id: "wt-07", category: "wheelsAndTires", label: "Quick release / thru-axle torqued to spec" },
  { id: "wt-08", category: "wheelsAndTires", label: "Hub bearings smooth with no play" },

  // ── Drivetrain ──
  { id: "dt-01", category: "drivetrain", label: "Chain wear measured (stretch gauge)" },
  { id: "dt-02", category: "drivetrain", label: "Chain lubrication adequate" },
  { id: "dt-03", category: "drivetrain", label: "Front derailleur alignment and limit screws" },
  { id: "dt-04", category: "drivetrain", label: "Rear derailleur alignment and limit screws" },
  { id: "dt-05", category: "drivetrain", label: "Derailleur hanger alignment checked" },
  { id: "dt-06", category: "drivetrain", label: "Shifting through all gears smoothly (both directions)" },
  { id: "dt-07", category: "drivetrain", label: "Cassette wear assessed" },
  { id: "dt-08", category: "drivetrain", label: "Chainring teeth condition checked" },
  { id: "dt-09", category: "drivetrain", label: "Crankset bolts torqued to spec" },
  { id: "dt-10", category: "drivetrain", label: "Bottom bracket smooth with no play" },
  { id: "dt-11", category: "drivetrain", label: "Electronic shifting battery level (if applicable)" },
  { id: "dt-12", category: "drivetrain", label: "Electronic shifting firmware current (if applicable)" },

  // ── Brakes ──
  { id: "br-01", category: "brakes", label: "Brake pad thickness measured (front and rear)" },
  { id: "br-02", category: "brakes", label: "Rotor condition: no warping, scoring, or contamination" },
  { id: "br-03", category: "brakes", label: "Rotor thickness within wear limit" },
  { id: "br-04", category: "brakes", label: "Brake lever feel firm, no spongy action" },
  { id: "br-05", category: "brakes", label: "Hydraulic system: no leaks at caliper, hose, or lever" },
  { id: "br-06", category: "brakes", label: "Brake fluid type verified (MINERAL OIL vs DOT)" },
  { id: "br-07", category: "brakes", label: "Caliper alignment centered over rotor" },
  { id: "br-08", category: "brakes", label: "Brake bleed performed (if due)" },

  // ── Suspension (MTB, E-Bike, E-Dirt Bike only) ──
  { id: "su-01", category: "suspension", label: "Fork stanchions inspected (scratches, oil weep)" },
  { id: "su-02", category: "suspension", label: "Fork air pressure set to rider weight specification" },
  { id: "su-03", category: "suspension", label: "Fork rebound and compression settings recorded" },
  { id: "su-04", category: "suspension", label: "Rear shock air pressure set to specification" },
  { id: "su-05", category: "suspension", label: "Rear shock rebound and compression settings recorded" },
  { id: "su-06", category: "suspension", label: "Sag measured and within target range" },
  { id: "su-07", category: "suspension", label: "Pivot bearings checked for play (full suspension)" },
  { id: "su-08", category: "suspension", label: "Pivot bolts torqued to spec (full suspension)" },
  { id: "su-09", category: "suspension", label: "Dropper seatpost function and return speed" },

  // ── Cockpit & Frame ──
  { id: "cf-01", category: "cockpitAndFrame", label: "Headset bearing smooth with no play" },
  { id: "cf-02", category: "cockpitAndFrame", label: "Stem bolts torqued to spec" },
  { id: "cf-03", category: "cockpitAndFrame", label: "Handlebar bolts torqued to spec" },
  { id: "cf-04", category: "cockpitAndFrame", label: "Seatpost clamp torqued to spec" },
  { id: "cf-05", category: "cockpitAndFrame", label: "Saddle rails secure, position noted" },
  { id: "cf-06", category: "cockpitAndFrame", label: "Frame inspected for cracks, dents, or damage" },
  { id: "cf-07", category: "cockpitAndFrame", label: "Cable/housing condition: no fraying, kinks, or corrosion" },
  { id: "cf-08", category: "cockpitAndFrame", label: "Internal routing: cables move freely" },
  { id: "cf-09", category: "cockpitAndFrame", label: "Pedals secure and bearings smooth" },
  { id: "cf-10", category: "cockpitAndFrame", label: "All accessory mounts secure (bottle cages, lights, etc.)" },

  // ── E-Vehicle Systems (E-Bike, E-Dirt Bike only) ──
  { id: "ev-01", category: "eVehicle", label: "Battery charge level and health status" },
  { id: "ev-02", category: "eVehicle", label: "Battery mounting secure, contacts clean" },
  { id: "ev-03", category: "eVehicle", label: "Motor response: smooth engagement, no noise or hesitation" },
  { id: "ev-04", category: "eVehicle", label: "All assist levels cycling correctly" },
  { id: "ev-05", category: "eVehicle", label: "Display/controller functioning, firmware version noted" },
  { id: "ev-06", category: "eVehicle", label: "Wiring harness: no exposed wires, connectors sealed" },
  { id: "ev-07", category: "eVehicle", label: "Charging port clean and functional" },
  { id: "ev-08", category: "eVehicle", label: "Speed sensor alignment and function" },
  { id: "ev-09", category: "eVehicle", label: "Motor bearing condition (listen for grinding)" },
];

export const DEFAULT_PM_INTERVAL_DAYS = 60;
export const DEFAULT_PM_INTERVAL_RIDE_DAYS = 15;
export const PM_YELLOW_THRESHOLD_DAYS = 7;
export const PM_RIDE_DAY_YELLOW_THRESHOLD = 3;

export const TOOL_LOCATIONS = [
  { id: null, label: "Workshop", icon: Building2, color: "gray" },
  { id: "c1", label: "Hale Waterous", icon: MapPinned, color: "blue" },
  { id: "c2", label: "Holoholo", icon: MapPinned, color: "green" },
  { id: "c3", label: "Ehunani", icon: MapPinned, color: "purple" },
];

export const WO_STATUSES = [
  { key: "new", label: "New", color: "blue", bgCard: "border-l-blue-500" },
  { key: "diagnostics", label: "Diagnostics", color: "purple", bgCard: "border-l-purple-500" },
  { key: "in_progress", label: "In Progress", color: "yellow", bgCard: "border-l-yellow-500" },
  { key: "waiting_parts", label: "Waiting Parts", color: "orange", bgCard: "border-l-orange-500" },
  { key: "ready", label: "Ready", color: "green", bgCard: "border-l-green-500" },
  { key: "resolved", label: "Resolved", color: "gray", bgCard: "border-l-gray-400" },
];

export const WO_PRIORITIES = [
  { key: "urgent", label: "Urgent", color: "red" },
  { key: "high", label: "High", color: "orange" },
  { key: "normal", label: "Normal", color: "blue" },
  { key: "low", label: "Low", color: "gray" },
];

export const WO_TYPES = [
  { value: "preventative", label: "Preventative" },
  { value: "reactive", label: "Reactive" },
  { value: "inspection", label: "Inspection" },
  { value: "client_request", label: "Client Request" },
];

export const WO_CATEGORIES = ["General", "Brakes", "Drivetrain", "Tires/Wheels", "Suspension", "Frame", "Electrical"];

export const ALL_NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["owner", "manager"] },
  { key: "myqueue", label: "My Queue", icon: ClipboardCheck, roles: ["tech"] },
  { key: "clienthome", label: "My Property", icon: Home, roles: ["client"] },
  { key: "bicycles", label: "Bicycles", icon: Bike, roles: ["owner", "manager", "tech"] },
  { key: "clients", label: "Clients", icon: Users, roles: ["owner", "manager"] },
  { key: "tools", label: "Tools", icon: Wrench, roles: ["owner", "manager", "tech"] },
  { key: "workorders", label: "Work Orders", icon: Columns3, roles: ["owner", "manager", "tech"] },
  { key: "parts", label: "Parts", icon: Package, roles: ["owner", "manager", "tech"] },
  { key: "supplies", label: "Supplies", icon: Droplets, roles: ["owner", "manager", "tech"] },
  { key: "bookings", label: "Bookings", icon: CalendarCheck, roles: ["owner", "manager"] },
  { key: "trip", label: "Grant's UBI Trip", icon: MapPin, roles: ["owner", "manager"] },
];
