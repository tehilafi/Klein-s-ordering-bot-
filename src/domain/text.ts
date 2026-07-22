const FINAL_HEBREW_LETTERS: Record<string, string> = {
  ך: "כ",
  ם: "מ",
  ן: "נ",
  ף: "פ",
  ץ: "צ",
};

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[״"'׳]/g, "")
    .replace(/[-־]/g, " ")
    .replace(/[.,!?;:()[\]{}]/g, " ")
    .replace(/[ךםןףץ]/g, (letter) => FINAL_HEBREW_LETTERS[letter] ?? letter)
    .replace(/\s+/g, " ");
}

export function cleanFreeText(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}
