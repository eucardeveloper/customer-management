/** Filters of one audit feed. Every field is a plain string from an input; blanks mean "no filter". */
export interface AuditFilters {
  /** Order number (orders feed), customer number (customers feed) or account name (accounts feed). */
  subject: string;
  action: string;
  actor: string;
  /** yyyy-mm-dd */
  from: string;
  to: string;
}

export type AuditFeedName = 'orders' | 'customers' | 'accounts';

export const EMPTY_AUDIT_FILTERS: AuditFilters = { subject: '', action: '', actor: '', from: '', to: '' };

const SUBJECT_PARAM: Record<AuditFeedName, string> = { orders: 'orderId', customers: 'customerId', accounts: 'target' };
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** The query string for one audit request. Anything that is not a valid value is left out instead of being sent. */
export function buildAuditQuery(feed: AuditFeedName, filters: AuditFilters, page: number, size: number): string {
  const parts = [`page=${page}`, `size=${size}`];
  const add = (name: string, value: string) => parts.push(`${name}=${encodeURIComponent(value)}`);
  const subject = filters.subject.trim();
  if (subject && (feed === 'accounts' || /^\d+$/.test(subject))) add(SUBJECT_PARAM[feed], subject);
  if (filters.action.trim()) add('action', filters.action.trim());
  if (filters.actor.trim()) add('actor', filters.actor.trim());
  if (DATE.test(filters.from)) add('from', filters.from);
  if (DATE.test(filters.to)) add('to', filters.to);
  return parts.join('&');
}

export function hasActiveFilters(filters: AuditFilters): boolean {
  return Object.values(filters).some((v) => v.trim() !== '');
}

/** True when both dates are set and the end is before the start (the server answers 400 for that). */
export function isRangeInvalid(filters: AuditFilters): boolean {
  return DATE.test(filters.from) && DATE.test(filters.to) && filters.to < filters.from;
}
