"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { ChatDrawer } from "@/components/ChatDrawer";
import { LogOut, Plus, UserPlus, CheckSquare, Layers, Shield, MessageSquare } from "lucide-react";

interface UserSession {
  id: string;
  name: string;
  email: string;
  role: "admin" | "manager" | "employee";
}

interface NavbarProps {
  user: UserSession;
  onOpenCreateTask?: () => void;
  onOpenInviteUser?: () => void;
}

export function Navbar({ user, onOpenCreateTask, onOpenInviteUser }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      setLoggingOut(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-stone-200 bg-white/90 backdrop-blur-md shadow-2xs">
        <div className="w-full flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8 gap-4 overflow-x-auto">
          {/* Brand & Navigation */}
          <div className="flex items-center space-x-6 shrink-0">
            <Link href="/dashboard" className="flex items-center space-x-2.5 shrink-0 group">
              <motion.div
                whileHover={{ scale: 1.05, rotate: -2 }}
                whileTap={{ scale: 0.95 }}
                className="flex h-8.5 w-8.5 items-center justify-center rounded bg-stone-900 text-white shadow-2xs shrink-0"
              >
                <CheckSquare className="h-4.5 w-4.5" />
              </motion.div>
              <div className="flex items-center space-x-1.5 whitespace-nowrap">
                <span className="text-base sm:text-lg font-extrabold tracking-tight text-stone-900 group-hover:text-blue-600 transition-colors">
                  Axiora
                </span>
                <span className="text-xs font-mono text-stone-400">/</span>
                <span className="text-xs font-mono text-stone-500 font-semibold">Axiora Software</span>
              </div>
            </Link>

            <div className="h-5 w-[1px] bg-stone-200 shrink-0" />

            {/* Navigation Items */}
            <nav className="flex items-center space-x-1.5 shrink-0">
              <Link href="/dashboard">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded text-xs sm:text-sm font-semibold whitespace-nowrap transition-all shrink-0 ${
                    pathname === "/dashboard"
                      ? "bg-stone-100 text-stone-900 font-bold border border-stone-200"
                      : "text-stone-600 hover:text-stone-900 hover:bg-stone-50"
                  }`}
                >
                  <Layers className="h-4 w-4 shrink-0" />
                  <span>Workspace</span>
                </motion.div>
              </Link>

              {user.role === "admin" && (
                <Link href="/admin">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`flex items-center space-x-2 px-3 py-1.5 rounded text-xs sm:text-sm font-semibold whitespace-nowrap transition-all shrink-0 ${
                      pathname === "/admin"
                        ? "bg-stone-900 text-white font-bold"
                        : "text-stone-600 hover:text-stone-900 hover:bg-stone-50"
                    }`}
                  >
                    <Shield className="h-4 w-4 text-rose-500 shrink-0" />
                    <span>Admin Panel</span>
                  </motion.div>
                </Link>
              )}
            </nav>
          </div>

          {/* Right Actions */}
          <div className="flex items-center space-x-2.5 shrink-0">
            {/* Direct Chat Drawer Trigger */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setIsChatOpen(true)}
              className="inline-flex items-center space-x-1.5 rounded border border-stone-300 bg-white px-3 py-1.5 text-xs sm:text-sm font-bold text-stone-800 hover:bg-stone-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-2xs"
              title="Open Support & Direct Chat"
            >
              <MessageSquare className="h-4 w-4 text-rose-600 shrink-0" />
              <span>Chat</span>
              <span className="h-2 w-2 rounded-full bg-rose-600 animate-pulse shrink-0" />
            </motion.button>

            {/* Quick Create Task CTA - Only for Admins & Managers */}
            {user.role !== "employee" && onOpenCreateTask && (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={onOpenCreateTask}
                className="inline-flex items-center space-x-1.5 rounded bg-stone-900 px-3.5 py-1.5 text-xs sm:text-sm font-bold text-white hover:bg-stone-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
              >
                <Plus className="h-4 w-4 shrink-0" />
                <span>New Task</span>
              </motion.button>
            )}

            {/* Admin Invite User */}
            {user.role === "admin" && onOpenInviteUser && (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={onOpenInviteUser}
                className="inline-flex items-center space-x-1.5 rounded border border-stone-300 bg-white px-3 py-1.5 text-xs sm:text-sm font-semibold text-stone-800 hover:bg-stone-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <UserPlus className="h-4 w-4 text-stone-600 shrink-0" />
                <span>Invite Member</span>
              </motion.button>
            )}

            <div className="h-5 w-[1px] bg-stone-200 shrink-0" />

            {/* User Profile Info */}
            <div className="flex items-center space-x-2.5 shrink-0 whitespace-nowrap">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-stone-200 font-mono text-xs font-bold text-stone-800 shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:flex items-center space-x-2 text-xs sm:text-sm shrink-0">
                <span className="font-bold text-stone-900 whitespace-nowrap">{user.name}</span>
                <span className="rounded bg-stone-100 px-2 py-0.5 font-mono text-[10px] font-bold text-stone-700 border border-stone-200 uppercase whitespace-nowrap">
                  {user.role}
                </span>
              </div>

              <motion.button
                whileHover={{ scale: 1.1, color: "#dc2626" }}
                whileTap={{ scale: 0.9 }}
                onClick={handleLogout}
                disabled={loggingOut}
                title="Log Out"
                className="p-1.5 rounded text-stone-400 hover:bg-stone-100 transition-colors shrink-0 cursor-pointer"
              >
                <LogOut className="h-4 w-4 shrink-0" />
              </motion.button>
            </div>
          </div>
        </div>
      </header>

      {/* Direct Chat Drawer */}
      <ChatDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        currentUser={user}
      />
    </>
  );
}
