import {
  buildProductMetrics,
  getProfitStatus,
  calculateMaterialBaseUnitCost
} from "./engine/pricingEngine.js";
import {
  detectInitialLocale,
  persistLocale,
  applyDocumentLocale,
  createTranslator
} from "./i18n/localization.js";
import { IndexedDbProvider } from "./storage/indexedDbProvider.js";
import { exportCsv, exportXlsx, exportPdf } from "./services/exportService.js";
import { formatMoney, formatNumber, toNumber } from "./utils/format.js";
import { uid } from "./utils/id.js";

const storage = new IndexedDbProvider();

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

const state = {
  locale: detectInitialLocale(),
  t: () => "",
  currencies: [],
  project: null,
  materialsLibrary: [],
  products: [],
  selectedProductId: null,
  editingProductId: null,
  editingMaterialId: null,
  uiMode: "simple"
};

function createDefaultProject() {
  return {
    currencyCode: "USD",
    localeMode: "auto",
    dataVersion: 3,
    hourlyRate: 0,
    monthlyFixedCosts: FIXED_COST_TEMPLATES.map((item) => ({
      id: uid("fixed"),
      name: "",
      templateKey: item.key,
      templateHintKey: item.hintKey,
      amount: 0
    })),
    equipmentDepreciation: [{ id: uid("equip"), name: "", purchasePrice: 0, lifetimeMonths: 12 }],
    expectedMonthlyUnits: 1,
    expectedMonthlySales: 0,
    safetyMarginPercent: 5,
    pricingMode: "markup",
    pricingPercent: 30,
    hasSales: "no",
    salesUnitsInput: 0,
    salesUndefined: true,
    uiMode: "simple"
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

const refs = {
  feedback: document.getElementById("feedback"),
  languageSelect: document.getElementById("languageSelect"),
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

  exportCsvBtn: document.getElementById("exportCsvBtn"),
  exportXlsxBtn: document.getElementById("exportXlsxBtn"),
  exportPdfBtn: document.getElementById("exportPdfBtn")
};

function setFeedback(message) {
  refs.feedback.textContent = message;
}

function getFriendlyErrorMessage(error) {
  const code = String(error?.message || error || "");
  if (code.includes("EXPORT_LIBRARY_MISSING")) return state.t("errorExportLibrary");
  if (code.includes("LOAD_CURRENCIES_FAILED")) return state.t("errorLoadCurrencies");
  return state.t("unexpectedError");
}

function validateNonNegative(values) {
  return values.every((v) => Number.isFinite(v) && v >= 0);
}

function getCurrencyDisplay(currency) {
  const name = state.locale === "ar"
    ? (currency.name_ar || `${state.t("currencyGenericName")} ${currency.code}`)
    : (currency.name_en || currency.code);
  return `${name} — ${currency.code}`;
}

function getMaterialDisplayName(material) {
  return state.locale === "ar"
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
  state.uiMode = mode === "advanced" ? "advanced" : "simple";
  document.body.classList.toggle("simple-mode", state.uiMode === "simple");
  refs.simpleModeBtn.classList.toggle("active", state.uiMode === "simple");
  refs.advancedModeBtn.classList.toggle("active", state.uiMode === "advanced");
  refs.advancedSettingsBtn.classList.toggle("hidden", state.uiMode === "simple");
  refs.equipmentSection.classList.toggle("hidden", state.uiMode === "simple");
  if (state.uiMode === "simple") {
    refs.advancedSettingsPanel.classList.add("hidden");
  }
}

function renderSalesBlocks() {
  const hasSales = getHasSalesValue();
  refs.salesYesBlock.classList.toggle("hidden", hasSales !== "yes");
  refs.salesNoBlock.classList.toggle("hidden", hasSales !== "no");
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
    piece: state.t("unitTypePiece"),
    g: state.t("unitTypeG"),
    kg: state.t("unitTypeKg"),
    ml: state.t("unitTypeMl"),
    l: state.t("unitTypeL")
  };
  return map[unitType] || unitType;
}

function pricingModeLabel(mode) {
  return mode === "perPack" ? state.t("pricingModePerPack") : state.t("pricingModePerUnit");
}

function normalizeLegacyLabel(text, fallbackKey) {
  const value = String(text || "").trim();
  if (!value) return state.t(fallbackKey);
  if (state.locale === "ar" && /^(unit|variant)$/i.test(value)) {
    return state.t(fallbackKey);
  }
  return value;
}

function renderCurrencySelect() {
  refs.currencyCode.innerHTML = "";
  state.currencies.forEach((currency) => {
    const option = document.createElement("option");
    option.value = currency.code;
    option.textContent = getCurrencyDisplay(currency);
    refs.currencyCode.append(option);
  });
  const selectedCode = state.currencies.some((item) => item.code === state.project.currencyCode)
    ? state.project.currencyCode
    : "USD";
  refs.currencyCode.value = selectedCode;
  state.project.currencyCode = selectedCode;
}

function renderRecipeMaterialOptions() {
  refs.recipeMaterialOptions.innerHTML = "";
  state.materialsLibrary.forEach((material) => {
    const option = document.createElement("option");
    option.value = `${getMaterialDisplayName(material)} — ${material.id}`;
    refs.recipeMaterialOptions.append(option);
  });
}

function renderSettingsLists() {
  const t = state.t;

  refs.fixedCostsList.innerHTML = "";
  state.project.monthlyFixedCosts.forEach((row) => {
    const item = document.createElement("div");
    item.className = "row fixed-cost-row";

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
      state.project.monthlyFixedCosts = state.project.monthlyFixedCosts.filter((x) => x.id !== row.id);
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
  state.project.equipmentDepreciation.forEach((row) => {
    const item = document.createElement("div");
    item.className = "row equipment-row";

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
      state.project.equipmentDepreciation = state.project.equipmentDepreciation.filter((x) => x.id !== row.id);
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
    refs.materialPackExample.textContent = `${state.t("materialPackExample")} ${formatNumber(unitCost, state.locale, 4)}. ${state.t("materialPricingModeHintPerPack")}`;
  } else {
    refs.materialPackExample.textContent = state.t("materialPricingModeHintPerUnit");
  }
}

function collectMaterialFromForm() {
  const base = createDefaultMaterial();
  return {
    ...base,
    id: state.editingMaterialId || base.id,
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
  state.editingMaterialId = null;
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
  const t = state.t;
  const q = refs.materialsSearch.value.trim();
  const list = q ? state.materialsLibrary.filter((m) => materialMatchSearch(m, q)) : state.materialsLibrary;

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
    info.innerHTML = `<strong>${getMaterialDisplayName(material)}</strong><div class="meta">${unitTypeLabel(material.unitType)} • ${pricingModeLabel(material.pricingMode)} • ${formatMoney(unitCost, state.project.currencyCode, state.locale)}</div>`;

    const actions = document.createElement("div");
    actions.className = "item-actions";

    const edit = document.createElement("button");
    edit.type = "button";
    edit.textContent = t("edit");
    edit.onclick = () => {
      state.editingMaterialId = material.id;
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
      await storage.deleteMaterial(material.id);
      state.materialsLibrary = state.materialsLibrary.filter((m) => m.id !== material.id);
      state.products = (await storage.listProducts()).map(normalizeProduct);
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
  const material = state.materialsLibrary.find((m) => m.id === materialId);
  if (!material) return "";
  return `${getMaterialDisplayName(material)} — ${material.id}`;
}

function materialIdFromRecipeInput(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const byTail = state.materialsLibrary.find((m) => text.endsWith(`— ${m.id}`));
  if (byTail) return byTail.id;

  const byId = state.materialsLibrary.find((m) => m.id === text);
  if (byId) return byId.id;

  const byName = state.materialsLibrary.find((m) => {
    const name = getMaterialDisplayName(m).toLowerCase();
    return name === text.toLowerCase();
  });
  return byName?.id || "";
}

function renderRecipeRows(recipe) {
  const t = state.t;
  refs.recipeList.innerHTML = "";

  recipe.forEach((row) => {
    const wrapper = document.createElement("div");
    wrapper.className = "row";
    wrapper.dataset.id = row.id || uid("recipe");

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
  const t = state.t;
  refs.variantsList.innerHTML = "";

  variants.forEach((variant) => {
    const row = document.createElement("div");
    row.className = "row";
    row.dataset.id = variant.id || uid("variant");

    const name = createInput(normalizeLegacyLabel(variant.name, "defaultVariantName"), "text");
    name.placeholder = t("variantNameLabel");
    name.className = "variant-name";
    const units = createInput(variant.unitsPerVariant ?? 1, "number");
    units.step = "1";
    units.placeholder = t("variantUnitsLabel");
    units.className = "variant-units";
    const extra = createInput(variant.extraPackagingCost ?? 0, "number");
    extra.step = "0.01";
    extra.placeholder = t("variantPackagingCostLabel");
    extra.className = "variant-extra";

    const selling = createInput(variant.sellingPriceOverride ?? 0, "number");
    selling.step = "0.01";
    selling.placeholder = `${t("variantManualPriceLabel")} (${t("optionalLabel")})`;
    selling.className = "variant-selling";

    const target = createInput(variant.pricingTargetPercent ?? "", "number");
    target.step = "0.1";
    target.placeholder = `${t("variantProfitPercentLabel")} (${t("optionalLabel")})`;
    target.className = "variant-target";

    const deliveryWrap = document.createElement("div");
    deliveryWrap.className = "field";

    const deliveryToggleLabel = document.createElement("label");
    const deliveryToggle = document.createElement("input");
    deliveryToggle.type = "checkbox";
    deliveryToggle.className = "variant-delivery-toggle";
    deliveryToggle.checked = Boolean(variant.hasDelivery);
    deliveryToggleLabel.append(deliveryToggle, document.createTextNode(` ${t("variantDeliveryHas")}`));

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
    deliveryCost.placeholder = t("variantDeliveryCostLabel");
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

    const deliveryModeField = document.createElement("label");
    deliveryModeField.className = "field";
    const deliveryModeText = document.createElement("span");
    deliveryModeText.textContent = t("variantDeliveryModeLabel");
    deliveryModeField.append(deliveryModeText, deliveryMode);

    const deliveryCostField = document.createElement("label");
    deliveryCostField.className = "field";
    const deliveryCostText = document.createElement("span");
    deliveryCostText.textContent = t("variantDeliveryCostLabel");
    deliveryCostField.append(deliveryCostText, deliveryCost);

    const deliveryBasisField = document.createElement("label");
    deliveryBasisField.className = "field";
    const deliveryBasisText = document.createElement("span");
    deliveryBasisText.textContent = t("variantDeliveryBasisLabel");
    deliveryBasisField.append(deliveryBasisText, deliveryBasis);

    const deliveryFields = document.createElement("div");
    deliveryFields.className = "grid-3";
    deliveryFields.append(deliveryModeField, deliveryCostField, deliveryBasisField);
    deliveryFields.classList.toggle("hidden", !deliveryToggle.checked);

    deliveryToggle.addEventListener("change", () => {
      deliveryFields.classList.toggle("hidden", !deliveryToggle.checked);
    });
    deliveryWrap.append(deliveryToggleLabel, deliveryFields);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "remove";
    remove.textContent = t("remove");
    remove.onclick = () => row.remove();

    row.append(name, units, extra, selling, target, deliveryWrap, remove);
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
      name: (nameInput?.value || "").trim() || state.t("defaultVariantName"),
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
  state.editingProductId = null;
  const product = createDefaultProduct();
  refs.productName.value = "";
  refs.unitName.value = state.t("defaultUnitName");
  refs.laborMinutes.value = "0";
  refs.energyKw.value = "0";
  refs.energyMinutes.value = "0";
  refs.energyPricePerKwh.value = "0";
  renderRecipeRows(product.recipe);
  renderVariantRows(product.variants);
}

function renderProductsList() {
  const t = state.t;
  refs.productsList.innerHTML = "";

  if (!state.products.length) {
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = t("noProducts");
    refs.productsList.append(p);
    return;
  }

  state.products.forEach((product) => {
    const item = document.createElement("article");
    item.className = "product-item";

    const info = document.createElement("div");
    info.innerHTML = `<strong>${product.name}</strong><div class="meta">${product.recipe.length} ${t("recipeItemsShort")} • ${product.variants.length} ${t("variantsShort")}</div>`;

    const actions = document.createElement("div");
    actions.className = "item-actions";

    const edit = document.createElement("button");
    edit.type = "button";
    edit.textContent = t("edit");
    edit.onclick = () => {
      state.editingProductId = product.id;
      refs.productName.value = product.name;
      refs.unitName.value = normalizeLegacyLabel(product.unitName, "defaultUnitName");
      refs.laborMinutes.value = product.laborMinutes || 0;
      refs.energyKw.value = product.energy?.kw || 0;
      refs.energyMinutes.value = product.energy?.minutes || 0;
      refs.energyPricePerKwh.value = product.energy?.pricePerKwh || 0;
      renderRecipeRows(product.recipe || []);
      renderVariantRows(product.variants || []);
    };

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "remove";
    remove.textContent = t("delete");
    remove.onclick = async () => {
      await storage.deleteProduct(product.id);
      state.products = state.products.filter((p) => p.id !== product.id);
      if (state.selectedProductId === product.id) {
        state.selectedProductId = state.products[0]?.id ?? null;
      }
      renderProductsList();
      renderProductPicker();
      setFeedback(t("feedbackDeleted"));
    };

    actions.append(edit, remove);
    item.append(info, actions);
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

  if (!state.selectedProductId && state.products.length) {
    state.selectedProductId = state.products[0].id;
  }

  refs.resultProductSelect.value = state.selectedProductId || "";
}

function collectProjectFromForm() {
  const hasSales = getHasSalesValue();
  const directSales = Math.floor(toNumber(refs.salesCurrentUnits.value, 0));
  const optionalSales = Math.floor(toNumber(refs.salesOptionalUnits.value, 0));
  const selectedUnits = hasSales === "yes" ? directSales : optionalSales;
  const salesDefined = selectedUnits > 0;

  return {
    ...state.project,
    dataVersion: 3,
    currencyCode: refs.currencyCode.value || "USD",
    hourlyRate: toNumber(refs.hourlyRate.value, 0),
    expectedMonthlyUnits: salesDefined ? selectedUnits : 1,
    expectedMonthlySales: salesDefined ? selectedUnits : 0,
    safetyMarginPercent: toNumber(refs.safetyMarginPercent.value, 5),
    pricingMode: state.uiMode === "simple" ? "markup" : getCurrentPricingMode(),
    pricingPercent: toNumber(refs.pricingPercent.value, 30),
    hasSales,
    salesUnitsInput: selectedUnits,
    salesUndefined: !salesDefined,
    uiMode: state.uiMode
  };
}

async function saveSettings() {
  const t = state.t;
  const project = collectProjectFromForm();

  if (!validateNonNegative([
    project.hourlyRate,
    project.expectedMonthlyUnits,
    project.expectedMonthlySales,
    project.safetyMarginPercent,
    project.pricingPercent,
    ...project.monthlyFixedCosts.map((x) => x.amount),
    ...project.equipmentDepreciation.map((x) => x.purchasePrice),
    ...project.equipmentDepreciation.map((x) => x.lifetimeMonths)
  ])) {
    setFeedback(t("validationPositive"));
    return;
  }

  state.project = project;
  await storage.saveProject(project);
  setFeedback(t("feedbackSaved"));
}

async function saveMaterial(event) {
  event.preventDefault();
  const t = state.t;
  const material = collectMaterialFromForm();

  if (!material.name_ar.trim() && !material.name_en.trim()) {
    setFeedback(t("validationRequired"));
    return;
  }

  if (material.pricingMode === "perPack" && material.packSize <= 0) {
    setFeedback(t("validationPackSize"));
    return;
  }

  await storage.upsertMaterial(material);
  const idx = state.materialsLibrary.findIndex((m) => m.id === material.id);
  if (idx >= 0) state.materialsLibrary[idx] = material;
  else state.materialsLibrary.push(material);

  state.materialsLibrary.sort((a, b) => getMaterialDisplayName(a).localeCompare(getMaterialDisplayName(b)));
  resetMaterialForm();
  renderMaterialsLibraryList();
  renderRecipeMaterialOptions();
  setFeedback(t("feedbackSaved"));
}

async function saveProduct(event) {
  event.preventDefault();

  const t = state.t;
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
    id: state.editingProductId || uid("product"),
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

  await storage.upsertProduct(product);
  const idx = state.products.findIndex((p) => p.id === product.id);
  if (idx >= 0) state.products[idx] = product;
  else state.products.unshift(product);

  state.selectedProductId = product.id;
  renderProductsList();
  renderProductPicker();
  resetProductForm();
  setFeedback(t("feedbackSaved"));
}

function renderResults() {
  const t = state.t;
  const product = state.products.find((p) => p.id === state.selectedProductId);
  if (!product) return;

  const sellingPrice = toNumber(refs.resultSellingPrice.value, 0);
  const metrics = buildProductMetrics(state.project, product, state.materialsLibrary, sellingPrice);

  refs.resultsGrid.innerHTML = "";
  refs.variantCards.innerHTML = "";
  refs.calculationDetails.classList.add("hidden");

  const list = [
    [t("metricTrueUnitCost"), formatMoney(metrics.trueUnitCost, state.project.currencyCode, state.locale)],
    [t("metricMinimumAcceptablePrice"), formatMoney(metrics.minimumAcceptablePrice, state.project.currencyCode, state.locale)],
    [t("metricSuggestedPrice"), formatMoney(metrics.suggestedPrice, state.project.currencyCode, state.locale)],
    [t("metricBreakEvenUnits"), Number.isFinite(metrics.breakEvenUnits) ? formatNumber(metrics.breakEvenUnits, state.locale, 2) : t("breakEvenImpossible")],
    [t("metricMonthlyProfit"), formatMoney(metrics.monthlyProfit, state.project.currencyCode, state.locale)]
  ];

  list.forEach(([name, value]) => {
    const box = document.createElement("article");
    box.className = "metric";
    box.innerHTML = `<div class="name">${name}</div><div class="value">${value}</div>`;
    refs.resultsGrid.append(box);
  });

  metrics.variantMetrics.forEach((variant) => {
    const status = getProfitStatus(variant);
    let deliveryLine = t("variantDeliveryNone");
    if (variant.hasDelivery) {
      const modeKey = variant.deliveryPricingMode === "merchant_free"
        ? "variantDeliveryModeMerchantFree"
        : (variant.deliveryPricingMode === "included_in_price" ? "variantDeliveryModeIncludedInPrice" : "variantDeliveryModeCustomerSeparate");
      const basisKey = variant.deliveryCostBasis === "perUnit" ? "variantDeliveryBasisPerUnit" : "variantDeliveryBasisPerOrder";
      deliveryLine = `${t(modeKey)} • ${t(basisKey)} • ${formatMoney(variant.deliveryCost, state.project.currencyCode, state.locale)}`;
    }

    const deliveryCalcLine = variant.hasDelivery
      ? (variant.deliveryAffectsProfit
        ? `${t("metricDeliveryCost")}: ${formatMoney(variant.deliveryCostApplied, state.project.currencyCode, state.locale)}`
        : t("deliverySeparateInfo"))
      : t("variantDeliveryNone");

    const card = document.createElement("article");
    card.className = "metric";
    card.innerHTML = `
      <div class="name">${normalizeLegacyLabel(variant.name, "defaultVariantName")}</div>
      <div>${t("metricTrueUnitCost")}: <strong>${formatMoney(variant.variantUnitCost, state.project.currencyCode, state.locale)}</strong></div>
      <div>${t("metricMinimumAcceptablePrice")}: <strong>${formatMoney(variant.minimumAcceptablePriceVariant, state.project.currencyCode, state.locale)}</strong></div>
      <div>${t("metricSuggestedPrice")}: <strong>${formatMoney(variant.suggestedPriceVariant, state.project.currencyCode, state.locale)}</strong></div>
      <div>${t("metricBreakEvenUnits")}: <strong>${Number.isFinite(variant.breakEvenUnitsVariant) ? formatNumber(variant.breakEvenUnitsVariant, state.locale, 2) : t("breakEvenImpossible")}</strong></div>
      <div>${t("metricExtraPackaging")}: <strong>${formatMoney(variant.extraPackagingCost, state.project.currencyCode, state.locale)}</strong></div>
      <div>${t("deliveryLabel")}: <strong>${deliveryLine}</strong></div>
      <div class="muted">${deliveryCalcLine}</div>
      <div class="badge ${status}">${t(status === "green" ? "statusGreen" : status === "yellow" ? "statusYellow" : "statusRed")}</div>
    `;
    refs.variantCards.append(card);
  });

  const firstVariant = metrics.variantMetrics[0] || metrics;
  const status = getProfitStatus(firstVariant);
  refs.statusBadge.className = `badge ${status}`;
  refs.statusBadge.textContent = t(status === "green" ? "statusGreen" : status === "yellow" ? "statusYellow" : "statusRed");

  refs.monthlyTable.innerHTML = `
    <h3>${t("monthlyTableTitle")}</h3>
    ${state.project.salesUndefined ? `<p class="warn-note">${t("salesUndefinedWarning")}</p>` : ""}
    <table>
      <thead><tr><th>${t("monthlyColumnScenario")}</th><th>${t("monthlyColumnValue")}</th></tr></thead>
      <tbody>
        <tr><td>${t("monthlyAtExpectedSales")}</td><td>${formatMoney(metrics.monthlyProfit, state.project.currencyCode, state.locale)}</td></tr>
        <tr><td>${t("monthlyAtBreakEven")}</td><td>${Number.isFinite(metrics.breakEvenUnits) ? formatNumber(metrics.breakEvenUnits, state.locale, 2) : t("breakEvenImpossible")}</td></tr>
        <tr><td>${t("monthlyContribution")}</td><td>${formatMoney(metrics.sellingPrice - metrics.variableCostPerUnit, state.project.currencyCode, state.locale)}</td></tr>
      </tbody>
    </table>
  `;

  refs.calculationDetails.innerHTML = `
    <h4>${t("howCalculatedBtn")}</h4>
    <ul>
      <li>${t("metricMaterialsCost")}: ${formatMoney(metrics.materialsCost, state.project.currencyCode, state.locale)}</li>
      <li>${t("metricLaborCost")}: ${formatMoney(metrics.laborCost, state.project.currencyCode, state.locale)}</li>
      <li>${t("metricEnergyCost")}: ${formatMoney(metrics.energyCost, state.project.currencyCode, state.locale)}</li>
      <li>${t("metricFixedShare")}: ${formatMoney(metrics.fixedPerUnit, state.project.currencyCode, state.locale)}</li>
      <li>${t("metricVariableCost")}: ${formatMoney(metrics.variableCostPerUnit, state.project.currencyCode, state.locale)}</li>
      <li>${t("deliveryLabel")}: ${metrics.variantMetrics.some((variant) => variant.hasDelivery)
        ? metrics.variantMetrics.map((variant) => {
          if (!variant.hasDelivery) return `${normalizeLegacyLabel(variant.name, "defaultVariantName")}: ${t("variantDeliveryNone")}`;
          if (!variant.deliveryAffectsProfit) return `${normalizeLegacyLabel(variant.name, "defaultVariantName")}: ${t("deliverySeparateInfo")}`;
          return `${normalizeLegacyLabel(variant.name, "defaultVariantName")}: ${t("metricDeliveryCost")} ${formatMoney(variant.deliveryCostApplied, state.project.currencyCode, state.locale)}`;
        }).join(" | ")
        : t("variantDeliveryNone")}</li>
    </ul>
  `;

  setFeedback(t("feedbackCalculated"));
}

async function exportAllAsCsv() {
  try {
    exportCsv({
      project: state.project,
      products: state.products,
      materialsLibrary: state.materialsLibrary,
      locale: state.locale,
      t: state.t
    });
    setFeedback(state.t("feedbackExported"));
  } catch (error) {
    setFeedback(getFriendlyErrorMessage(error));
  }
}

async function exportAllAsXlsx() {
  try {
    exportXlsx({
      project: state.project,
      products: state.products,
      materialsLibrary: state.materialsLibrary,
      locale: state.locale,
      t: state.t
    });
    setFeedback(state.t("feedbackExported"));
  } catch (error) {
    setFeedback(getFriendlyErrorMessage(error));
  }
}

async function exportCurrentAsPdf() {
  const product = state.products.find((p) => p.id === state.selectedProductId);
  if (!product) return;

  const metrics = buildProductMetrics(state.project, product, state.materialsLibrary, toNumber(refs.resultSellingPrice.value, 0));
  try {
    await exportPdf({
      project: state.project,
      product,
      metrics,
      materialsLibrary: state.materialsLibrary,
      locale: state.locale,
      t: state.t
    });
    setFeedback(state.t("feedbackExported"));
  } catch (error) {
    setFeedback(getFriendlyErrorMessage(error));
  }
}

function navigate(step) {
  document.querySelectorAll(".page").forEach((page) => {
    page.classList.toggle("active", page.dataset.page === step);
  });
  document.querySelectorAll(".step").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.step === step);
  });
}

function applyLocale(locale) {
  state.locale = locale;
  state.t = createTranslator(locale);
  applyDocumentLocale(locale);

  const t = state.t;
  const textKeys = {
    appTitle: "appTitle",
    appSubtitle: "appSubtitle",
    languageLabel: "languageLabel",
    exportCsvBtn: "exportCsv",
    exportXlsxBtn: "exportXlsx",
    exportPdfBtn: "exportPdf",

    stepSettings: "stepSettings",
    stepMaterials: "stepMaterials",
    stepProducts: "stepProducts",
    stepResults: "stepResults",

    settingsTitle: "settingsTitle",
    settingsHint: "settingsHint",
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
    safetyMarginPercentHelp: "safetyMarginPercentHelp",
    fixedCostsTitle: "fixedCostsTitle",
    fixedCostsHint: "fixedCostsHint",
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

  refs.hourlyRate.placeholder = t("hourlyRatePlaceholder");
  refs.hourlyRateTooltip.textContent = "?";
  refs.hourlyRateTooltip.setAttribute("aria-label", t("hourlyRateTooltipAria"));
  refs.hourlyRateTooltip.setAttribute("aria-expanded", "false");
  refs.hourlyRateTooltipText.textContent = t("hourlyRateTooltip");
  refs.hourlyRateTooltipText.classList.add("hidden");
  refs.salesOptionalUnits.placeholder = t("salesOptionalInputPlaceholder");
  refs.materialsSearch.placeholder = t("materialsSearchPlaceholder");
  refs.languageSelect.querySelector('option[value="ar"]').textContent = t("langArabic");
  refs.languageSelect.querySelector('option[value="en"]').textContent = t("langEnglish");
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

  refs.languageSelect.value = locale;

  renderCurrencySelect();
  renderSettingsLists();
  renderMaterialPricingMode();
  renderMaterialsLibraryList();
  renderRecipeMaterialOptions();
  renderProductsList();
  renderProductPicker();
  applyUiMode(state.uiMode);
}

function fillSettingsFromState() {
  refs.hourlyRate.value = state.project.hourlyRate;
  refs.salesCurrentUnits.value = state.project.hasSales === "yes" ? state.project.salesUnitsInput || state.project.expectedMonthlySales || "" : "";
  refs.salesOptionalUnits.value = state.project.hasSales === "no" ? state.project.salesUnitsInput || state.project.expectedMonthlySales || "" : "";
  refs.safetyMarginPercent.value = state.project.safetyMarginPercent;
  refs.pricingPercent.value = state.project.pricingPercent;

  document.querySelectorAll('input[name="hasSales"]').forEach((el) => {
    el.checked = el.value === (state.project.hasSales || "yes");
  });
  document.querySelectorAll('input[name="pricingMode"]').forEach((el) => {
    el.checked = el.value === (state.project.pricingMode || "markup");
  });

  applyUiMode(state.project.uiMode || "simple");
  renderSalesBlocks();
  renderCurrencySelect();
  renderSettingsLists();
}

function bindEvents() {
  document.querySelectorAll(".step").forEach((btn) => {
    btn.addEventListener("click", () => navigate(btn.dataset.step));
  });

  document.querySelectorAll(".nextBtn").forEach((btn) => {
    btn.addEventListener("click", () => navigate(btn.dataset.next));
  });

  refs.languageSelect.addEventListener("change", async (event) => {
    const next = event.target.value === "ar" ? "ar" : "en";
    state.project.localeMode = next;
    persistLocale(next);
    await storage.saveProject(state.project);
    applyLocale(next);
  });

  refs.simpleModeBtn.addEventListener("click", () => applyUiMode("simple"));
  refs.advancedModeBtn.addEventListener("click", () => applyUiMode("advanced"));

  refs.currencyCode.addEventListener("change", () => {
    state.project.currencyCode = refs.currencyCode.value || "USD";
    renderCurrencySelect();
  });

  refs.hourlyRateTooltip.addEventListener("click", () => {
    const isHidden = refs.hourlyRateTooltipText.classList.toggle("hidden");
    refs.hourlyRateTooltip.setAttribute("aria-expanded", String(!isHidden));
  });

  refs.addFixedCostBtn.addEventListener("click", () => {
    state.project.monthlyFixedCosts.push({ id: uid("fixed"), name: "", templateKey: "", amount: 0 });
    renderSettingsLists();
  });

  refs.addEquipmentBtn.addEventListener("click", () => {
    state.project.equipmentDepreciation.push({ id: uid("equip"), name: "", purchasePrice: 0, lifetimeMonths: 12 });
    renderSettingsLists();
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
    if (state.uiMode === "simple") return;
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
    recipe.push({ materialId: "", qtyPerUnit: 1, overrideWastePercent: null });
    renderRecipeRows(recipe);
  });

  refs.addVariantBtn.addEventListener("click", () => {
    const variants = currentVariantsFromForm();
    variants.push({
      id: uid("variant"),
      name: state.t("defaultVariantName"),
      unitsPerVariant: 1,
      extraPackagingCost: 0,
      sellingPriceOverride: 0,
      pricingTargetPercent: null,
      expectedMonthlySalesVariant: null,
      hasDelivery: false,
      deliveryPricingMode: "customer_separate",
      deliveryCost: 0,
      deliveryCostBasis: "perOrder"
    });
    renderVariantRows(variants);
  });

  refs.productForm.addEventListener("submit", saveProduct);
  refs.resetProductBtn.addEventListener("click", resetProductForm);

  refs.resultProductSelect.addEventListener("change", () => {
    state.selectedProductId = refs.resultProductSelect.value;
  });

  refs.calculateBtn.addEventListener("click", renderResults);
  refs.howCalculatedBtn.addEventListener("click", () => {
    refs.calculationDetails.classList.toggle("hidden");
  });

  refs.exportCsvBtn.addEventListener("click", exportAllAsCsv);
  refs.exportXlsxBtn.addEventListener("click", exportAllAsXlsx);
  refs.exportPdfBtn.addEventListener("click", exportCurrentAsPdf);

  window.addEventListener("storage", (event) => {
    if (event.key !== "pricingplus_locale") return;
    const next = event.newValue === "en" ? "en" : "ar";
    if (next === state.locale) return;
    state.project.localeMode = next;
    applyLocale(next);
  });
}

async function loadCurrencies() {
  const url = new URL("./data/currencies.json", import.meta.url);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("LOAD_CURRENCIES_FAILED");
  }
  state.currencies = await response.json();
}

async function loadState() {
  await storage.init();
  await loadCurrencies();

  const defaultProject = createDefaultProject();
  const storedProject = await storage.getProject();
  state.project = storedProject ? { ...defaultProject, ...storedProject } : { ...defaultProject };
  ensureProjectFixedCosts(state.project);

  state.project.uiMode = state.project.uiMode === "advanced" ? "advanced" : "simple";
  state.uiMode = state.project.uiMode;

  if (state.project.localeMode === "ar" || state.project.localeMode === "en") {
    state.locale = state.project.localeMode;
  }

  state.materialsLibrary = await storage.listMaterials();
  state.products = (await storage.listProducts()).map(normalizeProduct);
  state.selectedProductId = state.products[0]?.id ?? null;
}

async function init() {
  await loadState();
  bindEvents();
  applyLocale(state.locale);
  fillSettingsFromState();
  resetMaterialForm();
  resetProductForm();
}

init().catch((error) => {
  console.error(error);
  setFeedback(getFriendlyErrorMessage(error));
});
