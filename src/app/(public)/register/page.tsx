import type { Metadata } from "next";
import { PublicRegisterForm } from "@/components/lighterracy/PublicRegisterForm";

export const metadata: Metadata = {
  title: "Daftar · Lighterracy",
  description:
    "Buat akun pembaca umum Lighterracy untuk mulai membangun pengalaman membaca yang lebih personal.",
};

export default function RegisterPage() {
  return <PublicRegisterForm />;
}
