// CAC and ROAS for one currency (PRD › Reporting page). Pure, so it is unit-tested.
// Attribution is approximate: spend is entered by hand and not linked to orders.

/** CAC = spend ÷ new paying customers, in minor units (rounded). Null when it can't be worked out. */
export function cac(spendMinor: number, newCustomers: number): number | null {
  if (spendMinor <= 0 || newCustomers <= 0) return null;
  return Math.round(spendMinor / newCustomers);
}

/** ROAS = revenue ÷ spend, as a ratio (e.g. 3.25 means 3.25× return). Null without spend. */
export function roas(revenueMinor: number, spendMinor: number): number | null {
  if (spendMinor <= 0) return null;
  return Math.round((revenueMinor / spendMinor) * 100) / 100;
}
