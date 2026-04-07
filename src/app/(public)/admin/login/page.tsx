"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AdminLoginPage() {
  const router = useRouter();

  return (
    <main className="min-h-dvh bg-[#f7f7f7] flex items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md shadow-lg border border-zinc-200">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Admin login dipindahkan</CardTitle>
          <CardDescription>
            Area admin tidak lagi dilayani dari Lighterracy FE publik.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-zinc-700">
            Untuk keamanan dan pemisahan realm, login admin/internal dilakukan lewat backend
            internal/Filament, bukan lewat frontend publik ini.
          </p>

          <div className="flex flex-col gap-2 pt-2">
            <Button type="button" className="w-full" onClick={() => router.push("/")}>
              Kembali ke beranda publik
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => router.push("/staff/login")}
            >
              Buka login staff/store
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}