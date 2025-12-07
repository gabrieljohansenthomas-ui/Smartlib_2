/**
 * Seeder Script
 * -------------------------------
 * Jalankan:
 *
 *  node seed.js
 *
 * Pastikan:
 *  - Sudah "firebase login"
 *  - Sudah "firebase use <project>"
 */

const admin = require("firebase-admin");
const fs = require("fs");

// Sesuaikan path serviceAccountKey.json Anda
admin.initializeApp({
  credential: admin.credential.applicationDefault()
});

const db = admin.firestore();

async function seed() {
  console.log("📌 Importing seed data...");

  const raw = fs.readFileSync("./seed/seedData.json");
  const data = JSON.parse(raw);

  // USERS
  console.log("→ Users...");
  for (const u of data.users) {
    await db.collection("users").doc(u.uid).set({
      displayName: u.displayName,
      email: u.email,
      role: u.role,
      active: u.active,
      joinedAt: new Date(u.joinedAt)
    });
  }

  // BOOKS
  console.log("→ Books...");
  let bookCounter = 1;
  for (const b of data.books) {
    await db.collection("books").doc(String(bookCounter)).set({
      ...b,
      createdAt: new Date()
    });
    bookCounter++;
  }

  // LOANS
  console.log("→ Loans...");
  let loanCounter = 1;
  for (const l of data.loans) {
    await db.collection("loans").doc(String(loanCounter)).set({
      ...l,
      requestAt: new Date(l.requestAt),
      approvedAt: l.approvedAt ? new Date(l.approvedAt) : null,
      dueDate: l.dueDate ? new Date(l.dueDate) : null,
      returnedAt: l.returnedAt ? new Date(l.returnedAt) : null
    });
    loanCounter++;
  }

  // REVIEWS
  console.log("→ Reviews...");
  let revCounter = 1;
  for (const r of data.reviews) {
    await db.collection("reviews").doc(String(revCounter)).set({
      ...r,
      createdAt: new Date(r.createdAt)
    });
    revCounter++;
  }

  console.log("🎉 SEED IMPORT COMPLETED!");
}

seed().catch(console.error);
