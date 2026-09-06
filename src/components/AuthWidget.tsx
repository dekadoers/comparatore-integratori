"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import AuthModal from "./AuthModal";
import { User as UserIcon, LogOut } from "lucide-react";

export default function AuthWidget() {
  const { user, loading, signOut } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);

  if (loading) return null;

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <span className="hidden sm:inline text-xs font-medium text-slate-600 max-w-[10rem] truncate">
          {user.email}
        </span>
        <button
          onClick={() => signOut()}
          title="Esci"
          className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:text-rose-600 hover:border-rose-200 transition"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 transition"
      >
        <UserIcon className="h-3.5 w-3.5" />
        Accedi
      </button>
      {modalOpen && <AuthModal onClose={() => setModalOpen(false)} />}
    </>
  );
}
