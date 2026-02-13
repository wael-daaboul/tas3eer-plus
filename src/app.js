import {
  calculateLaborCost,
  calculateOverheadPerUnit,
  calculateTrueUnitCost,
  calculateMinimumPrice,
  calculateSuggestedPriceByMarginOnSelling,
  calculateBreakEvenUnits,
  calculateMonthlyProfit
} from "./logic/calculators.js";

import { DEFAULT_LANGUAGE, TRANSLATIONS } from "./config/i18n.js";
import { formatCurrency, formatNumber } from "./lib/formatters.js";
import { byId, setHtml, show, hide } from "./lib/dom-utils.js";

const els = {
  appTitle: byId("appTitle"),
  appHint: byId("appHint"),
  inputsTitle: byId("inputsTitle"),
  resultsTitle: byId("resultsTitle"),
  languageLabel: byId("languageLabel"),
  materialsCostLabel: byId("materialsCostLabel"),
  laborHoursLabel: byId("laborHoursLabel"),
  laborMinutesLabel: byId("laborMinutesLabel"),
  hourlyRateLabel: byId("hourlyRateLabel"),
  monthlyFixedLabel: byId("monthlyFixedLabel"),
  monthlyUnitsLabel: byId("monthlyUnitsLabel"),
  marginPercentLabel: byId("marginPercentLabel"),
  currencyLabel: byId("currencyLabel"),
  materialsCost: byId("materialsCost"),
  laborHoursHours: byId("laborHoursHours"),
  laborHoursMinutes: byId("laborHoursMinutes"),
  hourlyRate: byId("hourlyRate"),
  monthlyFixed: byId("monthlyFixed"),
  monthlyUnits: byId("monthlyUnits"),
  marginPercent: byId("marginPercent"),
  currency: byId("currency"),
  language: byId("language"),
  calcBtn: byId("calcBtn"),
  results: byId("results"),
  errorBox: byId("errorBox")
};

function getInitialLanguage() {
  const storedLanguage = localStorage.getItem("language");
  if (storedLanguage && TRANSLATIONS[storedLanguage]) {
    return storedLanguage;
  }
  return DEFAULT_LANGUAGE;
}

let currentLanguage = getInitialLanguage();
let lastResultsData = null;
let lastErrorKey = "";

function t(key) {
  return TRANSLATIONS[currentLanguage][key] || key;
}

function toNumber(el) {
  const n = Number(el.value);
  return Number.isFinite(n) ? n : 0;
}

function setError(msg) {
  if (!msg) {
    hide(els.errorBox);
    els.errorBox.textContent = "";
    return;
  }
  els.errorBox.textContent = msg;
  show(els.errorBox);
}

function setErrorByKey(errorKey) {
  lastErrorKey = errorKey || "";
  setError(errorKey ? t(errorKey) : "");
}

function applyDirection() {
  document.documentElement.lang = currentLanguage;
  document.documentElement.dir = currentLanguage === "ar" ? "rtl" : "ltr";
}

function renderStaticTexts() {
  els.appTitle.textContent = t("appTitle");
  els.appHint.textContent = t("appHint");
  els.inputsTitle.textContent = t("inputsTitle");
  els.resultsTitle.textContent = t("resultsTitle");
  els.languageLabel.textContent = t("languageLabel");
  els.materialsCostLabel.textContent = t("materialsCostLabel");
  els.laborHoursLabel.textContent = t("laborHoursLabel");
  els.laborMinutesLabel.textContent = t("laborMinutesLabel");
  els.hourlyRateLabel.textContent = t("hourlyRateLabel");
  els.monthlyFixedLabel.textContent = t("monthlyFixedLabel");
  els.monthlyUnitsLabel.textContent = t("monthlyUnitsLabel");
  els.marginPercentLabel.textContent = t("marginPercentLabel");
  els.currencyLabel.textContent = t("currencyLabel");
  els.calcBtn.textContent = t("calcButton");

  els.materialsCost.placeholder = t("exampleMaterialsCost");
  els.laborHoursHours.placeholder = t("exampleLaborHours");
  els.laborHoursMinutes.placeholder = t("exampleLaborMinutes");
  els.hourlyRate.placeholder = t("exampleHourlyRate");
  els.monthlyFixed.placeholder = t("exampleMonthlyFixed");

  document.title = t("appTitle");
}

