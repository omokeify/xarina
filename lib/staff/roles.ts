// Pure role → permission mapping (PRD › Users and roles). No server imports so
// it can be unit-tested. The database enforces the same rules through RLS and
// is_staff(); this file only decides what the admin UI shows.

export const STAFF_ROLES = ["owner", "manager", "merchandiser", "fulfilment", "support"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export type AdminSection = {
  href: string;
  label: string;
  roles: readonly StaffRole[];
};

const ALL = STAFF_ROLES;

export const ADMIN_SECTIONS: readonly AdminSection[] = [
  { href: "/admin", label: "Overview", roles: ALL },
  { href: "/admin/products", label: "Products", roles: ["owner", "manager", "merchandiser"] },
  { href: "/admin/drops", label: "Drops", roles: ["owner", "manager", "merchandiser"] },
  { href: "/admin/orders", label: "Orders", roles: ["owner", "manager", "fulfilment", "support"] },
  { href: "/admin/customers", label: "Customers", roles: ["owner", "manager", "support"] },
  { href: "/admin/content", label: "Content", roles: ["owner", "manager", "merchandiser"] },
  { href: "/admin/reports", label: "Reports", roles: ["owner", "manager"] },
  { href: "/admin/analytics", label: "Analytics", roles: ["owner", "manager"] },
  { href: "/admin/audit", label: "Audit log", roles: ["owner", "manager"] }, // ADM-7
  { href: "/admin/staff", label: "Staff", roles: ["owner"] },
  { href: "/admin/settings", label: "Settings", roles: ["owner"] },
];

export function sectionsFor(role: StaffRole): AdminSection[] {
  return ADMIN_SECTIONS.filter((s) => s.roles.includes(role));
}

/** Capabilities that are finer-grained than a whole section. */
export const can = {
  changePrices: (r: StaffRole) => r === "owner" || r === "manager",
  publish: (r: StaffRole) => r === "owner" || r === "manager",
  exportCustomers: (r: StaffRole) => r === "owner" || r === "manager", // CRM-3
  approvePrive: (r: StaffRole) => r === "owner" || r === "manager", // VIP-1
  manageStaff: (r: StaffRole) => r === "owner",
};

export function isStaffRole(value: unknown): value is StaffRole {
  return typeof value === "string" && (STAFF_ROLES as readonly string[]).includes(value);
}
