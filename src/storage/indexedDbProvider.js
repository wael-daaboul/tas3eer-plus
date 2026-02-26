import { StorageProvider } from "./storageProvider.js";

const DB_NAME = "pricingplus-db";
const DB_VERSION = 3;
const STORE_PROJECT = "project";
const STORE_PRODUCTS = "products";
const STORE_MATERIALS = "materials";

function uid(prefix = "id") {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeName(value) {
  return String(value || "").trim().toLowerCase();
}

function promisifyRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function txDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("Transaction aborted"));
  });
}

function normalizeVariant(variant, product, index = 0) {
  return {
    id: variant?.id || uid("variant"),
    name: variant?.name || `${product.unitName || "Unit"} ${index + 1}`,
    unitsPerVariant: Math.max(1, Math.floor(toNumber(variant?.unitsPerVariant, 1))),
    extraPackagingCost: Math.max(0, toNumber(variant?.extraPackagingCost, 0)),
    sellingPriceOverride: Math.max(0, toNumber(variant?.sellingPriceOverride, 0)),
    pricingTargetPercent: variant?.pricingTargetPercent == null ? null : Math.max(0, toNumber(variant.pricingTargetPercent, 0)),
    expectedMonthlySalesVariant: variant?.expectedMonthlySalesVariant == null ? null : Math.max(0, toNumber(variant.expectedMonthlySalesVariant, 0)),
    hasDelivery: Boolean(variant?.hasDelivery),
    deliveryPricingMode: variant?.deliveryPricingMode === "merchant_free"
      ? "merchant_free"
      : (variant?.deliveryPricingMode === "included_in_price" ? "included_in_price" : "customer_separate"),
    deliveryCost: Math.max(0, toNumber(variant?.deliveryCost, 0)),
    deliveryCostBasis: variant?.deliveryCostBasis === "perUnit" ? "perUnit" : "perOrder"
  };
}

export class IndexedDbProvider extends StorageProvider {
  constructor() {
    super();
    this.db = null;
  }

  async init() {
    if (this.db) return;

    this.db = await new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;

        if (!db.objectStoreNames.contains(STORE_PROJECT)) {
          db.createObjectStore(STORE_PROJECT, { keyPath: "id" });
        }

        if (!db.objectStoreNames.contains(STORE_PRODUCTS)) {
          db.createObjectStore(STORE_PRODUCTS, { keyPath: "id" });
        }

        if (!db.objectStoreNames.contains(STORE_MATERIALS)) {
          const store = db.createObjectStore(STORE_MATERIALS, { keyPath: "id" });
          store.createIndex("byNameEn", "name_en", { unique: false });
        } else {
          const store = request.transaction.objectStore(STORE_MATERIALS);
          if (!store.indexNames.contains("byNameEn")) {
            store.createIndex("byNameEn", "name_en", { unique: false });
          }
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    await this.#migrateLegacyData();
  }

  async #migrateLegacyData() {
    const tx = this.db.transaction([STORE_PROJECT, STORE_PRODUCTS, STORE_MATERIALS], "readwrite");
    const projectStore = tx.objectStore(STORE_PROJECT);
    const productStore = tx.objectStore(STORE_PRODUCTS);
    const materialStore = tx.objectStore(STORE_MATERIALS);

    const projectRow = await promisifyRequest(projectStore.get("singleton"));
    const project = projectRow?.data || {};
    const currentVersion = toNumber(project.dataVersion, 0);

    const rawProducts = await promisifyRequest(productStore.getAll());
    const rawMaterials = await promisifyRequest(materialStore.getAll());
    let productsForV3 = rawProducts;

    if (currentVersion < 2) {
      const library = [];
      const byName = new Map();
      const legacyMaterialsByProduct = new Map();

      rawMaterials.forEach((row) => {
        if (row.productId) {
          if (!legacyMaterialsByProduct.has(row.productId)) {
            legacyMaterialsByProduct.set(row.productId, []);
          }
          legacyMaterialsByProduct.get(row.productId).push(row);
          return;
        }

        const material = {
          id: row.id || uid("mat"),
          name_ar: row.name_ar || row.name || row.name_en || "",
          name_en: row.name_en || row.name || row.name_ar || "",
          unitType: row.unitType || "piece",
          pricingMode: row.pricingMode || "perUnit",
          unitPrice: Math.max(0, toNumber(row.unitPrice, row.unitCost || 0)),
          packPrice: Math.max(0, toNumber(row.packPrice, 0)),
          packSize: Math.max(0, toNumber(row.packSize, 0)),
          wasteDefaultPercent: Math.max(0, toNumber(row.wasteDefaultPercent, 0)),
          updatedAt: Date.now()
        };

        library.push(material);
        byName.set(normalizeName(material.name_en || material.name_ar), material);
      });

      function ensureMaterial(name, unitCost = 0) {
        const normalized = normalizeName(name);
        if (!normalized) return null;

        if (byName.has(normalized)) {
          return byName.get(normalized);
        }

        const material = {
          id: uid("mat"),
          name_ar: name,
          name_en: name,
          unitType: "piece",
          pricingMode: "perUnit",
          unitPrice: Math.max(0, toNumber(unitCost, 0)),
          packPrice: 0,
          packSize: 0,
          wasteDefaultPercent: 0,
          updatedAt: Date.now()
        };

        library.push(material);
        byName.set(normalized, material);
        return material;
      }

      const migratedProducts = rawProducts.map((product) => {
        const legacyInline = Array.isArray(product.materials) ? product.materials : [];
        const legacyStore = legacyMaterialsByProduct.get(product.id) || [];

        let recipe = Array.isArray(product.recipe) ? product.recipe.filter((x) => x?.materialId) : [];

        if (!recipe.length) {
          recipe = [...legacyInline, ...legacyStore].map((component) => {
            const material = ensureMaterial(component.name, component.unitCost ?? component.costPerUnit ?? 0);
            if (!material) return null;
            return {
              materialId: material.id,
              qtyPerUnit: Math.max(0, toNumber(component.qtyPerUnit, component.qty ?? 1)),
              overrideWastePercent: component.overrideWastePercent == null ? null : Math.max(0, toNumber(component.overrideWastePercent, 0))
            };
          }).filter(Boolean);
        }

        const variants = Array.isArray(product.variants) && product.variants.length
          ? product.variants.map((v, idx) => normalizeVariant(v, product, idx))
          : [normalizeVariant({
            name: product.unitName || "Unit",
            unitsPerVariant: 1,
            sellingPriceOverride: product.manualSellingPrice || 0
          }, product, 0)];

        return {
          ...product,
          recipe,
          variants,
          updatedAt: Date.now()
        };
      });

      await new Promise((resolve, reject) => {
        const req = materialStore.openCursor();
        req.onsuccess = () => {
          const cursor = req.result;
          if (!cursor) {
            resolve();
            return;
          }
          materialStore.delete(cursor.primaryKey);
          cursor.continue();
        };
        req.onerror = () => reject(req.error);
      });

      library.forEach((material) => {
        materialStore.put(material);
      });

      migratedProducts.forEach((product) => {
        const copy = { ...product };
        delete copy.materials;
        productStore.put(copy);
      });

      productsForV3 = migratedProducts;
    }

    if (currentVersion < 3) {
      productsForV3.forEach((product) => {
        const variants = Array.isArray(product.variants) && product.variants.length
          ? product.variants.map((v, idx) => normalizeVariant(v, product, idx))
          : [normalizeVariant({
            name: product.unitName || "Unit",
            unitsPerVariant: 1,
            sellingPriceOverride: product.manualSellingPrice || 0
          }, product, 0)];
        productStore.put({ ...product, variants, updatedAt: Date.now() });
      });
    }

    projectStore.put({
      id: "singleton",
      data: {
        ...project,
        dataVersion: 3
      },
      updatedAt: Date.now()
    });

    await txDone(tx);
  }

