import { db } from './firebase-config.js';
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import { DOMPurify } from 'https://cdn.jsdelivr.net/npm/dompurify@3.0.6/dist/purify.min.js';

// Fetch dan display katalog dengan search/filter/pagination
export async function loadCatalog(search = '', category = '', status = '', page = 1) {
    const booksRef = collection(db, 'books');
    let q = query(booksRef, orderBy('title'), limit(10 * page)); // Pagination sederhana
    if (category) q = query(q, where('category', '==', category));
    // Status filter: available if availableStock > 0
    const snapshot = await getDocs(q);
    const books = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(book => {
        if (status === 'available') return book.availableStock > 0;
        if (status === 'borrowed') return book.availableStock <= 0;
        return book.title.toLowerCase().includes(search.toLowerCase());
    });
    displayBooks(books);
}

// Display books dengan sanitasi
function displayBooks(books) {
    const container = document.getElementById('bookList') || document.getElementById('featuredBooks');
    container.innerHTML = books.map(book => `
        <div class="bg-white p-4 rounded-lg shadow hover:shadow-lg transition">
            <img src="${book.coverUrl || 'placeholder.jpg'}" alt="${DOMPurify.sanitize(book.title)}" class="w-full h-48 object-cover mb-4">
            <h3 class="font-bold">${DOMPurify.sanitize(book.title)}</h3>
            <p>Penulis: ${DOMPurify.sanitize(book.author)}</p>
            <p>Stok: ${book.availableStock}/${book.totalStock}</p>
            <a href="book_detail.html?id=${book.id}" class="text-blue-600 hover:underline">Lihat Detail</a>
        </div>
    `).join('');
}

// Load detail buku + rata-rata rating
export async function loadBookDetail(bookId) {
    const bookDoc = await getDoc(doc(db, 'books', bookId));
    if (bookDoc.exists()) {
        const book = bookDoc.data();
        const avgRating = await calculateAvgRating(bookId);
        document.getElementById('bookDetail').innerHTML = `
            <img src="${book.coverUrl}" alt="${DOMPurify.sanitize(book.title)}" class="w-full h-64 object-cover mb-4">
            <h2 class="text-2xl font-bold">${DOMPurify.sanitize(book.title)}</h2>
            <p>Rating: ${avgRating}/5</p>
            <p>${DOMPurify.sanitize(book.description)}</p>
            <button id="borrowBtn" class="bg-blue-600 text-white px-4 py-2 rounded">Pinjam</button>
        `;
    }
}

// Helper: Hitung rata-rata rating
async function calculateAvgRating(bookId) {
    const reviews = await getDocs(query(collection(db, 'reviews'), where('bookId', '==', bookId)));
    const ratings = reviews.docs.map(doc => doc.data().rating);
    return ratings.length ? (ratings.reduce((a, b) => a + b) / ratings.length).toFixed(1) : 0;
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const bookId = urlParams.get('id');
    if (bookId) loadBookDetail(bookId);
    else loadCatalog();
    // Search/filter events
    document.getElementById('searchInput')?.addEventListener('input', () => loadCatalog(document.getElementById('searchInput').value));
    document.getElementById('categoryFilter')?.addEventListener('change', () => loadCatalog('', document.getElementById('categoryFilter').value));
    document.getElementById('statusFilter')?.addEventListener('change', () => loadCatalog('', '', document.getElementById('statusFilter').value));
});