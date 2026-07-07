export const AUTH_PASSWORD = "111111";
export const AUTH_STORAGE_KEY = "auth_session";
export const AUTH_TTL_MS = 24 * 60 * 60 * 1000;

export interface AuthSession {
  expiresAt: number;
}

export function saveAuthSession(): void {
  const session: AuthSession = {
    expiresAt: Date.now() + AUTH_TTL_MS
  };
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export function isAuthSessionValid(): boolean {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) {
    return false;
  }
  try {
    const session: AuthSession = JSON.parse(raw);
    return typeof session.expiresAt === "number" && session.expiresAt > Date.now();
  } catch {
    return false;
  }
}

export function clearAuthSession(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}
