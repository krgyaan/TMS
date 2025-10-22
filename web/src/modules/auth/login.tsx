import { useCallback, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LoginForm } from "@/components/login-form";
import {
  isAuthenticated,
  loginWithPassword,
  fetchGoogleLoginUrl,
  getStoredUser,
  fetchCurrentUser,
} from "@/lib/auth";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const redirectTo =
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/";

  useEffect(() => {
    if (isAuthenticated()) {
      navigate(redirectTo, { replace: true });
    }
  }, [navigate, redirectTo]);

  const handlePasswordLogin = useCallback(
    async (credentials: { email: string; password: string }) => {
      await loginWithPassword(credentials.email, credentials.password);
      navigate(redirectTo, { replace: true });
    },
    [navigate, redirectTo],
  );

  const handleGoogleLogin = useCallback(async () => {
    const url = await fetchGoogleLoginUrl();
    window.location.href = url;
  }, []);

  useEffect(() => {
    if (isAuthenticated() && !getStoredUser()) {
      fetchCurrentUser().catch(() => {
        /* ignore errors here, the protected routes will force re-auth */
      });
    }
  }, []);

  return (
    <div className="flex h-screen w-screen items-center justify-center p-4">
      <LoginForm onPasswordLogin={handlePasswordLogin} onGoogleLogin={handleGoogleLogin} />
    </div>
  );
};

export default Login;