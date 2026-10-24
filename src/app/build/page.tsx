"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ProfileForm from "@/components/ProfileForm";
import SeedPicker from "@/components/SeedPicker";
import GiftCard from "@/components/GiftCard";
import RefineBar from "@/components/RefineBar";
import {
  postAddSeed,
  postExclude,
  postInstruction,
  postRecommend,
  topTags,
} from "@/lib/api";
import { MAYA_SEEDS } from "@/lib/maya";
import type {
  GiftPick,
  ProfileInput,
  RecommendResponse,
  Seed,
} from "@/lib/types";
import { CATEGORY_LABELS } from "@/lib/types";

type Step = "profile" | "seeds" | "results";

const OCCASION_LABELS: Record<string, string> = {
  birthday: "birthday",
  anniversary: "anniversary",
  "thank-you": "thank-you",
  holiday: "holiday",
};

function WizardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>("profile");
  const [profile, setProfile] = useState<ProfileInput>({
    nickname: "",
    occasion: "birthday",
    budget: null,
    city: "",
  });
  const [seeds, setSeeds] = useState<Seed[]>([]);
  const [result, setResult] = useState<RecommendResponse | null>(null);
  const [excludeIds, setExcludeIds] = useState<string[]>([]);
  const [excludedCats, setExcludedCats] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [excludingId, setExcludingId] = useState<string | null>(null);
  const mayaRan = useRef(false);

  // One-click Maya persona: same live API path as manual flow.
  useEffect(() => {
    if (searchParams.get("persona") !== "maya" || mayaRan.current) return;
    mayaRan.current = true;
    const mayaSeeds: Seed[] = MAYA_SEEDS.map((s) => ({ ...s }));
    const p: ProfileInput = { nickname: "Maya", occasion: "birthday", budget: null, city: "" };
    setProfile(p);
    setSeeds(mayaSeeds);
    setStep("results");
    setLoading(true);
    setError(null);
    postRecommend({ ...p, seeds: mayaSeeds })
      .then((r) => setResult(r))
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Something went wrong")
      )
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const args = useMemo(
    () => ({
      ...profile,
      seeds,
      exclude: excludeIds,
      excludedCategories: excludedCats,
      limitPerCategory: 3,
    }),
    [profile, seeds, excludeIds, excludedCats],
  );

  // 9-card shortlist: top 3 categories × up to 3 picks.
  const slots = useMemo(() => {
    if (!result) return [];
    const out: Array<{ category: string; pick: GiftPick }> = [];
    for (const cat of result.categoryOrder.slice(0, 3)) {
      for (const pick of (result.categories as Record<string, GiftPick[]>)[cat] ?? []) {
        if (out.filter((s) => s.category === cat).length >= 3) break;
        out.push({ category: cat, pick });
      }
    }
    return out;
  }, [result]);

  const tasteProfile = useMemo(
    () => (result ? topTags(result.categories) : []),
    [result],
  );

  const runRecommend = async () => {
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const r = await postRecommend(args);
      setResult(r);
      setStep("results");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleExclude = async (pick: GiftPick) => {
    setExcludingId(pick.id);
    setError(null);
    try {
      const r = await postExclude(
        { ...args, previousIds: slots.map((s) => s.pick.id) },
        pick.id,
      );
      setExcludeIds((ids) => [...ids, pick.id]);
      // Swap the disliked card for the first fresh replacement in its category.
      const shown = new Set(slots.map((s) => s.pick.id));
      const repl = (r.categories[pick.category] as GiftPick[]).find(
        (p) => !shown.has(p.id),
      );
      if (repl && result) {
        const cats = { ...result.categories };
        cats[pick.category as keyof typeof cats] = (
          cats[pick.category as keyof typeof cats] as GiftPick[]
        ).map((p) => (p.id === pick.id ? repl : p));
        setResult({ ...result, categories: cats, meta: r.meta });
      } else {
        setResult(r);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not swap that pick");
    } finally {
      setExcludingId(null);
    }
  };

  const handleInstruction = async (text: string) => {
    setLoading(true);
    setError(null);
    try {
      const r = await postInstruction(args, text);
      setNotice(`Understood: ${r.intent.message}`);
      if (r.intent.budget != null) {
        setProfile((p) => ({ ...p, budget: r.intent.budget as number }));
      }
      if (r.intent.excludedCategories?.length) {
        setExcludedCats((c) =>
          [...new Set([...c, ...(r.intent.excludedCategories as string[])])],
        );
      }
      setResult({ categories: r.categories, categoryOrder: r.categoryOrder, meta: r.meta });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not apply that instruction");
    } finally {
      setLoading(false);
    }
  };

  const handleAddSeed = async (s: Seed) => {
    if (seeds.some((x) => x.id === s.id)) return;
    setLoading(true);
    setError(null);
    try {
      const r = await postAddSeed(args, s.id);
      setSeeds((prev) => [...prev, s]);
      setResult({ categories: r.categories, categoryOrder: r.categoryOrder, meta: r.meta });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add that seed");
    } finally {
      setLoading(false);
    }
  };

  const startOver = () => {
    setStep("profile");
    setResult(null);
    setExcludeIds([]);
    setExcludedCats([]);
    setNotice(null);
    setError(null);
  };

  const metaErrors = result?.meta?.errors
    ? Object.entries(result.meta.errors).filter(([, v]) => v)
    : [];

  return (
    <main className="mx-auto w-full max-w-5xl px-4 sm:px-6 py-8 flex-1">
      <button
        type="button"
        onClick={() => router.push("/")}
        className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 mb-6"
      >
        ← Back home
      </button>

      {step === "profile" && (
        <section className="max-w-xl mx-auto">
          <h1 className="text-3xl font-bold mb-1">Who are we shopping for?</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mb-8">
            A few details help the taste engine narrow in.
          </p>
          <ProfileForm profile={profile} onChange={setProfile} />
          <button
            type="button"
            onClick={() => setStep("seeds")}
            disabled={!profile.nickname.trim()}
            className="mt-8 w-full rounded-2xl bg-pink-600 px-6 py-3.5 text-base font-semibold text-white hover:bg-pink-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            Continue →
          </button>
        </section>
      )}

      {step === "seeds" && (
        <section className="max-w-xl mx-auto">
          <h1 className="text-3xl font-bold mb-1">
            Three things {profile.nickname.trim() || "they"} love
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mb-8">
            Search anything — artists, directors, places, podcasts. The taste engine
            fans out across every gift category from these seeds.
          </p>
          <SeedPicker
            seeds={seeds}
            onAdd={(s) => setSeeds((prev) => [...prev, s])}
            onRemove={(id) => setSeeds((prev) => prev.filter((s) => s.id !== id))}
          />
          {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
          <div className="mt-8 flex gap-3">
            <button
              type="button"
              onClick={() => setStep("profile")}
              className="rounded-2xl border border-zinc-300 dark:border-zinc-700 px-6 py-3.5 text-base font-medium hover:border-zinc-400 transition"
            >
              ← Edit
            </button>
            <button
              type="button"
              onClick={runRecommend}
              disabled={seeds.length < 3 || loading}
              className="flex-1 rounded-2xl bg-pink-600 px-6 py-3.5 text-base font-semibold text-white hover:bg-pink-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              {loading ? "Reading taste…" : "Find the gift 🎁"}
            </button>
          </div>
          <p className="mt-3 text-xs text-zinc-400">
            {seeds.length < 3
              ? `Add ${3 - seeds.length} more seed${3 - seeds.length === 1 ? "" : "s"} to continue.`
              : "Looking good — at least 3 seeds locked in."}
          </p>
        </section>
      )}

      {step === "results" && (
        <section>
          {loading && !result ? (
            <div className="text-center py-24">
              <p className="text-2xl mb-2">🎁</p>
              <p className="text-lg font-medium">Reading taste from {seeds.length} seeds…</p>
              <p className="text-sm text-zinc-500 mt-1">
                Fanning out across books, brands, places, movies and podcasts.
              </p>
            </div>
          ) : error && !result ? (
            <div className="text-center py-24 max-w-md mx-auto">
              <p className="text-2xl mb-2">😕</p>
              <p className="text-lg font-medium mb-2">The taste engine stumbled</p>
              <p className="text-sm text-red-600 dark:text-red-400 mb-6">{error}</p>
              <button
                type="button"
                onClick={startOver}
                className="rounded-2xl bg-pink-600 px-6 py-3 text-base font-semibold text-white hover:bg-pink-700"
              >
                Start over
              </button>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h1 className="text-3xl font-bold mb-1">
                  Gift ideas for {profile.nickname || "them"}
                  {profile.occasion ? ` — ${OCCASION_LABELS[profile.occasion] ?? profile.occasion}` : ""}
                </h1>
                {tasteProfile.length > 0 && (
                  <p className="text-zinc-500 dark:text-zinc-400 mt-1">
                    Taste profile: <span className="font-medium text-zinc-700 dark:text-zinc-200">{tasteProfile.join(" · ")}</span>
                  </p>
                )}
                {result?.meta?.budgetRule && (
                  <p className="text-xs text-zinc-400 mt-1">Budget rule: {result.meta.budgetRule}</p>
                )}
              </div>

              {error && (
                <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>
              )}

              {slots.length === 0 ? (
                <div className="text-center py-16 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700">
                  <p className="text-xl font-medium mb-2">No strong signal — try adding broader tastes.</p>
                  <p className="text-sm text-zinc-500">
                    Fewer filters, more mainstream seeds usually unlock the graph.
                  </p>
                </div>
              ) : (
                <>
                  {result && result.categoryOrder.slice(0, 3).map((cat) => (
                    <div key={cat} className="mb-10">
                      <h2 className="text-xl font-semibold mb-4">
                        {CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS] ?? cat}
                      </h2>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {slots
                          .filter((s) => s.category === cat)
                          .map(({ pick }) => (
                            <GiftCard
                              key={pick.id}
                              pick={pick}
                              occasion={OCCASION_LABELS[profile.occasion] ?? profile.occasion}
                              onExclude={handleExclude}
                              excluding={excludingId === pick.id}
                            />
                          ))}
                      </div>
                    </div>
                  ))}

                  <div className="mb-10">
                    <RefineBar
                      seeds={seeds}
                      onAdd={handleAddSeed}
                      onInstruction={handleInstruction}
                      busy={loading}
                      notice={notice}
                    />
                  </div>

                  {metaErrors.length > 0 && (
                    <details className="mb-8 text-xs text-zinc-500">
                      <summary className="cursor-pointer underline">
                        Engine notes ({metaErrors.length})
                      </summary>
                      <ul className="mt-2 space-y-1 font-mono">
                        {metaErrors.map(([k, v]) => (
                          <li key={k}>
                            {k}: {v}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}

                  <div className="flex flex-wrap gap-3 mb-8">
                    <button
                      type="button"
                      onClick={() => setStep("seeds")}
                      className="rounded-2xl border border-zinc-300 dark:border-zinc-700 px-5 py-2.5 text-sm font-medium hover:border-zinc-400 transition"
                    >
                      ← Edit seeds
                    </button>
                    <button
                      type="button"
                      onClick={startOver}
                      className="rounded-2xl border border-zinc-300 dark:border-zinc-700 px-5 py-2.5 text-sm font-medium hover:border-zinc-400 transition"
                    >
                      Start over
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </section>
      )}
    </main>
  );
}

export default function BuildPage() {
  return (
    <Suspense fallback={<main className="flex-1 p-8 text-center text-zinc-500">Loading…</main>}>
      <WizardInner />
    </Suspense>
  );
}
