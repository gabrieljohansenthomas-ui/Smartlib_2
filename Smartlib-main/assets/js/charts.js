/**
 * charts.js
 * Admin charts using Chart.js
 *
 * - Top books by number of loans
 * - Loans per month for last 6 months
 * - Active members count
 *
 * Implementation is done client-side by aggregating Firestore collections.
 * For large datasets, move aggregation to Cloud Functions (recommended).
 */

const Charts = (function () {
  const db = window.firebaseDb;

  async function fetchTopBooks(limitN = 6) {
    // count loans per book
    const loansSnap = await db.collection('loans').get();
    const counts = {};
    loansSnap.forEach(d => {
      const b = d.data().bookId;
      counts[b] = (counts[b] || 0) + 1;
    });
    const pairs = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, limitN);
    const labels = [], data = [];
    for (const [bookId, cnt] of pairs) {
      const bSnap = await db.collection('books').doc(bookId).get();
      labels.push(bSnap.exists ? bSnap.data().title : bookId);
      data.push(cnt);
    }
    return { labels, data };
  }

  async function fetchLoansPerMonth(months = 6) {
    const now = new Date();
    const labels = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      labels.push(d.toLocaleString('id-ID', { month: 'short', year: 'numeric' }));
    }
    const counts = new Array(months).fill(0);
    const loansSnap = await db.collection('loans').get();
    loansSnap.forEach(doc => {
      const d = doc.data();
      const req = d.requestAt && d.requestAt.toDate ? d.requestAt.toDate() : null;
      if (!req) return;
      const diffMonths = (now.getFullYear() - req.getFullYear()) * 12 + (now.getMonth() - req.getMonth());
      if (diffMonths >= 0 && diffMonths < months) {
        counts[months - 1 - diffMonths] += 1;
      }
    });
    return { labels, data: counts };
  }

  async function fetchActiveMembersCount() {
    const snap = await db.collection('users').where('active', '==', true).get();
    return snap.size;
  }

  return {
    init: async function () {
      // top books
      const topCanvas = document.getElementById('top-books-chart')?.getContext('2d');
      const loansCanvas = document.getElementById('loans-chart')?.getContext('2d');
      const activeEl = document.getElementById('active-members');

      const top = await fetchTopBooks();
      if (topCanvas) {
        new Chart(topCanvas, {
          type: 'bar',
          data: { labels: top.labels, datasets: [{ label: 'Jumlah Peminjaman', data: top.data }] },
          options: { responsive: true, maintainAspectRatio: false }
        });
      }

      const loansSeries = await fetchLoansPerMonth(6);
      if (loansCanvas) {
        new Chart(loansCanvas, {
          type: 'line',
          data: { labels: loansSeries.labels, datasets: [{ label: 'Peminjaman', data: loansSeries.data, fill: true }] },
          options: { responsive: true, maintainAspectRatio: false }
        });
      }

      const activeCount = await fetchActiveMembersCount();
      if (activeEl) activeEl.textContent = activeCount;
    }
  };
})();

window.Charts = Charts;
