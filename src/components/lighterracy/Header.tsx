"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthMeUser, fetchAuthMe } from "@/lib/auth-client";

type AuthState = "unknown" | "guest" | "authenticated";

const STAFF_PANEL_ROLES = new Set([
  "staff",
  "store_staff",
  "store_manager",
  "area_manager",
]);

function getFirstName(fullName: string): string {
  const trimmed = fullName.trim();
  if (trimmed.length === 0) {
    return "User";
  }

  const parts = trimmed.split(" ");
  return parts[0] ?? "User";
}

function getSessionChipLabel(user: AuthMeUser): string {
  const firstName = getFirstName(user.name);

  if (STAFF_PANEL_ROLES.has(user.role)) {
    return `Staff: ${firstName}`;
  }

  return firstName;
}

export default function Header() {
  const pathname = usePathname();
  const [authState, setAuthState] = useState<AuthState>("unknown");
  const [authUser, setAuthUser] = useState<AuthMeUser | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      try {
        const payload = await fetchAuthMe();

        if (cancelled) {
          return;
        }

        if (!payload?.user) {
          setAuthState("guest");
          setAuthUser(null);
          return;
        }

        setAuthState("authenticated");
        setAuthUser(payload.user);
      } catch {
        if (!cancelled) {
          setAuthState("guest");
          setAuthUser(null);
        }
      }
    }

    void checkSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const isAuthenticated = authState === "authenticated" && authUser !== null;
  const showStaffPanelLink = isAuthenticated && STAFF_PANEL_ROLES.has(authUser.role);
  const isOnStaffLoginPage = pathname === "/staff/login";
  const isOnRegisterPage = pathname === "/register";
  const isOnStaffHomePage = pathname === "/staff";

  return (
    <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-screen-md items-center justify-between px-4">
        <Link href="/" className="font-semibold">
          <span className="text-brand">Lighterracy</span>
        </Link>

        <nav className="flex items-center gap-2">
          <Link
            href="/promos"
            className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm shadow-soft hover:bg-gray-50"
          >
            <span>🔥</span>
            <span>Promos</span>
          </Link>

          <Link
            href="/stores"
            className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm shadow-soft hover:bg-gray-50"
          >
            <span>🏬</span>
            <span>Stores</span>
          </Link>

          {showStaffPanelLink && authUser ? (
            <Link
              href="/staff"
              className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs shadow-soft hover:bg-gray-50 sm:px-3 sm:text-sm"
            >
              <span>👤</span>
              <span>{getSessionChipLabel(authUser)}</span>
              {!isOnStaffHomePage && (
                <span className="hidden text-[11px] text-emerald-700 sm:inline">
                  (Panel)
                </span>
              )}
            </Link>
          ) : isAuthenticated && authUser ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs shadow-soft sm:px-3 sm:text-sm">
              <span>✨</span>
              <span>{getSessionChipLabel(authUser)}</span>
            </span>
          ) : (
            <>
              <Link
                href={isOnRegisterPage ? "/register" : "/register"}
                className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs shadow-soft hover:bg-amber-100 sm:px-3 sm:text-sm"
              >
                <span>✨</span>
                <span>Daftar</span>
              </Link>

              <Link
                href={isOnStaffLoginPage ? "/staff/login" : "/staff/login"}
                className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-xs shadow-soft hover:bg-gray-50 sm:px-3 sm:text-sm"
              >
                <span>🔑</span>
                <span className="sm:hidden">Staff</span>
                <span className="hidden sm:inline">Staff Login</span>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}