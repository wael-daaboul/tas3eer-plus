import { t } from "../../i18n/localization.js";

/**
 * SummarySection Component
 * Displays the high-level profit and products summary for multiple products.
 * 
 * @param {Object} props - Component properties
 * @param {Array} props.productsMetrics - Array of product metrics
 * @param {Number} props.totalMonthlyProfit - Sum of profits
 * @param {Number|null} props.totalRevenue - Sum of revenue (if available)
 * @param {Function} props.formatMoney - Currency formatting helper
 * @param {Function} props.escapeHTML - HTML escaping helper
 * @param {String} props.currencyCode - The currency code
 * @param {String} props.locale - The current locale (ar/en)
 */
export function SummarySection(props) {
  const { 
    productsMetrics, totalMonthlyProfit, totalRevenue, 
    formatMoney, escapeHTML, currencyCode, locale 
  } = props;
  
  const container = document.createElement("div");
  container.className = "all-products-summary-container";
  
  container.innerHTML = `
    <div class="summary-head">
      <div class="summary-title">${escapeHTML(t("allProductsSummaryTitle"))}</div>
      <div class="summary-subtitle">${escapeHTML(t("allProductsSummarySubtitle"))}</div>
    </div>
    <div class="summary-metrics">
      <div class="metric">
        <div class="name">${escapeHTML(t("totalProducts"))}</div>
        <div class="value">${escapeHTML(productsMetrics.length)}</div>
      </div>
      <div class="metric">
        <div class="name">${escapeHTML(t("totalExpectedProfit"))}</div>
        <div class="value" style="color:var(--color-primary)">
          ${escapeHTML(formatMoney(totalMonthlyProfit, currencyCode, locale))}
        </div>
      </div>
      ${totalRevenue === null
        ? ""
        : `<div class="metric">
            <div class="name">${escapeHTML(t("totalExpectedRevenue"))}</div>
            <div class="value">${escapeHTML(formatMoney(totalRevenue, currencyCode, locale))}</div>
          </div>`}
    </div>
  `;
  
  return container;
}
