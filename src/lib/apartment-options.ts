export const APARTMENT_OPTIONS: { key: string; label: string }[] = [
  { key: "cleaning", label: "Ménage inclus" },
  { key: "breakfast", label: "Petit déjeuner" },
  { key: "love_room", label: "Love room" },
  { key: "wifi", label: "Wi-Fi" },
  { key: "parking", label: "Parking" },
  { key: "pool", label: "Piscine" },
  { key: "ac", label: "Climatisation" },
  { key: "pets", label: "Animaux acceptés" },
];

export const OPTION_LABEL = Object.fromEntries(
  APARTMENT_OPTIONS.map((o) => [o.key, o.label]),
) as Record<string, string>;
