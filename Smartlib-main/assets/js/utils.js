/**
 * utils.js
 * Shared helper utilities for frontend.
 * Place at perpus-smkn3manado-frontend/assets/js/utils.js
 *
 * Notes:
 * - Use DOMPurify (loaded in each HTML) to sanitize HTML where needed.
 * - Escape text before injecting into innerHTML to reduce XSS risk.
 */

// Basic namespace
const Utils = (function () {
  return {
    // Escape text for safe insertion into innerHTML where only text intended
    escapeHTML: function (str) {
      if (str === undefined || str === null) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    },

    // Sanitize HTML fragment using DOMPurify (global) if available
    sanitizeHTML: function (html) {
      if (typeof DOMPurify !== 'undefined') {
        return DOMPurify.sanitize(html);
      }
      // Fallback: escape everything (no HTML)
      return Utils.escapeHTML(html);
    },

    // Format Firestore Timestamp or Date to readable date
    formatDate: function (ts) {
      if (!ts) return '-';
      let d = ts;
      if (d.toDate) d = d.toDate();
      return new Date(d).toLocaleDateString('id-ID');
    },

    // Simple client-side form validation utility
    validateText: function (value, minLen = 1) {
      if (!value || String(value).trim().length < minLen) return false;
      return true;
    },

    // Small helper to create DOM nodes from HTML string
    createElementFromHTML: function (htmlString) {
      const div = document.createElement('div');
      div.innerHTML = htmlString.trim();
      return div.firstChild;
    }
  };
})();

// expose globally for other scripts
window.Utils = Utils;
