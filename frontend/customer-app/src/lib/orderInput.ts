type OrderLike = { customerId: number; productName: string; price: number; quantity: number; version?: number };

/**
 * Reads a price typed by a person: digits with an optional decimal comma or point and at most two decimals
 * (what the order service accepts). Anything else gives null, so the form can refuse it instead of silently
 * keeping a prefix ("1,5" must not become 1, "12abc" must not become 12). The price must be above zero.
 */
export function parsePrice(text: string): number | null {
  const t = text.trim();
  if (!/^\d{1,9}([.,]\d{1,2})?$/.test(t)) return null;
  const n = Number(t.replace(',', '.'));
  return n > 0 ? n : null;
}

/**
 * Body of the PUT that changes only the status of an order from the list. It carries the version the row was
 * loaded with, so the server refuses (409) when someone else changed the order meanwhile instead of writing
 * this row's old price and quantity back over their change.
 */
export function statusChangeBody(order: OrderLike, status: string): Record<string, unknown> {
  const body: Record<string, unknown> = {
    customerId: order.customerId, productName: order.productName, price: order.price, quantity: order.quantity, status,
  };
  if (order.version !== undefined) body.version = order.version;
  return body;
}
