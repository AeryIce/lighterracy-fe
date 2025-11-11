"use client";

import React, { useEffect } from "react";

type DialogProps = {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
};

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  // lock scroll saat modal terbuka
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // esc untuk close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange?.(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center"
      aria-hidden={!open}
    >
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => onOpenChange?.(false)}
      />
      <div className="relative z-[1001] w-full max-w-[900px] px-4">{children}</div>
    </div>
  );
}

type ContentProps = React.HTMLAttributes<HTMLDivElement>;
export function DialogContent({ className = "", onClick, ...rest }: ContentProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className={`mx-auto mt-6 rounded-2xl bg-white p-4 shadow-lg ${className}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
      {...rest}
    />
  );
}

export function DialogHeader({ className = "", ...rest }: ContentProps) {
  return <div className={`mb-3 ${className}`} {...rest} />;
}

export function DialogTitle({ className = "", ...rest }: ContentProps) {
  return <h2 className={`text-lg font-semibold ${className}`} {...rest} />;
}

export function DialogDescription({ className = "", ...rest }: ContentProps) {
  return <p className={`text-sm text-gray-600 ${className}`} {...rest} />;
}
