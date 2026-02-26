import { buildProductMetrics, calculateMaterialBaseUnitCost } from "../engine/pricingEngine.js";
import { formatMoney, formatNumber } from "../utils/format.js";

function downloadBlob(content, fileName, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (text.includes(",") || text.includes("\n") || text.includes('"')) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function getMaterialName(material, locale) {
  return locale === "ar" ? (material.name_ar || material.name_en || material.id) : (material.name_en || material.name_ar || material.id);
}

function getPricingModeLabel(mode, t) {
  return mode === "perPack" ? t("pricingModePerPack") : t("pricingModePerUnit");
}

function getDeliveryModeLabel(mode, t) {
  if (mode === "merchant_free") return t("variantDeliveryModeMerchantFree");
  if (mode === "included_in_price") return t("variantDeliveryModeIncludedInPrice");
  return t("variantDeliveryModeCustomerSeparate");
}

function getDeliveryBasisLabel(basis, t) {
  return basis === "perUnit" ? t("variantDeliveryBasisPerUnit") : t("variantDeliveryBasisPerOrder");
}

export function exportCsv({ project, products, materialsLibrary, locale, t }) {
  const lines = [];
  lines.push([t("exportType"), t("exportProduct"), t("exportField"), t("exportValue")].map(csvEscape).join(","));

  lines.push([t("exportSettings"), "-", t("exportCurrency"), project.currencyCode].map(csvEscape).join(","));
  lines.push([t("exportSettings"), "-", t("exportHourlyRate"), project.hourlyRate].map(csvEscape).join(","));
  lines.push([t("exportSettings"), "-", t("exportExpectedUnits"), project.expectedMonthlyUnits].map(csvEscape).join(","));
  lines.push([t("exportSettings"), "-", t("exportExpectedSales"), project.expectedMonthlySales].map(csvEscape).join(","));

  products.forEach((product) => {
    const metrics = buildProductMetrics(project, product, materialsLibrary);
    lines.push([t("exportProduct"), product.name, t("metricTrueUnitCost"), formatMoney(metrics.trueUnitCost, project.currencyCode, locale)].map(csvEscape).join(","));
    lines.push([t("exportProduct"), product.name, t("metricSuggestedPrice"), formatMoney(metrics.suggestedPrice, project.currencyCode, locale)].map(csvEscape).join(","));

    metrics.recipeBreakdown.forEach((item) => {
      const materialLabel = item.materialName === "Unknown" ? t("unknownMaterial") : item.materialName;
      lines.push([
        t("exportRecipeRow"),
        product.name,
        `${materialLabel} (${item.qtyPerUnit})`,
        formatMoney(item.componentCost, project.currencyCode, locale)
      ].map(csvEscape).join(","));
    });

    metrics.variantMetrics.forEach((variant) => {
      lines.push([
        t("exportVariantRow"),
        `${product.name} / ${variant.name}`,
        t("metricSuggestedPrice"),
        formatMoney(variant.suggestedPriceVariant, project.currencyCode, locale)
      ].map(csvEscape).join(","));
      lines.push([
        t("exportVariantRow"),
        `${product.name} / ${variant.name}`,
        t("deliveryLabel"),
        variant.hasDelivery
          ? `${getDeliveryModeLabel(variant.deliveryPricingMode, t)} | ${getDeliveryBasisLabel(variant.deliveryCostBasis, t)} | ${formatMoney(variant.deliveryCost, project.currencyCode, locale)}`
          : t("variantDeliveryNone")
      ].map(csvEscape).join(","));
    });
  });

  downloadBlob(lines.join("\n"), "pricingplus-report.csv", "text/csv;charset=utf-8");
}

export function exportXlsx({ project, products, materialsLibrary, locale, t }) {
  if (!window.XLSX) {
    throw new Error("EXPORT_LIBRARY_MISSING");
  }

  const workbook = window.XLSX.utils.book_new();

  const settingsRows = [
    [t("exportField"), t("exportValue")],
    [t("exportCurrency"), project.currencyCode],
    [t("exportHourlyRate"), project.hourlyRate],
    [t("exportExpectedUnits"), project.expectedMonthlyUnits],
    [t("exportExpectedSales"), project.expectedMonthlySales],
    [t("safetyMarginPercentLabel"), project.safetyMarginPercent],
    [t("materialPricingModeLabel"), project.pricingMode],
    [t("pricingSimpleLabel"), project.pricingPercent]
  ];

  const summaryRows = [[t("exportProduct"), t("metricTrueUnitCost"), t("metricMinimumAcceptablePrice"), t("metricSuggestedPrice"), t("metricBreakEvenUnits"), t("metricMonthlyProfit")]];
  const materialsLibraryRows = [[t("exportField"), t("materialNameArLabel"), t("materialPricingModeLabel"), t("metricTrueUnitCost"), t("materialWasteDefaultLabel")]];
  const recipeRows = [[t("exportProduct"), t("pdfRecipeMaterial"), t("pdfRecipeQty"), t("pdfRecipeCost")]];
  const variantRows = [[
    t("exportProduct"),
    t("pdfVariantName"),
    t("variantUnitsLabel"),
    t("pdfVariantCost"),
    t("metricMinimumAcceptablePrice"),
    t("pdfVariantSuggested"),
    t("pdfVariantBreakEven"),
    t("exportDeliveryHas"),
    t("exportDeliveryMode"),
    t("exportDeliveryCost"),
    t("exportDeliveryBasis")
  ]];

  materialsLibrary.forEach((material) => {
    materialsLibraryRows.push([
      material.id,
      getMaterialName(material, locale),
      getPricingModeLabel(material.pricingMode, t),
      calculateMaterialBaseUnitCost(material),
      material.wasteDefaultPercent || 0
    ]);
  });

  products.forEach((product) => {
    const metrics = buildProductMetrics(project, product, materialsLibrary);
    summaryRows.push([
      product.name,
      formatMoney(metrics.trueUnitCost, project.currencyCode, locale),
      formatMoney(metrics.minimumAcceptablePrice, project.currencyCode, locale),
      formatMoney(metrics.suggestedPrice, project.currencyCode, locale),
      Number.isFinite(metrics.breakEvenUnits) ? formatNumber(metrics.breakEvenUnits, locale, 2) : t("breakEvenImpossible"),
      formatMoney(metrics.monthlyProfit, project.currencyCode, locale)
    ]);

    metrics.recipeBreakdown.forEach((item) => {
      const materialLabel = item.materialName === "Unknown" ? t("unknownMaterial") : item.materialName;
      recipeRows.push([
        product.name,
        materialLabel,
        item.qtyPerUnit,
        item.componentCost
      ]);
    });

    metrics.variantMetrics.forEach((variant) => {
      variantRows.push([
        product.name,
        variant.name,
        variant.unitsPerVariant,
        variant.variantUnitCost,
        variant.minimumAcceptablePriceVariant,
        variant.suggestedPriceVariant,
        Number.isFinite(variant.breakEvenUnitsVariant) ? variant.breakEvenUnitsVariant : t("breakEvenImpossible"),
        variant.hasDelivery ? t("yesLabel") : t("noLabel"),
        variant.hasDelivery ? getDeliveryModeLabel(variant.deliveryPricingMode, t) : "-",
        variant.hasDelivery ? variant.deliveryCost : 0,
        variant.hasDelivery ? getDeliveryBasisLabel(variant.deliveryCostBasis, t) : "-"
      ]);
    });
  });

  window.XLSX.utils.book_append_sheet(workbook, window.XLSX.utils.aoa_to_sheet(settingsRows), t("sheetSettings"));
  window.XLSX.utils.book_append_sheet(workbook, window.XLSX.utils.aoa_to_sheet(summaryRows), t("sheetProductsSummary"));
  window.XLSX.utils.book_append_sheet(workbook, window.XLSX.utils.aoa_to_sheet(materialsLibraryRows), t("sheetMaterialsLibrary"));
  window.XLSX.utils.book_append_sheet(workbook, window.XLSX.utils.aoa_to_sheet(recipeRows), t("sheetProductRecipes"));
  window.XLSX.utils.book_append_sheet(workbook, window.XLSX.utils.aoa_to_sheet(variantRows), t("sheetSalesVariants"));

  window.XLSX.writeFile(workbook, "pricingplus-report.xlsx");
}

export async function exportPdf({ project, product, metrics, materialsLibrary, locale, t }) {
  if (!window.html2pdf) {
    throw new Error("EXPORT_LIBRARY_MISSING");
  }

  const wrapper = document.createElement("section");
  wrapper.style.padding = "20px";
  wrapper.style.fontFamily = locale === "ar" ? "Tajawal, Tahoma, sans-serif" : "Segoe UI, Arial, sans-serif";
  wrapper.dir = locale === "ar" ? "rtl" : "ltr";

  const recipeRows = metrics.recipeBreakdown.map((item) => {
    const materialLabel = item.materialName === "Unknown" ? t("unknownMaterial") : item.materialName;
    return `<tr><td style=\"border:1px solid #ddd; padding:6px;\">${materialLabel}</td><td style=\"border:1px solid #ddd; padding:6px;\">${formatNumber(item.qtyPerUnit, locale, 3)}</td><td style=\"border:1px solid #ddd; padding:6px;\">${formatMoney(item.componentCost, project.currencyCode, locale)}</td></tr>`;
  }).join("");

  const variantRows = metrics.variantMetrics.map((variant) => {
    const deliveryInfo = variant.hasDelivery
      ? `${getDeliveryModeLabel(variant.deliveryPricingMode, t)} / ${getDeliveryBasisLabel(variant.deliveryCostBasis, t)} / ${formatMoney(variant.deliveryCost, project.currencyCode, locale)}`
      : t("variantDeliveryNone");
    return `<tr><td style=\"border:1px solid #ddd; padding:6px;\">${variant.name}</td><td style=\"border:1px solid #ddd; padding:6px;\">${formatMoney(variant.variantUnitCost, project.currencyCode, locale)}</td><td style=\"border:1px solid #ddd; padding:6px;\">${formatMoney(variant.suggestedPriceVariant, project.currencyCode, locale)}</td><td style=\"border:1px solid #ddd; padding:6px;\">${Number.isFinite(variant.breakEvenUnitsVariant) ? formatNumber(variant.breakEvenUnitsVariant, locale, 2) : t("breakEvenImpossible")}</td><td style=\"border:1px solid #ddd; padding:6px;\">${deliveryInfo}</td></tr>`;
  }).join("");

  wrapper.innerHTML = `
    <h1 style="margin:0 0 8px;">${t("pdfTitle")}</h1>
    <p style="margin:0 0 14px;">${product.name}</p>
    <table style="width:100%; border-collapse:collapse; margin-bottom: 16px;">
      <tbody>
        <tr><td style="border:1px solid #ddd; padding:8px;">${t("metricTrueUnitCost")}</td><td style="border:1px solid #ddd; padding:8px;">${formatMoney(metrics.trueUnitCost, project.currencyCode, locale)}</td></tr>
        <tr><td style="border:1px solid #ddd; padding:8px;">${t("metricMinimumAcceptablePrice")}</td><td style="border:1px solid #ddd; padding:8px;">${formatMoney(metrics.minimumAcceptablePrice, project.currencyCode, locale)}</td></tr>
        <tr><td style="border:1px solid #ddd; padding:8px;">${t("metricSuggestedPrice")}</td><td style="border:1px solid #ddd; padding:8px;">${formatMoney(metrics.suggestedPrice, project.currencyCode, locale)}</td></tr>
      </tbody>
    </table>

    <h3 style="margin: 10px 0 6px;">${t("pdfRecipeTitle")}</h3>
    <table style="width:100%; border-collapse:collapse; margin-bottom: 16px;">
      <thead><tr><th style="border:1px solid #ddd; padding:6px;">${t("pdfRecipeMaterial")}</th><th style="border:1px solid #ddd; padding:6px;">${t("pdfRecipeQty")}</th><th style="border:1px solid #ddd; padding:6px;">${t("pdfRecipeCost")}</th></tr></thead>
      <tbody>${recipeRows}</tbody>
    </table>

    <h3 style="margin: 10px 0 6px;">${t("pdfVariantsTitle")}</h3>
    <table style="width:100%; border-collapse:collapse;">
      <thead><tr><th style="border:1px solid #ddd; padding:6px;">${t("pdfVariantName")}</th><th style="border:1px solid #ddd; padding:6px;">${t("pdfVariantCost")}</th><th style="border:1px solid #ddd; padding:6px;">${t("pdfVariantSuggested")}</th><th style="border:1px solid #ddd; padding:6px;">${t("pdfVariantBreakEven")}</th><th style="border:1px solid #ddd; padding:6px;">${t("deliveryLabel")}</th></tr></thead>
      <tbody>${variantRows}</tbody>
    </table>
  `;

  wrapper.style.position = "fixed";
  wrapper.style.insetInlineStart = "-9999px";
  wrapper.style.top = "0";
  document.body.append(wrapper);

  try {
    await window.html2pdf().from(wrapper).set({
      margin: 10,
      filename: `pricingplus-${product.name}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
    }).save();
  } finally {
    wrapper.remove();
  }
}
