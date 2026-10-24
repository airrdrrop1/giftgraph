/**
 * MAYA demo persona — one click runs the whole taste graph live.
 * IDs are Qloo entity IDs used by the backend; names power reasons.
 */
export const MAYA_SEEDS = [
  { id: "E51DB8F2-7A93-4746-A283-E55B5216FDE1", name: "Bon Iver", type: "artist" },
  { id: "C71B6CCE-3F05-4A57-AA84-9D2C2B4D67C5", name: "Wes Anderson", type: "director" },
  { id: "95E19B2C-553A-46A6-AD73-5562AF7124E5", name: "Kyoto", type: "place" },
] as const;

export const MAYA_SEED_NAMES: Record<string, string> = {
  "E51DB8F2-7A93-4746-A283-E55B5216FDE1": "Bon Iver",
  "C71B6CCE-3F05-4A57-AA84-9D2C2B4D67C5": "Wes Anderson",
  "95E19B2C-553A-46A6-AD73-5562AF7124E5": "Kyoto",
};
