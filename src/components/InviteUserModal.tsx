"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, UserPlus, Loader2 } from "lucide-react";

interface InviteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserInvited: () => void;
}

export function InviteUserModal({ isOpen, onClose, onUserInvited }: InviteUserModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "manager" | "employee">("employee");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      setError("All fields are required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to invite user");
      }

      setName("");
      setEmail("");
      setPassword("");
      setRole("employee");

      onUserInvited();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="relative z-10 w-full max-w-md rounded-md border border-stone-300 bg-white p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div className="flex items-center space-x-2">
                <UserPlus className="h-5 w-5 text-stone-700" />
                <h2 className="text-base font-bold text-stone-900">Invite Team Member</h2>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="p-1 rounded text-stone-400 hover:text-stone-700 hover:bg-stone-100"
              >
                <X className="h-4 w-4" />
              </motion.button>
            </div>

            {error && (
              <div className="rounded border border-red-200 bg-red-50 p-3 text-xs text-red-700 font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block font-mono text-xs font-bold uppercase text-stone-600 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Jordan Lee"
                  className="w-full rounded-md border border-stone-300 bg-white px-3.5 py-2 text-sm text-stone-900 placeholder-stone-400 focus:border-stone-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-mono text-xs font-bold uppercase text-stone-600 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jordan@axiorasoftware.com"
                  className="w-full rounded-md border border-stone-300 bg-white px-3.5 py-2 text-sm text-stone-900 placeholder-stone-400 focus:border-stone-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-mono text-xs font-bold uppercase text-stone-600 mb-1">
                  Initial Password *
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-md border border-stone-300 bg-white px-3.5 py-2 text-sm text-stone-900 placeholder-stone-400 focus:border-stone-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-mono text-xs font-bold uppercase text-stone-600 mb-1">
                  System Role *
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-stone-900 focus:outline-none font-medium"
                >
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-2 border-t border-stone-200 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md border border-stone-300 bg-white px-4 py-2 font-semibold text-stone-700 hover:bg-stone-50"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center space-x-2 rounded-md bg-stone-900 px-5 py-2 font-bold text-white hover:bg-stone-800 disabled:opacity-50"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>Create Account</span>
                </motion.button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
