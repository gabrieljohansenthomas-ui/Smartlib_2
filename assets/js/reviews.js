import { db, auth } from './firebase-config.js';
import { collection, addDoc, getDocs, query, where, orderBy, limit } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import { DOMPurify } from 'https://cdn.jsdelivr.net/npm/dompurify@3.0.6/dist/purify.min.js';

// Submit ulasan (member) - Sanitasi XSS
export async function submitReview(bookId, rating, text) {
    const user = auth.currentUser;
    if (!user || rating < 1 || rating > 5) return alert('Invalid');
    await addDoc(collection(db, 'reviews'), {
        bookId,
        userId: user.uid,
        rating: parseInt(rating),
        text: DOMPurify.sanitize(text), // Sanitasi
        createdAt: new Date()
    });
    loadReviews(bookId);
}

// Load ulasan dengan pagination
export async function loadReviews(bookId, page = 1) {
    const q = query(collection(db, 'reviews'), where('bookId', '==', bookId), orderBy('createdAt', 'desc'), limit(5 * page));
    const snapshot = await getDocs(q);
    const reviews = snapshot.docs.map(doc => doc.data());
    document.getElementById('reviewsList').innerHTML = reviews.map(review => `
        <div class="border-b py-2">
            <p>Rating: ${review.rating}/5</p>
            <p>${DOMPurify.sanitize(review.text)}</p>
        </div>
    `).join('');
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const bookId = urlParams.get('id');
    if (bookId) loadReviews(bookId);
    document.getElementById('reviewForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const rating = document.getElementById('rating').value;
        const text = document.getElementById('reviewText').value;
        submitReview(bookId, rating, text);
    });
});