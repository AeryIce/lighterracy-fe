"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { apiFetchWithAuth } from "@/lib/auth-client";

type AuthState = "unknown" | "guest" | "staff";

interface StaffPingUser {
  id: number;
  name: string;
  role: string;
}

interface StaffPingResponse {
  message: string;
  user: StaffPingUser;
}

function getFirstName(fullName: string): string {
  const trimmed = fullName.trim();
  if (trimmed.length === 0) {
    return "Staff";
  }

  const parts = trimmed.split(" ");
  return parts[0];
}

export default function Header() {
  const pathname = usePathname();
  const [authState, setAuthState] = useState<AuthState>("unknown");
  const [staffUser, setStaffUser] = useState<StaffPingUser | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function checkStaffSession() {
      try {
        const response = await apiFetchWithAuth("/api/staff/ping", {
          method: "GET",
        });

        if (!response.ok) {
          if (!cancelled) {
            setAuthState("guest");
            setStaffUser(null);
          }
          return;
        }

        const data = (await response.json()) as StaffPingResponse;

        if (!cancelled) {
          setAuthState("staff");
          setStaffUser(data.user);
        }
      } catch {
        if (!cancelled) {
          setAuthState("guest");
          setStaffUser(null);
        }
      }
    }

    void checkStaffSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const isStaff = authState === "staff" && staffUser !== null;
  const staffName = isStaff ? getFirstName(staffUser.name) : null;

  const isOnStaffLoginPage = pathname === "/staff/login";
  const isOnStaffHomePage = pathname === "/staff";

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b">
      <div className="mx-auto max-w-screen-md px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-semibold">
          <span className="text-brand">Lighterracy</span>
        </Link>

        <nav className="flex items-center gap-2">
          <Link
            href="/promos"
            className="inline-flex items-center gap-1 text-sm border px-3 py-1.5 rounded-full shadow-soft hover:bg-gray-50"
          >
            <span>🔥</span>
            <span>Promos</span>
          </Link>

          <Link
            href="/stores"
            className="inline-flex items-center gap-1 text-sm border px-3 py-1.5 rounded-full shadow-soft hover:bg-gray-50"
          >
            <span>🏬</span>
            <span>Stores</span>
          </Link>

          {/* Status staff di pojok kanan */}
          {isStaff ? (
            <Link
              href="/staff"
              className="inline-flex items-center gap-1 text-xs sm:text-sm border px-2.5 sm:px-3 py-1.5 rounded-full shadow-soft hover:bg-gray-50 bg-emerald-50 border-emerald-200"
            >
              <span>👤</span>
              <span className="hidden sm:inline">Staff:</span>
              <span>{staffName}</span>
              {!isOnStaffHomePage && (
                <span className="hidden sm:inline text-[11px] text-emerald-700">
                  (Home)
                </span>
              )}
            </Link>
          ) : (
            <Link
              href={isOnStaffLoginPage ? "/staff/login" : "/staff/login"}
              className="inline-flex items-center gap-1 text-xs sm:text-sm border px-2.5 sm:px-3 py-1.5 rounded-full shadow-soft hover:bg-gray-50"
            >
              <span>🔑</span>
              <span className="sm:hidden">Staff</span>
              <span className="hidden sm:inline">Staff Login</span>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
