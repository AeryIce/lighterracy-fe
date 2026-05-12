"use client";

interface ReviewItem {
  isbn: string;
  title: string;
  rating: number;
  mood: string;
  review: string;
  created_at: string;
}

function getReviews(): ReviewItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = localStorage.getItem("lighterracy_reviews");

  if (!raw) {
    return [];
  }

  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export default function ReviewsPage() {
  const reviews = getReviews();

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            📚 Kesan Bacaan
          </h1>

          <p className="mt-1 text-sm text-neutral-500">
            Tempat menyimpan refleksi kecil dari perjalanan
            membacamu.
          </p>
        </div>

        <a
          href="/me/shelf"
          className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-100"
        >
          ← Kembali ke Rak
        </a>
      </div>

      {reviews.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-8 text-center text-neutral-500">
          Belum ada kesan bacaan.
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((item, index) => (
            <div
              key={`${item.isbn}-${index}`}
              className="rounded-2xl border bg-white p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-semibold">
                    {item.title}
                  </h2>

                  <p className="text-xs text-neutral-400">
                    {new Date(
                      item.created_at
                    ).toLocaleString()}
                  </p>
                </div>

                <div className="text-sm">
                  {"⭐".repeat(item.rating)}
                </div>
              </div>

              <div className="inline-flex rounded-full border px-3 py-1 text-xs">
                {item.mood}
              </div>

              <p className="text-sm leading-relaxed text-neutral-700">
                {item.review}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}