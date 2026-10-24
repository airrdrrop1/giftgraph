"use client";

import { useEffect, useRef, useState } from "react";
import { getTrending, searchSeeds } from "@/lib/api";
import type { Seed } from "@/lib/types";

interface Props {
  seeds: Seed[];
  onAdd: (s: Seed) => void;
  onRemove: (id: string) => void;
  max?: number;
}

export default function SeedPicker({ seeds, onAdd, onRemove, max = 5 }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Seed[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [trending, setTrending] = useState<Seed[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    getTrending()
      .then((t) => {
        if (alive) setTrending(t.seeds ?? []);
      })
      .catch(() => {
        /* trending is best-effort; chips just won't render */
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const onQueryChange = (q: string) => {
    setQuery(q);
    setSearchError(null);
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 2) {
      setResults([]);
      setOpen(false);
      setSearching(false);
      return;
    }
    setSearching(true);
    timer.current = setTimeout(async () => {
      try {
        const r = await searchSeeds(q.trim());
        setResults(r);
        setOpen(true);
      } catch (err) {
        setSearchError(err instanceof Error ? err.message : "Search failed");
        setResults([]);
        setOpen(false);
      } finally {
        setSearching(false);
      }
    }, 300);
  };

  const canAdd = seeds.length < max;

  const pick = (s: Seed) => {
    if (!canAdd) return;
    if (seeds.some((x) => x.id === s.id)) return;
    onAdd(s);
    setQuery("");
    setResults([]);
    setOpen(false);
  };

  const typeLabel = (t?: string) =>
    t ? t.charAt(0).toUpperCase() + t.slice(1) : "Taste";

  return (
    <div className="space-y-5">
      <div>
        <div className="flex flex-wrap gap-2 mb-3">
          {seeds.map((s) => (
            <span
              key={s.id}
              className="inline-flex items-center gap-2 rounded-full bg-pink-600/10 border border-pink-500/40 pl-3 pr-1.5 py-1 text-sm"
            >
              {s.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.image} alt="" className="h-5 w-5 rounded-full object-cover" />
              ) : null}
              <span className="font-medium">{s.name}</span>
              <span className="text-xs text-zinc-500">{typeLabel(s.type)}</span>
              <button
                type="button"
                onClick={() => onRemove(s.id)}
                aria-label={`Remove ${s.name}`}
                className="rounded-full h-6 w-6 flex items-center justify-center text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              >
                ×
              </button>
            </span>
          ))}
          {seeds.length === 0 && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Add at least 3 things they love — artists, films, places, books…
            </p>
          )}
        </div>

        <div ref={boxRef} className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
            placeholder={
              canAdd ? "Search artists, films, places…" : `Seed limit reached (${max})`
            }
            disabled={!canAdd}
            className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2.5 text-base outline-none focus:ring-2 focus:ring-pink-400 disabled:opacity-50"
          />
          {searching && (
            <span className="absolute right-4 top-3 text-sm text-zinc-400">…</span>
          )}
          {open && results.length > 0 && (
            <ul className="absolute z-20 mt-1 w-full max-h-64 overflow-auto rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg">
              {results.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => pick(r)}
                    disabled={seeds.some((x) => x.id === r.id)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40"
                  >
                    {r.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.image} alt="" className="h-9 w-9 rounded-lg object-cover bg-zinc-100" />
                    ) : (
                      <div className="h-9 w-9 rounded-lg bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-sm">
                        🎁
                      </div>
                    )}
                    <span>
                      <span className="block text-sm font-medium">{r.name}</span>
                      <span className="block text-xs text-zinc-500">
                        {typeLabel(r.type)}
                        {r.disambiguation ? ` · ${r.disambiguation}` : ""}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {searchError && (
          <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{searchError}</p>
        )}
      </div>

      {trending.length > 0 && canAdd && (
        <div>
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">
            Trending tastes — tap to add
          </p>
          <div className="flex flex-wrap gap-2">
            {trending
              .filter((t) => !seeds.some((s) => s.id === t.id))
              .map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => pick(t)}
                  className="rounded-full border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 text-sm hover:border-pink-400 hover:text-pink-700 dark:hover:text-pink-300 transition"
                >
                  {t.name}
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
