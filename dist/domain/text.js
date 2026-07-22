"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeText = normalizeText;
exports.cleanFreeText = cleanFreeText;
const FINAL_HEBREW_LETTERS = {
    ך: "כ",
    ם: "מ",
    ן: "נ",
    ף: "פ",
    ץ: "צ",
};
function normalizeText(text) {
    return text
        .toLowerCase()
        .trim()
        .replace(/[״"'׳]/g, "")
        .replace(/[-־]/g, " ")
        .replace(/[.,!?;:()[\]{}]/g, " ")
        .replace(/[ךםןףץ]/g, (letter) => FINAL_HEBREW_LETTERS[letter] ?? letter)
        .replace(/\s+/g, " ");
}
function cleanFreeText(text) {
    return text.trim().replace(/\s+/g, " ");
}
