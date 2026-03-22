import type { CharacterSpecies, CharacterStyle } from "@/lib/types";

export const CHARACTER_SPECIES: Array<{ value: CharacterSpecies; label: string; emoji: string }> = [
  { value: "cat", label: "貓咪", emoji: "🐱" },
  { value: "dog", label: "小狗", emoji: "🐶" },
  { value: "fox", label: "狐狸", emoji: "🦊" },
  { value: "rabbit", label: "兔兔", emoji: "🐰" },
  { value: "bear", label: "小熊", emoji: "🐻" },
];

export const CHARACTER_STYLES: Array<{ value: CharacterStyle; label: string }> = [
  { value: "classic", label: "經典" },
  { value: "sport", label: "運動" },
  { value: "adventure", label: "冒險" },
];
