/**
 * borrow.js
 * - submit loan requests (member)
 * - show borrower history (member)
 *
 * Uses firebaseAuth, firebaseDb globals (compat).
 *
 * Security note:
 * - Creating a loan uses client-side add to 'loans' collection. Firestore rules must ensure
 *   only authenticated user can create loans for their own uid (implemented in firestore.rules).
 */

const Borrow = (function () {
  const db = window.firebaseDb;
  const auth = window.firebaseAuth;

  function getBookIdFromUrl() {
    const p = new URLSearchParams(window.location.search);
    return p.get('bookId');
  }

  async function showBookSummary(bookId) {
    const cont = document.getElementById('book-summary');
    cont.innerHTML = 'Memuat...';
    try {
      const snap = await db.collection('books').doc(bookId).get();
      if (!snap.exists) { cont.innerHTML = '<p>Buku tidak ditemukan.</p>'; return; }
      const d = snap.data();
      cont.innerHTML = `
        <div class="flex gap-4">
          <img src="${Utils.escapeHTML(d.coverUrl || '')}" alt="${Utils.escapeHTML(d.title)}" class="w-28 h-36 object-cover" />
          <div>
            <div class="font-semibold">${Utils.escapeHTML(d.title)}</div>
            <div class="text-sm text-slate-600">${Utils.escapeHTML(d.author)}</div>
            <div class="mt-2">Stok tersedia: ${d.availableStock || 0}</div>
          </div>
        </div>
      `;
    } catch (e) {
      console.error('showBook', e);
      cont.innerHTML = '<p>Gagal memuat data buku.</p>';
    }
  }

  async function submitRequest(e) {
    e.preventDefault();
    const bookId = getBookIdFromUrl();
    if (!bookId) return alert('bookId missing');
    const note = DOMPurify.sanitize(document.getElementById('note').value || '');
    const user = auth.currentUser;
    if (!user) { window.location.href = 'login.html'; return; }

    try {
      // create loan request
      await db.collection('loans').add({
        bookId,
        userId: user.uid,
        note,
        requestAt: firebase.firestore.FieldValue.serverTimestamp(),
        approvedAt: null,
        dueDate: null,
        returnedAt: null,
        status: 'requested'
      });
      document.getElementById('borrow-msg').textContent = 'Permintaan berhasil dikirim. Tunggu konfirmasi admin.';
    } catch (err) {
      console.error('submitRequest', err);
      alert('Gagal mengirim permintaan: ' + err.message);
    }
  }

  // Member history view
  async function showHistory() {
    const user = auth.currentUser;
    if (!user) {
      // redirect if not logged in
      window.location.href = 'login.html';
      return;
    }
    const el = document.getElementById('loanHistory');
    el.innerHTML = 'Memuat riwayat...';
    try {
      const snap = await db.collection('loans').where('userId', '==', user.uid).orderBy('requestAt', 'desc').get();
      if (snap.empty) { el.innerHTML = '<p>Tidak ada riwayat.</p>'; return; }
      el.innerHTML = '';
      for (const doc of snap.docs) {
        const d = doc.data();
        // fetch book title
        const bdoc = await db.collection('books').doc(d.bookId).get();
        const title = bdoc.exists ? bdoc.data().title : d.bookId;
        const status = d.status || 'requested';
        let statusBadge = `<span class="px-2 py-1 rounded text-xs">${Utils.escapeHTML(status)}</span>`;
        if (status === 'approved') statusBadge = `<span class="px-2 py-1 rounded text-xs bg-green-100 text-green-800">Disetujui</span>`;
        if (status === 'rejected') statusBadge = `<span class="px-2 py-1 rounded text-xs bg-red-100 text-red-800">Ditolak</span>`;
        if (status === 'returned') statusBadge = `<span class="px-2 py-1 rounded text-xs bg-slate-100 text-slate-800">Selesai</span>`;
        if (status === 'overdue') statusBadge = `<span class="px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-800">Terlambat</span>`;

        const reqDate = d.requestAt && d.requestAt.toDate ? Utils.formatDate(d.requestAt) : '-';
        const due = d.dueDate && d.dueDate.toDate ? Utils.formatDate(d.dueDate) : '-';
        const ret = d.returnedAt && d.returnedAt.toDate ? Utils.formatDate(d.returnedAt) : '-';

        const card = document.createElement('div');
        card.className = 'p-3 border rounded mb-3';
        card.innerHTML = `
          <div class="flex justify-between items-start">
            <div>
              <div class="font-semibold">${Utils.escapeHTML(title)}</div>
              <div class="text-sm text-slate-600">Tanggal request: ${reqDate}</div>
              <div class="text-sm">Tenggat: ${due} • Dikembalikan: ${ret}</div>
            </div>
            <div>${statusBadge}</div>
          </div>
        `;
        el.appendChild(card);
      }
    } catch (e) {
      console.error('showHistory', e);
      el.innerHTML = '<p>Gagal memuat riwayat.</p>';
    }
  }

  return {
    init: async function () {
      // called on borrow.html
      const bookId = getBookIdFromUrl();
      if (!bookId) {
        document.getElementById('book-summary').textContent = 'Parameter bookId tidak ada';
        return;
      }
      await showBookSummary(bookId);
      const form = document.getElementById('borrow-form');
      if (form) form.addEventListener('submit', submitRequest);
    },

    initHistory: function () {
      // called on history.html - wait for auth state
      auth.onAuthStateChanged(user => {
        if (user) showHistory();
        else window.location.href = 'login.html';
      });
    }
  };
})();

window.Borrow = Borrow;
