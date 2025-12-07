import { db } from "./firebase-config.js";
import {
  collection, getDocs, query, where, limit
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import { sanitizeHTML } from "./utils.js";

const bookList = document.getElementById("bookList");

/* Load buku dengan filter */
async function loadBooks() {
  bookList.innerHTML = "Memuat...";

  const q = query(collection(db, "books"), limit(40));
  const snap = await getDocs(q);

  let books = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  const search = sanitizeHTML(document.getElementById("searchInput").value.trim().toLowerCase());
  if (search) {
    books = books.filter(b =>
      b.title.toLowerCase().includes(search) ||
      b.author.toLowerCase().includes(search)
    );
  }

  const cat = document.getElementById("categoryFilter").value;
  if (cat) books = books.filter(b => b.category === cat);

  const status = document.getElementById("statusFilter").value;
  if (status === "available")
    books = books.filter(b => b.availableStock > 0);
  if (status === "borrowed")
    books = books.filter(b => b.availableStock <= 0);

  renderBooks(books);
}

/* Render */
function renderBooks(list) {
  bookList.innerHTML = "";
  list.forEach(b => {
    bookList.innerHTML += `
      <div class="bg-white rounded shadow hover:shadow-lg card-hover p-4">
        <img src="${b.coverUrl}" class="w-full h-40 object-cover rounded">
        <h3 class="font-bold mt-2">${escapeHTML(b.title)}</h3>
        <p class="text-sm text-gray-600">${escapeHTML(b.author)}</p>

        <a href="book_detail.html?id=${b.id}"
           class="block mt-3 px-3 py-2 bg-sky-600 text-white text-center rounded">
          Detail
        </a>
      </div>`;
  });
}

/* Events */
["searchInput", "categoryFilter", "statusFilter"].forEach(id => {
  if (document.getElementById(id)) {
    document.getElementById(id).addEventListener("input", loadBooks);
  }
});

loadBooks();
