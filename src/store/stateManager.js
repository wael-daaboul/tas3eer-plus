/**
 * State Manager - Centralized State Store for Pricing+
 * Implements a Single Source of Truth pattern.
 */

let internalState = {
  inputs: {
    // Project-specific data (hourlyRate, taxRate, wholesaleDiscount, materialsLibrary, etc.)
    project: null,
    materialsLibrary: []
  },
  settings: {
    // UI and application settings
    locale: localStorage.getItem("selectedLanguage") || "ar",
    uiMode: "simple",
    currencies: [],
    selectedProductId: null,
    editingProductId: null,
    editingMaterialId: null,
    demoMode: false,
    t: (key) => key,
    // Add auth and sync here as part of application settings
    auth: {
      user: null,
      token: "",
      supabase: null
    },
    sync: {
      status: "pending",
      lastSyncAt: "",
      dirty: false,
      debounceId: null,
      throttleId: null,
      lastSyncRunAt: 0,
      wrapApplied: false,
      suspendWrites: false
    },
    analytics: {
      calculatorStarted: false,
      laborTimeAdded: false,
      fixedCostsAdded: false,
      breakevenViewed: false
    }
  },
  products: [],
  results: {}
};

function dispatchChange() {
  window.dispatchEvent(new CustomEvent('stateChanged', { detail: internalState }));
}

export function getState() {
  // Since we have a 't' function, we can't deep copy easily with JSON
  // We'll return the object but UI logic should use the setters
  return internalState; 
}

export function updateInput(key, value) {
  if (key === 'project') {
    internalState.inputs.project = { ...internalState.inputs.project, ...value };
  } else if (key === 'materialsLibrary') {
    internalState.inputs.materialsLibrary = value;
  } else if (internalState.inputs.project) {
    internalState.inputs.project = { ...internalState.inputs.project, [key]: value };
  } else {
    internalState.inputs.project = { [key]: value };
  }
  dispatchChange();
}

export function updateSetting(key, value) {
  // Handle nested settings like auth or sync if needed
  if (typeof value === 'object' && !Array.isArray(value) && internalState.settings[key]) {
     internalState.settings[key] = { ...internalState.settings[key], ...value };
  } else {
    internalState.settings[key] = value;
  }
  dispatchChange();
}

export function setProducts(productsArray) {
  internalState.products = productsArray;
  dispatchChange();
}

export function setResults(resultsData) {
  internalState.results = resultsData;
  dispatchChange();
}
