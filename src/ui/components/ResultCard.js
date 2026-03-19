import { t } from "../../i18n/localization.js";

/**
 * ResultCard Component
 * Displays the final price, taxes, wholesale discount, and other metrics for a product variant.
 * 
 * @param {Object} props - Component properties
 * @param {Object} props.variant - The variant metrics object
 * @param {Number} props.taxRate - The tax rate percentage
 * @param {Function} props.formatMoney - Currency formatting helper
 * @param {Function} props.formatNumber - Number formatting helper
 * @param {Function} props.escapeHTML - HTML escaping helper
 * @param {Function} props.calculatePriceWithTax - Tax calculation helper
 * @param {Function} props.getProfitStatus - Profit status helper
 * @param {Function} props.getDeltaLine - Delta line summary helper
 * @param {Function} props.normalizeLegacyLabel - Label normalization helper
 * @param {String} props.currencyCode - The currency code
 * @param {String} props.locale - The current locale (ar/en)
 */
export function ResultCard(props) {
  const { 
    variant, taxRate, formatMoney, formatNumber, escapeHTML, 
    calculatePriceWithTax, getProfitStatus, getDeltaLine, 
    normalizeLegacyLabel, currencyCode, locale 
  } = props;
  
  const status = getProfitStatus(variant);
  
  let deliveryLine = t("variantDeliveryNone");
  if (variant.hasDelivery) {
    const modeKey = variant.deliveryPricingMode === "merchant_free"
      ? "variantDeliveryModeMerchantFree"
      : (variant.deliveryPricingMode === "included_in_price" ? "variantDeliveryModeIncludedInPrice" : "variantDeliveryModeCustomerSeparate");
    const basisKey = variant.deliveryCostBasis === "perUnit" ? "variantDeliveryBasisPerUnit" : "variantDeliveryBasisPerOrder";
    deliveryLine = `${t(modeKey)} • ${t(basisKey)} • ${formatMoney(variant.deliveryCost, currencyCode, locale)}`;
  }

  const deliveryCalcLine = variant.hasDelivery
    ? (variant.deliveryAffectsProfit
      ? `${t("metricDeliveryCost")}: ${formatMoney(variant.deliveryCostApplied, currencyCode, locale)}`
      : t("deliverySeparateInfo"))
    : t("variantDeliveryNone");

  const deltaLine = getDeltaLine(variant);

  const card = document.createElement("article");
  card.className = "metric";
  card.innerHTML = `
    <div class="metric-head">
      <div class="name">${escapeHTML(normalizeLegacyLabel(variant.name, "defaultVariantName"))}</div>
      <span class="badge scope-badge">${escapeHTML(t("perMethodBadge"))}</span>
    </div>
    
    <div class="results-main-metrics">
       <div>${escapeHTML(t("metricTrueUnitCost"))}: <strong>${escapeHTML(formatMoney(variant.variantUnitCost, currencyCode, locale))}</strong></div>
       <div>${escapeHTML(t("metricMinimumAcceptablePrice"))}: <strong>${escapeHTML(formatMoney(variant.minimumAcceptablePriceVariant, currencyCode, locale))}</strong></div>
       <div>${escapeHTML(t("metricSuggestedPrice"))}: <strong>${escapeHTML(formatMoney(variant.suggestedPriceVariant, currencyCode, locale))}</strong></div>
    </div>

    <div class="results-enhanced-pricing" style="margin: 12px 0; padding: 10px; background: rgba(var(--color-primary-rgb), 0.05); border-radius: 8px; border-inline-start: 4px solid var(--color-primary);">
       <div class="wholesale-line" style="color:var(--color-primary); font-weight:bold; margin-bottom: 4px;">
         ${escapeHTML(t("metricWholesalePrice"))}: <strong>${escapeHTML(formatMoney(variant.wholesalePriceVariant, currencyCode, locale))}</strong>
       </div>
       <div class="tax-line" style="font-weight: 600;">
         ${escapeHTML(t("priceInclTax"))}: <strong>${escapeHTML(formatMoney(calculatePriceWithTax(variant.suggestedPriceVariant, taxRate), currencyCode, locale))}</strong>
       </div>
    </div>

    <div class="results-secondary-metrics" style="font-size: 0.9em; opacity: 0.9;">
       <div>${escapeHTML(t("metricBreakEvenUnits"))}: <strong>${escapeHTML(Number.isFinite(variant.breakEvenUnitsVariant) ? formatNumber(variant.breakEvenUnitsVariant, locale, 2) : t("breakEvenImpossible"))}</strong></div>
       <div>${escapeHTML(t("metricExtraPackaging"))}: <strong>${escapeHTML(formatMoney(variant.extraPackagingCost, currencyCode, locale))}</strong></div>
       <div>${escapeHTML(t("deliveryLabel"))}: <strong>${escapeHTML(deliveryLine)}</strong></div>
       <div class="muted">${escapeHTML(deliveryCalcLine)}</div>
       <div class="delta-line">${escapeHTML(deltaLine)}</div>
    </div>

    <div class="badge ${escapeHTML(status)}" style="margin-top: 12px;">
      ${escapeHTML(t(status === "green" ? "statusGreen" : status === "yellow" ? "statusYellow" : "statusRed"))}
    </div>
  `;
  
  return card;
}
