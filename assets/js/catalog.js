/**
 * catalog.js
 * Client-side catalog queries and rendering, with simple pagination.
 * Uses firebaseDb (compat) global from firebase-config.js
 *
 * Behavior:
 * - load categories (unique values from books)
 * - perform query (orderBy title) and apply client-side text match for search
 * - pagination: limit + startAfter (using timestamp/index) where available
 *
 * Note: Firestore doesn't support full-text search. This implementation uses basic
 * substring matching client-side. For production scale, integrate Algolia.
 */

const Catalog = (function () {
  const db = window.firebaseDb;
  const pageSize = 9;
  let lastVisible = null;
  let currentFilter = { q: '', category: '', status: '' };

  async function loadCategories() {
    // fetch up to 200 docs and gather categories (simple approach)
    try {
      const snap = await db.collection('books').orderBy('category').limit(200).get();
      const set = new Set();
      snap.forEach(d => {
        if (d.data().category) set.add(d.data().category);
      });
      const sel = document.getElementById('category-filter');
      if (!sel) return;
      set.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c; opt.textContent = c;
        sel.appendChild(opt);
      });
    } catch (e) {
      console.error('loadCategories', e);
    }
  }

  function renderBookCard(doc) {
    const d = doc.data();
    const el = document.createElement('div');
    el.className = 'border rounded p-3 bg-white';
    const cover = Utils.escapeHTML(d.coverUrl || 'https://via.placeholder.com/200x300?text=No+Cover');
    const title = Utils.escapeHTML(d.title || '');
    const author = Utils.escapeHTML(d.author || '');
    const avail = (d.availableStock || 0) > 0 ? 'Tersedia' : 'Dipinjam';
    el.innerHTML = `
      <img src="${cover}" alt="${title}" class="cover mb-2"/>
      <h4 class="font-semibold">${title}</h4>
      <p class="text-sm text-slate-600">${author}</p>
      <p class="mt-2"><strong>${avail}</strong></p>
      <div class="mt-2 flex gap-2">
        <a href="book_detail.html?bookId=${doc.id}" class="px-3 py-1 bg-sky-600 text-white rounded">Detail</a>
        <a href="borrow.html?bookId=${doc.id}" class="px-3 py-1 border rounded">Pinjam</a>
      </div>
    `;
    return el;
  }

  async function loadFirstPage() {
    lastVisible = null;
    const results = document.getElementById('results');
    results.innerHTML = '';
    currentFilter.q = (document.getElementById('q') || {}).value || '';
    currentFilter.category = (document.getElementById('category-filter') || {}).value || '';
    currentFilter.status = (document.getElementById('status-filter') || {}).value || '';

    try {
      let q = db.collection('books').orderBy('title').limit(pageSize);
      if (currentFilter.category) q = db.collection('books').where('category', '==', currentFilter.category).orderBy('title').limit(pageSize);

      const snap = await q.get();
      if (snap.empty) {
        results.innerHTML = '<p>Tidak ada buku ditemukan.</p>';
        return;
      }
      snap.forEach(doc => {
        const d = doc.data();
        // client-side text filter
        if (currentFilter.q) {
          const hay = (d.title + ' ' + d.author + ' ' + (d.isbn || '')).toLowerCase();
          if (!hay.includes(currentFilter.q.toLowerCase())) return;
        }
        // status filter
        if (currentFilter.status === 'available' && (d.availableStock || 0) <= 0) return;
        if (currentFilter.status === 'borrowed' && (d.availableStock || 0) > 0) return;

        const card = renderBookCard(doc);
        results.appendChild(card);
      });
      lastVisible = snap.docs[snap.docs.length - 1];
    } catch (e) {
      console.error('loadFirstPage', e);
    }
  }

  async function loadMore() {
    if (!lastVisible) return;
    const results = document.getElementById('results');
    try {
      let q = db.collection('books').orderBy('title').startAfter(lastVisible).limit(pageSize);
      if (currentFilter.category) q = db.collection('books').where('category', '==', currentFilter.category).orderBy('title').startAfter(lastVisible).limit(pageSize);
      const snap = await q.get();
      if (snap.empty) return;
      snap.forEach(doc => {
        const d = doc.data();
        if (currentFilter.q) {
          const hay = (d.title + ' ' + d.author + ' ' + (d.isbn || '')).toLowerCase();
          if (!hay.includes(currentFilter.q.toLowerCase())) return;
        }
        if (currentFilter.status === 'available' && (d.availableStock || 0) <= 0) return;
        if (currentFilter.status === 'borrowed' && (d.availableStock || 0) > 0) return;
        results.appendChild(renderBookCard(doc));
      });
      lastVisible = snap.docs[snap.docs.length - 1];
    } catch (e) {
      console.error('loadMore', e);
    }
  }

  return {
    init: async function () {
      await loadCategories();
      await loadFirstPage();
      const searchBtn = document.getElementById('search-btn');
      if (searchBtn) searchBtn.addEventListener('click', (ev) => { ev.preventDefault(); loadFirstPage(); });
      const loadMoreBtn = document.getElementById('load-more');
      if (loadMoreBtn) loadMoreBtn.addEventListener('click', loadMore);
    }
  };
})();

// expose
window.Catalog = Catalog;
