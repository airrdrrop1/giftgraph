"use client";

import type { ProfileInput } from "@/lib/types";

const OCCASIONS = [
  { value: "birthday", label: "Birthday" },
  { value: "anniversary", label: "Anniversary" },
  { value: "thank-you", label: "Thank you" },
  { value: "holiday", label: "Holiday" },
];

const BUDGETS: Array<{ value: number | null; label: string }> = [
  { value: 25, label: "$25" },
  { value: 50, label: "$50" },
  { value: 100, label: "$100" },
  { value: null, label: "Any" },
];

interface Props {
  profile: ProfileInput;
  onChange: (p: ProfileInput) => void;
}

export default function ProfileForm({ profile, onChange }: Props) {
  const set = (patch: Partial<ProfileInput>) => onChange({ ...profile, ...patch });

  return (
    <div className="space-y-6">
      <div>
        <label
          htmlFor="nickname"
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5"
        >
          Recipient&apos;s nickname
        </label>
        <input
          id="nickname"
          type="text"
          value={profile.nickname}
          onChange={(e) => set({ nickname: e.target.value })}
          placeholder="e.g. Maya"
          className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2.5 text-base outline-none focus:ring-2 focus:ring-pink-400"
        />
      </div>

      <div>
        <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
          Occasion
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {OCCASIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => set({ occasion: o.value })}
              className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                profile.occasion === o.value
                  ? "border-pink-500 bg-pink-50 text-pink-700 dark:bg-pink-950/50 dark:text-pink-200"
                  : "border-zinc-300 dark:border-zinc-700 hover:border-pink-300 dark:hover:border-pink-700"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
          Budget per gift
        </span>
        <div className="flex rounded-xl border border-zinc-300 dark:border-zinc-700 overflow-hidden">
          {BUDGETS.map((b) => (
            <button
              key={String(b.value)}
              type="button"
              onClick={() => set({ budget: b.value })}
              className={`flex-1 px-3 py-2.5 text-sm font-medium transition ${
                profile.budget === b.value
                  ? "bg-pink-600 text-white"
                  : "bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          ≤$25 skips fashion &amp; experiences; $25–$100 leans toward books, podcasts and
          movies.
        </p>
      </div>

      <div>
        <label
          htmlFor="city"
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5"
        >
          City <span className="font-normal text-zinc-400">(optional — used for experience picks)</span>
        </label>
        <input
          id="city"
          type="text"
          value={profile.city}
          onChange={(e) => set({ city: e.target.value })}
          placeholder="e.g. Kyoto"
          className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2.5 text-base outline-none focus:ring-2 focus:ring-pink-400"
        />
      </div>
    </div>
  );
}
