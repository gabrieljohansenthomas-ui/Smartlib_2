import { db } from './firebase-config.js';
import { collection, query, where, orderBy, limit, getDocs } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import Chart from 'https://cdn.jsdelivr.net/npm/chart.js@3.9.1/+esm';

// Load statistik untuk dashboard admin
export async function loadStats() {
  // Top books by loans
  const loansSnapshot = await getDocs(collection(db, 'loans'));
  const bookCounts = {};
  loansSnapshot.forEach(doc => {
    const bookId = doc.data().bookId;
    bookCounts[bookId] = (bookCounts[bookId] || 0) + 1;
  });
  const topBooks = Object.entries(bookCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const labels = topBooks.map(([id]) => `Buku ${id}`);
  const data = topBooks.map(([, count]) => count);
  new Chart(document.getElementById('topBooksChart'), {
    type: 'bar',
    data: { labels, datasets: [{ label: 'Jumlah Peminjaman', data, backgroundColor: '#0ea5e9' }] }
  });

  // Loans per month (last 6-12 months)
  const now = new Date();
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(date.toISOString().slice(0, 7)); // YYYY-MM
  }
  const monthlyLoans = months.map(month => {
    return loansSnapshot.docs.filter(doc => {
      const approvedAt = doc.data().approvedAt;
      return approvedAt && approvedAt.toDate().toISOString().slice(0, 7) === month;
    }).length;
  });
  new Chart(document.getElementById('loansChart'), {
    type: 'line',
    data: { labels: months, datasets: [{ label: 'Peminjaman', data: monthlyLoans, borderColor: '#0ea5e9' }] }
  });

  // Active members
  const usersSnapshot = await getDocs(query(collection(db, 'users'), where('active', '==', true)));
  document.getElementById('activeMembers').textContent = usersSnapshot.size;
}

// Load saat halaman stats
if (window.location.pathname.includes('stats.html')) loadStats();
