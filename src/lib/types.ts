export type Category = "place" | "book" | "brand" | "movie" | "podcast";

export type Tier = "Top match" | "Strong match" | "Wildcard";

export interface Seed {
  id: string;
  name: string;
  type: string;
  image?: string;
  disambiguation?: string;
}

export interface GiftPick {
  id: string;
  name: string;
  type: string;
  category: Category;
  image?: string;
  tier: Tier;
  reason: string;
  reasonSeedId?: string;
  reasonSeedName?: string;
  popularity?: number;
  tags: string[];
}

export interface RecommendMeta {
  seeds: number;
  occasion: string | null;
  budget: number | null;
  city: string | null;
  budgetRule: string;
  excludedCategories: Category[];
  errors: Record<string, string>;
  totalPicks: number;
}

export interface RecommendResponse {
  categories: Record<Category, GiftPick[]>;
  categoryOrder: Category[];
  meta: RecommendMeta;
}

export interface IntentEcho {
  budget?: number;
  excludedCategories: Category[];
  priorityCategories?: Category[];
  message: string;
}

export interface ProfileInput {
  nickname: string;
  occasion: string;
  budget: number | null; // null = any
  city: string;
}

export interface GiftCardData {
  pick: GiftPick;
  message: string;
  from: string;
  occasion: string;
}

export const CATEGORY_LABELS: Record<Category, string> = {
  place: "Experience",
  book: "Book",
  brand: "Fashion & gear",
  movie: "Movie",
  podcast: "Podcast",
};

export const TIER_STYLES: Record<Tier, string> = {
  "Top match":
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  "Strong match":
    "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200",
  Wildcard:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
};
