import { db, auth } from "./firebase-config.js";
import { getQueryParam, sanitizeHTML, formatDate } from "./utils.js";

import {
  collection, addDoc, getDocs, query, where
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const bookId = getQueryParam("id");
const reviewSection = document.getElementById("reviewSection");

if (reviewSection) loadReviews();

async function loadReviews() {
  const q = query(collection(db, "reviews"), where("bookId", "==", bookId));
  const snap = await getDocs(q);

  let total = 0, count = 0;
  let html = "";

  snap.forEach(d => {
    const r = d.data();
    count++;
    total += r.rating;

    html += `
      <div class="bg-white shadow p-4 rounded mb-3">
        <p class="font-bold">${"⭐".repeat(r.rating)}</p>
        <p>${sanitizeHTML(r.text)}</p>
        <p class="text-xs text-gray-500 mt-2">${formatDate(r.createdAt)}</p>
      </div>`;
  });

  const avg = count ? (total / count).toFixed(1) : "0";

  reviewSection.innerHTML = `
    <p class="text-lg mb-4">Rating rata-rata: <b>${avg}</b> / 5</p>

    <textarea id="reviewText" class="w-full border p-2 rounded"
      placeholder="Tulis ulasan..."></textarea>

    <select id="reviewRating" class="border p-2 rounded mt-2">
      <option value="5">5 - Sangat Bagus</option>
      <option value="4">4 - Bagus</option>
      <option value="3">3 - Cukup</option>
      <option value="2">2 - Kurang</option>
      <option value="1">1 - Buruk</option>
    </select>

    <button id="sendReview"
      class="mt-3 px-4 py-2 bg-sky-600 text-white rounded">
      Kirim Ulasan
    </button>

    <h3 class="text-xl font-bold mt-6">Ulasan Pengguna</h3>
    ${html}
  `;

  document.getElementById("sendReview").onclick = sendReview;
}

async function sendReview() {
  const text = sanitizeHTML(document.getElementById("reviewText").value.trim());
  const rating = Number(document.getElementById("reviewRating").value);

  if (!text) return alert("Tulis ulasan.");

  const user = auth.currentUser;
  if (!user) return alert("Login dulu.");

  await addDoc(collection(db, "reviews"), {
    bookId,
    userId: user.uid,
    rating,
    text,
    createdAt: new Date()
  });

  alert("Ulasan dikirim.");
  loadReviews();
}
