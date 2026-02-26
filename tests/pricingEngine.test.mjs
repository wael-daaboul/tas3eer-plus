import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateMaterialBaseUnitCost,
  calculateRecipeMaterialsCost,
  calculateLaborCost,
  calculateEnergyCost,
  calculateDepreciationMonthly,
  calculateFixedMonthly,
  calculateFixedPerUnit,
  calculateTrueUnitCost,
  calculateMinimumAcceptablePrice,
  calculateSuggestedPrice,
  calculateBreakEvenUnits,
  calculateVariableCostPerUnit,
  calculateMonthlyProfit,
  buildProductMetrics
} from "../src/engine/pricingEngine.js";

function approxEqual(actual, expected, epsilon = 1e-9) {
  assert.ok(Math.abs(actual - expected) <= epsilon, `Expected ${actual} ≈ ${expected}`);
}

test("perPack material base unit cost", () => {
  const cost = calculateMaterialBaseUnitCost({ pricingMode: "perPack", packPrice: 10, packSize: 5 });
  assert.equal(cost, 2);
});

test("recipe material cost with waste from override/default", () => {
  const materials = [
    { id: "m1", pricingMode: "perPack", packPrice: 10, packSize: 5, wasteDefaultPercent: 0, name_en: "Sugar" },
    { id: "m2", pricingMode: "perUnit", unitPrice: 3, wasteDefaultPercent: 10, name_en: "Milk" }
  ];

  const recipe = [
    { materialId: "m1", qtyPerUnit: 2, overrideWastePercent: 5 },
    { materialId: "m2", qtyPerUnit: 1, overrideWastePercent: null }
  ];

  const result = calculateRecipeMaterialsCost(recipe, materials);
  assert.equal(result.total, 7.5);
});

test("core formulas remain stable", () => {
  const dep = calculateDepreciationMonthly([{ purchasePrice: 1200, lifetimeMonths: 12 }]);
  const fixed = calculateFixedMonthly([{ amount: 50 }], dep);
  const fixedPerUnit = calculateFixedPerUnit(fixed, 100);
  const labor = calculateLaborCost(60, 30);
  const energy = calculateEnergyCost({ kw: 2, minutes: 30, pricePerKwh: 2 });
  const variable = calculateVariableCostPerUnit(10, labor, energy);
  const trueCost = calculateTrueUnitCost(10, labor, energy, fixedPerUnit);
  const minimum = calculateMinimumAcceptablePrice(trueCost, 5);
  const suggested = calculateSuggestedPrice(trueCost, "markup", 30);
  const breakEven = calculateBreakEvenUnits(fixed, suggested, variable);
  const monthly = calculateMonthlyProfit(suggested, trueCost, 100);

  assert.equal(dep, 100);
  assert.equal(fixed, 150);
  assert.equal(fixedPerUnit, 1.5);
  assert.equal(labor, 30);
  assert.equal(energy, 2);
  assert.equal(variable, 42);
  assert.equal(trueCost, 43.5);
  approxEqual(minimum, 45.675);
  approxEqual(suggested, 56.55);
  approxEqual(breakEven, 10.309278350515461);
  approxEqual(monthly, 1305);
});

test("buildProductMetrics calculates variant metrics", () => {
  const project = {
    hourlyRate: 60,
    monthlyFixedCosts: [{ amount: 100 }],
    equipmentDepreciation: [{ purchasePrice: 1200, lifetimeMonths: 12 }],
    expectedMonthlyUnits: 100,
    expectedMonthlySales: 80,
    safetyMarginPercent: 5,
    pricingMode: "markup",
    pricingPercent: 20
  };

  const materialsLibrary = [
    { id: "m1", name_en: "Sugar", pricingMode: "perPack", packPrice: 10, packSize: 5, wasteDefaultPercent: 0 },
    { id: "m2", name_en: "Bottle", pricingMode: "perUnit", unitPrice: 1, wasteDefaultPercent: 0 }
  ];

  const product = {
    id: "p1",
    unitName: "piece",
    laborMinutes: 30,
    energy: { kw: 1, minutes: 60, pricePerKwh: 1 },
    recipe: [
      { materialId: "m1", qtyPerUnit: 1, overrideWastePercent: null },
      { materialId: "m2", qtyPerUnit: 1, overrideWastePercent: 0 }
    ],
    variants: [
      {
        id: "v1",
        name: "Box 6",
        unitsPerVariant: 6,
        extraPackagingCost: 2,
        sellingPriceOverride: 0,
        pricingTargetPercent: 30
      }
    ]
  };

  const metrics = buildProductMetrics(project, product, materialsLibrary);

  assert.equal(metrics.materialsCost, 3);
  assert.equal(metrics.trueUnitCost, 36);
  assert.equal(metrics.variantMetrics.length, 1);

  const variant = metrics.variantMetrics[0];
  assert.equal(variant.variantUnitCost, 218);
  assert.equal(variant.variableCostVariant, 206);
  assert.equal(variant.minimumAcceptablePriceVariant, 228.9);
  assert.equal(variant.suggestedPriceVariant, 283.40000000000003);
});

