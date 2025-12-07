import { db } from "./firebase-config.js";
import { requireAdmin } from "./auth.js";
import {
  collection, addDoc, getDocs, deleteDoc, doc, updateDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import { sanitizeHTML } from "./utils.js";

await requireAdmin();

/* ADD BOOK ----------------------------------------- */
const addBtn = document.getElementById("addBookBtn");
if (addBtn) {
  addBtn.addEventListener("click", async () => {
    const title = sanitizeHTML(bookTitle.value.trim());
    const author = sanitizeHTML(bookAuthor.value.trim());
    const isbn = sanitizeHTML(bookISBN.value.trim());
    const cat = sanitizeHTML(bookCategory.value.trim());
    const stock = Number(bookStock.value);
    const cover = sanitizeHTML(bookCover.value.trim());
    const desc = sanitizeHTML(bookDescription.value.trim());

    if (!title || !author) {
      alert("Judul dan penulis wajib.");
      return;
    }

    await addDoc(collection(db, "books"), {
      title, author, isbn, category: cat, description: desc,
      coverUrl: cover, totalStock: stock, availableStock: stock,
      createdAt: new Date(), updatedAt: new Date(), popularityScore: 0
    });

    alert("Buku ditambahkan.");
    location.reload();
  });
}


/* LIST BOOKS ----------------------------------------- */
const bookContainer = document.getElementById("adminBookList");
if (bookContainer) loadBooks();

async function loadBooks() {
  const snap = await getDocs(collection(db, "books"));
  bookContainer.innerHTML = "";

  snap.forEach(docu => {
    const b = docu.data();
    bookContainer.innerHTML += `
      <div class="bg-white p-4 rounded shadow">
        <img src="${b.coverUrl}" class="h-32 object-cover rounded w-full" />
        <h3 class="font-bold mt-2">${escapeHTML(b.title)}</h3>
        <p>${escapeHTML(b.author)}</p>
        <button onclick="deleteBook('${docu.id}')"
          class="mt-3 px-3 py-1 bg-red-600 text-white rounded">Hapus</button>
      </div>`;
  });
}

/* DELETE */
window.deleteBook = async id => {
  if (!confirm("Hapus buku ini?")) return;
  await deleteDoc(doc(db, "books", id));
  loadBooks();
};


/* MEMBER MANAGEMENT ----------------------------------- */
const memberList = document.getElementById("memberList");
if (memberList) loadMembers();

async function loadMembers() {
  const snap = await getDocs(collection(db, "users"));

  memberList.innerHTML = `
    <table class="w-full text-left">
      <tr>
        <th>Nama</th><th>Email</th><th>Role</th><th>Status</th><th>Aksi</th>
      </tr>
    `;

  snap.forEach(d => {
    const u = d.data();
    memberList.innerHTML += `
      <tr>
        <td>${escapeHTML(u.displayName)}</td>
        <td>${escapeHTML(u.email)}</td>
        <td>${u.role}</td>
        <td>${u.active ? "Aktif" : "Nonaktif"}</td>
        <td>
          <button onclick="toggleActive('${d.id}', ${!u.active})"
                  class="px-2 py-1 bg-sky-600 text-white rounded">
            ${u.active ? "Nonaktifkan" : "Aktifkan"}
          </button>
        </td>
      </tr>
    `;
  });

  memberList.innerHTML += `</table>`;
}

window.toggleActive = async (uid, v) => {
  await updateDoc(doc(db, "users", uid), { active: v });
  loadMembers();
};
