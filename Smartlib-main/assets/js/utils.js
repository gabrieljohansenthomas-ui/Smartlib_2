// Helper functions untuk sanitasi dan format
export function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export function formatDate(timestamp) {
  if (!timestamp) return 'N/A';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('id-ID');
}

// Sanitasi input dengan DOMPurify (untuk review text)
import DOMPurify from 'https://cdn.jsdelivr.net/npm/dompurify@3';
export function sanitizeInput(input) {
  return DOMPurify.sanitize(input);
}