function renderResults(data) {
  const {
    laborCost,
    overheadPerUnit,
    trueUnitCost,
    minimumPrice,
    suggestedPrice,
    breakEvenUnits,
    monthlyProfit,
    marginPercent,
    currency
  } = data;

  setHtml(els.results, `
    <ul>
      <li><strong>${t("resultLaborCost")}:</strong> ${formatCurrency(laborCost, currency)}</li>
      <li><strong>${t("resultOverheadPerUnit")}:</strong> ${formatCurrency(overheadPerUnit, currency)}</li>
      <li><strong>${t("resultTrueUnitCost")}:</strong> ${formatCurrency(trueUnitCost, currency)}</li>
      <li><strong>${t("resultMinimumPrice")}:</strong> ${formatCurrency(minimumPrice, currency)}</li>
      <li><strong>${t("resultSuggestedPrice")} (${t("profitMarginShort")} ${formatNumber(marginPercent, 1)}%):</strong> ${formatCurrency(suggestedPrice, currency)}</li>
      <li><strong>${t("resultBreakEvenUnits")}:</strong> ${
        Number.isFinite(breakEvenUnits) ? formatNumber(breakEvenUnits, 1) : t("breakEvenImpossible")
      }</li>
      <li><strong>${t("resultMonthlyProfit")}:</strong> ${formatCurrency(monthlyProfit, currency)}</li>
    </ul>
  `);
}

function setLanguage(nextLanguage) {
  if (!TRANSLATIONS[nextLanguage]) return;
  currentLanguage = nextLanguage;
  localStorage.setItem("language", currentLanguage);
  applyDirection();
  renderStaticTexts();

  if (lastErrorKey) {
    setErrorByKey(lastErrorKey);
  }
  if (lastResultsData) {
    renderResults(lastResultsData);
  }
}

els.calcBtn.addEventListener("click", () => {
  setErrorByKey("");

  const materialsCost = toNumber(els.materialsCost);
  const laborHoursHours = toNumber(els.laborHoursHours);
  const laborHoursMinutes = toNumber(els.laborHoursMinutes);
  const hourlyRate = toNumber(els.hourlyRate);
  const monthlyFixed = toNumber(els.monthlyFixed);
  const monthlyUnitsRaw = toNumber(els.monthlyUnits);
  const marginPercent = toNumber(els.marginPercent);
  const selectedCurrency = els.currency.value || "USD";

  const monthlyUnits = Math.max(1, Math.floor(monthlyUnitsRaw));

  if (
    !Number.isInteger(laborHoursMinutes) ||
    laborHoursMinutes < 0 ||
    laborHoursMinutes > 59
  ) {
    setErrorByKey("errorInvalidMinutes");
    return;
  }

  if (
    materialsCost < 0 ||
    laborHoursHours < 0 ||
    hourlyRate < 0 ||
    monthlyFixed < 0 ||
    marginPercent < 0
  ) {
    setErrorByKey("errorPositiveNumbers");
    return;
  }

  const laborHours = laborHoursHours + (laborHoursMinutes / 60);
  const laborCost = calculateLaborCost(laborHours, hourlyRate);
  const overheadPerUnit = calculateOverheadPerUnit(monthlyFixed, monthlyUnits);

  const trueUnitCost = calculateTrueUnitCost(materialsCost, laborCost, overheadPerUnit);
  const minimumPrice = calculateMinimumPrice(trueUnitCost);
  const suggestedPrice = calculateSuggestedPriceByMarginOnSelling(trueUnitCost, marginPercent);

  const variableCostPerUnit = materialsCost + laborCost;

  const breakEvenUnits = calculateBreakEvenUnits(monthlyFixed, suggestedPrice, variableCostPerUnit);
  const monthlyProfit = calculateMonthlyProfit(monthlyUnits, suggestedPrice, variableCostPerUnit, monthlyFixed);

  lastResultsData = {
    laborCost,
    overheadPerUnit,
    trueUnitCost,
    minimumPrice,
    suggestedPrice,
    breakEvenUnits,
    monthlyProfit,
    marginPercent,
    currency: selectedCurrency
  };

  renderResults(lastResultsData);
});

els.language.addEventListener("change", (event) => {
  const nextLanguage = event.target.value;
  setLanguage(nextLanguage);
});

els.language.value = currentLanguage;
setLanguage(currentLanguage);
  
