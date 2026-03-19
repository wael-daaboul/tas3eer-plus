/**
 * Pricing+ Core - Version 1.5.0 (The Vanilla Milestone)
 * Final stable version of the Vanilla JavaScript implementation.
 * Updated: 2026-03-19
 */
// Global error tracking for resilience
if (!window.__pricingPlusErrorsBound) {
  window.__pricingPlusErrorsBound = true;
  window.addEventListener('unhandledrejection', (event) => {
    // TODO: Integrate with monitoring service like Sentry
    console.error("Unhandled Promise Rejection:", event.reason);
  });

  window.addEventListener('error', (event) => {
    // TODO: Integrate with monitoring service like Sentry
    console.error("Global Runtime Error:", event.error || event.message);
  });
}

import {
  buildProductMetrics,
  getProfitStatus,
  calculateMaterialBaseUnitCost,
  calculatePriceWithTax
} from "./engine/pricingEngine.js";
import {
  applyDocumentLocale,
  createTranslator,
  getStoredLocale,
  normalizeLocale,
  persistLocaleSelection,
  SELECTED_LANGUAGE_KEY,
  LOCALE_KEY,
  t
} from "./i18n/localization.js";
import { LanguageSelector } from "./ui/components/LanguageSelector.js";
import { showToast } from "./ui/components/Toast.js";
import { authService } from "./services/authService.js";
import { dbService } from "./services/dbService.js";
import { exportCsv, exportXlsx, exportPdf } from "./services/exportService.js";
import { formatMoney, formatNumber, toNumber } from "./utils/format.js";
import { uid } from "./utils/id.js";
import { escapeHTML } from "./utils/security.js";
import { hasSupabaseConfig } from "../site/supabaseClient.js";
import { ResultCard } from "./ui/components/ResultCard.js";
import { ProductItem } from "./ui/components/ProductItem.js";
import { PricingTable } from "./ui/components/PricingTable.js";
import { SummarySection } from "./ui/components/SummarySection.js";
import { ComparisonTable } from "./ui/components/ComparisonTable.js";
import { CostBreakdown } from "./ui/components/CostBreakdown.js";
import { MapsTo } from "./ui/viewManager.js";
import { getState, updateInput, updateSetting, setProducts, setResults } from "./store/stateManager.js";

const APP_VERSION = "1.5.0";

const FIXED_COST_TEMPLATES = [
  { key: "fixedRent", hintKey: "fixedRentHint" },
  { key: "fixedUtilities", hintKey: "fixedUtilitiesHint" },
  { key: "fixedInternetPhone", hintKey: "fixedInternetPhoneHint" },
  { key: "fixedToolsDepreciation", hintKey: "fixedToolsDepreciationHint" },
  { key: "fixedMarketingAds", hintKey: "fixedMarketingAdsHint" },
  { key: "fixedSubscriptions", hintKey: "fixedSubscriptionsHint" },
  { key: "fixedOwnerIncome", hintKey: "fixedOwnerIncomeHint" },
  { key: "fixedAdminOther", hintKey: "fixedAdminOtherHint" }
];

let state = getState();

window.getState = getState;
window.updateInput = updateInput;
window.updateSetting = updateSetting;
window.setProducts = setProducts;
window.setResults = setResults;

window.addEventListener('stateChanged', (event) => {
  state = event.detail;
  
  // Re-render core views if relevant data changes
  if (state.inputs.project) {
    renderHourlyRateWarning();
  }
  
  if (state.settings.selectedProductId && state.products.length > 0) {
    renderProductPicker();
    // Re-render results only if currently visible
    if (!refs.stepResults.classList.contains("hidden")) {
      renderResults();
    }
  }
});

function getCanonicalLocale() {
  return getStoredLocale();
}

function analytics() {
  return window.PricingPlusAnalytics;
}

function getLangCurrencyContext(extra = {}) {
  return {
    lang: state.settings.locale === "ar" ? "ar" : "en",
    currency: state.project?.currencyCode || "USD",
    ...extra
  };
}

function trackEvent(name, params = {}) {
  analytics()?.trackEvent(name, params);
}

function createDefaultProject() {
  return {
    id: uid("project"),
    monthlyFixedCosts: [{ id: uid("fixed"), name: "", templateKey: "", amount: 0 }],
    equipmentDepreciation: [{ id: uid("equip"), name: "", purchasePrice: 0, lifetimeMonths: 12 }],
    expectedMonthlyUnits: 1,
    expectedMonthlySales: 0,
    safetyMarginPercent: 5,
    pricingMode: "markup",
    pricingPercent: 30,
    hasSales: "no",
    salesUnitsInput: 0,
    salesUndefined: true,
    uiMode: "simple",
    taxRate: 0,
    wholesaleDiscount: 0
  };
}

function ensureProjectFixedCosts(project) {
  const existing = Array.isArray(project.monthlyFixedCosts) ? project.monthlyFixedCosts : [];
  const byTemplate = new Map(
    existing
      .filter((item) => item.templateKey)
      .map((item) => [item.templateKey, item])
  );
  const custom = existing.filter((item) => !item.templateKey);

  const templates = FIXED_COST_TEMPLATES.map((item) => {
    const old = byTemplate.get(item.key);
    return {
      id: old?.id || uid("fixed"),
      name: "",
      templateKey: item.key,
      templateHintKey: item.hintKey,
      amount: Math.max(0, toNumber(old?.amount, 0))
    };
  });

  project.monthlyFixedCosts = [...templates, ...custom];
}

function createDefaultMaterial() {
  return {
    id: uid("mat"),
    name_ar: "",
    name_en: "",
    unitType: "piece",
    pricingMode: "perUnit",
    unitPrice: 0,
    packPrice: 0,
    packSize: 0,
    wasteDefaultPercent: 0
  };
}

function createDefaultProduct() {
  return {
    id: uid("product"),
    name: "",
    unitName: "",
    laborMinutes: 0,
    manualSellingPrice: 0,
    energy: { kw: 0, minutes: 0, pricePerKwh: 0 },
    recipe: [{ materialId: "", qtyPerUnit: 1, overrideWastePercent: null }],
    variants: [{
      id: uid("variant"),
      name: "",
      unitsPerVariant: 1,
      extraPackagingCost: 0,
      sellingPriceOverride: 0,
      pricingTargetPercent: null,
      expectedMonthlySalesVariant: null,
      hasDelivery: false,
      deliveryPricingMode: "customer_separate",
      deliveryCost: 0,
      deliveryCostBasis: "perOrder"
    }]
  };
}

function buildDemoSeed(demoKey) {
  const project = {
    ...createDefaultProject(),
    hasSales: "yes",
    salesUndefined: false,
    pricingMode: "markup",
    pricingPercent: 30,
    safetyMarginPercent: 5
  };

  if (demoKey === "perfume") {
    project.hourlyRate = 8;
    project.expectedMonthlyUnits = 120;
    project.expectedMonthlySales = 120;
    project.salesUnitsInput = 120;
    project.monthlyFixedCosts = project.monthlyFixedCosts.map((item) => {
      if (item.templateKey === "fixedMarketingAds") return { ...item, amount: 80 };
      if (item.templateKey === "fixedSubscriptions") return { ...item, amount: 25 };
      return item;
    });

    const m1 = { id: uid("mat"), name_ar: "زيت عطري", name_en: "Fragrance Oil", unitType: "ml", pricingMode: "perPack", unitPrice: 0, packPrice: 25, packSize: 50, wasteDefaultPercent: 2 };
    const m2 = { id: uid("mat"), name_ar: "كحول", name_en: "Alcohol", unitType: "ml", pricingMode: "perUnit", unitPrice: 0.03, packPrice: 0, packSize: 0, wasteDefaultPercent: 0 };
    const m3 = { id: uid("mat"), name_ar: "عبوة زجاج", name_en: "Glass Bottle", unitType: "piece", pricingMode: "perUnit", unitPrice: 0.8, packPrice: 0, packSize: 0, wasteDefaultPercent: 0 };
    const product = {
      ...createDefaultProduct(),
      id: uid("product"),
      name: "عطر منزلي",
      unitName: "عبوة 50ml",
      laborMinutes: 20,
      recipe: [
        { materialId: m1.id, qtyPerUnit: 4, overrideWastePercent: null },
        { materialId: m2.id, qtyPerUnit: 40, overrideWastePercent: null },
        { materialId: m3.id, qtyPerUnit: 1, overrideWastePercent: null }
      ],
      variants: [
        { id: uid("variant"), name: "عبوة 50ml", unitsPerVariant: 1, extraPackagingCost: 0.4, sellingPriceOverride: 0, pricingTargetPercent: 35, expectedMonthlySalesVariant: null, hasDelivery: true, deliveryPricingMode: "included_in_price", deliveryCost: 1.2, deliveryCostBasis: "perOrder" },
        { id: uid("variant"), name: "عبوة 100ml", unitsPerVariant: 2, extraPackagingCost: 0.6, sellingPriceOverride: 0, pricingTargetPercent: 35, expectedMonthlySalesVariant: null, hasDelivery: true, deliveryPricingMode: "included_in_price", deliveryCost: 1.2, deliveryCostBasis: "perOrder" }
      ]
    };
    return { project, materials: [m1, m2, m3], product };
  }

  if (demoKey === "handmade") {
    project.hourlyRate = 7;
    project.expectedMonthlyUnits = 60;
    project.expectedMonthlySales = 60;
    project.salesUnitsInput = 60;
    project.monthlyFixedCosts = project.monthlyFixedCosts.map((item) => {
      if (item.templateKey === "fixedToolsDepreciation") return { ...item, amount: 35 };
      if (item.templateKey === "fixedOwnerIncome") return { ...item, amount: 120 };
      return item;
    });

    const m1 = { id: uid("mat"), name_ar: "خامة قماش", name_en: "Fabric", unitType: "piece", pricingMode: "perUnit", unitPrice: 1.2, packPrice: 0, packSize: 0, wasteDefaultPercent: 8 };
    const m2 = { id: uid("mat"), name_ar: "إكسسوار", name_en: "Accessory", unitType: "piece", pricingMode: "perUnit", unitPrice: 0.6, packPrice: 0, packSize: 0, wasteDefaultPercent: 0 };
    const m3 = { id: uid("mat"), name_ar: "تغليف يدوي", name_en: "Handmade Packaging", unitType: "piece", pricingMode: "perUnit", unitPrice: 0.3, packPrice: 0, packSize: 0, wasteDefaultPercent: 0 };
    const product = {
      ...createDefaultProduct(),
      id: uid("product"),
      name: "منتج يدوي",
      unitName: "قطعة",
      laborMinutes: 60,
      recipe: [
        { materialId: m1.id, qtyPerUnit: 1, overrideWastePercent: null },
        { materialId: m2.id, qtyPerUnit: 2, overrideWastePercent: null },
        { materialId: m3.id, qtyPerUnit: 1, overrideWastePercent: null }
      ],
      variants: [
        { id: uid("variant"), name: "قطعة مفردة", unitsPerVariant: 1, extraPackagingCost: 0.4, sellingPriceOverride: 0, pricingTargetPercent: 40, expectedMonthlySalesVariant: null, hasDelivery: true, deliveryPricingMode: "customer_separate", deliveryCost: 1.5, deliveryCostBasis: "perOrder" },
        { id: uid("variant"), name: "باكج 3 قطع", unitsPerVariant: 3, extraPackagingCost: 0.9, sellingPriceOverride: 0, pricingTargetPercent: 35, expectedMonthlySalesVariant: null, hasDelivery: true, deliveryPricingMode: "customer_separate", deliveryCost: 1.5, deliveryCostBasis: "perOrder" }
      ]
    };
    return { project, materials: [m1, m2, m3], product };
  }

  project.hourlyRate = 6;
  project.expectedMonthlyUnits = 90;
  project.expectedMonthlySales = 90;
  project.salesUnitsInput = 90;
  project.monthlyFixedCosts = project.monthlyFixedCosts.map((item) => {
    if (item.templateKey === "fixedUtilities") return { ...item, amount: 30 };
    if (item.templateKey === "fixedMarketingAds") return { ...item, amount: 40 };
    return item;
  });

  const m1 = { id: uid("mat"), name_ar: "طحين", name_en: "Flour", unitType: "kg", pricingMode: "perPack", unitPrice: 0, packPrice: 20, packSize: 10, wasteDefaultPercent: 3 };
  const m2 = { id: uid("mat"), name_ar: "سكر", name_en: "Sugar", unitType: "kg", pricingMode: "perPack", unitPrice: 0, packPrice: 18, packSize: 10, wasteDefaultPercent: 2 };
  const m3 = { id: uid("mat"), name_ar: "علبة تغليف", name_en: "Packaging Box", unitType: "piece", pricingMode: "perUnit", unitPrice: 0.5, packPrice: 0, packSize: 0, wasteDefaultPercent: 0 };
  const product = {
    ...createDefaultProduct(),
    id: uid("product"),
    name: "حلوى منزلية",
    unitName: "قطعة",
    laborMinutes: 40,
    recipe: [
      { materialId: m1.id, qtyPerUnit: 0.12, overrideWastePercent: null },
      { materialId: m2.id, qtyPerUnit: 0.05, overrideWastePercent: null },
      { materialId: m3.id, qtyPerUnit: 1, overrideWastePercent: null }
    ],
    variants: [
      { id: uid("variant"), name: "قطعة مفردة", unitsPerVariant: 1, extraPackagingCost: 0.2, sellingPriceOverride: 0, pricingTargetPercent: 30, expectedMonthlySalesVariant: null, hasDelivery: true, deliveryPricingMode: "merchant_free", deliveryCost: 1.5, deliveryCostBasis: "perOrder" },
      { id: uid("variant"), name: "علبة 6 قطع", unitsPerVariant: 6, extraPackagingCost: 0.9, sellingPriceOverride: 0, pricingTargetPercent: 28, expectedMonthlySalesVariant: null, hasDelivery: true, deliveryPricingMode: "merchant_free", deliveryCost: 1.5, deliveryCostBasis: "perOrder" }
    ]
  };
  return { project, materials: [m1, m2, m3], product };
}

