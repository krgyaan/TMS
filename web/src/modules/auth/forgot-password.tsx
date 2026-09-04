import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, CheckCircle2, Mail, KeyRound, Lock } from "lucide-react";
import { useForgotPassword, useVerifyOtp, useResetPassword } from "@/hooks/api/useAuth";
import { cn } from "@/lib/utils";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const STEP_CONFIG = [
    { id: 1, title: "Email", subtitle: "Enter your account email", icon: Mail },
    { id: 2, title: "OTP", subtitle: "Enter the code sent to your email", icon: KeyRound },
    { id: 3, title: "New Password", subtitle: "Set a new password for your account", icon: Lock },
];

const ForgotPasswordPage: React.FC = () => {
    const navigate = useNavigate();

    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [errors, setErrors] = useState<Record<string, string>>({});

    const forgotPassword = useForgotPassword();
    const verifyOtp = useVerifyOtp();
    const resetPassword = useResetPassword();

    const progress = ((step - 1) / 2) * 100;
    const currentStep = STEP_CONFIG.find((s) => s.id === step)!;

    const handleEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || !EMAIL_REGEX.test(email.trim())) {
            setErrors({ email: "Enter a valid email address" });
            return;
        }
        setErrors({});
        try {
            await forgotPassword.mutateAsync(email.trim());
            setStep(2);
        } catch {
            // error surfaced by the hook's toast
        }
    };

    const handleOtpSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (otp.length !== 6) {
            setErrors({ otp: "Enter the 6-digit OTP" });
            return;
        }
        setErrors({});
        try {
            const { token } = await verifyOtp.mutateAsync({ email, otp });
            sessionStorage.setItem("password_reset_token", token);
            setStep(3);
        } catch {
            // error surfaced by the hook's toast
        }
    };

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password.length < 6) {
            setErrors({ password: "Password must be at least 6 characters long" });
            return;
        }
        if (password !== confirmPassword) {
            setErrors({ confirm: "Passwords do not match" });
            return;
        }
        setErrors({});
        try {
            const token = sessionStorage.getItem("password_reset_token");
            if (!token) {
                navigate("/forgot-password", { replace: true });
                return;
            }
            await resetPassword.mutateAsync({ token, newPassword: password });
            sessionStorage.removeItem("password_reset_token");
            setTimeout(() => navigate("/login", { replace: true }), 1200);
        } catch {
            // error surfaced by the hook's toast
        }
    };

    const handleResendOtp = async () => {
        try {
            await forgotPassword.mutateAsync(email);
        } catch {
            // error surfaced by the hook's toast
        }
    };

    const goBack = () => {
        if (step === 1) {
            navigate("/login");
        } else {
            setStep((prev) => (prev - 1) as 1 | 2 | 3);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md">
                <CardContent className="p-6 md:p-8 space-y-6">
                    <div className="flex flex-col items-center text-center space-y-1">
                        <img src="/ve_logo.png" alt="Volks Energie" className="h-16 w-auto object-contain mb-2" />
                        <h1 className="text-2xl font-bold">Forgot Password</h1>
                        <p className="text-sm text-muted-foreground text-balance">{currentStep.subtitle}</p>
                    </div>

                    <div className="space-y-3">
                        <Progress value={progress} className="h-1.5" />
                        <div className="flex items-center justify-center gap-0">
                            {STEP_CONFIG.map((s, i) => {
                                const isDone = s.id < step;
                                const isActive = s.id === step;
                                const Icon = s.icon;
                                return (
                                    <React.Fragment key={s.id}>
                                        <div className="flex flex-col items-center gap-1">
                                            <div
                                                className={cn(
                                                    "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors",
                                                    isDone
                                                        ? "bg-primary border-primary text-primary-foreground"
                                                        : isActive
                                                          ? "border-primary text-primary bg-primary/10"
                                                          : "border-border text-muted-foreground bg-background"
                                                )}
                                            >
                                                {isDone ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                                            </div>
                                            <span
                                                className={cn(
                                                    "text-[10px] font-medium transition-colors",
                                                    isActive ? "text-primary" : isDone ? "text-muted-foreground" : "text-muted-foreground/60"
                                                )}
                                            >
                                                {s.title}
                                            </span>
                                        </div>
                                        {i < STEP_CONFIG.length - 1 && (
                                            <div
                                                className={cn(
                                                    "h-0.5 w-10 sm:w-16 mb-5 mx-1 transition-colors",
                                                    s.id < step ? "bg-primary" : "bg-border"
                                                )}
                                            />
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={step}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                        >
                            {step === 1 && (
                                <form onSubmit={handleEmailSubmit} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="you@example.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className={cn(errors.email && "border-destructive")}
                                        />
                                        {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                                    </div>
                                    <Button type="submit" className="w-full" disabled={forgotPassword.isPending}>
                                        {forgotPassword.isPending ? "Sending OTP..." : "Send OTP"}
                                    </Button>
                                </form>
                            )}

                            {step === 2 && (
                                <form onSubmit={handleOtpSubmit} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="otp">Enter OTP</Label>
                                        <Input
                                            id="otp"
                                            inputMode="numeric"
                                            maxLength={6}
                                            placeholder="123456"
                                            value={otp}
                                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                                            className={cn("font-mono tracking-widest text-center text-lg", errors.otp && "border-destructive")}
                                        />
                                        {errors.otp && <p className="text-xs text-destructive">{errors.otp}</p>}
                                    </div>
                                    <Button type="submit" className="w-full" disabled={verifyOtp.isPending}>
                                        {verifyOtp.isPending ? "Verifying..." : "Verify OTP"}
                                    </Button>
                                    <div className="text-center text-sm">
                                        <span className="text-muted-foreground">Didn't receive it? </span>
                                        <button
                                            type="button"
                                            onClick={handleResendOtp}
                                            disabled={forgotPassword.isPending}
                                            className="font-medium underline-offset-4 hover:underline disabled:opacity-50"
                                        >
                                            Resend OTP
                                        </button>
                                    </div>
                                </form>
                            )}

                            {step === 3 && (
                                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="new-password">New Password</Label>
                                        <Input
                                            id="new-password"
                                            type="password"
                                            placeholder="Min 6 characters"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className={cn(errors.password && "border-destructive")}
                                        />
                                        {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="confirm-password">Confirm Password</Label>
                                        <Input
                                            id="confirm-password"
                                            type="password"
                                            placeholder="Re-enter new password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className={cn(errors.confirm && "border-destructive")}
                                        />
                                        {errors.confirm && <p className="text-xs text-destructive">{errors.confirm}</p>}
                                    </div>
                                    <Button type="submit" className="w-full" disabled={resetPassword.isPending}>
                                        {resetPassword.isPending ? "Resetting..." : "Reset Password"}
                                    </Button>
                                </form>
                            )}
                        </motion.div>
                    </AnimatePresence>

                    <div className="text-center">
                        <button
                            type="button"
                            onClick={goBack}
                            disabled={forgotPassword.isPending || verifyOtp.isPending || resetPassword.isPending}
                            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            {step === 1 ? "Back to login" : "Back"}
                        </button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default ForgotPasswordPage;
