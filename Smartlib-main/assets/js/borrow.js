import { db, auth } from './firebase-config.js';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, increment } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import { httpsCallable } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-functions.js';
import { escapeHTML, formatDate } from './utils.js';

// Request pinjam buku (dari katalog)
export async function requestBorrow(bookId) {
  const user = auth.currentUser;
  if (!user) return alert('Login dulu.');
  await addDoc(collection(db, 'loans'), {
    bookId,
    userId: user.uid,
    requestAt: new Date(),
    status: 'requested'
  });
  alert('Request pinjam dikirim. Tunggu konfirmasi admin.');
}

// Load riwayat peminjaman per anggota
export async function loadLoanHistory() {
  const user = auth.currentUser;
  if (!user) return;
  const q = query(collection(db, 'loans'), where('userId', '==', user.uid));
  const snapshot = await getDocs(q);
  const loanHistory = document.getElementById('loanHistory');
  loanHistory.innerHTML = '';
  snapshot.forEach(doc => {
    const loan = doc.data();
    const statusText = loan.status === 'overdue' ? 'Terlambat' : loan.status.charAt(0).toUpperCase() + loan.status.slice(1);
    loanHistory.innerHTML += `
      <div class="bg-white p-4 rounded-lg shadow">
        <p>Buku ID: ${escapeHTML(loan.bookId)}</p>
        <p>Status: ${statusText}</p>
        <p>Tanggal Pinjam: ${formatDate(loan.approvedAt)}</p>
        <p>Tenggat: ${formatDate(loan.dueDate)}</p>
        ${loan.status === 'approved' ? `<button onclick="returnBook('${doc.id}')" class="bg-green-500 text-white px-4 py-2 rounded">Kembalikan</button>` : ''}
      </div>
    `;
  });
}

// Kembalikan buku
export async function returnBook(loanId) {
  await updateDoc(doc(db, 'loans', loanId), {
    returnedAt: new Date(),
    status: 'returned'
  });
  // Update stok buku
  const loanDoc = await getDoc(doc(db, 'loans', loanId));
  const bookId = loanDoc.data().bookId;
  await updateDoc(doc(db, 'books', bookId), { availableStock: increment(1) });
  loadLoanHistory();
}

// Admin: Load pending requests
export async function loadPendingRequests() {
  const q = query(collection(db, 'loans'), where('status', '==', 'requested'));
  const snapshot = await getDocs(q);
  // Tampilkan di UI admin (mis. di books.html atau halaman terpisah)
  // Approve/Reject logic: update status, set approvedAt/dueDate, decrement stok
}

// Event listeners
document.addEventListener('DOMContentLoaded', loadLoanHistory);
