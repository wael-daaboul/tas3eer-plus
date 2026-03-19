import { t } from "../../i18n/localization.js";

/**
 * ComparisonTable Component
 * Generates the comparison rows and variants overview for multiple products.
 * 
 * @param {Object} props - Component properties
 * @param {Array} props.productsMetrics - Selected products data
 * @param {Function} props.formatMoney - Currency formatting helper
 * @param {Function} props.formatNumber - Number formatting helper
 * @param {Function} props.escapeHTML - HTML escaping helper
 * @param {Function} props.normalizeLegacyLabel - Label normalization helper
 * @param {Function} props.getProfitStatus - Profit status helper
 * @param {Function} props.getDeltaLine - Delta line helper
 * @param {String} props.currencyCode - The currency code
 * @param {String} props.locale - The current locale (ar/en)
 */
export function ComparisonTable(props) {
  const { 
    productsMetrics, formatMoney, formatNumber, escapeHTML, 
    normalizeLegacyLabel, getProfitStatus, getDeltaLine, 
    currencyCode, locale 
  } = props;
  
  const container = document.createElement("div");
  container.className = "products-comparison-container";

  const tableTitle = document.createElement("h3");
  tableTitle.textContent = t("productsComparisonTitle");
  container.append(tableTitle);

  productsMetrics.forEach(({ product: productItem, metrics: productMetrics }) => {
    const row = document.createElement("article");
    row.className = "product-row";

    const productStatus = getProfitStatus(productMetrics.variantMetrics[0] || productMetrics);
    
    // Generate variant details inner HTML
    const variantDetails = productMetrics.variantMetrics.map((variantMetrics) => `
      <div class="product-variant-row">
        <div class="metric-head">
          <strong>${escapeHTML(normalizeLegacyLabel(variantMetrics.name, "defaultVariantName"))}</strong>
          <span class="badge scope-badge">${escapeHTML(t("perMethodBadge"))}</span>
        </div>
        <div class="product-variant-grid">
          <div>${escapeHTML(t("metricTrueUnitCost"))}: <strong>${escapeHTML(formatMoney(variantMetrics.variantUnitCost, currencyCode, locale))}</strong></div>
          <div>${escapeHTML(t("metricMinimumAcceptablePrice"))}: <strong>${escapeHTML(formatMoney(variantMetrics.minimumAcceptablePriceVariant, currencyCode, locale))}</strong></div>
          <div>${escapeHTML(t("metricSuggestedPrice"))}: <strong>${escapeHTML(formatMoney(variantMetrics.suggestedPriceVariant, currencyCode, locale))}</strong></div>
          <div>${escapeHTML(t("metricBreakEvenUnits"))}: <strong>${escapeHTML(Number.isFinite(variantMetrics.breakEvenUnitsVariant) ? formatNumber(variantMetrics.breakEvenUnitsVariant, locale, 2) : t("breakEvenImpossible"))}</strong></div>
        </div>
        <div class="delta-line">${escapeHTML(getDeltaLine(variantMetrics))}</div>
      </div>
    `).join("");

    row.innerHTML = `
      <div class="product-row-head">
        <h4>${escapeHTML(productItem.name)}</h4>
        <span class="badge ${escapeHTML(productStatus)}">${escapeHTML(t(productStatus === "green" ? "statusGreen" : productStatus === "yellow" ? "statusYellow" : "statusRed"))}</span>
      </div>
      <div class="product-row-grid">
        <div><span class="muted">${escapeHTML(t("metricTrueUnitCost"))}</span><strong>${escapeHTML(formatMoney(productMetrics.trueUnitCost, currencyCode, locale))}</strong></div>
        <div><span class="muted">${escapeHTML(t("metricMinimumAcceptablePrice"))}</span><strong>${escapeHTML(formatMoney(productMetrics.minimumAcceptablePrice, currencyCode, locale))}</strong></div>
        <div><span class="muted">${escapeHTML(t("metricSuggestedPrice"))}</span><strong>${escapeHTML(formatMoney(productMetrics.suggestedPrice, currencyCode, locale))}</strong></div>
        <div><span class="muted">${escapeHTML(t("metricBreakEvenUnits"))}</span><strong>${escapeHTML(Number.isFinite(productMetrics.breakEvenUnits) ? formatNumber(productMetrics.breakEvenUnits, locale, 2) : t("breakEvenImpossible"))}</strong></div>
        <div><span class="muted">${escapeHTML(t("metricMonthlyProfit"))}</span><strong>${escapeHTML(formatMoney(productMetrics.monthlyProfit, currencyCode, locale))}</strong></div>
      </div>
      <details class="product-variant-details">
        <summary>${escapeHTML(t("variantMethodDetails"))}</summary>
        <div class="product-variant-list">${variantDetails}</div>
      </details>
    `;
    
    container.append(row);
  });
  
  return container;
}
