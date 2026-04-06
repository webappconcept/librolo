"use client";

import { CheckCircle, X, XCircle } from "lucide-react";
import { useEffect } from "react";

export type ToastType = "success" | "error";

interface ToastProps {
  message: string;
  type: ToastType;
  onDismiss: () => void;
}

export function AdminToast({ message, type, onDismiss }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3500);
    return () => clearTimeout(t);
  }, [message, onDismiss]);

  return (
    <div
      className={`
    fixed top-6 left-1/2 -translate-x-1/2 z-50
    flex items-center gap-3 px-4 py-3
    rounded-xl shadow-lg text-sm font-medium whitespace-nowrap
    animate-in slide-in-from-top-4 fade-in duration-200
    ${
      type === "success"
        ? "bg-green-500/70 text-white"
        : "bg-red-500/70 text-white"
    }
  `}>
      {type === "success" ? (
        <CheckCircle size={16} className="shrink-0" />
      ) : (
        <XCircle size={16} className="shrink-0" />
      )}
      <span>{message}</span>
      <button
        onClick={onDismiss}
        aria-label="Chiudi"
        className="ml-1 text-white/70 hover:text-white transition-colors">
        <X size={14} />
      </button>
    </div>
  );
}
