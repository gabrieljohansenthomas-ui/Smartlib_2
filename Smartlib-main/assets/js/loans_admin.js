/**
 * loans_admin.js
 * Admin UI for managing loan requests:
 * - List loans
 * - Approve / Reject requests (calls Cloud Function 'processLoan' if available; fallback to direct Firestore update)
 * - Mark returned (and increment book availableStock)
 *
 * Security note:
 * - Cloud Function should validate admin role and perform stock updates server-side.
 * - Client fallback uses Firestore transaction but should still be allowed only for admin by rules.
 */

const LoansAdmin = (function () {
  const db = window.firebaseDb;
  const functions = window.firebaseFunctions;
  const auth = window.firebaseAuth;

  async function renderLoans() {
    const el = document.getElementById('loanList');
    el.innerHTML = 'Memuat...';
    try {
      const snap = await db.collection('loans').orderBy('requestAt', 'desc').get();
      if (snap.empty) { el.innerHTML = '<p>Tidak ada permintaan.</p>'; return; }
      el.innerHTML = '';
      for (const doc of snap.docs) {
        const d = doc.data();
        const loanId = doc.id;
        // fetch user and book
        const [uSnap, bSnap] = await Promise.all([
          db.collection('users').doc(d.userId).get(),
          db.collection('books').doc(d.bookId).get()
        ]);
        const userName = uSnap.exists ? uSnap.data().displayName || uSnap.data().email : d.userId;
        const bookTitle = bSnap.exists ? bSnap.data().title : d.bookId;
        const status = d.status || 'requested';
        const statusBadge = (() => {
          if (status === 'requested') return `<span class="px-2 py-1 rounded text-xs bg-gray-100">Requested</span>`;
          if (status === 'approved') return `<span class="px-2 py-1 rounded text-xs bg-green-100 text-green-700">Approved</span>`;
          if (status === 'rejected') return `<span class="px-2 py-1 rounded text-xs bg-red-100 text-red-700">Rejected</span>`;
          if (status === 'returned') return `<span class="px-2 py-1 rounded text-xs bg-slate-100">Returned</span>`;
          if (status === 'overdue') return `<span class="px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-700">Overdue</span>`;
          return `<span class="px-2 py-1 rounded text-xs">${Utils.escapeHTML(status)}</span>`;
        })();

        const card = document.createElement('div');
        card.className = 'p-3 border rounded mb-3';
        card.innerHTML = `
          <div class="flex justify-between">
            <div>
              <div class="font-semibold">${Utils.escapeHTML(bookTitle)}</div>
              <div class="text-sm text-slate-600">Pemohon: ${Utils.escapeHTML(userName)} • Catatan: ${Utils.escapeHTML(d.note || '')}</div>
              <div class="text-sm">Permintaan: ${d.requestAt && d.requestAt.toDate ? Utils.formatDate(d.requestAt) : '-'}</div>
            </div>
            <div class="text-right">
              ${statusBadge}
              <div class="mt-2 space-x-2">
                ${status === 'requested' ? `<button data-id="${loanId}" data-action="approve" class="approve-btn bg-green-600 text-white px-3 py-1 rounded">Setujui</button>
                <button data-id="${loanId}" data-action="reject" class="reject-btn bg-red-600 text-white px-3 py-1 rounded">Tolak</button>` : ''}
                ${status === 'approved' ? `<button data-id="${loanId}" data-action="return" class="return-btn bg-sky-600 text-white px-3 py-1 rounded">Catat Kembali</button>` : ''}
              </div>
            </div>
          </div>
        `;
        el.appendChild(card);
      }

      // attach handlers
      el.querySelectorAll('.approve-btn').forEach(btn => btn.addEventListener('click', () => processAction(btn.dataset.id, 'approve')));
      el.querySelectorAll('.reject-btn').forEach(btn => btn.addEventListener('click', () => processAction(btn.dataset.id, 'reject')));
      el.querySelectorAll('.return-btn').forEach(btn => btn.addEventListener('click', () => processAction(btn.dataset.id, 'return')));
    } catch (e) {
      console.error('renderLoans', e);
      document.getElementById('loanList').innerHTML = '<p>Gagal memuat permintaan.</p>';
    }
  }

  async function processAction(loanId, action) {
    // action: approve | reject | return
    // Attempt to call Callable Function 'processLoan' first
    try {
      if (functions && functions.httpsCallable) {
        const fn = functions.httpsCallable('processLoan');
        // supply action and loanId
        const payload = { loanId, action };
        const resp = await fn(payload);
        console.log('processLoan resp', resp);
        // refresh
        await renderLoans();
        return;
      }
    } catch (err) {
      console.warn('Callable function processLoan failed or not available, fallback to client-side update', err);
    }

    // Fallback: client updates (admin only)
    try {
      if (action === 'approve') {
        // approve: set approvedAt, dueDate (14 days), decrement availableStock
        await firebase.firestore().runTransaction(async (t) => {
          const loanRef = firebase.firestore().collection('loans').doc(loanId);
          const loanSnap = await t.get(loanRef);
          if (!loanSnap.exists) throw new Error('Loan not found');
          const loan = loanSnap.data();
          if (loan.status !== 'requested') throw new Error('Loan must be in requested status');

          const bookRef = firebase.firestore().collection('books').doc(loan.bookId);
          const bookSnap = await t.get(bookRef);
          if (!bookSnap.exists) throw new Error('Book not found');
          const book = bookSnap.data();
          if ((book.availableStock || 0) <= 0) throw new Error('Tidak ada stok tersedia');

          const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
          t.update(loanRef, {
            status: 'approved',
            approvedAt: firebase.firestore.FieldValue.serverTimestamp(),
            dueDate: firebase.firestore.Timestamp.fromDate(dueDate)
          });
          t.update(bookRef, { availableStock: (book.availableStock || 0) - 1 });
        });
      } else if (action === 'reject') {
        await db.collection('loans').doc(loanId).update({ status: 'rejected', processedAt: firebase.firestore.FieldValue.serverTimestamp() });
      } else if (action === 'return') {
        // mark returnedAt and increment stock
        await firebase.firestore().runTransaction(async (t) => {
          const loanRef = firebase.firestore().collection('loans').doc(loanId);
          const loanSnap = await t.get(loanRef);
          if (!loanSnap.exists) throw new Error('Loan not found');
          const loan = loanSnap.data();
          const bookRef = firebase.firestore().collection('books').doc(loan.bookId);
          const bookSnap = await t.get(bookRef);
          if (!bookSnap.exists) throw new Error('Book not found');
          const book = bookSnap.data();

          t.update(loanRef, { status: 'returned', returnedAt: firebase.firestore.FieldValue.serverTimestamp() });
          t.update(bookRef, { availableStock: (book.availableStock || 0) + 1 });
        });
      }
      await renderLoans();
    } catch (err) {
      console.error('processAction fallback error', err);
      alert('Gagal memproses tindakan: ' + err.message);
    }
  }

  return {
    init: function () {
      renderLoans();
    }
  };
})();

window.LoansAdmin = LoansAdmin;
