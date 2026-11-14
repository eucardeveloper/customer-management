const DATE = /^\d{4}-\d{2}-\d{2}$/;

export interface OrderFilters { status: string; from: string; to: string }
export const EMPTY_ORDER_FILTERS: OrderFilters = { status: '', from: '', to: '' };

export function hasOrderFilters(f: OrderFilters): boolean {
  return f.status !== '' || f.from !== '' || f.to !== '';
}

/** True when both dates are set and the end is before the start. */
export function isOrderRangeInvalid(f: OrderFilters): boolean {
  return DATE.test(f.from) && DATE.test(f.to) && f.to < f.from;
}

/** Status is exact (a missing status is shown as pending, so it counts as pending); dates are inclusive whole days by calendar day. */
export function filterOrders<T extends { status?: string; date?: string }>(orders: readonly T[], f: OrderFilters): T[] {
  const range = !isOrderRangeInvalid(f);
  return orders.filter((o) => {
    if (f.status && (o.status ?? 'PENDING') !== f.status) return false;
    if (!range) return true;
    const hasFrom = DATE.test(f.from);
    const hasTo = DATE.test(f.to);
    if (!hasFrom && !hasTo) return true;
    const day = (o.date ?? '').slice(0, 10);
    if (!DATE.test(day)) return false;
    return (!hasFrom || day >= f.from) && (!hasTo || day <= f.to);
  });
}

export type CustomerKind = 'INDIVIDUAL' | 'COMPANY';

/** Same rule as the type chip: the stored type wins (COMPANY and CORPORATE are companies); without one, a last name means a person. */
export function customerKind(c: { customerType?: string; lastName?: string }): CustomerKind {
  if (c.customerType) return c.customerType === 'COMPANY' || c.customerType === 'CORPORATE' ? 'COMPANY' : 'INDIVIDUAL';
  return c.lastName?.trim() ? 'INDIVIDUAL' : 'COMPANY';
}

export function filterCustomersByKind<T extends { customerType?: string; lastName?: string }>(rows: readonly T[], kind: '' | CustomerKind): T[] {
  return kind ? rows.filter((c) => customerKind(c) === kind) : [...rows];
}

export function filterUsersByRole<T extends { role: string }>(rows: readonly T[], role: string): T[] {
  return role ? rows.filter((u) => u.role === role) : [...rows];
}
