import BookSearch from "@/components/lighterracy/BookSearch";

export const dynamic = "force-dynamic";

export default function IsbnIndexPage() {
  return (
    <main className="max-w-screen-sm mx-auto p-6">
      <BookSearch />
    </main>
  );
}
