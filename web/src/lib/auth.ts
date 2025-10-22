const AUTH_TOKEN_KEY = "tms_auth_token";
const AUTH_USER_KEY = "tms_auth_user";
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "/api/v1";

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  username: string | null;
  mobile: string | null;
};

export function getAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthToken(token: string) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearAuthToken() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(AUTH_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch (error) {
    console.warn("Failed to parse stored auth user", error);
    localStorage.removeItem(AUTH_USER_KEY);
    return null;
  }
}

export function setStoredUser(user: AuthUser) {
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

export function clearStoredUser() {
  localStorage.removeItem(AUTH_USER_KEY);
}

export function isAuthenticated(): boolean {
  return Boolean(getAuthToken());
}

export function setAuthSession(token: string, user: AuthUser) {
  setAuthToken(token);
  setStoredUser(user);
}

export function clearAuthSession() {
  clearAuthToken();
  clearStoredUser();
}

const defaultHeaders = () => {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
};

export async function loginWithPassword(email: string, password: string) {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Invalid email or password");
  }
  const payload = (await response.json()) as { accessToken: string; user: AuthUser };
  setAuthSession(payload.accessToken, payload.user);
  return payload.user;
}

export async function fetchCurrentUser(): Promise<AuthUser> {
  const response = await fetch(`${API_BASE}/auth/me`, {
    headers: defaultHeaders(),
  });
  if (!response.ok) {
    throw new Error("Session expired");
  }
  const payload = (await response.json()) as { user: AuthUser };
  setStoredUser(payload.user);
  return payload.user;
}

export async function fetchGoogleLoginUrl() {
  const response = await fetch(`${API_BASE}/auth/google/url`);
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Unable to start Google login");
  }
  const payload = (await response.json()) as { url: string };
  if (!payload.url) {
    throw new Error("Google login URL missing in response");
  }
  return payload.url;
}