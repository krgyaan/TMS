import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  setAuthSession,
  clearAuthSession,
  setAuthToken,
  fetchCurrentUser,
  type AuthUser,
} from "@/lib/auth";

const decodeUser = (value: string | null): AuthUser | null => {
  if (!value) return null;
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const json = window.atob(normalized);
    return JSON.parse(json) as AuthUser;
  } catch (error) {
    console.warn("Failed to decode Google login payload", error);
    return null;
  }
};

const GoogleLoginCallback = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);

  const [message, setMessage] = useState("Completing sign-in...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const status = params.get("status");
    if (status !== "success") {
      const err = params.get("error") ?? "Google sign-in failed";
      setError(err);
      setMessage("");
      clearAuthSession();
      return;
    }

    const token = params.get("token");
    if (!token) {
      setError("Missing access token in Google response");
      setMessage("");
      return;
    }

    const user = decodeUser(params.get("user"));
    if (user) {
      setAuthSession(token, user);
      navigate("/", { replace: true });
      return;
    }

    setAuthToken(token);
    fetchCurrentUser()
      .then(() => navigate("/", { replace: true }))
      .catch(() => {
        setMessage("");
        setError("Signed in but failed to load profile. Please refresh.");
      });
  }, [navigate, params]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="max-w-md text-center">
        {message ? <p className="text-muted-foreground text-sm">{message}</p> : null}
        {error ? <p className="text-red-500 text-sm">{error}</p> : null}
      </div>
    </div>
  );
};

export default GoogleLoginCallback;