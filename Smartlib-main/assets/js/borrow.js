import { db, auth } from "./firebase-config.js";
import { getQueryParam, sanitizeHTML, formatDate } from "./utils.js";

import {
  collection, addDoc, getDoc, doc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

/* Borrow page */
const id = getQueryParam("id");
const container = document.getElementById("borrowForm");

if (container && id) {
  loadBook();
}

async function loadBook() {
  const snap = await getDoc(doc(db, "books", id));
  if (!snap.exists()) return container.innerHTML = "Buku tidak ditemukan.";

  const b = snap.data();

  container.innerHTML = `
    <p class="mb-4">Buku: <b>${sanitizeHTML(b.title)}</b></p>
    <button id="reqBtn"
      class="px-4 py-2 bg-sky-600 text-white rounded">Ajukan Peminjaman</button>
  `;

  document.getElementById("reqBtn").onclick = makeRequest;
}

async function makeRequest() {
  onAuthStateChanged(auth, async user => {
    if (!user) return alert("Login dulu.");

    await addDoc(collection(db, "loans"), {
      bookId: id,
      userId: user.uid,
      requestAt: new Date(),
      approvedAt: null,
      dueDate: null,
      returnedAt: null,
      status: "requested"
    });

    alert("Permintaan peminjaman dikirim.");
    window.location.href = "katalog.html";
  });
}
