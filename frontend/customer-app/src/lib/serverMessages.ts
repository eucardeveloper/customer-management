import type { Lang } from '../app/translations';

/**
 * The backends answer in English. The UI is trilingual, so the known validation and
 * business-rule messages are mapped here; anything unknown is shown as the server sent it.
 */
type Entry = { match: RegExp; en: string; tr: string; de: string };

const ENTRIES: Entry[] = [
  { match: /^Username is required$/i, en: 'Username is required', tr: 'Kullanıcı adı gerekli', de: 'Benutzername ist erforderlich' },
  { match: /^Password is required$/i, en: 'Password is required', tr: 'Şifre gerekli', de: 'Passwort ist erforderlich' },
  { match: /^Email is required$/i, en: 'Email is required', tr: 'E-posta gerekli', de: 'E-Mail ist erforderlich' },
  { match: /^Password must be at least 8 characters$/i, en: 'Password must be at least 8 characters', tr: 'Şifre en az 8 karakter olmalı', de: 'Das Passwort muss mindestens 8 Zeichen lang sein' },
  { match: /^Password must be 8-72 characters$/i, en: 'Password must be 8-72 characters', tr: 'Şifre 8-72 karakter olmalı', de: 'Das Passwort muss 8-72 Zeichen lang sein' },
  { match: /^Username or email already taken$/i, en: 'Username or email already taken', tr: 'Bu kullanıcı adı veya e-posta zaten kullanılıyor', de: 'Benutzername oder E-Mail bereits vergeben' },
  { match: /^Invalid email format$/i, en: 'Invalid email format', tr: 'Geçersiz e-posta biçimi', de: 'Ungültiges E-Mail-Format' },
  { match: /^Username already taken/i, en: 'Username already taken', tr: 'Bu kullanıcı adı zaten alınmış', de: 'Benutzername bereits vergeben' },
  { match: /^Email already registered/i, en: 'Email already registered', tr: 'Bu e-posta zaten kayıtlı', de: 'E-Mail bereits registriert' },
  { match: /^Current password is incorrect$/i, en: 'Current password is incorrect', tr: 'Mevcut şifre yanlış', de: 'Das aktuelle Passwort ist falsch' },
  { match: /^New password must be different from the current one$/i, en: 'New password must be different from the current one', tr: 'Yeni şifre mevcut şifreden farklı olmalı', de: 'Das neue Passwort muss sich vom aktuellen unterscheiden' },
  { match: /^Invalid username or password$/i, en: 'Invalid username or password', tr: 'Kullanıcı adı veya şifre hatalı', de: 'Benutzername oder Passwort ist falsch' },
  { match: /^User not found/i, en: 'User not found', tr: 'Kullanıcı bulunamadı', de: 'Benutzer nicht gefunden' },
  { match: /^Customer not found/i, en: 'Customer not found', tr: 'Müşteri bulunamadı', de: 'Kunde nicht gefunden' },
  { match: /^Order not found/i, en: 'Order not found', tr: 'Sipariş bulunamadı', de: 'Bestellung nicht gefunden' },
  { match: /^First name is required$/i, en: 'First name is required', tr: 'Ad gerekli', de: 'Vorname ist erforderlich' },
  { match: /^First name must be at most 100 characters$/i, en: 'First name must be at most 100 characters', tr: 'Ad en fazla 100 karakter olabilir', de: 'Der Vorname darf höchstens 100 Zeichen lang sein' },
  { match: /^Last name must be at most 100 characters$/i, en: 'Last name must be at most 100 characters', tr: 'Soyad en fazla 100 karakter olabilir', de: 'Der Nachname darf höchstens 100 Zeichen lang sein' },
  { match: /^Phone may contain only/i, en: 'Phone may contain only digits, +, spaces, - and parentheses', tr: 'Telefon yalnızca rakam, +, boşluk, - ve parantez içerebilir', de: 'Die Telefonnummer darf nur Ziffern, +, Leerzeichen, - und Klammern enthalten' },
  { match: /^Phone must be at most 20 characters$/i, en: 'Phone must be at most 20 characters', tr: 'Telefon en fazla 20 karakter olabilir', de: 'Die Telefonnummer darf höchstens 20 Zeichen lang sein' },
  { match: /^Customer type must be/i, en: 'Customer type must be INDIVIDUAL or COMPANY', tr: 'Müşteri türü INDIVIDUAL veya COMPANY olmalı', de: 'Der Kundentyp muss INDIVIDUAL oder COMPANY sein' },
  { match: /^Customer ID is required$/i, en: 'Customer ID is required', tr: 'Müşteri kimliği gerekli', de: 'Kunden-ID ist erforderlich' },
  { match: /^Product name is required$/i, en: 'Product name is required', tr: 'Ürün adı gerekli', de: 'Produktname ist erforderlich' },
  { match: /^Price is required$/i, en: 'Price is required', tr: 'Fiyat gerekli', de: 'Preis ist erforderlich' },
  { match: /^Price must be positive$/i, en: 'Price must be positive', tr: 'Fiyat pozitif olmalı', de: 'Der Preis muss positiv sein' },
  { match: /^Quantity is required$/i, en: 'Quantity is required', tr: 'Adet gerekli', de: 'Menge ist erforderlich' },
  { match: /^Quantity must be at least 1$/i, en: 'Quantity must be at least 1', tr: 'Adet en az 1 olmalı', de: 'Die Menge muss mindestens 1 betragen' },
  { match: /^Status must be/i, en: 'Invalid order status', tr: 'Geçersiz sipariş durumu', de: 'Ungültiger Bestellstatus' },
  { match: /^Unknown role/i, en: 'Unknown role', tr: 'Bilinmeyen rol', de: 'Unbekannte Rolle' },
  { match: /^role is required$/i, en: 'Role is required', tr: 'Rol gerekli', de: 'Rolle ist erforderlich' },
  { match: /^Invalid request$/i, en: 'Invalid request', tr: 'Geçersiz istek', de: 'Ungültige Anfrage' },
];

/** Translate a known backend message; unknown messages are returned unchanged. */
export function translateServerMessage(lang: Lang, message: string): string {
  const text = message.trim();
  for (const entry of ENTRIES) {
    if (entry.match.test(text)) return entry[lang];
  }
  return message;
}
