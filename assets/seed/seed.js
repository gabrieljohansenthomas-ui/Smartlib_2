// Script untuk seed data - Jalankan dengan Node.js setelah setup Firebase
// TODO: Install firebase-admin via npm install firebase-admin
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json'); // TODO: Download dari Firebase Console > Project Settings > Service accounts
const data = require('./seedData.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://your-project-id.firebaseio.com' // TODO: Ganti dengan project ID
});

const db = admin.firestore();

// Import users (manual UID untuk admin)
async function seedUsers() {
  for (const user of data.users) {
    await db.collection('users').doc(user.uid).set({
      displayName: user.displayName,
      email: user.email,
      role: user.role,
      active: user.active,
      joinedAt: admin.firestore.Timestamp.fromDate(new Date(user.joinedAt))
    });
  }
  console.log('Users seeded');
}

// Import books
async function seedBooks() {
  for (const book of data.books) {
    await db.collection('books').add({
      ...book,
      createdAt: admin.firestore.Timestamp.fromDate(new Date(book.createdAt)),
      updatedAt: admin.firestore.Timestamp.fromDate(new Date(book.updatedAt))
    });
  }
  console.log('Books seeded');
}

// Import loans dan reviews
async function seedLoansAndReviews() {
  for (const loan of data.loans) {
    await db.collection('loans').add({
      ...loan,
      requestAt: admin.firestore.Timestamp.fromDate(new Date(loan.requestAt)),
      approvedAt: loan.approvedAt ? admin.firestore.Timestamp.fromDate(new Date(loan.approvedAt)) : null,
      dueDate: loan.dueDate ? admin.firestore.Timestamp.fromDate(new Date(loan.dueDate)) : null
    });
  }
  for (const review of data.reviews) {
    await db.collection('reviews').add({
      ...review,
      createdAt: admin.firestore.Timestamp.fromDate(new Date(review.createdAt))
    });
  }
  console.log('Loans and reviews seeded');
}

// Jalankan semua
async function runSeed() {
  try {
    await seedUsers();
    await seedBooks();
    await seedLoansAndReviews();
    console.log('Seeding completed!');
  } catch (error) {
    console.error('Error seeding:', error);
  } finally {
    admin.app().delete();
  }
}

runSeed();