"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { Review } from "@/types/database";
import { Star, Loader2 } from "lucide-react";

interface ReviewsSectionProps {
  productId: string;
  initialReviews: Review[];
}

function StarRow({ rating, size = "h-3.5 w-3.5" }: { rating: number; size?: string }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((value) => (
        <Star
          key={value}
          className={`${size} ${value <= rating ? "text-amber-500 fill-current" : "text-slate-200"}`}
        />
      ))}
    </div>
  );
}

export default function ReviewsSection({ productId, initialReviews }: ReviewsSectionProps) {
  const { user } = useAuth();
  const [supabase] = useState(() => createClient());
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const alreadyReviewed = useMemo(
    () => (user ? reviews.some((r) => r.user_id === user.id) : false),
    [reviews, user]
  );

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return null;
    return reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  }, [reviews]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    setError(null);

    const { data, error } = await supabase
      .from("reviews")
      .insert({
        product_id: productId,
        user_id: user.id,
        user_email: user.email,
        rating,
        comment: comment.trim() || null,
      })
      .select()
      .single();

    setSubmitting(false);

    if (error || !data) {
      setError("Non è stato possibile salvare la recensione. Riprova.");
      return;
    }

    setReviews((prev) => [data, ...prev]);
    setComment("");
    setRating(5);
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
      <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
          <Star className="h-4 w-4 fill-current" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Recensioni</h2>
          <p className="text-xs text-slate-500">
            {reviews.length > 0
              ? `${averageRating!.toFixed(1)} su 5 · ${reviews.length} recensioni`
              : "Ancora nessuna recensione"}
          </p>
        </div>
      </div>

      {user ? (
        alreadyReviewed ? (
          <p className="mt-6 text-xs text-slate-500">Hai già recensito questo prodotto.</p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-3">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  className="p-0.5"
                  aria-label={`${value} stelle`}
                >
                  <Star
                    className={`h-6 w-6 ${
                      value <= rating ? "text-amber-500 fill-current" : "text-slate-200"
                    }`}
                  />
                </button>
              ))}
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Racconta la tua esperienza con questo prodotto (opzionale)"
              rows={3}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
            {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Pubblica recensione
            </button>
          </form>
        )
      ) : (
        <p className="mt-6 text-xs text-slate-500">
          <span className="font-semibold text-slate-700">Accedi</span> per lasciare una recensione.
        </p>
      )}

      <div className="mt-6 space-y-4 divide-y divide-slate-100">
        {reviews.map((review) => (
          <div key={review.id} className="pt-4 first:pt-0 first:border-t-0">
            <div className="flex items-center justify-between">
              <StarRow rating={review.rating} />
              <span className="text-2xs text-slate-400">
                {new Date(review.created_at).toLocaleDateString("it-IT", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
            {review.comment && <p className="mt-2 text-sm text-slate-700">{review.comment}</p>}
            <p className="mt-1 text-2xs text-slate-400">
              {review.user_email ? review.user_email.split("@")[0] : "Utente"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
