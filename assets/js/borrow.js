import { db, auth } from './firebase-config.js';
import { collection, addDoc, updateDoc, doc, getDocs, query, where, orderBy } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

// Request pinjam (member)
export async function requestBorrow(bookId) {
    const user = auth.currentUser;
    if (!user) return alert('Login dulu');
    await addDoc(collection(db, 'loans'), {
        bookId,
        userId: user.uid,
        requestAt: new Date(),
        status: 'requested'
    });
    alert('Request dikirim!');
}

// Approve/Reject (admin) - Update stok
export async function approveLoan(loanId, bookId) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14); // 14 hari
    await updateDoc(doc(db, 'loans', loanId), {
        status: 'approved',
        approvedAt: new Date(),
        dueDate
    });
    // Update stok
    const bookDoc = await getDoc(doc(db, 'books', bookId));
    const availableStock = bookDoc.data().availableStock - 1;
    await updateDoc(doc(db, 'books', bookId), { availableStock });
}

// Return (admin) - Update stok
export async function returnBook(loanId, bookId) {
    await updateDoc(doc(db, 'loans', loanId), {
        status: 'returned',
        returnedAt: new Date()
    });
    const bookDoc = await getDoc(doc(db, 'books', bookId));
    const availableStock = bookDoc.data().availableStock + 1;
    await updateDoc(doc(db, 'books', bookId), { availableStock });
}

// Load riwayat peminjaman per anggota
export async function loadBorrowHistory() {
    const user = auth.currentUser;
    if (!user) return;
    const q = query(collection(db, 'loans'), where('userId', '==', user.uid), orderBy('requestAt', 'desc'));
    const snapshot = await getDocs(q);
    const loans = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    document.getElementById('borrowHistory').innerHTML = loans.map(loan => `
        <div class="bg-white p-4 rounded-lg shadow">
            <p>Buku ID: ${loan.bookId}</p>
            <p>Status: ${loan.status}</p>
            <p>Tenggat: ${loan.dueDate ? new Date(loan.dueDate.seconds * 1000).toLocaleDateString() : 'N/A'}</p>
        </div>
    `).join('');
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    loadBorrowHistory();
    document.getElementById('borrowBtn')?.addEventListener('click', () => {
        const urlParams = new URLSearchParams(window.location.search);
        requestBorrow(urlParams.get('id'));
    });
});