import { TRANSLATIONS } from "./translations.js";

const LOCALE_KEY = "pricingplus_locale";

export function detectInitialLocale() {
  const saved = localStorage.getItem(LOCALE_KEY);
  if (saved === "ar" || saved === "en") return saved;

  const browserLanguage = (navigator.language || "en").toLowerCase();
  return browserLanguage.startsWith("ar") ? "ar" : "en";
}

export function persistLocale(locale) {
  localStorage.setItem(LOCALE_KEY, locale);
}

export function applyDocumentLocale(locale) {
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
}

export function createTranslator(locale) {
  return function t(key) {
    const value = TRANSLATIONS[locale]?.[key];
    if (value != null) return value;
    return locale === "ar" ? "نص غير مترجم" : "Untranslated text";
  };
}
