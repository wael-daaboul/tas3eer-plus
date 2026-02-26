function toSafeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clampNonNegative(value) {
  return Math.max(0, toSafeNumber(value));
}

export function calculateMaterialBaseUnitCost(material) {
  if (!material) return 0;
  if (material.pricingMode === "perPack") {
    const packPrice = clampNonNegative(material.packPrice);
    const packSize = Math.max(1e-9, clampNonNegative(material.packSize));
    return packPrice / packSize;
  }
  return clampNonNegative(material.unitPrice);
}

export function calculateMaterialsCost(materials = [], wastePercent = 0) {
  const base = materials.reduce((sum, item) => {
    const qty = clampNonNegative(item.qty);
    const unitCost = clampNonNegative(item.unitCost);
    return sum + (qty * unitCost);
  }, 0);

  const wasteMultiplier = 1 + (clampNonNegative(wastePercent) / 100);
  return base * wasteMultiplier;
}

export function calculateRecipeMaterialsCost(recipe = [], materialsLibrary = []) {
  const materialsById = new Map(materialsLibrary.map((item) => [item.id, item]));

  const breakdown = recipe.map((component) => {
    const material = materialsById.get(component.materialId);
    if (!material) {
      return {
        materialId: component.materialId,
        materialName: "Unknown",
        qtyPerUnit: clampNonNegative(component.qtyPerUnit),
        baseUnitCost: 0,
        wastePercent: 0,
        componentCost: 0
      };
    }

    const qtyPerUnit = clampNonNegative(component.qtyPerUnit);
    const baseUnitCost = calculateMaterialBaseUnitCost(material);
    const wastePercent = component.overrideWastePercent == null
      ? clampNonNegative(material.wasteDefaultPercent)
      : clampNonNegative(component.overrideWastePercent);

    const rawCost = qtyPerUnit * baseUnitCost;
    const componentCost = rawCost * (1 + wastePercent / 100);

    return {
      materialId: material.id,
      materialName: material.name_en || material.name_ar || material.name || material.id,
      qtyPerUnit,
      baseUnitCost,
      wastePercent,
      componentCost
    };
  });

  const total = breakdown.reduce((sum, item) => sum + item.componentCost, 0);
  return { total, breakdown };
}

export function calculateLaborCost(hourlyRate, laborMinutes) {
  const rate = clampNonNegative(hourlyRate);
  const minutes = clampNonNegative(laborMinutes);
  return (rate / 60) * minutes;
}

export function calculateEnergyCost(energy) {
  if (!energy) return 0;
  const kw = clampNonNegative(energy.kw);
  const minutes = clampNonNegative(energy.minutes);
  const pricePerKwh = clampNonNegative(energy.pricePerKwh);
  return kw * (minutes / 60) * pricePerKwh;
}

export function calculateDepreciationMonthly(equipmentDepreciation = []) {
  return equipmentDepreciation.reduce((sum, item) => {
    const purchasePrice = clampNonNegative(item.purchasePrice);
    const lifetimeMonths = Math.max(1, toSafeNumber(item.lifetimeMonths, 1));
    return sum + (purchasePrice / lifetimeMonths);
  }, 0);
}

export function calculateFixedMonthly(monthlyFixedCosts = [], depreciationMonthly = 0) {
  const baseFixed = monthlyFixedCosts.reduce((sum, item) => {
    const amount = clampNonNegative(item.amount);
    return sum + amount;
  }, 0);

  return baseFixed + clampNonNegative(depreciationMonthly);
}

export function calculateFixedPerUnit(fixedMonthly, expectedMonthlyUnits) {
  const fixed = clampNonNegative(fixedMonthly);
  const units = Math.max(1, Math.floor(toSafeNumber(expectedMonthlyUnits, 1)));
  return fixed / units;
}

export function calculateTrueUnitCost(materialsCost, laborCost, energyCost, fixedPerUnit) {
  return [materialsCost, laborCost, energyCost, fixedPerUnit].reduce((sum, value) => {
    return sum + clampNonNegative(value);
  }, 0);
}

