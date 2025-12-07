import { db } from './firebase-config.js';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import { escapeHTML } from './utils.js';

// Load daftar buku untuk admin
export async function loadBooks() {
  const snapshot = await getDocs(collection(db, 'books'));
  const booksList = document.getElementById('booksList');
  booksList.innerHTML = '';
  snapshot.forEach(doc => {
    const book = doc.data();
    booksList.innerHTML += `
      <div class="bg-white p-4 rounded-lg shadow flex justify-between items-center">
        <div>
          <h3 class="text-xl font-bold">${escapeHTML(book.title)}</h3>
          <p>Stok: ${book.availableStock}/${book.totalStock}</p>
        </div>
        <div>
          <button onclick="editBook('${doc.id}')" class="bg-yellow-500 text-white px-4 py-2 rounded mr-2">Edit</button>
          <button onclick="deleteBook('${doc.id}')" class="bg-red-500 text-white px-4 py-2 rounded">Hapus</button>
        </div>
      </div>
    `;
  });
}

// Tambah/Edit buku dengan validasi
export async function saveBook(bookId = null) {
  const title = document.getElementById('title').value.trim();
  const author = document.getElementById('author').value.trim();
  const isbn = document.getElementById('isbn').value.trim();
  const category = document.getElementById('category').value.trim();
  const description = document.getElementById('description').value.trim();
  const coverUrl = document.getElementById('coverUrl').value.trim();
  const totalStock = parseInt(document.getElementById('totalStock').value);

  if (!title || !author || !isbn || !category || !description || !coverUrl || totalStock < 1) {
    alert('Semua field wajib diisi dengan benar.');
    return;
  }

  const bookData = {
    title,
    author,
    isbn,
    category,
    description,
    coverUrl,
    totalStock,
    availableStock: totalStock, // Default sama dengan total
    createdAt: new Date(),
    updatedAt: new Date(),
    popularityScore: 0
  };

  if (bookId) {
    await updateDoc(doc(db, 'books', bookId), bookData);
  } else {
    await addDoc(collection(db, 'books'), bookData);
  }
  document.getElementById('bookModal').classList.add('hidden');
  loadBooks();
}

// Hapus buku
export async function deleteBook(bookId) {
  if (confirm('Yakin hapus buku ini?')) {
    await deleteDoc(doc(db, 'books', bookId));
    loadBooks();
  }
}

// Load anggota untuk admin (reuse logic)
export async function loadMembers() {
  const snapshot = await getDocs(collection(db, 'users'));
  const membersList = document.getElementById('membersList');
  membersList.innerHTML = '';
  snapshot.forEach(doc => {
    const user = doc.data();
    membersList.innerHTML += `
      <div class="bg-white p-4 rounded-lg shadow flex justify-between items-center">
        <div>
          <h3 class="text-xl font-bold">${escapeHTML(user.displayName)}</h3>
          <p>Email: ${escapeHTML(user.email)} | Status: ${user.active ? 'Aktif' : 'Nonaktif'}</p>
        </div>
        <button onclick="toggleActive('${doc.id}', ${!user.active})" class="bg-blue-600 text-white px-4 py-2 rounded">${user.active ? 'Nonaktifkan' : 'Aktifkan'}</button>
      </div>
    `;
  });
}

// Toggle aktif/nonaktif anggota
export async function toggleActive(userId, active) {
  await updateDoc(doc(db, 'users', userId), { active });
  loadMembers();
}

// Event listeners
document.getElementById('addBookBtn')?.addEventListener('click', () => {
  document.getElementById('bookModal').classList.remove('hidden');
  document.getElementById('modalTitle').textContent = 'Tambah Buku';
  document.getElementById('bookForm').reset();
});

document.getElementById('closeModal')?.addEventListener('click', () => {
  document.getElementById('bookModal').classList.add('hidden');
});

document.getElementById('bookForm')?.addEventListener('submit', (e) => {
  e.preventDefault();
  saveBook();
});

// Load data saat halaman load
if (window.location.pathname.includes('books.html')) loadBooks();
if (window.location.pathname.includes('members.html')) loadMembers();