  async getProject() {
    const tx = this.db.transaction(STORE_PROJECT, "readonly");
    const store = tx.objectStore(STORE_PROJECT);
    const result = await promisifyRequest(store.get("singleton"));
    return result?.data ?? null;
  }

  async saveProject(project) {
    const tx = this.db.transaction(STORE_PROJECT, "readwrite");
    const store = tx.objectStore(STORE_PROJECT);
    store.put({ id: "singleton", data: project, updatedAt: Date.now() });
    await txDone(tx);
    return project;
  }

  async listMaterials() {
    const tx = this.db.transaction(STORE_MATERIALS, "readonly");
    const store = tx.objectStore(STORE_MATERIALS);
    const materials = await promisifyRequest(store.getAll());
    return materials.sort((a, b) => {
      const aName = (a.name_en || a.name_ar || "").toLowerCase();
      const bName = (b.name_en || b.name_ar || "").toLowerCase();
      return aName.localeCompare(bName);
    });
  }

  async upsertMaterial(material) {
    const tx = this.db.transaction(STORE_MATERIALS, "readwrite");
    tx.objectStore(STORE_MATERIALS).put({ ...material, updatedAt: Date.now() });
    await txDone(tx);
    return material;
  }

  async getMaterialById(materialId) {
    const tx = this.db.transaction(STORE_MATERIALS, "readonly");
    return promisifyRequest(tx.objectStore(STORE_MATERIALS).get(materialId));
  }

  async deleteMaterial(materialId) {
    const tx = this.db.transaction([STORE_MATERIALS, STORE_PRODUCTS], "readwrite");
    tx.objectStore(STORE_MATERIALS).delete(materialId);

    const productsStore = tx.objectStore(STORE_PRODUCTS);
    const products = await promisifyRequest(productsStore.getAll());
    products.forEach((product) => {
      const recipe = (product.recipe || []).filter((component) => component.materialId !== materialId);
      productsStore.put({ ...product, recipe, updatedAt: Date.now() });
    });

    await txDone(tx);
  }

  async listProducts() {
    const tx = this.db.transaction(STORE_PRODUCTS, "readonly");
    const store = tx.objectStore(STORE_PRODUCTS);
    const products = await promisifyRequest(store.getAll());
    return products.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }

  async upsertProduct(product) {
    const tx = this.db.transaction(STORE_PRODUCTS, "readwrite");
    const normalized = {
      ...product,
      variants: (product.variants || []).map((variant, index) => normalizeVariant(variant, product, index)),
      updatedAt: Date.now()
    };
    tx.objectStore(STORE_PRODUCTS).put(normalized);
    await txDone(tx);
    return normalized;
  }

  async deleteProduct(productId) {
    const tx = this.db.transaction(STORE_PRODUCTS, "readwrite");
    tx.objectStore(STORE_PRODUCTS).delete(productId);
    await txDone(tx);
  }
}
