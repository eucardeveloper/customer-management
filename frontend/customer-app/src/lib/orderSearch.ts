/**
 * Search box on the orders screen. The placeholder promises "product, status or customer", so the
 * customer's NAME and the status as the user sees it (translated) must match too, not only the raw
 * product text, the customer id and the status code.
 */
export interface SearchableOrder {
  productName?: string;
  customerId?: number;
  status?: string;
}

export function orderMatchesSearch(
  order: SearchableOrder,
  query: string,
  customerName: string,
  statusLabel: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    (order.productName ?? '').toLowerCase().includes(q) ||
    customerName.toLowerCase().includes(q) ||
    String(order.customerId ?? '').includes(q) ||
    (order.status ?? '').toLowerCase().includes(q) ||
    statusLabel.toLowerCase().includes(q)
  );
}
