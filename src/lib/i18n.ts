/**
 * Batch 29 — lightweight bilingual UI (English / हिंदी).
 * No i18n framework: a typed dictionary for workspace chrome. The
 * conversational replies switch language via the intake prompt (lang flag).
 */
export type Lang = "en" | "hi";

const STRINGS = {
  daysToFile: { en: "days to file", hi: "दिन बचे हैं" },
  taxGuide: { en: "Tax Guide", hi: "टैक्स गाइड" },
  send: { en: "Send", hi: "भेजें" },
  thinking: { en: "TaxSense is thinking…", hi: "TaxSense सोच रहा है…" },
  placeholder: {
    en: 'e.g. "I earn around 80k a month plus a bonus sometimes"',
    hi: 'जैसे "मैं महीने का करीब 80 हज़ार कमाता हूँ"',
  },
  emptyState: {
    en: "Your live tax computation appears here the moment I know enough about your income.",
    hi: "जैसे ही मुझे आपकी आय की जानकारी मिलेगी, आपका टैक्स यहाँ लाइव दिखेगा।",
  },
  results: { en: "results", hi: "नतीजे" },
  planner: { en: "planner", hi: "प्लानर" },
  recommendation: { en: "Recommendation", hi: "सुझाव" },
  saves: { en: "saves", hi: "बचत" },
  downloadPdf: { en: "Download filing summary (PDF)", hi: "फाइलिंग समरी डाउनलोड करें (PDF)" },
  save: { en: "Save", hi: "सेव" },
  pasteForm16: { en: "📄 Paste my Form 16", hi: "📄 मेरा Form 16 पेस्ट करें" },
  oldRegime: { en: "old regime", hi: "पुरानी व्यवस्था" },
  newRegime: { en: "new regime", hi: "नई व्यवस्था" },
  effective: { en: "effective", hi: "प्रभावी दर" },
  on: { en: "on", hi: "कुल आय" },
  taxHealthScore: { en: "Tax Health Score", hi: "टैक्स हेल्थ स्कोर" },
  movesTitle: { en: "Moves that lower your tax", hi: "टैक्स घटाने के तरीक़े" },
  insightsTitle: { en: "Smart insights", hi: "स्मार्ट इनसाइट्स" },
  openerHi:
    "नमस्ते! मैं TaxSense AI हूँ — एक ऐसा CA जो आपसे कोई फ़ॉर्म नहीं भरवाता। चलिए FY 2025-26 का टैक्स निपटाते हैं। शुरू करें: आपकी कमाई कैसे होती है — सैलरी, फ्रीलांसिंग/बिज़नेस, किराया, शेयर, या मिली-जुली?",
  quickChips: {
    en: ["I'm salaried — around 80k a month", "I run a small business", "I freelance", "What is 87A?", "Old vs new regime?"],
    hi: ["मैं सैलरीड हूँ — महीने का करीब 80 हज़ार", "मेरा छोटा बिज़नेस है", "मैं फ्रीलांस करता हूँ", "87A क्या है?", "पुरानी बनाम नई व्यवस्था?"],
  },
} as const;

export type StringKey = keyof typeof STRINGS;

export function t(key: Exclude<StringKey, "quickChips" | "openerHi">, lang: Lang): string {
  const entry = STRINGS[key] as { en: string; hi: string };
  return entry[lang] ?? entry.en;
}

export function quickChips(lang: Lang): readonly string[] {
  return STRINGS.quickChips[lang];
}

export const HINDI_OPENER = STRINGS.openerHi;

/** Appended to the responder system prompt when the user prefers Hindi. */
export const HINDI_RESPONDER_NOTE =
  "IMPORTANT: The user prefers Hindi. Reply in natural conversational Hindi (Devanagari script), but keep tax terms, section numbers and abbreviations in English (80C, HRA, TDS, ITR, regime names). Numbers in Indian format.";
