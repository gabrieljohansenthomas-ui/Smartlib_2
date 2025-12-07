/**
 * reviews.js
 * Handles viewing and submitting reviews for a book.
 * - Uses global firebaseDb (compat) and firebaseAuth
 * - Uses DOMPurify for sanitization, and Utils.escapeHTML for safe insertion
 */

const Reviews = (function () {
  const db = window.firebaseDb;
  const auth = window.firebaseAuth;

  // Read bookId from query string
  function getBookId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('bookId');
  }

  async function fetchBook(bookId) {
    const doc = await db.collection('books').doc(bookId).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  }

  async function renderBook(bookId) {
    const book = await fetchBook(bookId);
    const container = document.getElementById('book-container');
    if (!book) { container.innerHTML = '<p>Buku tidak ditemukan.</p>'; return; }
    // compute average rating
    const avg = await computeAverageRating(bookId);
    container.innerHTML = `
      <div class="grid md:grid-cols-3 gap-4">
        <img src="${Utils.escapeHTML(book.coverUrl || 'https://via.placeholder.com/300x400?text=No+Cover')}" alt="${Utils.escapeHTML(book.title)}" class="w-full h-64 object-cover"/>
        <div class="md:col-span-2">
          <h2 class="text-2xl font-semibold">${Utils.escapeHTML(book.title)}</h2>
          <p class="text-sm text-slate-600">${Utils.escapeHTML(book.author)}</p>
          <p class="mt-3">${Utils.escapeHTML(book.description || '')}</p>
          <div class="mt-3">Kategori: ${Utils.escapeHTML(book.category || '-')}</div>
          <div class="mt-1">Stok tersedia: ${book.availableStock || 0} / ${book.totalStock || 0}</div>
          <div class="mt-2">Rating rata-rata: ${avg.toFixed(2)}</div>
        </div>
      </div>
    `;
  }

  async function loadReviews(bookId) {
    const list = document.getElementById('reviews-list');
    list.innerHTML = '';
    const snap = await db.collection('reviews').where('bookId', '==', bookId).orderBy('createdAt', 'desc').get();
    if (snap.empty) { list.innerHTML = '<p>Belum ada ulasan.</p>'; return; }
    snap.forEach(doc => {
      const d = doc.data();
      const text = Utils.escapeHTML(d.text || '');
      const user = Utils.escapeHTML(d.userDisplay || 'Pengguna');
      const date = d.createdAt && d.createdAt.toDate ? Utils.formatDate(d.createdAt) : '-';
      const el = document.createElement('div');
      el.className = 'p-3 border rounded';
      el.innerHTML = `<div class="font-semibold">${user} <span class="text-sm text-slate-600">(${date})</span></div>
        <div class="mt-1 text-sm">Rating: ${d.rating}</div>
        <div class="mt-2">${text}</div>`;
      list.appendChild(el);
    });
  }

  async function computeAverageRating(bookId) {
    const snap = await db.collection('reviews').where('bookId', '==', bookId).get();
    let sum = 0, count = 0;
    snap.forEach(d => { sum += (d.data().rating || 0); count++; });
    return count === 0 ? 0 : (sum / count);
  }

  async function submitReview(e) {
    e.preventDefault();
    const bookId = getBookId();
    if (!bookId) return alert('Book ID missing');
    const rating = Number(document.getElementById('rating').value);
    let text = document.getElementById('review-text').value || '';
    // sanitize text via DOMPurify
    text = DOMPurify.sanitize(text);
    const user = auth.currentUser;
    if (!user) {
      window.location.href = 'login.html';
      return;
    }
    // Optional: server-side verify user had borrowed the book before (recommended)
    try {
      await db.collection('reviews').add({
        bookId,
        userId: user.uid,
        userDisplay: user.displayName || user.email,
        rating,
        text,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      document.getElementById('review-text').value = '';
      await loadReviews(bookId);
      await renderBook(bookId);
    } catch (err) {
      console.error('submitReview', err);
      alert('Gagal mengirim ulasan: ' + err.message);
    }
  }

  return {
    init: async function () {
      const bookId = getBookId();
      if (!bookId) {
        document.getElementById('book-container').textContent = 'Param bookId tidak ada';
        return;
      }
      await renderBook(bookId);
      await loadReviews(bookId);
      const form = document.getElementById('review-form');
      if (form) form.addEventListener('submit', submitReview);
    },
    // exported for testing
    computeAverageRating
  };
})();

window.Reviews = Reviews;
