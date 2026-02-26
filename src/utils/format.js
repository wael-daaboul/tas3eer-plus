export function formatMoney(value, currencyCode, locale) {
  if (!Number.isFinite(value)) return "-";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 2
  }).format(value);
}

export function formatNumber(value, locale, digits = 2) {
  if (!Number.isFinite(value)) return "-";
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0
  }).format(value);
}

export function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