let refs = {};

function initRefs() {
  refs = {
    feedback: document.getElementById("feedback"),
  languageSelectorContainer: document.getElementById("language-selector-container"),
  siteNavHome: document.getElementById("siteNavHome"),
  siteNavApp: document.getElementById("siteNavApp"),
  siteNavLearn: document.getElementById("siteNavLearn"),
  siteNavHow: document.getElementById("siteNavHow"),
  siteNavSupport: document.getElementById("siteNavSupport"),
  siteNavAbout: document.getElementById("siteNavAbout"),
  stepSettings: document.getElementById("stepSettings"),
  stepMaterials: document.getElementById("stepMaterials"),
  stepProducts: document.getElementById("stepProducts"),
  stepResults: document.getElementById("stepResults"),

  simpleModeBtn: document.getElementById("simpleModeBtn"),
  advancedModeBtn: document.getElementById("advancedModeBtn"),
  currencyCode: document.getElementById("currencyCode"),
  hourlyRate: document.getElementById("hourlyRate"),
  hourlyRateTooltip: document.getElementById("hourlyRateTooltip"),
  hourlyRateTooltipText: document.getElementById("hourlyRateTooltipText"),
  salesCurrentUnits: document.getElementById("salesCurrentUnits"),
  salesOptionalUnits: document.getElementById("salesOptionalUnits"),
  salesYesBlock: document.getElementById("salesYesBlock"),
  salesNoBlock: document.getElementById("salesNoBlock"),
  advancedSettingsBtn: document.getElementById("advancedSettingsBtn"),
  advancedSettingsPanel: document.getElementById("advancedSettingsPanel"),
  equipmentSection: document.getElementById("equipmentSection"),
  safetyMarginPercent: document.getElementById("safetyMarginPercent"),
  pricingPercent: document.getElementById("pricingPercent"),
  fixedCostsList: document.getElementById("fixedCostsList"),
  equipmentList: document.getElementById("equipmentList"),
  addFixedCostBtn: document.getElementById("addFixedCostBtn"),
  addEquipmentBtn: document.getElementById("addEquipmentBtn"),
  saveSettingsBtn: document.getElementById("saveSettingsBtn"),
  demoBakeryBtn: document.getElementById("demoBakeryBtn"),
  demoPerfumeBtn: document.getElementById("demoPerfumeBtn"),
  demoHandmadeBtn: document.getElementById("demoHandmadeBtn"),

  materialsSearch: document.getElementById("materialsSearch"),
  materialForm: document.getElementById("materialForm"),
  materialNameAr: document.getElementById("materialNameAr"),
  materialNameEn: document.getElementById("materialNameEn"),
  materialUnitType: document.getElementById("materialUnitType"),
  materialPricingMode: document.getElementById("materialPricingMode"),
  materialWasteDefaultPercent: document.getElementById("materialWasteDefaultPercent"),
  materialUnitPrice: document.getElementById("materialUnitPrice"),
  materialPackPrice: document.getElementById("materialPackPrice"),
  materialPackSize: document.getElementById("materialPackSize"),
  perUnitBlock: document.getElementById("perUnitBlock"),
  perPackBlock: document.getElementById("perPackBlock"),
  materialPackExample: document.getElementById("materialPackExample"),
  resetMaterialBtn: document.getElementById("resetMaterialBtn"),
  materialsLibraryList: document.getElementById("materialsLibraryList"),

  productForm: document.getElementById("productForm"),
  productName: document.getElementById("productName"),
  unitName: document.getElementById("unitName"),
  laborMinutes: document.getElementById("laborMinutes"),
  energyKw: document.getElementById("energyKw"),
  energyMinutes: document.getElementById("energyMinutes"),
  energyPricePerKwh: document.getElementById("energyPricePerKwh"),
  recipeMaterialOptions: document.getElementById("recipeMaterialOptions"),
  recipeList: document.getElementById("recipeList"),
  addRecipeItemBtn: document.getElementById("addRecipeItemBtn"),
  variantsList: document.getElementById("variantsList"),
  addVariantBtn: document.getElementById("addVariantBtn"),
  resetProductBtn: document.getElementById("resetProductBtn"),
  productsList: document.getElementById("productsList"),

  resultProductSelect: document.getElementById("resultProductSelect"),
  resultSellingPrice: document.getElementById("resultSellingPrice"),
  calculateBtn: document.getElementById("calculateBtn"),
  howCalculatedBtn: document.getElementById("howCalculatedBtn"),
  statusBadge: document.getElementById("statusBadge"),
  resultsGrid: document.getElementById("resultsGrid"),
  variantCards: document.getElementById("variantCards"),
  calculationDetails: document.getElementById("calculationDetails"),
  monthlyTable: document.getElementById("monthlyTable"),
  taxRateInput: document.getElementById("tax-rate-input"),
  wholesaleDiscountInput: document.getElementById("wholesale-discount-input"),

  exportCsvBtn: document.getElementById("exportCsvBtn"),
  exportXlsxBtn: document.getElementById("exportXlsxBtn"),
  exportPdfBtn: document.getElementById("exportPdfBtn"),
  authSyncPanel: document.getElementById("authSyncPanel"),
  authSignInBtn: document.getElementById("authSignInBtn"),
  accountChipBtn: document.getElementById("accountChipBtn"),
  authUserEmailShort: document.getElementById("authUserEmailShort"),
  accountDropdown: document.getElementById("accountDropdown"),
  syncStatusLine: document.getElementById("syncStatusLine"),
  syncLastLine: document.getElementById("syncLastLine"),
  syncNowBtn: document.getElementById("syncNowBtn"),
  restoreCloudBtn: document.getElementById("restoreCloudBtn"),
  authSignOutBtn: document.getElementById("authSignOutBtn"),
  backToSiteLink: document.getElementById("backToSiteLink"),
  startNewProjectBtn: document.getElementById("startNewProjectBtn"),
  demoModeBanner: document.getElementById("demoModeBanner"),
  demoModeTitle: document.getElementById("demoModeTitle"),
  exitDemoModeBtn: document.getElementById("exitDemoModeBtn"),
  appGuideBox: document.getElementById("appGuideBox"),
  appGuideText: document.getElementById("appGuideText"),
  appGuideDismiss: document.getElementById("appGuideDismiss"),
  quickStartDemoBtn: document.getElementById("quickStartDemoBtn"),
  deleteDemoBtn: document.getElementById("deleteDemoBtn"),
  hourlyRateZeroWarning: document.getElementById("hourlyRateZeroWarning"),
    demoSeedSectionTitle: document.getElementById("demoSeedTitle")
  };
}

function setFeedback(message) {
  refs.feedback.textContent = message;
}

function getFriendlyErrorMessage(error) {
  const code = String(error?.message || error || "");
  const t = state.settings.t;
  if (code.includes("EXPORT_LIBRARY_MISSING")) return t("errorExportLibrary");
  if (code.includes("LOAD_CURRENCIES_FAILED")) return t("errorLoadCurrencies");
  return t("unexpectedError");
}

function validateNonNegative(values) {
  return values.every((v) => Number.isFinite(v) && v >= 0);
}

function getCurrencyDisplay(currency) {
  const isAr = state.settings.locale === "ar";
  const name = isAr
    ? (currency.name_ar || `${state.settings.t("currencyGenericName")} ${currency.code}`)
    : (currency.name_en || currency.code);
  return `${name} — ${currency.code}`;
}

function getMaterialDisplayName(material) {
  return state.settings.locale === "ar"
    ? (material.name_ar || material.name_en || material.id)
    : (material.name_en || material.name_ar || material.id);
}

function getCurrentPricingMode() {
  const radio = document.querySelector('input[name="pricingMode"]:checked');
  return radio?.value === "margin" ? "margin" : "markup";
}

function getHasSalesValue() {
  const selected = document.querySelector('input[name="hasSales"]:checked');
  return selected?.value === "no" ? "no" : "yes";
}


function applyUiMode(mode) {
  const newMode = mode === "advanced" ? "advanced" : "simple";
  updateSetting("uiMode", newMode);
  document.body.classList.toggle("simple-mode", state.settings.uiMode === "simple");
  refs.simpleModeBtn.classList.toggle("active", state.settings.uiMode === "simple");
  refs.advancedModeBtn.classList.toggle("active", state.settings.uiMode === "advanced");
  refs.advancedSettingsBtn.classList.toggle("hidden", state.settings.uiMode === "simple");
  refs.equipmentSection.classList.toggle("hidden", state.settings.uiMode === "simple");
  if (state.settings.uiMode === "simple") {
    refs.advancedSettingsPanel.classList.add("hidden");
  }
  document.querySelectorAll(".advanced-field").forEach((el) => {
    el.style.display = state.settings.uiMode === "advanced" ? "block" : "none";
  });
}

function renderSalesBlocks() {
  const hasSales = getHasSalesValue();
  refs.salesYesBlock.classList.toggle("hidden", hasSales !== "yes");
  refs.salesNoBlock.classList.toggle("hidden", hasSales !== "no");
}

function renderHourlyRateWarning() {
  if (!refs.hourlyRateZeroWarning) return;
  const isZero = toNumber(refs.hourlyRate.value, 0) === 0;
  refs.hourlyRateZeroWarning.classList.toggle("hidden", !isZero);
}

function renderDemoDeleteButton() {
  if (!refs.deleteDemoBtn) return;
  const show = Boolean(state.settings.demoMode);
  refs.deleteDemoBtn.classList.toggle("hidden", !show);
}

function renderDemoModeBanner() {
  if (!refs.demoModeBanner) return;
  refs.demoModeBanner.classList.toggle("hidden", !state.settings.demoMode);
}

function updateDemoModeTexts() {
  if (refs.demoModeTitle) {
    refs.demoModeTitle.textContent = state.settings.locale === "ar"
      ? "أنت الآن في وضع التجربة"
      : "You are in demo mode";
  }
  if (refs.exitDemoModeBtn) {
    refs.exitDemoModeBtn.textContent = state.settings.locale === "ar"
      ? "ابدأ مشروعك الخاص"
      : "Start your own project";
  }
}

