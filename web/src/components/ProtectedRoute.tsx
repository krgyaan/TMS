import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import {
  isAuthenticated,
  getStoredUser,
  fetchCurrentUser,
  clearAuthSession,
} from "@/lib/auth";

export default function ProtectedRoute() {
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      setAllowed(false);
      setChecking(false);
      return;
    }

    if (getStoredUser()) {
      setAllowed(true);
      setChecking(false);
      return;
    }

    fetchCurrentUser()
      .then(() => {
        setAllowed(true);
      })
      .catch(() => {
        clearAuthSession();
        setAllowed(false);
      })
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    return (
      <div className="flex h-screen w-screen items-center justify-center text-sm text-muted-foreground">
        Restoring session...
      </div>
    );
  }

  if (!allowed) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}