export interface AuthUser {
  username: string;
  role: string;
  token: string;
}

export function saveAuth(user: AuthUser): void {
  localStorage.setItem('auth_token', user.token);
  localStorage.setItem('auth_user', JSON.stringify({ username: user.username, role: user.role }));
  document.cookie = `auth_token=${user.token}; path=/; max-age=86400; SameSite=Lax`;
}

export function clearAuth(): void {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');
  document.cookie = 'auth_token=; path=/; max-age=0';
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
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem('auth_token');
}