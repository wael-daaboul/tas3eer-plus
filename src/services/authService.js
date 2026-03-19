import { getSupabaseClient, hasSupabaseConfig } from "../../site/supabaseClient.js";
import { updateSetting, getState } from "../store/stateManager.js";
import { showToast } from "../ui/components/Toast.js";

/**
 * Auth Service - Handles Supabase authentication logic
 */
const REDIRECT_URL = "https://pricingplus.app/login/callback";

export const authService = {
  /**
   * Initialize Auth state and listeners
   */
  async init(onAuthStateChangeCallback) {
    if (!hasSupabaseConfig()) return null;

    try {
      const supabase = await getSupabaseClient();
      if (!supabase) return null;

      const { data } = await supabase.auth.getSession();
      
      const sessionData = {
        user: data.session?.user || null,
        token: data.session?.access_token || ""
      };

      updateSetting("auth", sessionData);

      supabase.auth.onAuthStateChange((event, session) => {
        const newUserData = {
          user: session?.user || null,
          token: session?.access_token || ""
        };
        updateSetting("auth", newUserData);
        if (event === "SIGNED_IN") {
          showToast("welcome_back", "success");
        }
        if (onAuthStateChangeCallback) onAuthStateChangeCallback(event, session);
      });

      return supabase;
    } catch (error) {
      console.error("Auth Init Error:", error);
      updateSetting("auth", { user: null, token: "" });
      return null;
    }
  },

  /**
   * Sign in using Magic Link (OTP)
   */
  async signInWithMagicLink(email) {
    const supabase = await getSupabaseClient();
    if (!supabase) throw new Error("Supabase not configured");

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: REDIRECT_URL }
    });

    if (error) throw error;
    showToast("link_sent", "info");
    return true;
  },

  /**
   * Sign out current user
   */
  async signOut() {
    const supabase = await getSupabaseClient();
    if (!supabase) return;

    await supabase.auth.signOut();
    updateSetting("auth", { user: null, token: "" });
  },

  /**
   * Get current authenticated user
   */
  getCurrentUser() {
    return getState().settings.auth.user;
  },

  /**
   * Get Supabase client instance
   */
  async getClient() {
    return await getSupabaseClient();
  }
};
