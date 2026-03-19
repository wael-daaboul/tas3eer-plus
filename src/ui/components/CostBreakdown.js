import { t } from "../../i18n/localization.js";

/**
 * CostBreakdown Component
 * Displays the detailed components of the cost (Materials, Labor, Fixed, etc.).
 * 
 * @param {Object} props - Component properties
 * @param {Object} props.metrics - Calculated metrics object
 * @param {Object} props.project - Project state object
 * @param {Function} props.formatMoney - Currency formatting helper
 * @param {Function} props.escapeHTML - HTML escaping helper
 * @param {Function} props.normalizeLegacyLabel - Label normalization helper
 * @param {String} props.locale - The current locale (ar/en)
 */
export function CostBreakdown(props) {
  const { 
    metrics, project, formatMoney, escapeHTML, normalizeLegacyLabel, locale 
  } = props;
  
  const breakdownSection = document.createElement("div");
  breakdownSection.className = "breakdown-section";
  
  const detailsTitle = document.createElement("h4");
  detailsTitle.textContent = t("howCalculatedBtn");
  breakdownSection.append(detailsTitle);

  const list = document.createElement("ul");
  list.className = "calculation-details-list";
  list.innerHTML = `
    <li>${escapeHTML(t("metricMaterialsCost"))}: ${escapeHTML(formatMoney(metrics.materialsCost, project.currencyCode, locale))}</li>
    <li>${escapeHTML(t("metricLaborCost"))}: ${escapeHTML(formatMoney(metrics.laborCost, project.currencyCode, locale))}</li>
    <li>${escapeHTML(t("metricEnergyCost"))}: ${escapeHTML(formatMoney(metrics.energyCost, project.currencyCode, locale))}</li>
    <li>${escapeHTML(t("metricFixedShare"))}: ${escapeHTML(formatMoney(metrics.fixedPerUnit, project.currencyCode, locale))}</li>
    <li>${escapeHTML(t("metricVariableCost"))}: ${escapeHTML(formatMoney(metrics.variableCostPerUnit, project.currencyCode, locale))}</li>
    <li>${escapeHTML(t("deliveryLabel"))}: ${escapeHTML(
      metrics.variantMetrics.some((variant) => variant.hasDelivery)
        ? metrics.variantMetrics.map((variant) => {
            const name = normalizeLegacyLabel(variant.name, "defaultVariantName");
            if (!variant.hasDelivery) return `${name}: ${t("variantDeliveryNone")}`;
            if (!variant.deliveryAffectsProfit) return `${name}: ${t("deliverySeparateInfo")}`;
            return `${name}: ${formatMoney(variant.deliveryCostApplied, project.currencyCode, locale)}`;
          }).join(" | ")
        : "-"
    )}</li>
  `;
  breakdownSection.append(list);

  const hint = document.createElement("p");
  hint.className = "muted";
  hint.style.marginTop = "8px";
  hint.textContent = t("variableCostComponents");
  breakdownSection.append(hint);

  return breakdownSection;
}
