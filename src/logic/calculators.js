export function calculateLaborCost(laborHours, hourlyRate) {
    return laborHours * hourlyRate;
  }
  
  export function calculateOverheadPerUnit(monthlyFixed, monthlyUnits) {
    if (monthlyUnits <= 0) return 0;
    return monthlyFixed / monthlyUnits;
  }
  
  export function calculateTrueUnitCost(materialsCost, laborCost, overheadPerUnit) {
    return materialsCost + laborCost + overheadPerUnit;
  }
  
  export function calculateMinimumPrice(trueUnitCost) {
    return trueUnitCost; // بدون ربح
  }
  
  /**
   * هامش ربح كنسبة من سعر البيع:
   * selling = cost / (1 - margin)
   * مثال: cost=100, margin=20% => selling=125
   */
  export function calculateSuggestedPriceByMarginOnSelling(trueUnitCost, marginPercent) {
    const m = marginPercent / 100;
    if (m >= 1) return Infinity;
    if (m < 0) return trueUnitCost;
    return trueUnitCost / (1 - m);
  }
  
  /**
   * نقطة التعادل (عدد الوحدات) = المصاريف الثابتة / (الربح لكل وحدة)
   * الربح لكل وحدة = سعر البيع - التكلفة المتغيرة للوحدة
   */
  export function calculateBreakEvenUnits(monthlyFixed, sellingPrice, variableCostPerUnit) {
    const profitPerUnit = sellingPrice - variableCostPerUnit;
    if (profitPerUnit <= 0) return Infinity;
    return monthlyFixed / profitPerUnit;
  }
  
  export function calculateMonthlyProfit(monthlyUnits, sellingPrice, variableCostPerUnit, monthlyFixed) {
    const revenue = monthlyUnits * sellingPrice;
    const variableCosts = monthlyUnits * variableCostPerUnit;
    return revenue - variableCosts - monthlyFixed;
  }
  