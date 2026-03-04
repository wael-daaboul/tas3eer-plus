/**
 * security.js
 * Minimal security utilities for Pricing+
 */

/**
 * Escapes characters that have special meaning in HTML to prevent XSS.
 * Converts &, <, >, ", and ' to their corresponding HTML entities.
 *
 * @param {string|number|null|undefined} str - The string to escape.
 * @returns {string} The HTML-escaped string.
 */
export function escapeHTML(str) {
    if (str === null || str === undefined) return "";
    return String(str).replace(/[&<>"']/g, (match) => {
        switch (match) {
            case "&": return "&amp;";
            case "<": return "&lt;";
            case ">": return "&gt;";
            case "\"": return "&quot;";
            case "'": return "&#39;";
            default: return match;
        }
    });
}
