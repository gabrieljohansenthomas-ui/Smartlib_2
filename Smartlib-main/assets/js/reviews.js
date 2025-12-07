import { db, auth } from './firebase-config.js';
import { collection, query, where, getDocs, addDoc, orderBy, limit } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import { escapeHTML } from './utils.js';

// Load detail buku dan ulasan
export async function loadBookDetail(bookId) {
  const bookDoc = await getDoc(doc(db, 'books', bookId));
  const book = bookDoc.data();
  const reviewsQ = query(collection(db, 'reviews'), where('bookId', '==', bookId), orderBy('createdAt', 'desc'), limit(10));
  const reviewsSnapshot = await getDocs(reviewsQ);
  let avgRating = 0;
  let totalReviews = 0;
  reviewsSnapshot.forEach(doc => {
    const review = doc.data();
    avgRating += review.rating;
    totalReviews++;
  });
  avgRating = totalReviews > 0 ? (avgRating / totalReviews).toFixed(1) : 0;

  document.getElementById('bookDetail').innerHTML = `
    <img src="${escapeHTML(book.coverUrl)}" alt="${escapeHTML(book.title)}" class="w-full h-64 object-cover mb-4">
    <h2 class="text-3xl font-bold">${escapeHTML(book.title)}</h2>
    <p>Penulis: ${escapeHTML(book.author)}</p>
    <p>Kategori: ${escapeHTML(book.category)}</p>
    <p>Rating Rata-rata: ${avgRating}/5 (${totalReviews} ulasan)</p>
    <p>Stok: ${book.availableStock}/${book.totalStock}</p>
    <p>${escapeHTML(book.description)}</p>
    <button onclick="requestBorrow('${bookId}')" class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700">Pinjam</button>
  `;

  const reviewsList = document.getElementById('reviewsList');
  reviewsList.innerHTML = '';
  reviewsSnapshot.forEach(doc => {
    const review = doc.data();
    reviewsList.innerHTML += `
      <div class="bg-gray-100 p-4 rounded mb-4">
        <p>Rating: ${review.rating}/5</p>
        <p>${DOMPurify.sanitize(review.text)}</p> <!-- Sanitasi XSS -->
      </div>
    `;
  });
}

// Submit ulasan
export async function submitReview(bookId, rating, text) {
  const user = auth.currentUser;
  if (!user) return alert('Login dulu.');
  await addDoc(collection(db, 'reviews'), {
    bookId,
    userId: user.uid,
    rating: parseInt(rating),
    text: DOMPurify.sanitize(text), // Sanitasi
    createdAt: new Date()
  });
  loadBookDetail(bookId);
}

// Event listeners
const urlParams = new URLSearchParams(window.location.search);
const bookId = urlParams.get('id');
if (bookId) loadBookDetail(bookId);

document.getElementById('reviewForm')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const rating = document.getElementById('rating').value;
  const text = document.getElementById('reviewText').value;
  submitReview(bookId, rating, text);
});
