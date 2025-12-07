import { db } from './firebase-config.js';
import { collection, getDocs, query, where, orderBy } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import Chart from 'https://cdn.jsdelivr.net/npm/chart.js@4.3.0/dist/chart.umd.js';

// Load data dan render chart
export async function loadCharts() {
    // Top books by loans
    const loans = await getDocs(collection(db, 'loans'));
    const bookCounts = {};
    loans.docs.forEach(doc => {
        const bookId = doc.data().bookId;
        bookCounts[bookId] = (bookCounts[bookId] || 0) + 1;
    });
    const topBooks = Object.entries(bookCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const ctx1 = document.getElementById('topBooksChart').getContext('2d');
    new Chart(ctx1, {
        type: 'bar',
        data: {
            labels: topBooks.map(([id]) => `Buku ${id}`),
            datasets: [{ label: 'Jumlah Peminjaman', data: topBooks.map(([, count]) => count), backgroundColor: '#0ea5e9' }]
        }
    });

    // Loans per month (last 6 months)
    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
        const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push(month);
    }
    const monthlyCounts = months.map(month => {
        const count = loans.docs.filter(doc => {
            const date = new Date(doc.data().requestAt.seconds * 1000);
            return date.getMonth() === month.getMonth() && date.getFullYear() === month.getFullYear();
        }).length;
        return count;
    });
    const ctx2 = document.getElementById('loansPerMonthChart').getContext('2d');
    new Chart(ctx2, {
        type: 'line',
        data: {
            labels: months.map(m => m.toLocaleDateString('id', { month: 'short', year: 'numeric' })),
            datasets: [{ label: 'Peminjaman', data: monthlyCounts, borderColor: '#0ea5e9' }]
        }
    });

    // Active members
    const users = await getDocs(query(collection(db, 'users'), where('active', '==', true)));
    document.getElementById('activeMembers').textContent = users.size;
}

// Load on page
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('stats.html')) loadCharts();
});