/**
 * The JWT lives only in an HttpOnly cookie set by the server, so scripts (and XSS) can never read it.
 * Here we keep just the display data (username, role) for the UI.
 */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export interface AuthUser {
  username: string;
  role: string;
}

export function saveAuth(user: AuthUser): void {
  localStorage.setItem('auth_user', JSON.stringify({ username: user.username, role: user.role }));
}

export function clearAuth(): void {
  localStorage.removeItem('auth_user');
}

/** Ends the server session (clears the HttpOnly cookie), then forgets the local display data. */
export async function logout(): Promise<void> {
  try {
    await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST', credentials: 'include' });
  } finally {
    clearAuth();
  }
}

export function getAuthUser(): { username: string; role: string } | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('auth_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return getAuthUser() !== null;
}
