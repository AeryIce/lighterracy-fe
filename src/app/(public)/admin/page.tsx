"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AdminHomePage() {
  const router = useRouter();

  return (
    <main className="min-h-dvh bg-[#f7f7f7] flex items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md shadow-lg border border-zinc-200">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Area admin tidak tersedia di FE publik</CardTitle>
          <CardDescription>
            Lighterracy FE publik hanya melayani area publik dan panel staff/store yang relevan.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-zinc-700">
            Kalau kamu sedang mencari dashboard admin/internal, gunakan portal backend internal.
          </p>

          <div className="flex flex-col gap-2 pt-2">
            <Button type="button" className="w-full" onClick={() => router.push("/")}>
              Kembali ke beranda publik
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => router.push("/staff")}
            >
              Buka staff panel
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}