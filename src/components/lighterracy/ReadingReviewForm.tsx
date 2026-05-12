"use client";

import { useState } from "react";

const MOODS = [
  "🔥 Mengubah cara pikirku",
  "💡 Banyak insight",
  "😌 Ringan & nyaman",
  "😭 Emosional",
  "🤯 Berat tapi bagus",
  "📚 Layak dibaca ulang",
];

interface Props {
  isbn: string;
  title: string;
}

interface StoredReview {
  isbn: string;
  title: string;
  rating: number;
  mood: string;
  review: string;
  created_at: string;
}

export default function ReadingReviewForm({
  isbn,
  title,
}: Props) {
  const [rating, setRating] = useState<number>(5);
  const [mood, setMood] = useState<string>(MOODS[0]);
  const [review, setReview] = useState<string>("");
  const [saved, setSaved] = useState<boolean>(false);

  function saveReview() {
    const raw = localStorage.getItem("lighterracy_reviews");

    let existing: StoredReview[] = [];

    try {
      existing = raw ? JSON.parse(raw) : [];
    } catch {
      existing = [];
    }

    existing.unshift({
      isbn,
      title,
      rating,
      mood,
      review,
      created_at: new Date().toISOString(),
    });

    localStorage.setItem(
      "lighterracy_reviews",
      JSON.stringify(existing)
    );

    setSaved(true);
    setReview("");
  }

  return (
    <div className="mt-4 rounded-2xl border border-neutral-200 bg-white p-4 space-y-4">
      <div>
        <h3 className="text-lg font-semibold">
          ✍️ Tulis Kesan Bacaan
        </h3>

        <p className="mt-1 text-sm text-neutral-500">
          Simpan refleksi kecil dari pengalaman membacamu.
        </p>
      </div>

      <div>
        <label className="text-sm font-medium">
          Rating
        </label>

        <select
          className="mt-2 w-full rounded-xl border px-3 py-2"
          value={rating}
          onChange={(e) =>
            setRating(Number(e.target.value))
          }
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {"⭐".repeat(n)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-sm font-medium">
          Mood setelah membaca
        </label>

        <select
          className="mt-2 w-full rounded-xl border px-3 py-2"
          value={mood}
          onChange={(e) => setMood(e.target.value)}
        >
          {MOODS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-sm font-medium">
          Kesan singkat
        </label>

        <textarea
          className="mt-2 min-h-[120px] w-full rounded-xl border px-3 py-2"
          placeholder="Apa yang paling membekas dari buku ini?"
          maxLength={280}
          value={review}
          onChange={(e) => setReview(e.target.value)}
        />

        <div className="mt-1 text-right text-xs text-neutral-400">
          {review.length}/280
        </div>
      </div>

      <button
        type="button"
        onClick={saveReview}
        className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-neutral-100"
      >
        Simpan Kesan
      </button>

      {saved && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Kesan bacaan tersimpan ✨
        </div>
      )}
    </div>
  );
}