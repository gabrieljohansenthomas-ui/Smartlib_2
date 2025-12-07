import { db } from './firebase-config.js';
import { collection, query, where, orderBy, limit, startAfter, getDocs } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import { escapeHTML } from './utils.js';

let lastDoc = null;
let currentPage = 1;

// Load katalog dengan filter dan pagination
export async function loadCatalog(search = '', category = '', status = '', page = 1) {
  const booksRef = collection(db, 'books');
  let q = query(booksRef, orderBy('title'), limit(10));
  if (search) q = query(q, where('title', '>=', search), where('title', '<=', search + '\uf8ff'));
  if (category) q = query(q, where('category', '==', category));
  if (status === 'available') q = query(q, where('availableStock', '>', 0));
  if (status === 'borrowed') q = query(q, where('availableStock', '==', 0));
  if (page > 1 && lastDoc) q = query(q, startAfter(lastDoc));

  const snapshot = await getDocs(q);
  lastDoc = snapshot.docs[snapshot.docs.length - 1];
  const booksList = document.getElementById('bookList');
  booksList.innerHTML = '';
  snapshot.forEach(doc => {
    const book = doc.data();
    booksList.innerHTML += `
      <div class="bg-white p-4 rounded-lg shadow">
        <img src="${escapeHTML(book.coverUrl)}" alt="${escapeHTML(book.title)}" class="w-full h-48 object-cover mb-4">
        <h3 class="text-xl font-bold">${escapeHTML(book.title)}</h3>
        <p>Penulis: ${escapeHTML(book.author)}</p>
        <p>Stok: ${book.availableStock}/${book.totalStock}</p>
        <a href="book_detail.html?id=${doc.id}" class="bg-blue-600 text-white px-4 py-2 rounded mt-2 inline-block">Detail</a>
      </div>
    `;
  });
  updatePagination(snapshot.size === 10);
}

// Load kategori untuk filter
export async function loadCategories() {
  const snapshot = await getDocs(collection(db, 'books'));
  const categories = new Set();
  snapshot.forEach(doc => categories.add(doc.data().category));
  const select = document.getElementById('categoryFilter');
  categories.forEach(cat => select.innerHTML += `<option value="${cat}">${cat}</option>`);
}

// Event listeners
document.getElementById('searchBtn')?.addEventListener('click', () => {
  const search = document.getElementById('searchInput').value;
  const category = document.getElementById('categoryFilter').value;
  const status = document.getElementById('statusFilter').value;
  loadCatalog(search, category, status, 1);
});

document.getElementById('prevBtn')?.addEventListener('click', () => {
  if (currentPage > 1) loadCatalog('', '', '', --currentPage);
});

document.getElementById('nextBtn')?.addEventListener('click', () => {
  loadCatalog('', '', '', ++currentPage);
});

loadCategories();
loadCatalog();
