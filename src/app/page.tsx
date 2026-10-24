"use client";

import Link from "next/link";
import { MAYA_SEEDS } from "@/lib/maya";

export default function Home() {
  return (
    <main className="flex-1">
      <section className="mx-auto max-w-4xl px-4 sm:px-6 py-16 sm:py-24 text-center">
        <p className="text-6xl mb-6">🎁</p>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight">
          Tell us three things they love.
          <br />
          <span className="text-pink-600">We&apos;ll find the gift.</span>
        </h1>
        <p className="mt-5 text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
          GiftGraph reads taste like a graph — artists, films, places, books — and
          turns it into a cross-domain gift shortlist powered by Qloo&apos;s Taste AI.
        </p>

        <div className="mt-10 grid sm:grid-cols-2 gap-4 max-w-3xl mx-auto text-left">
          {/* One-click persona demo */}
          <Link
            href="/build?persona=maya"
            className="group rounded-2xl border-2 border-pink-500/60 bg-gradient-to-br from-pink-50 to-amber-50 dark:from-pink-950/40 dark:to-amber-950/20 p-6 hover:shadow-lg transition"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-pink-600 mb-2">
              One-click demo ⚡
            </p>
            <p className="text-xl font-bold">For Maya</p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              Loves {MAYA_SEEDS.map((s) => s.name).join(", ")}
            </p>
            <p className="mt-3 text-sm font-medium text-pink-700 dark:text-pink-300 group-hover:underline">
              Run the whole flow live →
            </p>
          </Link>

          {/* Start from scratch */}
          <Link
            href="/build"
            className="group rounded-2xl border border-zinc-300 dark:border-zinc-700 p-6 hover:border-pink-400 hover:shadow-lg transition"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-2">
              Custom
            </p>
            <p className="text-xl font-bold">Start from scratch</p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              Tell us about your recipient, pick their tastes, get the shortlist.
            </p>
            <p className="mt-3 text-sm font-medium group-hover:underline">
              Build it yourself →
            </p>
          </Link>
        </div>

        <div className="mt-14 text-left max-w-3xl mx-auto">
          <h2 className="text-lg font-semibold mb-3 text-center">How it works</h2>
          <ol className="grid sm:grid-cols-4 gap-3 text-sm">
            {[
              ["1. Profile", "Nickname, occasion, budget."],
              ["2. Seeds", "Search anything they love — min 3."],
              ["3. Shortlist", "9 picks across top taste categories."],
              ["4. Refine", "Thumbs-down, add seeds, or just say it."],
            ].map(([t, d]) => (
              <li
                key={t}
                className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4"
              >
                <p className="font-semibold mb-1">{t}</p>
                <p className="text-zinc-500 dark:text-zinc-400">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </main>
  );
}
