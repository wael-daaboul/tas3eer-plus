export function formatCurrency(value, currency = "USD") {
    if (!Number.isFinite(value)) return "غير متاح";
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(value);
  }
  
  export function formatNumber(value, digits = 2) {
    if (!Number.isFinite(value)) return "غير متاح";
    return value.toFixed(digits);
  }
  
