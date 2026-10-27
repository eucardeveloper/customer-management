/** Müşteri görünen adı: şirketlerde soyad boş/null gelebilir; "null" metni asla yazılmaz. */
export const customerFullName = (c: { firstName?: string | null; lastName?: string | null }): string =>
  [c.firstName, c.lastName].map(p => (p ?? '').trim()).filter(Boolean).join(' ');
