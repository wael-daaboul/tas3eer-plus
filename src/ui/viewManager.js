import { getState } from "../store/stateManager.js";
import { t } from "../i18n/localization.js";

/**
 * Update the UI view based on navigation.
 * Linked to window.location.hash to allow deep linking.
 * 
 * @param {string} viewName - The destination view (e.g. 'settings', 'materials', 'products', 'results')
 * @param {boolean} updateHash - Whether to update the hash (set to false inside the hashchange listener)
 */
export function MapsTo(viewName, updateHash = true) {
  if (!viewName) return;

  const state = getState();
  const isAr = state.settings.locale === "ar";
  
  // 1. Update window hash for deep linking (if not prevented)
  if (updateHash && window.location.hash !== `#${viewName}`) {
    window.location.hash = viewName;
  }
  
  // 2. Hide all main sections
  document.querySelectorAll(".page").forEach((page) => {
    page.classList.remove("active");
    page.setAttribute("aria-hidden", "true");
  });
  
  // 3. Update tab/step buttons
  document.querySelectorAll(".step").forEach((btn) => {
    btn.classList.remove("active");
    btn.setAttribute("aria-selected", "false");
  });

  // 4. Reveal the target section
  const targetPage = document.querySelector(`.page[data-page="${viewName}"]`);
  if (targetPage) {
    targetPage.classList.add("active");
    targetPage.setAttribute("aria-hidden", "false");
    
    // Smooth scroll to top for a better mobile experience
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  
  // 5. Highlighting the navigation step button
  const targetStep = document.querySelector(`.step[data-step="${viewName}"]`);
  if (targetStep) {
    targetStep.classList.add("active");
    targetStep.setAttribute("aria-selected", "true");
  }

  // 6. Set Document Title (Deep Linking SEO)
  const titleKey = `step${viewName.charAt(0).toUpperCase() + viewName.slice(1)}`;
  const translatedTitle = t(titleKey) || viewName;
  document.title = `${translatedTitle} | ${isAr ? 'تسعير+' : 'PricingPlus'}`;

  // 7. Dispatch viewChanged event for other observers
  window.dispatchEvent(new CustomEvent('viewChanged', { 
    detail: { 
      view: viewName,
      title: translatedTitle
    } 
  }));
}

/** 
 * Alias for external use if needed
 */
export { MapsTo as navigateTo };

// Global listener for browser Back/Forward/Direct navigations
window.addEventListener("hashchange", () => {
    const view = window.location.hash.replace("#", "") || "settings";
    MapsTo(view, false); // Pass false to prevent infinite loop
});

// Initial boot logic: Route to the hash or default to 'settings'
window.addEventListener("load", () => {
    const initialView = window.location.hash.replace("#", "") || "settings";
    MapsTo(initialView);
});
