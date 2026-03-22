import fs from "fs";
import path from "path";
import { db } from "@/lib/db";
import type { Mood, PetStatus } from "@/lib/types";

const publicDir = path.join(process.cwd(), "public");
const fallbackAssetPath = "/pet/cat-default/calm.png";
const fallbackAssetKey = "cat-default";
const stateFallback: Array<Mood | "hungry" | "sleepy" | "excited"> = ["calm", "hungry", "happy", "angry"];

type AssetState = Mood | "hungry" | "sleepy" | "excited";

function assetExists(assetPath: string) {
  return fs.existsSync(path.join(publicDir, assetPath.replace(/^\//, "")));
}

export function listActivePetAssets(species?: string) {
  const speciesFilter = species ? "AND species = ?" : "";
  return db
    .prepare(
      `
        SELECT id, key, name, species
        FROM pet_assets
        WHERE is_active = 1
        ${speciesFilter}
        ORDER BY created_at ASC, id ASC
      `,
    )
    .all(...(species ? [species] : [])) as Array<{
    id: number;
    key: string;
    name: string;
    species: string;
  }>;
}

export function getDefaultPetAssetId(species = "cat") {
  const matchingAsset = listActivePetAssets(species)[0];

  if (matchingAsset) {
    return matchingAsset.id;
  }

  const fallbackAsset = db
    .prepare(
      `
        SELECT id
        FROM pet_assets
        WHERE key = ?
      `,
    )
    .get(fallbackAssetKey) as { id: number } | undefined;

  return fallbackAsset?.id ?? null;
}

export function getPetAssetById(petAssetId: number | null | undefined) {
  if (!petAssetId) {
    return null;
  }

  return db
    .prepare(
      `
        SELECT id, key, name, species
        FROM pet_assets
        WHERE id = ?
      `,
    )
    .get(petAssetId) as
    | {
        id: number;
        key: string;
        name: string;
        species: string;
      }
    | undefined
    | null;
}

function getAssetStateMap(petAssetId: number | null | undefined) {
  if (!petAssetId) {
    return new Map<AssetState, string>();
  }

  const rows = db
    .prepare(
      `
        SELECT state_key, image_path
        FROM pet_asset_states
        WHERE pet_asset_id = ?
      `,
    )
    .all(petAssetId) as Array<{
    state_key: AssetState;
    image_path: string;
  }>;

  return new Map<AssetState, string>(rows.map((row) => [row.state_key, row.image_path]));
}

export function getPetImagePath(status: PetStatus, mood: Mood, petAssetId?: number | null) {
  const asset = getPetAssetById(petAssetId ?? null);
  const effectiveAssetId = asset?.id ?? getDefaultPetAssetId("cat");
  const desiredState: AssetState = status === "hungry" ? "hungry" : mood;
  const assetStateMap = getAssetStateMap(effectiveAssetId);

  const preferredPath = assetStateMap.get(desiredState);

  if (preferredPath && assetExists(preferredPath)) {
    return preferredPath;
  }

  for (const fallbackState of stateFallback) {
    const fallbackPath = assetStateMap.get(fallbackState);
    if (fallbackPath && assetExists(fallbackPath)) {
      return fallbackPath;
    }
  }

  const fallbackAssetRow = db
    .prepare(
      `
        SELECT id
        FROM pet_assets
        WHERE key = ?
      `,
    )
    .get(fallbackAssetKey) as { id: number } | undefined;
  const fallbackStateMap = getAssetStateMap(fallbackAssetRow?.id ?? null);
  const fallbackDesiredPath = fallbackStateMap.get(desiredState);

  if (fallbackDesiredPath && assetExists(fallbackDesiredPath)) {
    return fallbackDesiredPath;
  }

  for (const fallbackState of stateFallback) {
    const fallbackPath = fallbackStateMap.get(fallbackState);
    if (fallbackPath && assetExists(fallbackPath)) {
      return fallbackPath;
    }
  }

  return fallbackAssetPath;
}
