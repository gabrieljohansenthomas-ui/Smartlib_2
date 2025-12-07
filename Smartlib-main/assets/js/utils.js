/**
 * Utils file: sanitization, formatting, helper functions
 * -------------------------------------------------------
 * Dipakai global untuk mencegah XSS dan memformat tanggal.
 */

export function sanitizeHTML(str) {
  return DOMPurify.sanitize(str);
}

export function escapeHTML(str) {
  const div = document.createElement("div");
  div.innerText = str;
  return div.innerHTML;
}

export function formatDate(ts) {
  if (!ts) return "-";
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}

export function getQueryParam(param) {
  const url = new URL(window.location.href);
  return url.searchParams.get(param);
}
