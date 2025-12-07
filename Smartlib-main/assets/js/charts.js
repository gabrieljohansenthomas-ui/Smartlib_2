import { db } from "./firebase-config.js";
import { requireAdmin } from "./auth.js";
import {
  collection, getDocs
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

await requireAdmin();

const ctx1 = document.getElementById("popularBooksChart");
const ctx2 = document.getElementById("loanMonthlyChart");

loadCharts();

async function loadCharts() {

  /* POPULAR BOOKS */
  const snapBooks = await getDocs(collection(db, "books"));
  const books = snapBooks.docs
    .map(d => d.data())
    .sort((a, b) => b.popularityScore - a.popularityScore)
    .slice(0, 5);

  new Chart(ctx1, {
    type: "bar",
    data: {
      labels: books.map(b => b.title),
      datasets: [{
        label: "Skor Popularitas",
        data: books.map(b => b.popularityScore),
        backgroundColor: "#0ea5e9"
      }]
    }
  });


  /* LOAN MONTHLY */
  const snapLoans = await getDocs(collection(db, "loans"));
  const counts = Array(12).fill(0);

  snapLoans.forEach(l => {
    const d = l.data();
    if (d.requestAt) {
      const m = new Date(d.requestAt.toDate()).getMonth();
      counts[m]++;
    }
  });

  new Chart(ctx2, {
    type: "line",
    data: {
      labels: ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"],
      datasets: [{
        label: "Jumlah Peminjaman",
        data: counts,
        borderColor: "#0ea5e9",
        fill: false
      }]
    }
  });
}
