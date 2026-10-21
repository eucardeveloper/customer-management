import { Chip } from '@mui/material';
import type { Lang } from './translations';

export interface Customer { id: number; firstName: string; lastName: string; email: string; phone: string; customerType?: string; }
export interface Order { id: number; customerId: number; productName: string; price: number; quantity: number; date: string; status?: string; }
export interface ChatMessage { role: 'user' | 'assistant'; content: string; }
export interface UserItem { id: number; username: string; email: string; role: string; }

export const emptyCustomer: Omit<Customer, 'id'> = { firstName: '', lastName: '', email: '', phone: '', customerType: 'INDIVIDUAL' };
export type CustomerType = 'individual' | 'company';
export const emptyOrder = { customerId: '', productName: '', price: '', quantity: '', status: 'PENDING' };
export const getQuickQuestionsAdmin = (t: (k: string) => string) => [t('aiQ1'), t('aiQ2'), t('aiQ3'), t('aiQ4')];
export const getQuickQuestionsUser = (t: (k: string) => string) => [t('aiQ5'), t('aiQ6'), t('aiQ3'), t('aiQ7')];
export const ORDER_STATUSES = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

// One label per status, used by chips, charts and dropdowns so they can never disagree.
export const statusText = (status: string, tFn: (k: string) => string) =>
  ({ PENDING: tFn('pending'), PROCESSING: tFn('processing'), SHIPPED: tFn('shipped'), DELIVERED: tFn('delivered'), CANCELLED: tFn('cancelled') } as Record<string, string>)[status] ?? status;

// A customer is a company when the data says COMPANY or CORPORATE (the seed data uses CORPORATE).
export const isCompany = (c: { customerType?: string }) => c.customerType === 'COMPANY' || c.customerType === 'CORPORATE';

export const statusChip = (status?: string, tFn?: (k: string) => string) => {
  const s = status ?? 'PENDING';
  const map: Record<string, { bg: string; color: string; border: string }> = {
    PENDING:   { bg: 'var(--amber-bg)', color: 'var(--amber-tx)', border: 'var(--amber-bd)' },
    PROCESSING: { bg: 'var(--surface-2)', color: 'var(--text2)', border: '#cbd5e1' },
    SHIPPED:   { bg: 'var(--blue-bg)', color: 'var(--blue-tx)', border: 'var(--blue-bd)' },
    DELIVERED: { bg: 'var(--green-bg)', color: 'var(--green-tx)', border: 'var(--green-bd)' },
    CANCELLED: { bg: 'var(--red-bg)', color: 'var(--red-tx)', border: 'var(--red-bd)' },
  };
  const style = map[s] ?? { bg: 'var(--surface-2)', color: '#64748b', border: 'var(--border)' };
  const labelMap: Record<string, string> = {
    PENDING: tFn ? tFn('pending') : 'Pending',
    PROCESSING: tFn ? tFn('processing') : 'Processing',
    SHIPPED: tFn ? tFn('shipped') : 'Shipped',
    DELIVERED: tFn ? tFn('delivered') : 'Delivered',
    CANCELLED: tFn ? tFn('cancelled') : 'Cancelled',
  };
  const chipLabel = labelMap[s] ?? s;
  return <Chip label={chipLabel} size="small" sx={{ bgcolor: style.bg, color: style.color, border: `1px solid ${style.border}`, fontWeight: 700, fontSize: '0.68rem', height: 22 }} />;
};

export const customerTypeChip = (c: Customer, tFn?: (k: string) => string) => {
  const type = c.customerType ?? (c.lastName?.trim() ? 'INDIVIDUAL' : 'COMPANY');
  const indLabel = tFn ? tFn('individual') : 'Individual';
  const comLabel = tFn ? tFn('company') : 'Company';
  if (type === 'INDIVIDUAL') return <Chip label={indLabel} size="small" sx={{ bgcolor: 'var(--blue-bg)', color: 'var(--blue-tx)', border: '1px solid var(--blue-bd)', fontSize: '0.7rem', fontWeight: 600 }} />;
  return <Chip label={comLabel} size="small" sx={{ bgcolor: 'var(--violet-bg)', color: '#7c3aed', border: '1px solid var(--violet-bd)', fontSize: '0.7rem', fontWeight: 600 }} />;
};

export const formatDate = (dateStr: string, lang: Lang = 'en') => {
  if (!dateStr) return '—';
  try { return new Date(dateStr).toLocaleDateString(lang === 'tr' ? 'tr-TR' : lang === 'de' ? 'de-DE' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return dateStr; }
};

export type TFn = (key: string) => string;
export type SessionUser = { username: string; role: string } | null;
export type TabKey = 'dashboard' | 'customers' | 'orders' | 'ai' | 'analytics' | 'users';