export function calculateMinimumAcceptablePrice(trueUnitCost, safetyMarginPercent = 0) {
  const safetyMargin = clampNonNegative(safetyMarginPercent) / 100;
  return clampNonNegative(trueUnitCost) * (1 + safetyMargin);
}

export function calculateSuggestedPrice(trueUnitCost, pricingMode, percent) {
  const cost = clampNonNegative(trueUnitCost);
  const ratio = clampNonNegative(percent) / 100;

  if (pricingMode === "margin") {
    if (ratio >= 1) return Infinity;
    return cost / (1 - ratio);
  }

  return cost * (1 + ratio);
}

export function calculateVariableCostPerUnit(materialsCost, laborCost, energyCost) {
  return [materialsCost, laborCost, energyCost].reduce((sum, value) => {
    return sum + clampNonNegative(value);
  }, 0);
}

export function calculateBreakEvenUnits(fixedMonthly, sellingPrice, variableCostPerUnit) {
  const fixed = clampNonNegative(fixedMonthly);
  const contribution = clampNonNegative(sellingPrice) - clampNonNegative(variableCostPerUnit);
  if (contribution <= 0) return Infinity;
  return fixed / contribution;
}

export function calculateMonthlyProfit(sellingPrice, trueUnitCost, expectedMonthlySales) {
  const units = clampNonNegative(expectedMonthlySales);
  const unitProfit = clampNonNegative(sellingPrice) - clampNonNegative(trueUnitCost);
  return unitProfit * units;
}

export function buildVariantMetrics({
  project,
  product,
  variant,
  trueUnitCost,
  variableCostPerUnit,
  fixedMonthly
}) {
  const unitsPerVariant = Math.max(1, Math.floor(toSafeNumber(variant.unitsPerVariant, 1)));
  const extraPackagingCost = clampNonNegative(variant.extraPackagingCost);
  const hasDelivery = Boolean(variant.hasDelivery);
  const deliveryPricingMode = variant.deliveryPricingMode === "merchant_free"
    ? "merchant_free"
    : (variant.deliveryPricingMode === "included_in_price" ? "included_in_price" : "customer_separate");
  const deliveryCostBasis = variant.deliveryCostBasis === "perUnit" ? "perUnit" : "perOrder";
  const deliveryCost = clampNonNegative(variant.deliveryCost);
  const deliveryCostApplied = !hasDelivery
    ? 0
    : (deliveryCostBasis === "perUnit" ? deliveryCost * unitsPerVariant : deliveryCost);
  const deliveryAffectsProfit = hasDelivery && deliveryPricingMode !== "customer_separate";

  const variantBaseCost = (trueUnitCost * unitsPerVariant) + extraPackagingCost;
  const variableCostBase = (variableCostPerUnit * unitsPerVariant) + extraPackagingCost;
  const variantUnitCost = variantBaseCost + (deliveryAffectsProfit ? deliveryCostApplied : 0);
  const variableCostVariant = variableCostBase + (deliveryAffectsProfit ? deliveryCostApplied : 0);

  const targetPercent = variant.pricingTargetPercent == null
    ? project.pricingPercent
    : clampNonNegative(variant.pricingTargetPercent);

  const minimumAcceptablePriceVariant = calculateMinimumAcceptablePrice(variantUnitCost, project.safetyMarginPercent);
  const suggestedPriceVariant = calculateSuggestedPrice(variantUnitCost, project.pricingMode, targetPercent);

  const sellingPriceVariant = clampNonNegative(variant.sellingPriceOverride) > 0
    ? clampNonNegative(variant.sellingPriceOverride)
    : suggestedPriceVariant;

  const breakEvenUnitsVariant = calculateBreakEvenUnits(fixedMonthly, sellingPriceVariant, variableCostVariant);
  const monthlySales = variant.expectedMonthlySalesVariant == null
    ? project.expectedMonthlySales
    : clampNonNegative(variant.expectedMonthlySalesVariant);

  const monthlyProfitVariant = calculateMonthlyProfit(sellingPriceVariant, variantUnitCost, monthlySales);

  return {
    id: variant.id,
    name: variant.name,
    unitsPerVariant,
    extraPackagingCost,
    hasDelivery,
    deliveryPricingMode,
    deliveryCost,
    deliveryCostBasis,
    deliveryCostApplied,
    deliveryAffectsProfit,
    variantBaseCost,
    pricingTargetPercent: targetPercent,
    variantUnitCost,
    variableCostVariant,
    minimumAcceptablePriceVariant,
    suggestedPriceVariant,
    sellingPriceVariant,
    breakEvenUnitsVariant,
    expectedMonthlySalesVariant: monthlySales,
    monthlyProfitVariant
  };
}

