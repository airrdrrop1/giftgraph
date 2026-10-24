"use client";

import { useState } from "react";
import { CATEGORY_LABELS, TIER_STYLES } from "@/lib/types";
import type { GiftCardData, GiftPick } from "@/lib/types";
import { encodeCard } from "@/lib/encode";

interface Props {
  pick: GiftPick;
  occasion: string;
  onExclude: (pick: GiftPick) => void;
  excluding: boolean;
}

function PickImage({ pick }: { pick: GiftPick }) {
  if (pick.image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={pick.image}
        alt={pick.name}
        loading="lazy"
        className="h-36 w-full object-cover bg-zinc-100 dark:bg-zinc-800"
      />
    );
  }
  return (
    <div className="h-36 w-full bg-gradient-to-br from-pink-100 via-amber-100 to-sky-100 dark:from-pink-950 dark:via-amber-950 dark:to-sky-950 flex items-center justify-center">
      <span className="text-5xl">🎁</span>
    </div>
  );
}

export default function GiftCard({ pick, occasion, onExclude, excluding }: Props) {
  const [formOpen, setFormOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [from, setFrom] = useState("");
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const buildUrl = () => {
    const data: GiftCardData = { pick, message, from, occasion };
    const d = encodeCard(data);
    const u = `${window.location.origin}/card?d=${d}`;
    setUrl(u);
    return u;
  };

  const copyLink = async () => {
    const u = buildUrl();
    try {
      await navigator.clipboard.writeText(u);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard may be unavailable — link stays visible */
    }
  };

  return (
    <article className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm flex flex-col">
      <PickImage pick={pick} />
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {CATEGORY_LABELS[pick.category]}
          </span>
          <span
            className={`text-xs font-semibold rounded-full px-2.5 py-1 ${TIER_STYLES[pick.tier]}`}
          >
            {pick.tier}
          </span>
        </div>
        <h3 className="font-semibold text-lg leading-snug">{pick.name}</h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 flex-1">{pick.reason}</p>
        {pick.tags?.length > 0 && (
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            {pick.tags.slice(0, 4).join(" · ")}
          </p>
        )}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => onExclude(pick)}
            disabled={excluding}
            title="Not a fit — get a replacement"
            aria-label={`Thumbs down ${pick.name}`}
            className="rounded-full border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 text-sm hover:border-red-400 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50 transition"
          >
            {excluding ? "…" : "👎"}
          </button>
          <button
            type="button"
            onClick={() => setFormOpen((v) => !v)}
            className="flex-1 rounded-full bg-pink-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-pink-700 transition"
          >
            🎁 Gift card
          </button>
        </div>
        {formOpen && (
          <div className="mt-1 space-y-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 p-3">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Your message…"
              rows={2}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-pink-400"
            />
            <input
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              placeholder="From (your name)"
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-pink-400"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={copyLink}
                className="flex-1 rounded-lg bg-pink-600 text-white px-3 py-2 text-sm font-medium hover:bg-pink-700 transition"
              >
                {copied ? "Link copied ✓" : "Copy link"}
              </button>
              {url && (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-pink-500 text-pink-700 dark:text-pink-300 px-3 py-2 text-sm font-medium hover:bg-pink-50 dark:hover:bg-pink-950/40"
                >
                  Open ↗
                </a>
              )}
            </div>
            {url && (
              <p className="text-xs text-zinc-500 break-all">{url}</p>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
