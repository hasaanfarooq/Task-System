"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Layers,
  ArrowRight,
  Lock,
  Mail,
  AlertCircle,
  ShieldCheck,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Authentication failed.");
      }

      router.push(from);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="w-full max-w-md space-y-6"
    >
      {/* Brand Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-stone-950 via-stone-900 to-stone-800 text-white shadow-md ring-1 ring-black/5 mb-1">
          <Layers className="h-6 w-6 text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-950">
            Axiora Software
          </h1>
          <p className="text-xs font-mono font-semibold uppercase tracking-wider text-stone-500 mt-1">
            Enterprise Task & Operations Portal
          </p>
        </div>
      </div>

      {/* Production Card Container */}
      <div className="rounded-xl border border-stone-200/80 bg-white p-7 sm:p-8 shadow-sm space-y-6">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-stone-900">Sign in to your account</h2>
          <p className="text-xs text-stone-500 font-medium">
            Enter your company credentials to access your workspace.
          </p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-start space-x-2.5 rounded-lg border border-red-200 bg-red-50/80 p-3 text-xs text-red-800 font-medium"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
            <span>{error}</span>
          </motion.div>
        )}

        <form onSubmit={handleLogin} className="space-y-4 text-xs">
          {/* Email Input */}
          <div className="space-y-1.5">
            <label className="block font-mono text-[11px] font-bold uppercase tracking-wider text-stone-600">
              Work Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-2.5 h-4 w-4 text-stone-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                required
                className="w-full rounded-lg border border-stone-300 bg-white pl-10 pr-3.5 py-2.5 text-xs text-stone-900 placeholder-stone-400 focus:border-stone-900 focus:ring-1 focus:ring-stone-900 focus:outline-none transition-all font-medium"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block font-mono text-[11px] font-bold uppercase tracking-wider text-stone-600">
                Password
              </label>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-2.5 h-4 w-4 text-stone-400" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full rounded-lg border border-stone-300 bg-white pl-10 pr-10 py-2.5 text-xs text-stone-900 placeholder-stone-400 focus:border-stone-900 focus:ring-1 focus:ring-stone-900 focus:outline-none transition-all font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 p-0.5 text-stone-400 hover:text-stone-700 transition-colors"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center space-x-2 rounded-lg bg-stone-950 py-3 text-xs font-bold text-white hover:bg-stone-850 active:scale-[0.99] transition-all shadow-xs disabled:opacity-60 disabled:cursor-not-allowed mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-stone-300" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <span>Sign In to Workspace</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </form>

        <div className="border-t border-stone-100 pt-4 text-center">
          <div className="inline-flex items-center space-x-1.5 text-[11px] font-mono font-medium text-stone-500">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>256-bit Encrypted Session &middot; Axiora SSO Guard</span>
          </div>
        </div>
      </div>

      {/* Security Disclaimer Footer */}
      <div className="text-center space-y-1">
        <p className="font-mono text-[11px] text-stone-400">
          &copy; 2026 Axiora Software Inc. All rights reserved.
        </p>
        <p className="font-mono text-[10px] text-stone-400/80">
          Authorized personnel only. All access is logged and audited.
        </p>
      </div>
    </motion.div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#FAFAF9] px-4 py-12 text-stone-900 selection:bg-stone-900 selection:text-white">
      <Suspense fallback={<div className="h-80 w-full max-w-md rounded-xl border border-stone-200 bg-white" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
