"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { X, Mail, Lock, Loader2 } from "lucide-react";

interface AuthModalProps {
  onClose: () => void;
}

export default function AuthModal({ onClose }: AuthModalProps) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);

    if (mode === "login") {
      const { error } = await signIn(email, password);
      setSubmitting(false);
      if (error) setError(error);
      else onClose();
    } else {
      const { error, needsEmailConfirmation } = await signUp(email, password);
      setSubmitting(false);
      if (error) setError(error);
      else if (needsEmailConfirmation) {
        setInfo("Controlla la tua email per confermare l'account, poi accedi.");
      } else {
        onClose();
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <h3 className="text-lg font-black text-slate-900">
            {mode === "login" ? "Accedi" : "Crea account"}
          </h3>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">Email</span>
            <div className="mt-1.5 flex items-center rounded-xl border border-slate-300 px-3 focus-within:border-emerald-500">
              <Mail className="h-4 w-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border-0 bg-transparent px-2 py-2 text-sm focus:outline-none"
                placeholder="nome@esempio.com"
              />
            </div>
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-slate-600">Password</span>
            <div className="mt-1.5 flex items-center rounded-xl border border-slate-300 px-3 focus-within:border-emerald-500">
              <Lock className="h-4 w-4 text-slate-400" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border-0 bg-transparent px-2 py-2 text-sm focus:outline-none"
                placeholder="Minimo 6 caratteri"
              />
            </div>
          </label>

          {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
          {info && <p className="text-xs font-medium text-emerald-700">{info}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 transition disabled:opacity-60"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "login" ? "Accedi" : "Registrati"}
          </button>

          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setError(null);
              setInfo(null);
            }}
            className="w-full text-center text-xs font-medium text-slate-500 hover:text-emerald-700 transition"
          >
            {mode === "login" ? "Non hai un account? Registrati" : "Hai già un account? Accedi"}
          </button>
        </form>
      </div>
    </div>
  );
}