function getCleanAppUrl() {
  const params = new URLSearchParams(window.location.search);
  params.delete("demo");
  const query = params.toString();
  return `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
}

function exitDemoModeReload() {
  state.settings.demoMode = false;
  window.location.replace(getCleanAppUrl());
}

function updateAuthTexts() {
  if (!refs.authSyncPanel) return;
  if (refs.authSignInBtn) refs.authSignInBtn.textContent = t("signInOptional");
  if (refs.syncNowBtn) refs.syncNowBtn.textContent = t("syncNow");
  if (refs.restoreCloudBtn) refs.restoreCloudBtn.textContent = t("restore");
  if (refs.authSignOutBtn) refs.authSignOutBtn.textContent = t("signOut");
}

function shortEmail(email) {
  const value = String(email || "").trim();
  if (!value) return "";
  if (value.length <= 24) return value;
  return `${value.slice(0, 21)}...`;
}

function relativeTime(iso) {
  if (!iso) return t("lastSyncNever");
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return t("lastSyncNever");
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  
  if (diffSec < 60) return t("timeNow");
  
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return t("timeMinAgo").replace("{n}", diffMin);
  
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return t("timeHourAgo").replace("{n}", diffHour);
  
  const diffDay = Math.floor(diffHour / 24);
  return t("timeDayAgo").replace("{n}", diffDay);
}

function setSyncStatus(status) {
  state.settings.sync.status = status;
}

function refreshSyncLines() {
  const status = state.settings.sync.status;
  const labels = {
    up_to_date: t("syncUpToDate"),
    pending: t("syncPending"),
    error: t("syncError"),
    syncing: t("syncInProgress")
  };
  const statusText = labels[status] || labels.pending;

  if (refs.syncStatusLine) {
    refs.syncStatusLine.textContent = `${t("syncStatusLabel")}: ${statusText}`;
  }
  if (refs.syncLastLine) {
    refs.syncLastLine.textContent = `${t("lastSyncLabel")}: ${relativeTime(state.settings.sync.lastSyncAt)}`;
  }
}

function renderAuthPanel() {
  if (!refs.authSyncPanel) return;
  const enabled = hasSupabaseConfig();
  const signedIn = Boolean(state.settings.auth.user);

  refs.authSyncPanel.classList.toggle("hidden", !enabled);
  if (!enabled) {
    closeAccountDropdown();
    return;
  }

  if (refs.authSignInBtn) refs.authSignInBtn.classList.toggle("hidden", signedIn);
  if (refs.accountChipBtn) refs.accountChipBtn.classList.toggle("hidden", !signedIn);

  if (!signedIn) {
    closeAccountDropdown();
    return;
  }

  if (refs.authUserEmailShort) {
    refs.authUserEmailShort.textContent = shortEmail(state.settings.auth.user.email);
  }
  refreshSyncLines();
}

// Data persistence is now handled by dbService.
// Local storage and cloud sync are isolated from the main Logic.

function readVersionsFromRow(data) {
  if (!data) return [];
  if (Array.isArray(data.versions)) return data.versions;
  if (data.project || data.products || data.materials) {
    const updatedAt = data?._meta?.updatedAt || new Date().toISOString();
    return [{ updatedAt, data }];
  }
  return [];
}

async function handleSyncNow() {
  if (state.settings.demoMode) {
    setFeedback(t("demoBlocked"));
    return;
  }
  try {
    await dbService.runAutoSync(true);
    setFeedback(t("synced"));
  } catch (_) {
    setFeedback(t("authError"));
  }
}

async function handleRestoreFromCloud() {
  if (state.settings.demoMode) {
    setFeedback(t("demoBlocked"));
    return;
  }
  try {
    const row = await dbService.loadFromCloud();
    const dataObj = typeof row?.data === "string" ? JSON.parse(row.data) : row?.data;
    const versions = (Array.isArray(dataObj?.versions) ? dataObj.versions : []);
    const latest = versions.length ? versions[versions.length - 1].data : null;
    
    if (!latest) {
      setFeedback(t("noBackup"));
      return;
    }
    if (!window.confirm(t("restoreConfirm"))) return;

    await dbService.importLocalData(latest);
    setFeedback(t("restored"));
    window.location.replace(getCleanAppUrl());
  } catch (_) {
    setFeedback(t("authError"));
  }
}

// Storage write mapping is now integrated into dbService.

function closeAccountDropdown() {
  if (!refs.accountDropdown || !refs.accountChipBtn) return;
  refs.accountDropdown.classList.add("hidden");
  refs.accountChipBtn.setAttribute("aria-expanded", "false");
}

function bindAccountDropdown() {
  if (!refs.accountChipBtn || !refs.accountDropdown) return;
  refs.accountChipBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    const willOpen = refs.accountDropdown.classList.contains("hidden");
    refs.accountDropdown.classList.toggle("hidden", !willOpen);
    refs.accountChipBtn.setAttribute("aria-expanded", willOpen ? "true" : "false");
  });

  document.addEventListener("click", (event) => {
    if (refs.accountChipBtn.contains(event.target) || refs.accountDropdown.contains(event.target)) return;
    closeAccountDropdown();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeAccountDropdown();
    }
  });
}

async function initAuth() {
  if (!refs.authSyncPanel) return;
  updateAuthTexts();
  bindAccountDropdown();

  if (!hasSupabaseConfig()) {
    renderAuthPanel();
    return;
  }

  // Use authService for initialization and session management
  await authService.init((event, _session) => {
    if (!authService.getCurrentUser()) {
      closeAccountDropdown();
    }
    renderAuthPanel();
  });

  refs.syncNowBtn?.addEventListener("click", handleSyncNow);
  refs.restoreCloudBtn?.addEventListener("click", handleRestoreFromCloud);
  refs.authSignOutBtn?.addEventListener("click", async () => {
    await authService.signOut();
    closeAccountDropdown();
    setFeedback(t("signOutDone"));
    renderAuthPanel();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      dbService.runAutoSync(true).catch(() => {});
    }
  });

  window.addEventListener("beforeunload", () => {
    dbService.runAutoSync(true).catch(() => {});
  });

  renderAuthPanel();
  if (state.settings.sync.dirty) {
    dbService.scheduleAutoSync();
  }
}

function createInput(value = "", type = "text") {
  const input = document.createElement("input");
  input.type = type;
  input.value = value;
  if (type === "number") {
    input.min = "0";
    input.step = "0.01";
  }
  return input;
}

function unitTypeLabel(unitType) {
  const map = {
    piece: state.settings.t("unitTypePiece"),
    g: state.settings.t("unitTypeG"),
    kg: state.settings.t("unitTypeKg"),
    ml: state.settings.t("unitTypeMl"),
    l: state.settings.t("unitTypeL")
  };
  return map[unitType] || unitType;
}

function pricingModeLabel(mode) {
  return mode === "perPack" ? state.settings.t("pricingModePerPack") : state.settings.t("pricingModePerUnit");
}

function normalizeLegacyLabel(text, fallbackKey) {
  const value = String(text || "").trim();
  if (!value) return state.settings.t(fallbackKey);
  if (state.settings.locale === "ar" && /^(unit|variant)$/i.test(value)) {
    return state.settings.t(fallbackKey);
  }
  return value;
}

function renderCurrencySelect() {
  refs.currencyCode.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = state.settings.t("currencyPlaceholder");
  placeholder.disabled = true;
  refs.currencyCode.append(placeholder);

  state.settings.currencies.forEach((currency) => {
    const option = document.createElement("option");
    option.value = currency.code;
    option.textContent = getCurrencyDisplay(currency);
    refs.currencyCode.append(option);
  });
  const selectedCode = state.settings.currencies.some((item) => item.code === state.inputs.project.currencyCode)
    ? state.inputs.project.currencyCode
    : "USD";
  refs.currencyCode.value = selectedCode || "";
  state.inputs.project.currencyCode = selectedCode;
}

function renderRecipeMaterialOptions() {
  refs.recipeMaterialOptions.innerHTML = "";
  state.inputs.materialsLibrary.forEach((material) => {
    const option = document.createElement("option");
    option.value = `${getMaterialDisplayName(material)} — ${material.id}`;
    refs.recipeMaterialOptions.append(option);
  });
}

function renderSettingsLists() {
  const t = state.settings.t;

  refs.fixedCostsList.innerHTML = "";
  state.inputs.project.monthlyFixedCosts.forEach((row) => {
    const item = document.createElement("div");
    item.className = "row fixed-cost-row";
    item.dataset.id = row.id;

    const nameLabel = document.createElement("label");
    nameLabel.className = "fixed-label";
    const labelText = row.templateKey ? t(row.templateKey) : (row.name || t("customCostLabel"));
    nameLabel.textContent = labelText;
    if (row.templateKey && row.templateHintKey) {
      const hint = document.createElement("small");
      hint.className = "muted";
      hint.textContent = t(row.templateHintKey);
      nameLabel.append(document.createElement("br"), hint);
    }

    const amount = createInput(row.amount, "number");
    amount.step = "0.01";
    amount.oninput = () => { row.amount = toNumber(amount.value, 0); };

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "remove";
    remove.textContent = t("remove");
    remove.onclick = () => {
      state.inputs.project.monthlyFixedCosts = state.inputs.project.monthlyFixedCosts.filter((x) => x.id !== row.id);
      renderSettingsLists();
    };

    if (!row.templateKey) {
      const customName = createInput(row.name, "text");
      customName.oninput = () => { row.name = customName.value.trim(); };
      item.append(customName);
    } else {
      item.append(nameLabel);
    }

    item.append(amount, remove);
    refs.fixedCostsList.append(item);
  });

  refs.equipmentList.innerHTML = "";
  state.inputs.project.equipmentDepreciation.forEach((row) => {
    const item = document.createElement("div");
    item.className = "row equipment-row";
    item.dataset.id = row.id;

    const name = createInput(row.name, "text");
    const purchasePrice = createInput(row.purchasePrice, "number");
    const lifetimeMonths = createInput(row.lifetimeMonths, "number");
    lifetimeMonths.step = "1";

    name.oninput = () => { row.name = name.value; };
    purchasePrice.oninput = () => { row.purchasePrice = toNumber(purchasePrice.value, 0); };
    lifetimeMonths.oninput = () => { row.lifetimeMonths = Math.max(1, Math.floor(toNumber(lifetimeMonths.value, 1))); };

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "remove";
    remove.textContent = t("remove");
    remove.onclick = () => {
      state.inputs.project.equipmentDepreciation = state.inputs.project.equipmentDepreciation.filter((x) => x.id !== row.id);
      renderSettingsLists();
    };

    item.append(name, purchasePrice, lifetimeMonths, remove);
    refs.equipmentList.append(item);
  });
}

function renderMaterialPricingMode() {
  const mode = refs.materialPricingMode.value;
  refs.perUnitBlock.classList.toggle("hidden", mode !== "perUnit");
  refs.perPackBlock.classList.toggle("hidden", mode !== "perPack");

  if (mode === "perPack") {
    const packPrice = toNumber(refs.materialPackPrice.value, 0);
    const packSize = toNumber(refs.materialPackSize.value, 0);
    const unitCost = packSize > 0 ? packPrice / packSize : 0;
    refs.materialPackExample.textContent = `${state.settings.t("materialPackExample")} ${formatNumber(unitCost, state.settings.locale, 4)}. ${state.settings.t("materialPricingModeHintPerPack")}`;
  } else {
    refs.materialPackExample.textContent = state.settings.t("materialPricingModeHintPerUnit");
  }
}

function collectMaterialFromForm() {
  const base = createDefaultMaterial();
  return {
    ...base,
    id: state.settings.editingMaterialId || base.id,
    name_ar: refs.materialNameAr.value.trim(),
    name_en: refs.materialNameEn.value.trim(),
    unitType: refs.materialUnitType.value || "piece",
    pricingMode: refs.materialPricingMode.value === "perPack" ? "perPack" : "perUnit",
    unitPrice: Math.max(0, toNumber(refs.materialUnitPrice.value, 0)),
    packPrice: Math.max(0, toNumber(refs.materialPackPrice.value, 0)),
    packSize: Math.max(0, toNumber(refs.materialPackSize.value, 0)),
    wasteDefaultPercent: Math.max(0, toNumber(refs.materialWasteDefaultPercent.value, 0))
  };
}

function resetMaterialForm() {
  state.settings.editingMaterialId = null;
  const material = createDefaultMaterial();
  refs.materialNameAr.value = "";
  refs.materialNameEn.value = "";
  refs.materialUnitType.value = material.unitType;
  refs.materialPricingMode.value = material.pricingMode;
  refs.materialWasteDefaultPercent.value = "0";
  refs.materialUnitPrice.value = "0";
  refs.materialPackPrice.value = "0";
  refs.materialPackSize.value = "0";
  renderMaterialPricingMode();
}

function materialMatchSearch(material, q) {
  const target = `${material.id} ${material.name_ar || ""} ${material.name_en || ""}`.toLowerCase();
  return target.includes(q.toLowerCase());
}

function renderMaterialsLibraryList() {
  const t = state.settings.t;
  const q = refs.materialsSearch.value.trim();
  const list = q ? state.inputs.materialsLibrary.filter((m) => materialMatchSearch(m, q)) : state.inputs.materialsLibrary;

  refs.materialsLibraryList.innerHTML = "";
  if (!list.length) {
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = t("noMaterials");
    refs.materialsLibraryList.append(p);
    return;
  }

  list.forEach((material) => {
    const item = document.createElement("article");
    item.className = "product-item";
    const unitCost = calculateMaterialBaseUnitCost(material);

    const info = document.createElement("div");
    info.innerHTML = `<strong>${escapeHTML(getMaterialDisplayName(material))}</strong><div class="meta">${escapeHTML(unitTypeLabel(material.unitType))} • ${escapeHTML(pricingModeLabel(material.pricingMode))} • ${escapeHTML(formatMoney(unitCost, state.inputs.project.currencyCode, state.settings.locale))}</div>`;

    const actions = document.createElement("div");
    actions.className = "item-actions";

    const edit = document.createElement("button");
    edit.type = "button";
    edit.textContent = t("edit");
    edit.onclick = () => {
      state.settings.editingMaterialId = material.id;
      refs.materialNameAr.value = material.name_ar || "";
      refs.materialNameEn.value = material.name_en || "";
      refs.materialUnitType.value = material.unitType || "piece";
      refs.materialPricingMode.value = material.pricingMode || "perUnit";
      refs.materialWasteDefaultPercent.value = material.wasteDefaultPercent || 0;
      refs.materialUnitPrice.value = material.unitPrice || 0;
      refs.materialPackPrice.value = material.packPrice || 0;
      refs.materialPackSize.value = material.packSize || 0;
      renderMaterialPricingMode();
    };

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "remove";
    remove.textContent = t("delete");
    remove.onclick = async () => {
      if (!state.settings.demoMode) {
        await dbService.deleteMaterial(material.id);
      }
      state.inputs.materialsLibrary = state.inputs.materialsLibrary.filter((m) => m.id !== material.id);
      if (state.settings.demoMode) {
        state.products = state.products.map((product) => ({
          ...product,
          recipe: (product.recipe || []).filter((component) => component.materialId !== material.id)
        }));
      } else {
        state.products = (await dbService.getProducts()).map(normalizeProduct);
      }
      renderMaterialsLibraryList();
      renderRecipeMaterialOptions();
      renderProductsList();
      renderProductPicker();
      setFeedback(t("feedbackDeleted"));
    };

    actions.append(edit, remove);
    item.append(info, actions);
    refs.materialsLibraryList.append(item);
  });
}

function recipeLabelFromId(materialId) {
  const material = state.inputs.materialsLibrary.find((m) => m.id === materialId);
  if (!material) return "";
  return `${getMaterialDisplayName(material)} — ${material.id}`;
}

function materialIdFromRecipeInput(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const byTail = state.inputs.materialsLibrary.find((m) => text.endsWith(`— ${m.id}`));
  if (byTail) return byTail.id;

  const byId = state.inputs.materialsLibrary.find((m) => m.id === text);
  if (byId) return byId.id;

  const byName = state.inputs.materialsLibrary.find((m) => {
    const name = getMaterialDisplayName(m).toLowerCase();
    return name === text.toLowerCase();
  });
  return byName?.id || "";
}

function renderRecipeRows(recipe) {
  const t = state.settings.t;
  refs.recipeList.innerHTML = "";

  recipe.forEach((row) => {
    const wrapper = document.createElement("div");
    wrapper.className = "row";
    wrapper.dataset.tempId = row.tempId;
    wrapper.dataset.id = row.id || row.tempId;

    const materialInput = createInput(recipeLabelFromId(row.materialId), "text");
    materialInput.setAttribute("list", "recipeMaterialOptions");
    materialInput.className = "recipe-material-picker";
    materialInput.placeholder = t("recipeMaterialLabel");

    const qty = createInput(row.qtyPerUnit ?? 1, "number");
    qty.step = "0.0001";
    qty.placeholder = t("recipeQtyLabel");

    const waste = createInput(row.overrideWastePercent ?? "", "number");
    waste.step = "0.1";
    waste.placeholder = `${t("recipeWasteOverrideLabel")} (${t("optionalLabel")})`;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "remove";
    remove.textContent = t("remove");
    remove.onclick = () => wrapper.remove();

    wrapper.append(materialInput, qty, waste, remove);
    refs.recipeList.append(wrapper);
  });
}

function renderVariantRows(variants) {
  const t = state.settings.t;
  refs.variantsList.innerHTML = "";

  function createHelp(arText, enText) {
    const help = document.createElement("div");
    help.className = "help";

    const ar = document.createElement("span");
    ar.className = "help-ar";
    ar.textContent = arText;

    const en = document.createElement("span");
    en.className = "help-en";
    en.textContent = enText;

    help.append(ar, en);
    return help;
  }

  variants.forEach((variant) => {
    const isAr = state.settings.locale === "ar";
    const row = document.createElement("div");
    row.className = "row variant-row";
    row.dataset.id = variant.id || uid("variant");

    const name = createInput(normalizeLegacyLabel(variant.name, "defaultVariantName"), "text");
    name.placeholder = isAr ? "مثال: إنستغرام / متجر / جملة" : "Example: Instagram / Shop / Wholesale";
    name.className = "variant-name";
    const units = createInput(variant.unitsPerVariant ?? 1, "number");
    units.step = "1";
    units.placeholder = isAr ? "مثال: 1" : "e.g. 1";
    units.className = "variant-units";
    const extra = createInput(variant.extraPackagingCost ?? 0, "number");
    extra.step = "0.01";
    extra.placeholder = isAr ? "مثال: 0" : "e.g. 0";
    extra.className = "variant-extra";

    const selling = createInput(variant.sellingPriceOverride ?? 0, "number");
    selling.step = "0.01";
    selling.placeholder = isAr ? "سعر اختياري" : "Optional price";
    selling.className = "variant-selling";

    const target = createInput(variant.pricingTargetPercent ?? "", "number");
    target.step = "0.1";
    target.placeholder = isAr ? "مثال: 25" : "e.g. 25";
    target.className = "variant-target";

    const createField = (labelText, inputEl, helpAr = "", helpEn = "") => {
      const field = document.createElement("label");
      field.className = "field";
      const label = document.createElement("span");
      label.textContent = labelText;
      field.append(label, inputEl);
      if (helpAr || helpEn) field.append(createHelp(helpAr, helpEn));
      return field;
    };

    const nameField = document.createElement("div");
    nameField.className = "field";
    nameField.append(
      (() => {
        const label = document.createElement("span");
        label.textContent = t("variantNameLabel");
        return label;
      })(),
      name,
      createHelp(
        "مثال: إنستغرام / متجر / جملة",
        "Example: Instagram / Shop / Wholesale / Event"
      )
    );

    const unitsField = document.createElement("div");
    unitsField.className = "field";
    unitsField.append(
      (() => {
        const label = document.createElement("span");
        label.textContent = t("variantUnitsLabel");
        return label;
      })(),
      units,
      createHelp(
        "اكتب 1 إذا تبيع قطعة واحدة",
        "Enter 1 if you usually sell one item"
      )
    );

    const extraField = document.createElement("div");
    extraField.className = "field";
    extraField.append(
      (() => {
        const label = document.createElement("span");
        label.textContent = t("variantPackagingCostLabel");
        return label;
      })(),
      extra,
      createHelp(
        "اكتب 0 إذا لا توجد عمولة",
        "Platform fee/commission for this method (0 if none)"
      )
    );

    const sellingField = createField(
      t("variantManualPriceLabel"),
      selling,
      "سعر بيع يدوي لهذه الطريقة (اختياري)",
      "Optional manual price for this method"
    );

    const targetField = document.createElement("div");
    targetField.className = "field";
    targetField.append(
      (() => {
        const label = document.createElement("span");
        label.textContent = t("variantProfitPercentLabel");
        return label;
      })(),
      target,
      createHelp(
        "ربح مختلف لهذه الطريقة (اختياري)",
        "Optional custom margin for this method only (e.g., wholesale lower margin)"
      )
    );

    const deliveryWrap = document.createElement("section");
    deliveryWrap.className = "variant-delivery";

    const deliveryToggleRow = document.createElement("div");
    deliveryToggleRow.className = "variant-delivery-toggle-row delivery-toggle";

    const deliveryToggleLabel = document.createElement("label");
    deliveryToggleLabel.className = "variant-delivery-toggle-label";
    const deliveryToggle = document.createElement("input");
    deliveryToggle.type = "checkbox";
    deliveryToggle.className = "variant-delivery-toggle";
    deliveryToggle.checked = Boolean(variant.hasDelivery);
    deliveryToggleLabel.append(deliveryToggle, document.createTextNode(` ${t("variantDeliveryHas")}`));
    deliveryToggleRow.append(deliveryToggleLabel);

    const deliveryMode = document.createElement("select");
    deliveryMode.className = "variant-delivery-mode";
    [
      { value: "merchant_free", label: t("variantDeliveryModeMerchantFree") },
      { value: "customer_separate", label: t("variantDeliveryModeCustomerSeparate") },
      { value: "included_in_price", label: t("variantDeliveryModeIncludedInPrice") }
    ].forEach((item) => {
      const option = document.createElement("option");
      option.value = item.value;
      option.textContent = item.label;
      deliveryMode.append(option);
    });
    deliveryMode.value = variant.deliveryPricingMode || "customer_separate";

    const deliveryCost = createInput(variant.deliveryCost ?? 0, "number");
    deliveryCost.step = "0.01";
    deliveryCost.placeholder = isAr ? "مثال: 3.5" : "e.g. 3.5";
    deliveryCost.className = "variant-delivery-cost";

    const deliveryBasis = document.createElement("select");
    deliveryBasis.className = "variant-delivery-basis";
    [
      { value: "perOrder", label: t("variantDeliveryBasisPerOrder") },
      { value: "perUnit", label: t("variantDeliveryBasisPerUnit") }
    ].forEach((item) => {
      const option = document.createElement("option");
      option.value = item.value;
      option.textContent = item.label;
      deliveryBasis.append(option);
    });
    deliveryBasis.value = variant.deliveryCostBasis || "perOrder";

    const deliveryModeField = document.createElement("div");
    deliveryModeField.className = "field";
    const deliveryModeText = document.createElement("span");
    deliveryModeText.textContent = t("variantDeliveryModeLabel");
    const deliveryTipWrap = document.createElement("span");
    deliveryTipWrap.className = "variant-tip-wrap";
    const deliveryTipBtn = document.createElement("button");
    deliveryTipBtn.type = "button";
    deliveryTipBtn.className = "tip";
    deliveryTipBtn.textContent = "?";
    deliveryTipBtn.setAttribute("aria-label", "Delivery payer help");
    const deliveryTipBox = document.createElement("span");
    deliveryTipBox.className = "tip-box";
    const tipAr = document.createElement("span");
    tipAr.className = "help-ar";
    tipAr.textContent = "الزبون يدفع: لا يؤثر على ربحك. أنت تدفع: تُحسب من تكاليفك.";
    const tipEn = document.createElement("span");
    tipEn.className = "help-en";
    tipEn.textContent = "Customer pays: doesn’t reduce profit. You pay: counted as your cost.";
    deliveryTipBox.append(tipAr, tipEn);
    deliveryTipWrap.append(deliveryTipBtn, deliveryTipBox);
    const deliveryModeLabel = document.createElement("div");
    deliveryModeLabel.className = "variant-delivery-label";
    deliveryModeLabel.append(deliveryModeText, deliveryTipWrap);
    deliveryModeField.append(
      deliveryModeLabel,
      deliveryMode,
      createHelp(
        "اختر من يتحمل تكلفة التوصيل",
        "Select who pays the delivery cost"
      )
    );

    const deliveryCostField = document.createElement("div");
    deliveryCostField.className = "field";
    const deliveryCostText = document.createElement("span");
    deliveryCostText.textContent = t("variantDeliveryCostLabel");
    deliveryCostField.append(
      deliveryCostText,
      deliveryCost,
      createHelp(
        "متوسط تكلفة التوصيل",
        "Average delivery cost per order"
      )
    );

    const deliveryBasisField = document.createElement("div");
    deliveryBasisField.className = "field";
    const deliveryBasisText = document.createElement("span");
    deliveryBasisText.textContent = t("variantDeliveryBasisLabel");
    deliveryBasisField.append(
      deliveryBasisText,
      deliveryBasis,
      createHelp(
        "تُحسب تكلفة التوصيل لكل: طلب / قطعة",
        "Delivery cost applies per: order / item"
      )
    );

    const deliveryFields = document.createElement("div");
    deliveryFields.className = "grid-3 variant-delivery-controls";
    deliveryFields.append(deliveryModeField, deliveryCostField, deliveryBasisField);
    deliveryFields.classList.toggle("hidden", !deliveryToggle.checked);

    deliveryToggle.addEventListener("change", () => {
      deliveryFields.classList.toggle("hidden", !deliveryToggle.checked);
    });
    deliveryWrap.append(deliveryToggleRow, deliveryFields);

    const mainBlock = document.createElement("section");
    mainBlock.className = "variant-main";
    mainBlock.append(nameField, unitsField, extraField);

    const advancedToggle = document.createElement("button");
    advancedToggle.type = "button";
    advancedToggle.className = "variant-advanced-toggle btn btn-secondary";
    advancedToggle.textContent = t("advancedToggleBtn");
    advancedToggle.setAttribute("aria-expanded", "false");
    mainBlock.append(advancedToggle);

    const metaBlock = document.createElement("section");
    metaBlock.className = "variant-meta variant-advanced";
    metaBlock.append(sellingField, targetField);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "remove";
    remove.classList.add("variant-remove");
    remove.textContent = t("remove");
    remove.onclick = () => row.remove();
    metaBlock.append(remove);

    advancedToggle.addEventListener("click", () => {
      const isOpen = metaBlock.classList.toggle("is-open");
      advancedToggle.setAttribute("aria-expanded", String(isOpen));
    });

    row.append(mainBlock, deliveryWrap, metaBlock);
    refs.variantsList.append(row);
  });
}

function currentRecipeFromForm() {
  const rows = [...refs.recipeList.querySelectorAll(".row")];
  return rows.map((row) => {
    const [materialInput, qtyInput, wasteInput] = row.querySelectorAll("input");
    const materialId = materialIdFromRecipeInput(materialInput.value);
    return {
      materialId,
      qtyPerUnit: Math.max(0, toNumber(qtyInput.value, 0)),
      overrideWastePercent: wasteInput.value === "" ? null : Math.max(0, toNumber(wasteInput.value, 0))
    };
  }).filter((item) => item.materialId && item.qtyPerUnit > 0);
}

function currentVariantsFromForm() {
  const rows = [...refs.variantsList.querySelectorAll(".row")];
  return rows.map((row) => {
    const nameInput = row.querySelector(".variant-name");
    const unitsInput = row.querySelector(".variant-units");
    const extraInput = row.querySelector(".variant-extra");
    const sellingInput = row.querySelector(".variant-selling");
    const targetInput = row.querySelector(".variant-target");
    const deliveryCostInput = row.querySelector(".variant-delivery-cost");
    const deliveryToggle = row.querySelector(".variant-delivery-toggle");
    const deliveryMode = row.querySelector(".variant-delivery-mode");
    const deliveryBasis = row.querySelector(".variant-delivery-basis");
    return {
      id: row.dataset.id || uid("variant"),
      name: (nameInput?.value || "").trim() || state.settings.t("defaultVariantName"),
      unitsPerVariant: Math.max(1, Math.floor(toNumber(unitsInput?.value, 1))),
      extraPackagingCost: Math.max(0, toNumber(extraInput?.value, 0)),
      sellingPriceOverride: Math.max(0, toNumber(sellingInput?.value, 0)),
      pricingTargetPercent: !targetInput || targetInput.value === "" ? null : Math.max(0, toNumber(targetInput.value, 0)),
      expectedMonthlySalesVariant: null,
      hasDelivery: Boolean(deliveryToggle?.checked),
      deliveryPricingMode: deliveryMode?.value === "merchant_free"
        ? "merchant_free"
        : (deliveryMode?.value === "included_in_price" ? "included_in_price" : "customer_separate"),
      deliveryCost: Math.max(0, toNumber(deliveryCostInput?.value, 0)),
      deliveryCostBasis: deliveryBasis?.value === "perUnit" ? "perUnit" : "perOrder"
    };
  }).filter((v) => v.name);
}

function normalizeProduct(product) {
  const base = createDefaultProduct();
  return {
    ...base,
    ...product,
    recipe: Array.isArray(product.recipe) && product.recipe.length ? product.recipe : base.recipe,
    variants: Array.isArray(product.variants) && product.variants.length
      ? product.variants.map((variant) => ({
        ...base.variants[0],
        ...variant,
        hasDelivery: Boolean(variant?.hasDelivery),
        deliveryPricingMode: variant?.deliveryPricingMode === "merchant_free"
          ? "merchant_free"
          : (variant?.deliveryPricingMode === "included_in_price" ? "included_in_price" : "customer_separate"),
        deliveryCost: Math.max(0, toNumber(variant?.deliveryCost, 0)),
        deliveryCostBasis: variant?.deliveryCostBasis === "perUnit" ? "perUnit" : "perOrder"
      }))
      : base.variants,
    energy: {
      ...base.energy,
      ...(product.energy || {})
    }
  };
}

function resetProductForm() {
  state.settings.editingProductId = null;
  const product = createDefaultProduct();
  refs.productName.value = "";
  refs.unitName.value = state.settings.t("defaultUnitName");
  refs.laborMinutes.value = "0";
  refs.energyKw.value = "0";
  refs.energyMinutes.value = "0";
  refs.energyPricePerKwh.value = "0";
  renderRecipeRows(product.recipe);
  renderVariantRows(product.variants);
}

function renderProductsList() {
  const t = state.settings.t;
  refs.productsList.innerHTML = "";

  if (!state.products.length) {
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = t("noProducts");
    refs.productsList.append(p);
    return;
  }

  state.products.forEach((product) => {
    const item = ProductItem({
      product,
      t,
      escapeHTML,
      onEdit: () => {
        state.settings.editingProductId = product.id;
        refs.productName.value = product.name;
        refs.unitName.value = normalizeLegacyLabel(product.unitName, "defaultUnitName");
        refs.laborMinutes.value = product.laborMinutes || 0;
        refs.energyKw.value = product.energy?.kw || 0;
        refs.energyMinutes.value = product.energy?.minutes || 0;
        refs.energyPricePerKwh.value = product.energy?.pricePerKwh || 0;
        renderRecipeRows(product.recipe || []);
        renderVariantRows(product.variants || []);
      },
      onDelete: async () => {
        if (!state.settings.demoMode) {
          await dbService.deleteProduct(product.id);
        }
        setProducts(state.products.filter((p) => p.id !== product.id));
        if (state.settings.selectedProductId === product.id) {
          updateSetting("selectedProductId", state.products[0]?.id ?? null);
        }
        renderProductsList();
        renderProductPicker();
        setFeedback(t("feedbackDeleted"));
      }
    });
    refs.productsList.append(item);
  });
}

function renderProductPicker() {
  refs.resultProductSelect.innerHTML = "";
  state.products.forEach((product) => {
    const option = document.createElement("option");
    option.value = product.id;
    option.textContent = product.name;
    refs.resultProductSelect.append(option);
  });

  if (!state.settings.selectedProductId && state.products.length) {
    state.settings.selectedProductId = state.products[0].id;
  }

  refs.resultProductSelect.value = state.settings.selectedProductId || "";
}

function collectProjectFromForm() {
  const hasSales = getHasSalesValue();
  const directSales = Math.floor(toNumber(refs.salesCurrentUnits.value, 0));
  const optionalSales = Math.floor(toNumber(refs.salesOptionalUnits.value, 0));
  const selectedUnits = hasSales === "yes" ? directSales : optionalSales;
  const salesDefined = selectedUnits > 0;

  const baseProject = state.inputs.project || createDefaultProject();

  return {
    ...baseProject,
    dataVersion: 3,
    currencyCode: refs.currencyCode.value || "USD",
    hourlyRate: toNumber(refs.hourlyRate.value, 0),
    expectedMonthlyUnits: salesDefined ? selectedUnits : 1,
    expectedMonthlySales: salesDefined ? selectedUnits : 0,
    safetyMarginPercent: toNumber(refs.safetyMarginPercent.value, 5),
    pricingMode: state.settings.uiMode === "simple" ? "markup" : getCurrentPricingMode(),
    pricingPercent: toNumber(refs.pricingPercent.value, 30),
    taxRate: toNumber(refs.taxRateInput?.value, 0),
    wholesaleDiscount: toNumber(refs.wholesaleDiscountInput?.value, 0),
    hasSales,
    salesUnitsInput: selectedUnits,
    salesUndefined: !salesDefined,
    uiMode: state.settings.uiMode
  };
}

async function saveSettings() {
  const t = state.settings.t;
  const project = collectProjectFromForm();

  const fixedCosts = project.monthlyFixedCosts || [];
  const equipment = project.equipmentDepreciation || [];

  if (!validateNonNegative([
    project.hourlyRate,
    project.expectedMonthlyUnits,
    project.expectedMonthlySales,
    project.safetyMarginPercent,
    project.pricingPercent,
    ...fixedCosts.map((x) => x.amount),
    ...equipment.map((x) => x.purchasePrice),
    ...equipment.map((x) => x.lifetimeMonths)
  ])) {
    setFeedback(t("validationPositive"));
    return;
  }

  updateInput("project", project);
  if (!state.settings.demoMode) {
    await dbService.saveProject(project);
  }
  setFeedback(t("feedbackSaved"));
}

async function saveMaterial(event) {
  event.preventDefault();
  const t = state.settings.t;
  const material = collectMaterialFromForm();

  if (!material.name_ar.trim() && !material.name_en.trim()) {
    setFeedback(t("validationRequired"));
    return;
  }

  if (material.pricingMode === "perPack" && material.packSize <= 0) {
    setFeedback(t("validationPackSize"));
    return;
  }

  if (!state.settings.demoMode) {
    await dbService.upsertMaterial(material);
  }
  const idx = state.inputs.materialsLibrary.findIndex((m) => m.id === material.id);
  if (idx >= 0) state.inputs.materialsLibrary[idx] = material;
  else state.inputs.materialsLibrary.push(material);

  state.inputs.materialsLibrary.sort((a, b) => getMaterialDisplayName(a).localeCompare(getMaterialDisplayName(b)));
  resetMaterialForm();
  renderMaterialsLibraryList();
  renderRecipeMaterialOptions();
  setFeedback(t("feedbackSaved"));
}

async function saveProduct(event) {
  event.preventDefault();

  const t = state.settings.t;
  const productName = refs.productName.value.trim();
  if (!productName) {
    setFeedback(t("validationRequired"));
    return;
  }

  const recipe = currentRecipeFromForm();
  if (!recipe.length) {
    setFeedback(t("validationRecipeRequired"));
    return;
  }

  const variants = currentVariantsFromForm();
  if (!variants.length) {
    setFeedback(t("validationVariantRequired"));
    return;
  }

  const product = {
    id: state.settings.editingProductId || uid("product"),
    name: productName,
    unitName: refs.unitName.value.trim() || t("defaultUnitName"),
    laborMinutes: Math.max(0, Math.floor(toNumber(refs.laborMinutes.value, 0))),
    manualSellingPrice: 0,
    recipe,
    variants,
    energy: {
      kw: toNumber(refs.energyKw.value, 0),
      minutes: Math.max(0, Math.floor(toNumber(refs.energyMinutes.value, 0))),
      pricePerKwh: toNumber(refs.energyPricePerKwh.value, 0)
    }
  };

  if (!validateNonNegative([
    product.laborMinutes,
    product.energy.kw,
    product.energy.minutes,
    product.energy.pricePerKwh,
    ...product.recipe.map((x) => x.qtyPerUnit),
    ...product.variants.map((x) => x.unitsPerVariant),
    ...product.variants.map((x) => x.extraPackagingCost),
    ...product.variants.map((x) => x.deliveryCost)
  ])) {
    setFeedback(t("validationPositive"));
    return;
  }

  if (!state.settings.demoMode) {
    await dbService.upsertProduct(product);
  }
  const idx = state.products.findIndex((p) => p.id === product.id);
  if (idx >= 0) state.products[idx] = product;
  else state.products.unshift(product);

  state.settings.selectedProductId = product.id;
  renderProductsList();
  renderProductPicker();
  resetProductForm();
  setFeedback(t("feedbackSaved"));
}

async function applyDemoSeed(demoKey) {
  const demo = buildDemoSeed(demoKey);
  updateSetting("demoMode", true);
  updateInput("project", {
    ...demo.project,
    localeMode: state.settings.locale
  });
  updateInput("materialsLibrary", demo.materials.map((material) => ({ ...material })));
  setProducts([normalizeProduct(demo.product)]);
  updateSetting("selectedProductId", demo.product.id);

  applyLocale(state.settings.locale);
  fillSettingsFromState();
  renderProductsList();
  renderProductPicker();
  navigate("results");
  refs.resultProductSelect.value = demo.product.id;
  refs.resultSellingPrice.value = "0";
  renderResults();
  renderDemoModeBanner();
  renderDemoDeleteButton();
  setFeedback(state.settings.t("feedbackDemoApplied"));
}

async function deleteCurrentDemoIfAny() {
  if (!state.settings.demoMode) return;
  exitDemoModeReload();
}

async function consumeDemoFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const demo = params.get("demo");
  if (!demo) return;
  if (!["bakery", "perfume", "handmade"].includes(demo)) return;

  await applyDemoSeed(demo);
  params.delete("demo");
  const query = params.toString();
  const finalUrl = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
  window.history.replaceState({}, "", finalUrl);
}

function getResetProjectLabel(locale) {
  return t("startNewProjectBtn");
}

function getResetProjectConfirm(locale) {
  return locale === "ar"
    ? "سيتم حذف بيانات المشروع الحالية والبدء من جديد. هل تريد المتابعة؟"
    : "This will clear current project data and start fresh. Do you want to continue?";
}

async function resetProjectAndReload() {
  const confirmed = window.confirm(getResetProjectConfirm(state.settings.locale));
  if (!confirmed) return;
  if (state.settings.demoMode) {
    exitDemoModeReload();
    return;
  }
  await dbService.clearAllData();
  window.location.replace(getCleanAppUrl());
}

function hasInvalidMetrics(metrics) {
  if (!metrics) return true;

  const baseNumbers = [
    metrics.trueUnitCost,
    metrics.minimumAcceptablePrice,
    metrics.suggestedPrice,
    metrics.monthlyProfit,
    metrics.sellingPrice,
    metrics.variableCostPerUnit,
    metrics.materialsCost,
    metrics.laborCost,
    metrics.energyCost,
    metrics.fixedPerUnit
  ];

  if (baseNumbers.some((value) => !Number.isFinite(value))) {
    return true;
  }

  return (metrics.variantMetrics || []).some((variant) => {
    const numbers = [
      variant.variantUnitCost,
      variant.minimumAcceptablePriceVariant,
      variant.suggestedPriceVariant,
      variant.deliveryCost,
      variant.deliveryCostApplied,
      variant.extraPackagingCost
    ];
    return numbers.some((value) => !Number.isFinite(value));
  });
}

function renderResults() {
  try {
    const t = state.settings.t;
    const isAr = state.settings.locale === "ar";
    const product = state.products.find((p) => p.id === state.settings.selectedProductId);
    if (!product) return;

    const sellingPrice = toNumber(refs.resultSellingPrice.value, 0);
    const wholesaleDiscount = toNumber(refs.wholesaleDiscountInput?.value, 0);
    const metrics = buildProductMetrics(state.inputs.project, product, state.inputs.materialsLibrary, sellingPrice, wholesaleDiscount);
    if (hasInvalidMetrics(metrics)) {
      trackEvent("calculation_error", { page: window.location.pathname || "/app/" });
      setFeedback(t("unexpectedError"));
      return;
    }
    const allProductsSummary = document.getElementById("allProductsSummary");
    const productsCompare = document.getElementById("productsCompare");
    const unitResultsTitle = document.getElementById("unitResultsTitle");
    const variantResultsTitle = document.getElementById("variantResultsTitle");
    const unitResultsSubtitle = document.getElementById("unitResultsSubtitle");
    const variantResultsSubtitle = document.getElementById("variantResultsSubtitle");
    const unitResultsBadge = document.getElementById("unitResultsBadge");
    const variantResultsBadge = document.getElementById("variantResultsBadge");
    const unitSectionHeadline = unitResultsTitle?.closest(".section-headline");
    const variantSectionHeadline = variantResultsTitle?.closest(".section-headline");

    refs.resultsGrid.innerHTML = "";
    refs.variantCards.innerHTML = "";
    if (allProductsSummary) allProductsSummary.innerHTML = "";
    if (productsCompare) productsCompare.innerHTML = "";
    refs.calculationDetails.classList.add("hidden");

    const unitSubtitle = isAr
      ? "هذه النتائج عامة للمنتج بدون احتساب تكاليف طريقة بيع محددة (توصيل/تغليف/عمولة)."
      : "Base product results without any specific selling method costs (delivery/packaging/fees).";
    const variantSubtitle = isAr
      ? "هذه النتائج تشمل التكاليف الخاصة بكل طريقة بيع (مثل التوصيل، التغليف، عمولة المنصة)."
      : "These results include each selling method's specific costs (delivery, packaging, platform fees).";

    if (unitResultsSubtitle) unitResultsSubtitle.textContent = unitSubtitle;
    if (variantResultsSubtitle) variantResultsSubtitle.textContent = variantSubtitle;
    if (unitResultsBadge) unitResultsBadge.textContent = isAr ? "أساسي" : "Baseline";
    if (variantResultsBadge) variantResultsBadge.textContent = isAr ? "حسب الطريقة" : "Per method";

    const getDeltaLine = (variantMetrics) => {
      const deltaDrivers = [];
      if (toNumber(variantMetrics.extraPackagingCost, 0) > 0) {
        deltaDrivers.push(`${isAr ? "تغليف/رسوم" : "Packaging/fees"} +${formatMoney(variantMetrics.extraPackagingCost, state.inputs.project.currencyCode, state.settings.locale)}`);
      }
      if (variantMetrics.hasDelivery && variantMetrics.deliveryAffectsProfit && toNumber(variantMetrics.deliveryCostApplied, 0) > 0) {
        deltaDrivers.push(`${isAr ? "توصيل" : "Delivery"} +${formatMoney(variantMetrics.deliveryCostApplied, state.inputs.project.currencyCode, state.settings.locale)}${isAr ? " (يتحمله التاجر)" : " (merchant-paid)"}`);
      }
      const customerDeliveryNote = variantMetrics.hasDelivery && !variantMetrics.deliveryAffectsProfit
        ? (isAr
          ? "التوصيل: يدفعه الزبون (لا يؤثر على ربحك)"
          : "Delivery: paid by customer (does not affect profit)")
        : "";

      return deltaDrivers.length
        ? `${isAr ? "يشمل:" : "Includes:"} ${deltaDrivers.join(" • ")}${customerDeliveryNote ? ` • ${customerDeliveryNote}` : ""}`
        : (customerDeliveryNote || (isAr ? "لا توجد تكاليف إضافية لهذه الطريقة." : "No extra costs for this method."));
    };

    const setSingleResultsVisibility = (visible) => {
      refs.statusBadge.classList.toggle("hidden", !visible);
      refs.resultsGrid.classList.toggle("hidden", !visible);
      refs.variantCards.classList.toggle("hidden", !visible);
      refs.monthlyTable.classList.toggle("hidden", !visible);
      refs.calculationDetails.classList.toggle("hidden", true);
      unitSectionHeadline?.classList.toggle("hidden", !visible);
      variantSectionHeadline?.classList.toggle("hidden", !visible);
      unitResultsSubtitle?.classList.toggle("hidden", !visible);
      variantResultsSubtitle?.classList.toggle("hidden", !visible);
      allProductsSummary?.classList.toggle("hidden", visible);
      productsCompare?.classList.toggle("hidden", visible);
    };

    if (state.products.length > 1) {
      setSingleResultsVisibility(false);

      const productsMetrics = state.products.map((item) => ({
        product: item,
        metrics: buildProductMetrics(state.inputs.project, item, state.inputs.materialsLibrary, sellingPrice, wholesaleDiscount)
      }));

      const totalMonthlyProfit = productsMetrics.reduce((sum, entry) => sum + (Number.isFinite(entry.metrics.monthlyProfit) ? entry.metrics.monthlyProfit : 0), 0);
      const expectedSales = Math.max(0, toNumber(state.inputs.project.expectedMonthlySales, 0));
      const revenueAvailable = expectedSales > 0 && productsMetrics.every((entry) => Number.isFinite(entry.metrics.sellingPrice));
      const totalRevenue = revenueAvailable
        ? productsMetrics.reduce((sum, entry) => sum + (entry.metrics.sellingPrice * expectedSales), 0)
        : null;

      if (allProductsSummary) {
        allProductsSummary.classList.remove("hidden");
        allProductsSummary.innerHTML = "";
        allProductsSummary.append(SummarySection({
          productsMetrics,
          totalMonthlyProfit,
          totalRevenue,
          t,
          formatMoney,
          escapeHTML,
          currencyCode: state.inputs.project.currencyCode,
          locale: state.settings.locale
        }));
      }

      if (productsCompare) {
        productsCompare.classList.remove("hidden");
        productsCompare.innerHTML = "";
        productsCompare.append(ComparisonTable({
          productsMetrics,
          t,
          formatMoney,
          formatNumber,
          escapeHTML,
          normalizeLegacyLabel,
          getProfitStatus,
          getDeltaLine,
          currencyCode: state.inputs.project.currencyCode,
          locale: state.settings.locale
        }));
      }

      refs.monthlyTable.innerHTML = "";
      refs.calculationDetails.innerHTML = "";
      trackEvent("result_displayed", getLangCurrencyContext());
      if (!state.settings.analytics.breakevenViewed) {
        trackEvent("breakeven_viewed", getLangCurrencyContext());
        state.settings.analytics.breakevenViewed = true;
      }
      setFeedback(t("feedbackCalculated"));
      return;
    }

    setSingleResultsVisibility(true);

    const taxRate = toNumber(refs.taxRateInput?.value, 0);
    const suggestedWithTax = calculatePriceWithTax(metrics.suggestedPrice, taxRate);

    const list = [
      [t("metricTrueUnitCost"), formatMoney(metrics.trueUnitCost, state.inputs.project.currencyCode, state.settings.locale)],
      [t("metricMinimumAcceptablePrice"), formatMoney(metrics.minimumAcceptablePrice, state.inputs.project.currencyCode, state.settings.locale)],
      [t("metricSuggestedPrice"), formatMoney(metrics.suggestedPrice, state.inputs.project.currencyCode, state.settings.locale)],
      [t("metricWholesalePrice"), formatMoney(metrics.suggestedPrice * (1 - wholesaleDiscount / 100), state.inputs.project.currencyCode, state.settings.locale)],
      [`${t("metricSuggestedPrice")} (${isAr ? "شامل الضريبة" : "Incl. VAT"})`, formatMoney(suggestedWithTax, state.inputs.project.currencyCode, state.settings.locale)],
      [t("metricBreakEvenUnits"), Number.isFinite(metrics.breakEvenUnits) ? formatNumber(metrics.breakEvenUnits, state.settings.locale, 2) : t("breakEvenImpossible")],
      [t("metricMonthlyProfit"), formatMoney(metrics.monthlyProfit, state.inputs.project.currencyCode, state.settings.locale)]
    ];

    list.forEach(([name, value], index) => {
      const box = document.createElement("article");
      box.className = index === 0 ? "metric metric-primary" : "metric";
      box.innerHTML = `<div class="name">${escapeHTML(name)}</div><div class="value">${escapeHTML(value)}</div>`;
      refs.resultsGrid.append(box);
    });

    metrics.variantMetrics.forEach((variant) => {
      const card = ResultCard({
        variant,
        taxRate,
        t,
        formatMoney,
        formatNumber,
        escapeHTML,
        calculatePriceWithTax,
        getProfitStatus,
        getDeltaLine,
        normalizeLegacyLabel,
        currencyCode: state.inputs.project.currencyCode,
        locale: state.settings.locale
      });
      refs.variantCards.append(card);
    });

    refs.monthlyTable.innerHTML = "";
    refs.monthlyTable.append(PricingTable({
      metrics,
      project: state.inputs.project,
      t,
      formatMoney,
      formatNumber,
      escapeHTML,
      locale: state.settings.locale
    }));

    refs.calculationDetails.innerHTML = "";
    refs.calculationDetails.append(CostBreakdown({
      metrics,
      project: state.inputs.project,
      t,
      formatMoney,
      escapeHTML,
      normalizeLegacyLabel,
      locale: state.settings.locale
    }));

    trackEvent("result_displayed", getLangCurrencyContext());
    if (!state.settings.analytics.breakevenViewed) {
      trackEvent("breakeven_viewed", getLangCurrencyContext());
      state.settings.analytics.breakevenViewed = true;
    }

    setFeedback(t("feedbackCalculated"));
  } catch (error) {
    trackEvent("calculation_error", { page: window.location.pathname || "/app/" });
    setFeedback(state.settings.t("unexpectedError"));
  }
}

async function exportAllAsCsv() {
  try {
    exportCsv({
      project: state.inputs.project,
      products: state.products,
      materialsLibrary: state.inputs.materialsLibrary,
      locale: state.settings.locale,
      t: state.settings.t
    });
    setFeedback(state.settings.t("feedbackExported"));
  } catch (error) {
    setFeedback(getFriendlyErrorMessage(error));
  }
}

async function exportAllAsXlsx() {
  try {
    exportXlsx({
      project: state.inputs.project,
      products: state.products,
      materialsLibrary: state.inputs.materialsLibrary,
      locale: state.settings.locale,
      t: state.settings.t
    });
    setFeedback(state.settings.t("feedbackExported"));
  } catch (error) {
    setFeedback(getFriendlyErrorMessage(error));
  }
}

async function exportCurrentAsPdf() {
  const product = state.products.find((p) => p.id === state.settings.selectedProductId);
  if (!product) return;

  const metrics = buildProductMetrics(state.inputs.project, product, state.inputs.materialsLibrary, toNumber(refs.resultSellingPrice.value, 0));
  try {
    await exportPdf({
      project: state.inputs.project,
      product,
      metrics,
      materialsLibrary: state.inputs.materialsLibrary,
      locale: state.settings.locale,
      t: state.settings.t
    });
    setFeedback(state.settings.t("feedbackExported"));
  } catch (error) {
    setFeedback(getFriendlyErrorMessage(error));
  }
}

function navigate(step) {
  MapsTo(step);
}

function applyLocale(locale) {
  const normalizedLocale = persistLocaleSelection(locale);
  console.log("App Trace: applyLocale start", normalizedLocale);
  updateSetting("locale", normalizedLocale);
  updateSetting("t", createTranslator(normalizedLocale));
  applyDocumentLocale(normalizedLocale);

  const t = state.settings.t;
  const textKeys = {
    appTitle: "appTitle",
    appSubtitle: "appSubtitle",
    appGuideText: "appGuideText",
    languageLabel: "languageLabel",
    backToSiteLink: "backToSiteLink",
    exportCsvBtn: "exportCsv",
    exportXlsxBtn: "exportXlsx",
    exportPdfBtn: "exportPdf",

    stepSettings: "stepSettings",
    stepMaterials: "stepMaterials",
    stepProducts: "stepProducts",
    stepResults: "stepResults",

    settingsTitle: "settingsTitle",
    settingsHint: "settingsHint",
    quickStartTitle: "quickStartTitle",
    quickStartStep1: "quickStartStep1",
    quickStartStep2: "quickStartStep2",
    quickStartStep3: "quickStartStep3",
    quickStartDemoBtn: "quickStartDemoBtn",
    simpleModeBtn: "simpleMode",
    advancedModeBtn: "advancedMode",
    currencyLabel: "currencyLabel",
    hourlyRateLabel: "hourlyRateLabel",
    hourlyRateHelp: "hourlyRateHelp",
    hasSalesLabel: "hasSalesLabel",
    hasSalesYes: "hasSalesYes",
    hasSalesNo: "hasSalesNo",
    salesCurrentUnitsLabel: "salesCurrentUnitsLabel",
    salesCurrentUnitsHelp: "salesCurrentUnitsHelp",
    salesPresetLabel: "salesPresetLabel",
    presetLowBtn: "presetLowBtn",
    presetMediumBtn: "presetMediumBtn",
    presetHighBtn: "presetHighBtn",
    salesOptionalInputLabel: "salesOptionalInputLabel",
    pricingSimpleLabel: "pricingSimpleLabel",
    pricingSimpleHelp: "pricingSimpleHelp",
    advancedSettingsBtn: "advancedSettingsBtn",
    pricingModeMarkup: "pricingModeMarkup",
    pricingModeMargin: "pricingModeMargin",
    pricingModeAdvancedHelp: "pricingModeAdvancedHelp",
    safetyMarginPercentLabel: "safetyMarginPercentLabel",
    taxRateLabel: "taxRateLabel",
    wholesaleDiscountLabel: "wholesaleDiscountLabel",
    safetyMarginPercentHelp: "safetyMarginPercentHelp",
    fixedCostsTitle: "fixedCostsTitle",
    fixedCostsHint: "fixedCostsHint",
    demoSeedTitle: "demoSeedTitle",
    demoSeedHint: "demoSeedHint",
    demoBakeryBtn: "demoBakery",
    demoPerfumeBtn: "demoPerfume",
    demoHandmadeBtn: "demoHandmade",
    deleteDemoBtn: "deleteDemoBtn",
    equipmentTitle: "equipmentTitle",
    equipmentHint: "equipmentHint",
    addFixedCostBtn: "addFixedCost",
    addEquipmentBtn: "addEquipment",
    saveSettingsBtn: "saveSettings",
    toMaterialsBtn: "toMaterials",

    materialsLibraryTitle: "materialsLibraryTitle",
    materialsLibraryHint: "materialsLibraryHint",
    materialsSearchLabel: "materialsSearchLabel",
    materialFormTitle: "materialFormTitle",
    materialNameArLabel: "materialNameArLabel",
    materialNameEnLabel: "materialNameEnLabel",
    materialUnitTypeLabel: "materialUnitTypeLabel",
    materialPricingModeLabel: "materialPricingModeLabel",
    materialWasteDefaultLabel: "materialWasteDefaultLabel",
    materialUnitPriceLabel: "materialUnitPriceLabel",
    materialPackPriceLabel: "materialPackPriceLabel",
    materialPackSizeLabel: "materialPackSizeLabel",
    saveMaterialBtn: "saveMaterial",
    resetMaterialBtn: "resetMaterial",
    materialsListTitle: "materialsListTitle",

    productsTitle: "productsTitle",
    productsHint: "productsHint",
    productNameLabel: "productNameLabel",
    unitNameLabel: "unitNameLabel",
    laborMinutesLabel: "laborMinutesLabel",
    energyTitle: "energyTitle",
    energyKwLabel: "energyKwLabel",
    energyMinutesLabel: "energyMinutesLabel",
    energyPriceLabel: "energyPriceLabel",
    productRecipeTitle: "productRecipeTitle",
    addRecipeItemBtn: "addRecipeItem",
    salesVariantsTitle: "salesVariantsTitle",
    addVariantBtn: "addVariant",
    saveProductBtn: "saveProduct",
    resetProductBtn: "resetProduct",
    toProductsBtn: "toProducts",
    toResultsBtn: "toResults",
    savedProductsTitle: "savedProductsTitle",

    resultsTitle: "resultsTitle",
    resultsHint: "resultsHint",
    resultProductLabel: "resultProductLabel",
    resultSellingPriceLabel: "resultSellingPriceLabel",
    calculateBtn: "calculateBtn",
    howCalculatedBtn: "howCalculatedBtn",
    unitResultsTitle: "unitResultsTitle",
    variantResultsTitle: "variantResultsTitle"
  };

  Object.entries(textKeys).forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = t(key);
  });
  if (refs.startNewProjectBtn) refs.startNewProjectBtn.textContent = getResetProjectLabel(normalizedLocale);
  if (refs.appGuideDismiss) refs.appGuideDismiss.setAttribute("aria-label", t("appGuideDismiss"));
  updateDemoModeTexts();

  if (!refs.hourlyRate) {
    console.warn("App Warning: applyLocale called before refs were ready.");
    return;
  }

  refs.hourlyRate.placeholder = t("hourlyRatePlaceholder");
  refs.hourlyRateTooltip.textContent = "?";
  refs.hourlyRateTooltip.setAttribute("aria-label", t("hourlyRateTooltipAria"));
  refs.hourlyRateTooltip.setAttribute("aria-expanded", "false");
  refs.hourlyRateTooltipText.textContent = t("hourlyRateTooltip");
  refs.hourlyRateTooltipText.classList.add("hidden");
  refs.hourlyRateZeroWarning.textContent = t("hourlyRateZeroWarning");
  refs.salesOptionalUnits.placeholder = t("salesOptionalInputPlaceholder");
  refs.materialsSearch.placeholder = t("materialsSearchPlaceholder");
  refs.materialUnitType.querySelector('option[value="piece"]').textContent = t("unitTypePiece");
  refs.materialUnitType.querySelector('option[value="g"]').textContent = t("unitTypeG");
  refs.materialUnitType.querySelector('option[value="kg"]').textContent = t("unitTypeKg");
  refs.materialUnitType.querySelector('option[value="ml"]').textContent = t("unitTypeMl");
  refs.materialUnitType.querySelector('option[value="l"]').textContent = t("unitTypeL");
  refs.materialPricingMode.querySelector('option[value="perUnit"]').textContent = t("pricingModePerUnit");
  refs.materialPricingMode.querySelector('option[value="perPack"]').textContent = t("pricingModePerPack");
  document.title = t("appTitle");
  if (!refs.unitName.value || /^(unit|piece)$/i.test(refs.unitName.value.trim())) {
    refs.unitName.value = t("defaultUnitName");
  }

  updateAuthTexts();
  renderAuthPanel();
  renderDemoModeBanner();
  renderHourlyRateWarning();
  renderDemoDeleteButton();

  renderCurrencySelect();
  renderSettingsLists();
  renderMaterialPricingMode();
  renderMaterialsLibraryList();
  renderRecipeMaterialOptions();
  renderProductsList();
  renderProductPicker();
  applyUiMode(state.settings.uiMode);

  window.dispatchEvent(new CustomEvent("pricingplus:locale-changed", {
    detail: { locale: normalizedLocale }
  }));
  console.log("App Trace: applyLocale end");
}

function fillSettingsFromState() {
  refs.hourlyRate.value = state.inputs.project.hourlyRate;
  refs.salesCurrentUnits.value = state.inputs.project.hasSales === "yes" ? state.inputs.project.salesUnitsInput || state.inputs.project.expectedMonthlySales || "" : "";
  refs.salesOptionalUnits.value = state.inputs.project.hasSales === "no" ? state.inputs.project.salesUnitsInput || state.inputs.project.expectedMonthlySales || "" : "";
  refs.safetyMarginPercent.value = state.inputs.project.safetyMarginPercent;
  refs.pricingPercent.value = state.inputs.project.pricingPercent;

  if (refs.taxRateInput) refs.taxRateInput.value = state.inputs.project.taxRate || 0;
  if (refs.wholesaleDiscountInput) refs.wholesaleDiscountInput.value = state.inputs.project.wholesaleDiscount || 0;

  document.querySelectorAll('input[name="hasSales"]').forEach((el) => {
    el.checked = el.value === (state.inputs.project.hasSales || "yes");
  });
  document.querySelectorAll('input[name="pricingMode"]').forEach((el) => {
    el.checked = el.value === (state.inputs.project.pricingMode || "markup");
  });

  applyUiMode(state.inputs.project.uiMode || "simple");
  renderSalesBlocks();
  renderCurrencySelect();
  renderSettingsLists();
  renderHourlyRateWarning();
  renderDemoModeBanner();
  renderDemoDeleteButton();
}

function bindEvents() {
  const firstInputHandler = (event) => {
    if (state.settings.analytics.calculatorStarted) return;
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement)) {
      return;
    }
    updateSetting("analytics", { ...state.settings.analytics, calculatorStarted: true });
    trackEvent("calculator_started");
  };

  document.addEventListener("input", firstInputHandler, { capture: true, once: true });
  document.addEventListener("change", firstInputHandler, { capture: true, once: true });

  // === Smart Numeric Inputs Logic ===
  document.addEventListener("focusin", (e) => {
    const t = e.target;
    if (t.tagName === "INPUT" && t.type === "number" && (t.value === "0" || t.value === "0.00")) {
      t.select();
    }
  });

  document.addEventListener("input", (e) => {
    const t = e.target;
    if (t.tagName === "INPUT" && t.type === "number") {
      const val = t.value;
      if (/[^0-9.]/.test(val)) {
        t.value = val.replace(/[^0-9.]/g, "");
        showToast("numbers_only", "error");
      }
    }
  });

  document.addEventListener("focusout", (e) => {
    const t = e.target;
    if (t.tagName === "INPUT" && t.type === "number" && t.value.trim() === "") {
      t.value = "0";
      t.dispatchEvent(new Event("input", { bubbles: true }));
    }
  });


  document.querySelectorAll(".step").forEach((btn) => {
    btn.addEventListener("click", () => navigate(btn.dataset.step));
  });

  document.querySelectorAll(".nextBtn").forEach((btn) => {
    btn.addEventListener("click", () => navigate(btn.dataset.next));
  });

  refs.appGuideDismiss?.addEventListener("click", () => {
    refs.appGuideBox?.classList.add("hidden");
  });

  refs.simpleModeBtn.addEventListener("click", () => applyUiMode("simple"));
  refs.advancedModeBtn.addEventListener("click", () => applyUiMode("advanced"));

  refs.currencyCode.addEventListener("change", () => {
    const from = state.inputs.project.currencyCode || "USD";
    const to = refs.currencyCode.value || "USD";
    updateInput("currencyCode", to);
    if (from !== to) {
      trackEvent("currency_changed", { from, to, lang: state.settings.locale });
    }
    renderCurrencySelect();
  });

  refs.hourlyRate.addEventListener("input", renderHourlyRateWarning);
  
  const taxIn = refs.taxRateInput;
  if (taxIn) {
    taxIn.addEventListener("input", () => {
      updateInput("taxRate", toNumber(taxIn.value, 0));
    });
  }
  
  const wholesaleIn = refs.wholesaleDiscountInput;
  if (wholesaleIn) {
    wholesaleIn.addEventListener("input", () => {
      updateInput("wholesaleDiscount", toNumber(wholesaleIn.value, 0));
    });
  }
  refs.laborMinutes.addEventListener("input", () => {
    if (state.settings.analytics.laborTimeAdded) return;
    if (toNumber(refs.laborMinutes.value, 0) <= 0) return;
    updateSetting("analytics", { ...state.settings.analytics, laborTimeAdded: true });
    trackEvent("labor_time_added");
  });

  refs.fixedCostsList.addEventListener("input", (event) => {
    if (state.settings.analytics.fixedCostsAdded) return;
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (target.type !== "number") return;
    if (toNumber(target.value, 0) <= 0) return;
    updateSetting("analytics", { ...state.settings.analytics, fixedCostsAdded: true });
    trackEvent("fixed_costs_added");
  });

  refs.hourlyRateTooltip.addEventListener("click", () => {
    const isHidden = refs.hourlyRateTooltipText.classList.toggle("hidden");
    refs.hourlyRateTooltip.setAttribute("aria-expanded", String(!isHidden));
  });

  refs.addFixedCostBtn.addEventListener("click", () => {
    const newItem = { id: uid("fixed"), name: "", templateKey: "", amount: 0 };
    state.inputs.project.monthlyFixedCosts.push(newItem);
    renderSettingsLists();
    setTimeout(() => {
      document.querySelector(`[data-id="${newItem.id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  });

  refs.addEquipmentBtn.addEventListener("click", () => {
    const newItem = { id: uid("equip"), name: "", purchasePrice: 0, lifetimeMonths: 12 };
    state.inputs.project.equipmentDepreciation.push(newItem);
    renderSettingsLists();
    setTimeout(() => {
      document.querySelector(`[data-id="${newItem.id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  });

  refs.demoBakeryBtn?.addEventListener("click", () => applyDemoSeed("bakery"));
  refs.demoPerfumeBtn?.addEventListener("click", () => applyDemoSeed("perfume"));
  refs.demoHandmadeBtn?.addEventListener("click", () => applyDemoSeed("handmade"));
  refs.deleteDemoBtn?.addEventListener("click", deleteCurrentDemoIfAny);
  refs.quickStartDemoBtn?.addEventListener("click", () => {
    refs.demoSeedSectionTitle?.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  document.querySelectorAll('input[name="hasSales"]').forEach((radio) => {
    radio.addEventListener("change", renderSalesBlocks);
  });

  document.querySelectorAll(".quick-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      refs.salesOptionalUnits.value = btn.dataset.units || "";
    });
  });

  refs.advancedSettingsBtn.addEventListener("click", () => {
    if (state.settings.uiMode === "simple") return;
    refs.advancedSettingsPanel.classList.toggle("hidden");
  });

  refs.saveSettingsBtn.addEventListener("click", saveSettings);

  refs.materialPricingMode.addEventListener("change", renderMaterialPricingMode);
  refs.materialPackPrice.addEventListener("input", renderMaterialPricingMode);
  refs.materialPackSize.addEventListener("input", renderMaterialPricingMode);
  refs.materialForm.addEventListener("submit", saveMaterial);
  refs.resetMaterialBtn.addEventListener("click", resetMaterialForm);
  refs.materialsSearch.addEventListener("input", renderMaterialsLibraryList);

  refs.addRecipeItemBtn.addEventListener("click", () => {
    const recipe = currentRecipeFromForm();
    const newItem = { materialId: "", qtyPerUnit: 1, overrideWastePercent: null, tempId: uid("recipe") };
    recipe.push(newItem);
    renderRecipeRows(recipe);
    setTimeout(() => {
      document.querySelector(`[data-temp-id="${newItem.tempId}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  });

  refs.addVariantBtn.addEventListener("click", () => {
    const variants = currentVariantsFromForm();
    const newItem = {
      id: uid("variant"),
      name: state.settings.t("defaultVariantName"),
      unitsPerVariant: 1,
      extraPackagingCost: 0,
      sellingPriceOverride: 0,
      pricingTargetPercent: null,
      expectedMonthlySalesVariant: null,
      hasDelivery: false,
      deliveryPricingMode: "customer_separate",
      deliveryCost: 0,
      deliveryCostBasis: "perOrder"
    };
    variants.push(newItem);
    renderVariantRows(variants);
    setTimeout(() => {
      document.querySelector(`[data-id="${newItem.id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  });

  refs.productForm.addEventListener("submit", saveProduct);
  refs.resetProductBtn.addEventListener("click", resetProductForm);

  refs.resultProductSelect.addEventListener("change", () => {
    updateSetting("selectedProductId", refs.resultProductSelect.value);
  });

  refs.resultSellingPrice.addEventListener("input", () => {
    if (!state.settings.analytics.sellingPriceChanged) {
      updateSetting("analytics", { sellingPriceChanged: true });
      trackEvent("selling_price_changed");
    }
    renderResults();
  });

  refs.calculateBtn.addEventListener("click", () => {
    trackEvent("calculate_clicked", getLangCurrencyContext());
    renderResults();
  });
  refs.howCalculatedBtn.addEventListener("click", () => {
    refs.calculationDetails.classList.toggle("hidden");
  });

  refs.exportCsvBtn.addEventListener("click", exportAllAsCsv);
  refs.exportXlsxBtn.addEventListener("click", exportAllAsXlsx);
  refs.exportPdfBtn.addEventListener("click", exportCurrentAsPdf);
  refs.startNewProjectBtn?.addEventListener("click", resetProjectAndReload);
  refs.exitDemoModeBtn?.addEventListener("click", exitDemoModeReload);

  window.addEventListener("storage", (event) => {
    if (event.key !== SELECTED_LANGUAGE_KEY && event.key !== LOCALE_KEY) return;
    const next = getCanonicalLocale();
    if (next === state.settings.locale) return;
    updateInput("localeMode", next);
    applyLocale(next);
  });

  window.addEventListener("pricingplus:locale-changed", () => {
    const next = getCanonicalLocale();
    if (next === state.settings.locale) return;
    updateInput("localeMode", next);
    applyLocale(next);
  });
}

async function loadCurrencies() {
  const url = new URL("./data/currencies.json", import.meta.url);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("LOAD_CURRENCIES_FAILED");
  }
  state.settings.currencies = await response.json();
}

async function loadState() {
  await dbService.init();
  await loadCurrencies();

  const defaultProject = createDefaultProject();
  const storedProject = await dbService.getProject();
  const project = storedProject ? { ...defaultProject, ...storedProject } : { ...defaultProject };
  if ("demo" in project) {
    delete project.demo;
  }
  ensureProjectFixedCosts(project);
  updateInput("project", project);

  updateInput("uiMode", project.uiMode === "advanced" ? "advanced" : "simple");
  updateSetting("uiMode", project.uiMode);
  updateInput("localeMode", state.settings.locale);
  updateSetting("demoMode", false);

  updateInput("materialsLibrary", await dbService.getMaterials());
  setProducts((await dbService.getProducts()).map(normalizeProduct));
  updateSetting("selectedProductId", state.products[0]?.id ?? null);
}

async function init() {
  initRefs();
  console.log("App Trace: init start");
  state.settings.locale = getCanonicalLocale();
  await loadState();
  // Storage write mapping is now integrated into dbService.
  bindEvents();
  await initAuth();

  // Inject Language Selector
  if (refs.languageSelectorContainer && !refs.languageSelectorContainer.hasChildNodes()) {
    const selector = LanguageSelector((lang) => {
      const normalizedLocale = normalizeLocale(lang);
      updateSetting("locale", normalizedLocale);
      updateSetting("t", createTranslator(normalizedLocale));
    });
    refs.languageSelectorContainer.appendChild(selector);
  }

  applyLocale(getCanonicalLocale());
  fillSettingsFromState();
  analytics()?.trackPageView(getLangCurrencyContext());
  resetMaterialForm();
  resetProductForm();
  await consumeDemoFromQuery();
  console.log("App Trace: init end");
}

window.addEventListener('DOMContentLoaded', () => {
  init().catch((error) => {
    console.error("App Crash in init():", error);
    if (refs.feedback) {
      setFeedback(getFriendlyErrorMessage(error));
    }
  });
});
