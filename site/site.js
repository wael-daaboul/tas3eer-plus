import { applyDocumentLocale, detectInitialLocale, persistLocaleSelection } from "../src/i18n/localization.js";
import { LanguageSelector } from "../src/ui/components/LanguageSelector.js";

/**
 * Pricing+ Site (Landing Page & Articles) Logic
 * Final Stable Version v1.5.0
 */

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Initial Locale Detection
  const locale = detectInitialLocale();
  applyDocumentLocale(locale);

  // 2. Initialize Language Selector
  const selectorContainer = document.getElementById("language-selector-container");
  if (selectorContainer && !selectorContainer.hasChildNodes()) {
    const selector = LanguageSelector((newLocale) => {
      const normalizedLocale = persistLocaleSelection(newLocale);
      applyDocumentLocale(normalizedLocale);
      window.dispatchEvent(new CustomEvent("pricingplus:locale-changed", { detail: normalizedLocale }));
    });
    selectorContainer.appendChild(selector);
  }

  // 3. Mobile Menu Logic
  const navToggle = document.querySelector(".nav-toggle");
  const siteNav = document.getElementById("siteNav");
  if (navToggle && siteNav) {
    navToggle.addEventListener("click", () => {
      const expanded = navToggle.getAttribute("aria-expanded") === "true";
      navToggle.setAttribute("aria-expanded", !expanded);
      siteNav.classList.toggle("is-open");
    });
  }

  // 4. Compact Header on Scroll
  const header = document.querySelector(".header");
  window.addEventListener("scroll", () => {
    if (header) {
      header.classList.toggle("compact", window.scrollY > 20);
    }
  });

  // 5. Active Nav Link Logic
  const updateActiveNavLink = () => {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll("#siteNav a");
    
    navLinks.forEach(link => {
      const href = link.getAttribute("href");
      if (!href) return;
      
      // Handle root path specially
      if (href === "/" || href === "/index.html") {
        const isRoot = currentPath === "/" || currentPath === "/index.html" || currentPath === "";
        link.classList.toggle("active", isRoot);
        return;
      }

      // For other paths, check if currentPath starts with href
      // We normalize by removing trailing slashes for better matching
      const normalizedHref = href.replace(/\/$/, "");
      const normalizedPath = currentPath.replace(/\/$/, "");
      
      const isActive = normalizedPath === normalizedHref || normalizedPath.startsWith(normalizedHref + "/");
      link.classList.toggle("active", isActive);
    });
  };
  updateActiveNavLink();

  // 6. Check URL for anchor scrolling
  if (window.location.hash) {
    const el = document.querySelector(window.location.hash);
    if (el) {
      setTimeout(() => el.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }
});
