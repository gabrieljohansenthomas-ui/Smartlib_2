/**
 * seed/seed.js
 * Usage:
 * 1) For emulator: set FIRESTORE_EMULATOR_HOST=localhost:8080 and run node seed.js
 * 2) For real project: initialize admin SDK with serviceAccountKey (not included)
 */
const admin = require('firebase-admin');
const fs = require('fs');

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  console.warn('Seeding recommended only in emulator or with a service account. Set FIRESTORE_EMULATOR_HOST to run in emulator.');
}

admin.initializeApp();
const db = admin.firestore();

async function run() {
  const raw = fs.readFileSync('./seedData.json', 'utf8');
  const data = JSON.parse(raw);

  // users
  for (const u of data.users) {
    await db.collection('users').doc(u.id).set({
      displayName: u.displayName,
      email: u.email,
      role: u.role,
      active: u.active,
      subscribe: u.subscribe || false,
      joinedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('seeded user', u.id);
  }

  // books
  for (const b of data.books) {
    const docRef = await db.collection('books').add({
      title: b.title,
      author: b.author,
      isbn: b.isbn,
      category: b.category,
      description: b.description,
      coverUrl: b.coverUrl,
      totalStock: b.totalStock,
      availableStock: b.availableStock,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      popularityScore: 0
    });
    console.log('seeded book', docRef.id, b.title);
  }

  console.log('Seeding complete');
}
run().catch(console.error);
