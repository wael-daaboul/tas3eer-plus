/**
 * DB Service - Version 1.5.0 (The Vanilla Milestone)
 * Final stable version of the Vanilla JavaScript implementation.
 * Updated: 2026-03-19
 */
import { IndexedDbProvider } from "../storage/indexedDbProvider.js";
import { authService } from "./authService.js";
import { updateSetting, getState } from "../store/stateManager.js";
import { showToast } from "../ui/components/Toast.js";

/**
 * DB Service - Handles all data persistence and cloud synchronization.
 * Follows Repository Pattern to isolate storage implementation details.
 */

const storage = new IndexedDbProvider();
const SYNC_PENDING_KEY = "pricingplus_sync_pending";
const AUTO_SYNC_DEBOUNCE_MS = 3000;
const AUTO_SYNC_THROTTLE_MS = 30000;
const APP_VERSION = "1.0";

export const dbService = {
  /**
   * Initialize local IndexedDB and check sync state
   */
  async init() {
    await storage.init();
    const lastSyncAt = localStorage.getItem("pricingplus_last_sync_at") || "";
    updateSetting("sync", { lastSyncAt });
    
    if (localStorage.getItem(SYNC_PENDING_KEY) === "true") {
      updateSetting("sync", { dirty: true, status: "pending" });
    } else {
      updateSetting("sync", { status: lastSyncAt ? "up_to_date" : "pending" });
    }
    return storage;
  },

  /**
   * Data Retrieval
   */
  async getProject() { return await storage.getProject(); },
  async getProducts() { return await storage.listProducts(); },
  async getMaterials() { return await storage.listMaterials(); },

  /**
   * Data Mutation (Offline-First)
   * Saves locally first, then schedules cloud sync
   */
  async saveProject(project) {
    const res = await storage.saveProject(project);
    this.scheduleAutoSync();
    return res;
  },
  async upsertProduct(product) {
    const res = await storage.upsertProduct(product);
    this.scheduleAutoSync();
    return res;
  },
  async deleteProduct(productId) {
    const res = await storage.deleteProduct(productId);
    this.scheduleAutoSync();
    return res;
  },
  async upsertMaterial(material) {
    const res = await storage.upsertMaterial(material);
    this.scheduleAutoSync();
    return res;
  },
  async deleteMaterial(materialId) {
    const res = await storage.deleteMaterial(materialId);
    this.scheduleAutoSync();
    return res;
  },

  async clearAllData() {
    await storage.clearAllData();
    updateSetting("sync", { lastSyncAt: "", dirty: false });
    localStorage.removeItem("pricingplus_last_sync_at");
  },

  /**
   * Cloud Synchronization Logic
   */
  scheduleAutoSync() {
    const state = getState();
    const user = authService.getCurrentUser();
    if (!user || state.settings.demoMode || state.settings.sync.suspendWrites) return;

    updateSetting("sync", { dirty: true, status: "pending" });
    localStorage.setItem(SYNC_PENDING_KEY, "true");

    if (state.settings.sync.debounceId) {
      clearTimeout(state.settings.sync.debounceId);
    }

    const debounceId = setTimeout(() => {
      updateSetting("sync", { debounceId: null });
      this.runAutoSync(false).catch(() => { });
    }, AUTO_SYNC_DEBOUNCE_MS);
    
    updateSetting("sync", { debounceId });
  },

  async runAutoSync(force = false) {
    const state = getState();
    const user = authService.getCurrentUser();
    if (!user || state.settings.demoMode) return false;
    
    if (!force && !state.settings.sync.dirty && localStorage.getItem(SYNC_PENDING_KEY) !== "true") return false;

    const lastRun = state.settings.sync.lastSyncRunAt || 0;
    const elapsed = Date.now() - lastRun;
    if (!force && elapsed < AUTO_SYNC_THROTTLE_MS) return false;

    try {
      updateSetting("sync", { status: "syncing", lastSyncRunAt: Date.now() });

      const snapshot = await this.exportLocalData();
      await this.saveBackupToCloud(snapshot);

      updateSetting("sync", { 
        lastSyncAt: snapshot._meta.updatedAt, 
        dirty: false,
        status: "up_to_date"
      });
      
      localStorage.removeItem(SYNC_PENDING_KEY);
      localStorage.setItem("pricingplus_last_sync_at", snapshot._meta.updatedAt);
      showToast("sync_success", "success");
      return true;
    } catch (error) {
      updateSetting("sync", { dirty: true, status: "error" });
      localStorage.setItem(SYNC_PENDING_KEY, "true");
      showToast("sync_error", "error");
      throw error;
    }
  },

  async saveBackupToCloud(snapshot) {
    const supabase = await authService.getClient();
    const user = authService.getCurrentUser();
    if (!supabase || !user) throw new Error("AUTH_REQUIRED");

    const { error } = await supabase
      .from("user_backups")
      .upsert({
        user_id: user.id,
        data: { versions: [{ updatedAt: snapshot._meta.updatedAt, data: snapshot }] },
        updated_at: snapshot._meta.updatedAt
      }, { onConflict: "user_id" });

    if (error) throw error;
  },

  async loadFromCloud() {
    const supabase = await authService.getClient();
    const user = authService.getCurrentUser();
    if (!supabase || !user) throw new Error("AUTH_REQUIRED");

    const { data, error } = await supabase
      .from("user_backups")
      .select("data,updated_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  /**
   * Data Export / Import Logic (Internal)
   */
  async exportLocalData() {
    const state = getState();
    const [project, materials, products] = await Promise.all([
      storage.getProject(),
      storage.listMaterials(),
      storage.listProducts()
    ]);
    return {
      _meta: {
        updatedAt: new Date().toISOString(),
        source: "pricingplus-local",
        version: 1,
        appVersion: APP_VERSION,
        locale: state.settings.locale
      },
      project,
      materials,
      products
    };
  },

  async importLocalData(snapshot) {
    const project = snapshot?.project ?? null;
    const materials = Array.isArray(snapshot?.materials) ? snapshot.materials : [];
    const products = Array.isArray(snapshot?.products) ? snapshot.products : [];

    updateSetting("sync", { suspendWrites: true });
    try {
      await storage.clearAllData();
      if (project) await storage.saveProject(project);
      for (const m of materials) await storage.upsertMaterial(m);
      for (const p of products) await storage.upsertProduct(p);
    } finally {
      updateSetting("sync", { suspendWrites: false });
    }
  }
};