test("delivery disabled does not affect variant costs", () => {
  const project = {
    hourlyRate: 0,
    monthlyFixedCosts: [{ amount: 0 }],
    equipmentDepreciation: [],
    expectedMonthlyUnits: 100,
    expectedMonthlySales: 10,
    safetyMarginPercent: 0,
    pricingMode: "markup",
    pricingPercent: 20
  };

  const product = {
    id: "p1",
    laborMinutes: 0,
    energy: { kw: 0, minutes: 0, pricePerKwh: 0 },
    recipe: [],
    materials: [{ qty: 1, unitCost: 10 }],
    variants: [{ id: "v1", name: "V1", unitsPerVariant: 2, extraPackagingCost: 1, hasDelivery: false }]
  };

  const metrics = buildProductMetrics(project, product, []);
  assert.equal(metrics.variantMetrics[0].variantUnitCost, 21);
  assert.equal(metrics.variantMetrics[0].variableCostVariant, 21);
});

test("perOrder + merchant_free adds delivery once", () => {
  const project = {
    hourlyRate: 0,
    monthlyFixedCosts: [{ amount: 100 }],
    equipmentDepreciation: [],
    expectedMonthlyUnits: 100,
    expectedMonthlySales: 10,
    safetyMarginPercent: 0,
    pricingMode: "markup",
    pricingPercent: 0
  };

  const product = {
    id: "p2",
    laborMinutes: 0,
    energy: { kw: 0, minutes: 0, pricePerKwh: 0 },
    recipe: [],
    materials: [{ qty: 1, unitCost: 10 }],
    variants: [{
      id: "v2",
      name: "V2",
      unitsPerVariant: 3,
      extraPackagingCost: 2,
      hasDelivery: true,
      deliveryPricingMode: "merchant_free",
      deliveryCost: 5,
      deliveryCostBasis: "perOrder"
    }]
  };

  const metrics = buildProductMetrics(project, product, []);
  const variant = metrics.variantMetrics[0];
  assert.equal(variant.variantUnitCost, 40);
  assert.equal(variant.variableCostVariant, 37);
});

test("perUnit + merchant_free multiplies delivery by unitsPerVariant", () => {
  const project = {
    hourlyRate: 0,
    monthlyFixedCosts: [{ amount: 0 }],
    equipmentDepreciation: [],
    expectedMonthlyUnits: 100,
    expectedMonthlySales: 10,
    safetyMarginPercent: 0,
    pricingMode: "markup",
    pricingPercent: 0
  };

  const product = {
    id: "p3",
    laborMinutes: 0,
    energy: { kw: 0, minutes: 0, pricePerKwh: 0 },
    recipe: [],
    materials: [{ qty: 1, unitCost: 10 }],
    variants: [{
      id: "v3",
      name: "V3",
      unitsPerVariant: 4,
      extraPackagingCost: 0,
      hasDelivery: true,
      deliveryPricingMode: "merchant_free",
      deliveryCost: 2,
      deliveryCostBasis: "perUnit"
    }]
  };

  const metrics = buildProductMetrics(project, product, []);
  const variant = metrics.variantMetrics[0];
  assert.equal(variant.variantUnitCost, 48);
  assert.equal(variant.variableCostVariant, 48);
});

test("customer_separate delivery does not affect cost or break-even variable part", () => {
  const project = {
    hourlyRate: 0,
    monthlyFixedCosts: [{ amount: 100 }],
    equipmentDepreciation: [],
    expectedMonthlyUnits: 100,
    expectedMonthlySales: 10,
    safetyMarginPercent: 0,
    pricingMode: "markup",
    pricingPercent: 0
  };

  const product = {
    id: "p4",
    laborMinutes: 0,
    energy: { kw: 0, minutes: 0, pricePerKwh: 0 },
    recipe: [],
    materials: [{ qty: 1, unitCost: 10 }],
    variants: [{
      id: "v4",
      name: "V4",
      unitsPerVariant: 2,
      extraPackagingCost: 0,
      sellingPriceOverride: 30,
      hasDelivery: true,
      deliveryPricingMode: "customer_separate",
      deliveryCost: 9,
      deliveryCostBasis: "perOrder"
    }]
  };

  const metrics = buildProductMetrics(project, product, []);
  const variant = metrics.variantMetrics[0];
  assert.equal(variant.variantUnitCost, 22);
  assert.equal(variant.variableCostVariant, 20);
  assert.equal(variant.deliveryAffectsProfit, false);
});
