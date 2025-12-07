// Helper functions untuk sanitasi, format, dll.
// Sanitasi XSS untuk innerHTML
export function sanitizeHTML(html) {
    return DOMPurify.sanitize(html);
}

// Format tanggal
export function formatDate(timestamp) {
    return new Date(timestamp.seconds * 1000).toLocaleDateString('id');
}

// Escape HTML untuk insertion
export function escapeHTML(str) {
    return str.replace(/[&<>"']/g, (match) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[match]));
}

// TODO: Tambahkan helper lain seperti pagination offset jika perlu