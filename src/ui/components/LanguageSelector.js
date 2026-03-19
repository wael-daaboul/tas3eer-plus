import { getStoredLocale, persistLocaleSelection } from "../../i18n/localization.js";
import { getState } from "../../store/stateManager.js";

/**
 * Premium Language Selector Component
 * Features a custom popover with glassmorphism and checkmark selection.
 */

export function LanguageSelector(onLanguageChange) {
  const container = document.createElement("div");
  container.className = "lang-selector";
  
  const state = getState();
  const currentLocale = state?.settings?.locale || getStoredLocale();

  // Globe Icon (Simple SVG)
  const globeIcon = `
    <svg class="globe-3d" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true">
      <defs>
        <clipPath id="globe-mask">
          <circle cx="12" cy="12" r="10" />
        </clipPath>
      </defs>
      <circle cx="12" cy="12" r="10" stroke-opacity="0.1" fill="currentColor" fill-opacity="0.05"/>
      <g stroke-opacity="0.2">
        <circle cx="12" cy="12" r="10" />
        <ellipse cx="12" cy="12" rx="6" ry="10" />
        <ellipse cx="12" cy="12" rx="2" ry="10" />
        <path d="M2 12h20M4.5 7h15M4.5 17h15" />
      </g>
      <g clip-path="url(#globe-mask)">
        <g class="globe-continents-group">
          <path d="M-20 14c2-2 4-1 6-3s3-4 6-4 5 2 7 4 3 4 5 4M10 14c2-2 4-1 6-3s3-4 6-4 5 2 7 4 3 4 5 4M40 14c2-2 4-1 6-3s3-4 6-4 5 2 7 4 3 4 5 4" stroke-width="1.5" stroke-linecap="round" />
          <path d="M-25 10c3 1 5-2 8-1s4 3 7 2 5-4 8-3M5 10c3 1 5-2 8-1s4 3 7 2 5-4 8-3M35 10c3 1 5-2 8-1s4 3 7 2 5-4 8-3" stroke-width="1.5" stroke-linecap="round" stroke-opacity="0.6" />
        </g>
      </g>
    </svg>
  `;
  
  // Chevron Icon
  const chevronIcon = `
    <svg class="chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
  `;

  // Trigger Button (New logic: bind or create)
  const trigger = document.createElement("div");
  trigger.className = "lang-selector-trigger";
  trigger.setAttribute("role", "button");
  trigger.setAttribute("tabindex", "0");
  trigger.setAttribute("aria-haspopup", "listbox");
  
  const labelText = currentLocale === "ar" ? "العربية" : "English";
  trigger.innerHTML = `
    ${globeIcon}
    <span class="lang-label">${labelText}</span>
    ${chevronIcon}
  `;
  
  // Popover List
  const popover = document.createElement("div");
  popover.className = "lang-popover";
  popover.setAttribute("role", "listbox");
  
  const languages = [
    { code: "ar", label: "العربية" },
    { code: "en", label: "English" }
  ];
  
  languages.forEach((lang) => {
    const option = document.createElement("div");
    option.className = `lang-option ${lang.code === currentLocale ? "active" : ""}`;
    option.dataset.lang = lang.code;
    option.setAttribute("role", "option");
    option.setAttribute("aria-selected", lang.code === currentLocale);
    
    // Checkmark Icon
    const checkIcon = `
      <svg class="check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    `;
    
    option.innerHTML = `
      <span>${lang.code === "ar" ? "العربية" : "English"}</span>
      ${checkIcon}
    `;
    
    popover.appendChild(option);
  });
  
  function updateSelector(locale) {
    const newLabel = locale === "ar" ? "العربية" : "English";
    const labelSpan = trigger.querySelector(".lang-label");
    if (labelSpan) labelSpan.textContent = newLabel;
    
    // Update options active state
    popover.querySelectorAll(".lang-option").forEach((opt, idx) => {
      const isSelected = languages[idx].code === locale;
      opt.classList.toggle("active", isSelected);
      opt.setAttribute("aria-selected", isSelected);
    });
  }
  
  function togglePopover(e) {
    e.stopPropagation();
    container.classList.toggle("is-open");
  }
  
  function closePopover() {
    container.classList.remove("is-open");
  }

  function commitLanguageChange(lang) {
    const normalizedLocale = persistLocaleSelection(lang);
    console.log("Language changed to: " + normalizedLocale);
    onLanguageChange?.(normalizedLocale);
    updateSelector(normalizedLocale);
    closePopover();
    window.location.reload();
  }

  function setupEventListeners() {
    trigger.addEventListener("click", togglePopover);
    trigger.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        togglePopover(e);
      }
    });

    popover.addEventListener("click", (event) => {
      const option = event.target.closest(".lang-option");
      if (!option || !popover.contains(option)) return;
      const lang = option.dataset.lang;
      if (!lang) return;
      commitLanguageChange(lang);
    });
  }
  
  // Close on outside click
  document.addEventListener("click", (e) => {
    if (!container.contains(e.target)) {
      closePopover();
    }
  });
  
  // Close on escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closePopover();
  });

  // Listen to external locale changes
  window.addEventListener("pricingplus:locale-changed", (e) => {
    const next = e.detail?.locale || e.detail;
    if (next && (next === "ar" || next === "en")) updateSelector(next);
  });

  setupEventListeners();

  container.appendChild(trigger);
  container.appendChild(popover);
  
  return container;
}