export function buildProductMetrics(project, product, materialsLibrary = [], sellingPriceOverride = null) {
  const depreciationMonthly = calculateDepreciationMonthly(project.equipmentDepreciation);
  const fixedMonthly = calculateFixedMonthly(project.monthlyFixedCosts, depreciationMonthly);
  const fixedPerUnit = calculateFixedPerUnit(fixedMonthly, project.expectedMonthlyUnits);

  let recipeCost = { total: 0, breakdown: [] };
  if (Array.isArray(product.recipe) && product.recipe.length) {
    recipeCost = calculateRecipeMaterialsCost(product.recipe, materialsLibrary);
  } else {
    recipeCost.total = calculateMaterialsCost(product.materials || [], product.wastePercent);
  }

  const materialsCost = recipeCost.total;
  const laborCost = calculateLaborCost(project.hourlyRate, product.laborMinutes);
  const energyCost = calculateEnergyCost(product.energy);
  const variableCostPerUnit = calculateVariableCostPerUnit(materialsCost, laborCost, energyCost);
  const trueUnitCost = calculateTrueUnitCost(materialsCost, laborCost, energyCost, fixedPerUnit);
  const minimumAcceptablePrice = calculateMinimumAcceptablePrice(trueUnitCost, project.safetyMarginPercent);
  const suggestedPrice = calculateSuggestedPrice(trueUnitCost, project.pricingMode, project.pricingPercent);
  const sellingPrice = sellingPriceOverride == null || sellingPriceOverride <= 0
    ? (clampNonNegative(product.manualSellingPrice) > 0 ? clampNonNegative(product.manualSellingPrice) : suggestedPrice)
    : clampNonNegative(sellingPriceOverride);

  const breakEvenUnits = calculateBreakEvenUnits(fixedMonthly, sellingPrice, variableCostPerUnit);
  const monthlyProfit = calculateMonthlyProfit(sellingPrice, trueUnitCost, project.expectedMonthlySales);

  const variants = Array.isArray(product.variants) && product.variants.length
    ? product.variants
    : [{
      id: `${product.id || "product"}-default-variant`,
      name: product.unitName || "Unit",
      unitsPerVariant: 1,
      extraPackagingCost: 0,
      sellingPriceOverride: sellingPriceOverride ?? product.manualSellingPrice ?? 0,
      pricingTargetPercent: null
    }];

  const variantMetrics = variants.map((variant) => buildVariantMetrics({
    project,
    product,
    variant,
    trueUnitCost,
    variableCostPerUnit,
    fixedMonthly
  }));

  return {
    materialsCost,
    recipeBreakdown: recipeCost.breakdown,
    laborCost,
    energyCost,
    depreciationMonthly,
    fixedMonthly,
    fixedPerUnit,
    variableCostPerUnit,
    trueUnitCost,
    minimumAcceptablePrice,
    suggestedPrice,
    sellingPrice,
    breakEvenUnits,
    monthlyProfit,
    variantMetrics
  };
}

export function getProfitStatus(metrics) {
  const minimum = metrics.minimumAcceptablePriceVariant ?? metrics.minimumAcceptablePrice;
  const selling = metrics.sellingPriceVariant ?? metrics.sellingPrice;
  const monthly = metrics.monthlyProfitVariant ?? metrics.monthlyProfit;
  const suggested = metrics.suggestedPriceVariant ?? metrics.suggestedPrice;

  if (selling < minimum || monthly < 0) {
    return "red";
  }

  if (selling < suggested || monthly === 0) {
    return "yellow";
  }

  return "green";
}
