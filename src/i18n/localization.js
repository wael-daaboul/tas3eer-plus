/**
 * i18n Localization Engine - Version 1.5.0 (The Vanilla Milestone)
 * Final stable version of the Vanilla JavaScript implementation.
 * Updated: 2026-03-19
 */
import { getState, updateSetting } from "../store/stateManager.js";
import { ar } from "./ar.js";
import { en } from "./en.js";

const translations = { ar, en };
export const SELECTED_LANGUAGE_KEY = "selectedLanguage";
export const LOCALE_KEY = "pricingplus_locale";
const LEGACY_KEYS = ["pricingplus_lang", "pricingplus-language", "locale", "language"];

/**
 * Standard i18n Engine - Language-centric translation system
 * Multi-file structure: ar.js, en.js
 */

/**
 * Smart translation function
 * @param {string} key - The translation key path
 * @returns {string} - The translated text or fallback
 */
export function t(key) {
  if (!key) return "";
  
  try {
    const state = getState();
    const currentLang = state?.settings?.locale || "ar";

    // Primary: current language, Secondary: english fallback, Tertiary: the key itself
    const value = 
      translations[currentLang]?.[key] || 
      translations["en"]?.[key] || 
      key;

    return value || key; // Ensure we never return an empty string if key is provided
  } catch (err) {
    console.warn("i18n t() error for key:", key, err);
    return key;
  }
}

/**
 * Updates the document's language and direction (RTL/LTR)
 * @param {string} locale - 'ar' or 'en'
 */
export function applyDocumentLocale(locale) {
  if (!locale) return;
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  document.body.setAttribute("dir", locale === "ar" ? "rtl" : "ltr");
  // Update global state to ensure t() reflects the change
  try {
    updateSetting("locale", locale);
  } catch (e) {
    console.debug("stateManager update skipped (not in app context?)", e);
  }
  translatePage();
}

/**
 * Iterates over all elements with [data-i18n] and updates their content.
 * Special handling for [data-i18n-attr] for translating attributes like placeholder or alt.
 */
export function translatePage() {
  // Update Document Title if key exists
  const titleEl = document.querySelector("title[data-i18n]");
  if (titleEl) {
    const key = titleEl.getAttribute("data-i18n");
    titleEl.textContent = t(key);
  }

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (!key) return;
    
    const translation = t(key);
    // Even if translation === key, we might want to set it if the element is empty
    if (!translation) return;

    // Default to innerHTML if the element has certain tags, otherwise textContent
    if (["P", "LI", "DIV", "H1", "H2", "H3", "H4", "SPAN", "SECTION", "ARTICLE"].includes(el.tagName)) {
      el.innerHTML = translation;
    } else {
      el.textContent = translation;
    }
  });

  // Handle attributes (e.g. data-i18n-placeholder="search_hint")
  document.querySelectorAll("[data-i18n-attr]").forEach((el) => {
    const config = el.getAttribute("data-i18n-attr"); // format: attrname:key
    if (!config) return;

    const [attr, key] = config.split(":");
    if (attr && key) {
      el.setAttribute(attr, t(key));
    }
  });
}

/**
 * Backward compatibility for legacy code
 */
export function createTranslator(locale) {
  return (key) => t(key);
}

export function normalizeLocale(locale) {
  if (typeof locale !== "string") return "ar";
  const normalized = locale.toLowerCase();
  return normalized.startsWith("en") ? "en" : "ar";
}

export function getStoredLocale() {
  const saved = localStorage.getItem(SELECTED_LANGUAGE_KEY);
  if (saved) return normalizeLocale(saved);

  const canonical = localStorage.getItem(LOCALE_KEY);
  if (canonical) return normalizeLocale(canonical);

  for (const key of LEGACY_KEYS) {
    const legacyValue = localStorage.getItem(key);
    if (legacyValue) return normalizeLocale(legacyValue);
  }

  return normalizeLocale(navigator.language || "ar");
}

export function persistLocaleSelection(locale) {
  const normalized = normalizeLocale(locale);
  localStorage.setItem(SELECTED_LANGUAGE_KEY, normalized);
  localStorage.setItem(LOCALE_KEY, normalized);
  return normalized;
}

/**
 * Detect language based on storage or browser
 */
export function detectInitialLocale() {
  const locale = getStoredLocale();
  persistLocaleSelection(locale);
  return locale;
}

console.log("I18n Initialized Successfully");
