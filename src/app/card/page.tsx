"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { decodeCard } from "@/lib/encode";
import { CATEGORY_LABELS, TIER_STYLES } from "@/lib/types";
import type { GiftCardData } from "@/lib/types";

function CardInner() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<GiftCardData | null | "invalid">(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const d = searchParams.get("d");
    if (!d) {
      setData("invalid");
      return;
    }
    const decoded = decodeCard<GiftCardData>(d);
    setData(decoded && decoded.pick ? decoded : "invalid");
  }, [searchParams]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard may be unavailable */
    }
  };

  if (data === "invalid") {
    return (
      <main className="flex-1 mx-auto max-w-xl px-4 py-16 text-center">
        <p className="text-5xl mb-4">🎁</p>
        <h1 className="text-2xl font-bold mb-2">This gift card link looks broken</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mb-6">
          The share payload couldn&apos;t be read. Ask the sender for a fresh link, or
          build your own.
        </p>
        <Link
          href="/"
          className="inline-block rounded-2xl bg-pink-600 px-6 py-3 font-semibold text-white hover:bg-pink-700"
        >
          Find a gift
        </Link>
      </main>
    );
  }

  if (data === null) {
    return (
      <main className="flex-1 mx-auto max-w-xl px-4 py-16 text-center text-zinc-500">
        Unwrapping…
      </main>
    );
  }

  const { pick, message, from, occasion } = data;

  return (
    <main className="flex-1 mx-auto max-w-xl px-4 py-10">
      <div className="rounded-3xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-xl bg-white dark:bg-zinc-900">
        <div className="bg-gradient-to-br from-pink-500 via-rose-500 to-amber-500 p-8 text-white text-center">
          <p className="text-5xl mb-3">🎁</p>
          <h1 className="text-2xl font-bold">A gift idea for you</h1>
          {occasion && (
            <p className="text-white/85 text-sm mt-1 capitalize">for {occasion}</p>
          )}
        </div>

        <div className="p-6 sm:p-8">
          {pick.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={pick.image}
              alt={pick.name}
              className="w-full h-56 object-cover rounded-2xl bg-zinc-100 dark:bg-zinc-800"
            />
          ) : (
            <div className="w-full h-40 rounded-2xl bg-gradient-to-br from-pink-100 via-amber-100 to-sky-100 dark:from-pink-950 dark:via-amber-950 dark:to-sky-950 flex items-center justify-center">
              <span className="text-6xl">🎁</span>
            </div>
          )}

          <div className="mt-5 flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              {CATEGORY_LABELS[pick.category]}
            </span>
            <span
              className={`text-xs font-semibold rounded-full px-2.5 py-1 ${TIER_STYLES[pick.tier]}`}
            >
              {pick.tier}
            </span>
          </div>
          <h2 className="text-3xl font-bold mt-2">{pick.name}</h2>
          <p className="text-zinc-600 dark:text-zinc-400 mt-2">{pick.reason}</p>

          {(message || from) && (
            <blockquote className="mt-6 rounded-2xl bg-pink-50 dark:bg-pink-950/30 border border-pink-200 dark:border-pink-900 p-5">
              {message && (
                <p className="text-lg italic leading-relaxed">“{message}”</p>
              )}
              {from && (
                <p className="mt-2 text-sm font-medium text-zinc-500">— {from}</p>
              )}
            </blockquote>
          )}

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={copyLink}
              className="flex-1 rounded-2xl bg-pink-600 px-5 py-3 font-semibold text-white hover:bg-pink-700 transition"
            >
              {copied ? "Link copied ✓" : "Copy link"}
            </button>
            <Link
              href="/"
              className="rounded-2xl border border-zinc-300 dark:border-zinc-700 px-5 py-3 font-medium hover:border-pink-400 transition"
            >
              Make yours
            </Link>
          </div>
          <p className="mt-4 text-xs text-zinc-400 text-center">
            Taste-matched by GiftGraph · Powered by Qloo&apos;s Taste AI
          </p>
        </div>
      </div>
    </main>
  );
}

export default function CardPage() {
  return (
    <Suspense
      fallback={
        <main className="flex-1 mx-auto max-w-xl px-4 py-16 text-center text-zinc-500">
          Unwrapping…
        </main>
      }
    >
      <CardInner />
    </Suspense>
  );
}
