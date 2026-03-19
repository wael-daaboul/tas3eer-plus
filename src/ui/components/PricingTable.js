import { t } from "../../i18n/localization.js";

/**
 * PricingTable Component
 * Renders the monthly scenarios table (Expected Sales, Break-even, Contribution).
 * 
 * @param {Object} props - Component properties
 * @param {Object} props.metrics - Calculated metrics object
 * @param {Object} props.project - Project state object
 * @param {Function} props.formatMoney - Currency formatting helper
 * @param {Function} props.formatNumber - Number formatting helper
 * @param {Function} props.escapeHTML - HTML escaping helper
 * @param {String} props.locale - The current locale (ar/en)
 */
export function PricingTable(props) {
  const { 
    metrics, project, formatMoney, formatNumber, escapeHTML, locale 
  } = props;
  
  const section = document.createElement("section");
  section.className = "monthly-table-section";
  
  const title = document.createElement("h3");
  title.textContent = t("monthlyTableTitle");
  section.append(title);

  if (project.salesUndefined) {
    const warn = document.createElement("p");
    warn.className = "warn-note";
    warn.textContent = t("salesUndefinedWarning");
    section.append(warn);
  }

  const table = document.createElement("table");
  table.className = "monthly-table";
  table.innerHTML = `
    <thead>
      <tr>
        <th>${escapeHTML(t("monthlyColumnScenario"))}</th>
        <th>${escapeHTML(t("monthlyColumnValue"))}</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${escapeHTML(t("monthlyAtExpectedSales"))}</td>
        <td>${escapeHTML(formatMoney(metrics.monthlyProfit, project.currencyCode, locale))}</td>
      </tr>
      <tr>
        <td>${escapeHTML(t("monthlyAtBreakEven"))}</td>
        <td>${escapeHTML(Number.isFinite(metrics.breakEvenUnits) ? formatNumber(metrics.breakEvenUnits, locale, 2) : t("breakEvenImpossible"))}</td>
      </tr>
      <tr>
        <td>${escapeHTML(t("monthlyContribution"))}</td>
        <td>${escapeHTML(formatMoney(metrics.sellingPrice - metrics.variableCostPerUnit, project.currencyCode, locale))}</td>
      </tr>
    </tbody>
  `;
  section.append(table);

  return section;
}
