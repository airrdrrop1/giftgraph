"use client";

import { useState } from "react";
import type { Seed } from "@/lib/types";
import { searchSeeds } from "@/lib/api";

interface Props {
  seeds: Seed[];
  onAdd: (s: Seed) => void;
  onInstruction: (text: string) => Promise<void>;
  busy: boolean;
  notice: string | null;
}

export default function RefineBar({ seeds, onAdd, onInstruction, busy, notice }: Props) {
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [sugs, setSugs] = useState<Seed[]>([]);
  const [adding, setAdding] = useState(false);

  const onSearch = async (value: string) => {
    setQ(value);
    if (value.trim().length < 2) {
      setSugs([]);
      return;
    }
    setAdding(true);
    try {
      setSugs(await searchSeeds(value.trim()));
    } catch {
      setSugs([]);
    } finally {
      setAdding(false);
    }
  };

  const addSeed = (s: Seed) => {
    if (seeds.some((x) => x.id === s.id)) return;
    onAdd(s);
    setQ("");
    setSugs([]);
  };

  const submit = () => {
    if (!text.trim() || busy) return;
    void onInstruction(text.trim());
    setText("");
  };

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-4">
      <div>
        <p className="text-sm font-medium mb-2">Tell us what to change</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder='e.g. "under $30 and nothing to wear"'
            disabled={busy}
            className="flex-1 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-pink-400 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={submit}
            disabled={busy || !text.trim()}
            className="rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50 transition"
          >
            {busy ? "Working…" : "Apply"}
          </button>
        </div>
        {notice && (
          <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl px-3 py-2">
            {notice}
          </p>
        )}
      </div>

      <div>
        <p className="text-sm font-medium mb-2">Or add another taste</p>
        <div className="relative">
          <input
            type="text"
            value={q}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search to add a seed…"
            disabled={busy}
            className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-pink-400 disabled:opacity-50"
          />
          {sugs.length > 0 && (
            <ul className="absolute z-20 mt-1 w-full max-h-56 overflow-auto rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg">
              {sugs.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => addSeed(s)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  >
                    <span className="font-medium">{s.name}</span>
                    <span className="text-zinc-500 text-xs"> · {s.type}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {adding && <span className="absolute right-4 top-2.5 text-sm text-zinc-400">…</span>}
        </div>
      </div>
    </div>
  );
}
