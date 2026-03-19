import { t } from "../../i18n/localization.js";

/**
 * Toast Notification System
 * Pure Vanilla JS implementation for non-intrusive feedback.
 */

let container = null;

function getContainer() {
  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    document.body.appendChild(container);
  }
  return container;
}

/**
 * Shows a toast notification
 * @param {string} key - i18n key for the message
 * @param {string} type - 'success', 'error', 'info'
 * @param {number} duration - visibility duration in ms
 */
export function showToast(key, type = "info", duration = 3500) {
  const root = getContainer();
  const message = t(key);
  
  const toast = document.createElement("div");
  toast.className = `toast-item ${type}`;
  
  // Add icon based on type (simple emoji or svg)
  const icon = type === "success" ? "✅" : (type === "error" ? "❌" : "ℹ️");
  
  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <span class="toast-message">${message}</span>
  `;
  
  root.appendChild(toast);
  
  // Auto-remove logic
  const removeToast = () => {
    toast.classList.add("fade-out");
    toast.addEventListener("animationend", () => {
      toast.remove();
      if (root.childNodes.length === 0) {
        // Optional: remove container if empty
      }
    }, { once: true });
  };
  
  const timeoutId = setTimeout(removeToast, duration);
  
  // Pause on hover
  toast.addEventListener("mouseenter", () => clearTimeout(timeoutId));
  toast.addEventListener("mouseleave", () => setTimeout(removeToast, 1000));
}

// Global accessor for non-ESM parts if needed
window.showToast = showToast;
