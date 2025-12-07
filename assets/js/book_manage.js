import { db } from './firebase-config.js';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

// CRUD Buku (Admin only) - Lanjutan
export async function updateBook(id, data) {
    if (!validateBookData(data)) return alert('Data tidak valid');
    await updateDoc(doc(db, 'books', id), { ...data, updatedAt: new Date() });
}

export async function deleteBook(id) {
    await deleteDoc(doc(db, 'books', id));
}

// Validasi input untuk buku (client-side + server-side di functions)
function validateBookData(data) {
    if (data.title.length > 100 || data.author.length > 50 || data.isbn.length !== 13) return false;
    if (data.totalStock < 1) return false;
    return true; // TODO: Tambahkan validasi URL cover jika perlu
}

// Load dan display tabel buku
export async function loadBooks() {
    const snapshot = await getDocs(collection(db, 'books'));
    const books = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    document.getElementById('booksTable').innerHTML = `
        <table class="w-full table-auto border-collapse border border-gray-300">
            <thead>
                <tr class="bg-gray-100">
                    <th class="border px-4 py-2">Judul</th>
                    <th class="border px-4 py-2">Penulis</th>
                    <th class="border px-4 py-2">Stok</th>
                    <th class="border px-4 py-2">Aksi</th>
                </tr>
            </thead>
            <tbody>
                ${books.map(book => `
                    <tr>
                        <td class="border px-4 py-2">${book.title}</td>
                        <td class="border px-4 py-2">${book.author}</td>
                        <td class="border px-4 py-2">${book.availableStock}/${book.totalStock}</td>
                        <td class="border px-4 py-2">
                            <button onclick="editBook('${book.id}')" class="text-blue-600">Edit</button>
                            <button onclick="deleteBook('${book.id}')" class="text-red-600 ml-2">Hapus</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// CRUD Anggota (Admin: aktifkan/nonaktifkan)
export async function toggleUserActive(uid, active) {
    await updateDoc(doc(db, 'users', uid), { active });
}

export async function loadMembers() {
    const snapshot = await getDocs(collection(db, 'users'));
    const members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    document.getElementById('membersTable').innerHTML = `
        <table class="w-full table-auto border-collapse border border-gray-300">
            <thead>
                <tr class="bg-gray-100">
                    <th class="border px-4 py-2">Nama</th>
                    <th class="border px-4 py-2">Email</th>
                    <th class="border px-4 py-2">Status</th>
                    <th class="border px-4 py-2">Aksi</th>
                </tr>
            </thead>
            <tbody>
                ${members.map(member => `
                    <tr>
                        <td class="border px-4 py-2">${member.displayName}</td>
                        <td class="border px-4 py-2">${member.email}</td>
                        <td class="border px-4 py-2">${member.active ? 'Aktif' : 'Nonaktif'}</td>
                        <td class="border px-4 py-2">
                            <button onclick="toggleUserActive('${member.id}', ${!member.active})" class="text-blue-600">${member.active ? 'Nonaktifkan' : 'Aktifkan'}</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// Event listeners untuk modal dan form
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('books.html')) {
        loadBooks();
        document.getElementById('addBookBtn')?.addEventListener('click', () => {
            document.getElementById('bookModal').classList.remove('hidden');
        });
        document.getElementById('closeModal')?.addEventListener('click', () => {
            document.getElementById('bookModal').classList.add('hidden');
        });
        document.getElementById('bookForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = {
                title: document.getElementById('title').value,
                author: document.getElementById('author').value,
                isbn: document.getElementById('isbn').value,
                category: document.getElementById('category').value,
                description: document.getElementById('description').value,
                coverUrl: document.getElementById('coverUrl').value,
                totalStock: parseInt(document.getElementById('totalStock').value)
            };
            await addBook(data);
            loadBooks();
            document.getElementById('bookModal').classList.add('hidden');
        });
    }
    if (window.location.pathname.includes('members.html')) {
        loadMembers();
    }
});