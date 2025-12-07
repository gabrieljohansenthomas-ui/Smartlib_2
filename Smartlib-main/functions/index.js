const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { sendEmail } = require("./lib/mailer");
const { Parser } = require("json2csv");

admin.initializeApp();
const db = admin.firestore();

/* ============= UTIL ============= */

function today() {
  return admin.firestore.Timestamp.fromDate(new Date());
}

/* ============= 1. NOTIFIKASI BUKU BARU ============= */
exports.onNewBookAdded = functions.firestore
  .document("books/{bookId}")
  .onCreate(async (snap, ctx) => {
    const book = snap.data();

    const users = await db.collection("users")
      .where("active", "==", true)
      .get();

    users.forEach(u => {
      sendEmail(
        u.data().email,
        "📚 Buku Baru Tersedia!",
        `
        <h2>Buku Baru Ditambahkan</h2>
        <p>Judul: <b>${book.title}</b></p>
        <p>Penulis: ${book.author}</p>
        <a href="${process.env.FRONTEND_URL}/book_detail.html?id=${snap.id}">
          Lihat Detail →
        </a>
        `
      );
    });

    console.log("Notifikasi email buku baru dikirim.");
  });


/* ============= 2. PERMINTAAN PEMINJAMAN DI-APPROVE ADMIN ============= */
exports.approveLoan = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated");

  const adminUser = await db.collection("users").doc(context.auth.uid).get();
  if (!adminUser.exists || adminUser.data().role !== "admin") {
    throw new functions.https.HttpsError("permission-denied");
  }

  const docId = data.loanId;

  const loanRef = db.collection("loans").doc(docId);
  const loan = (await loanRef.get()).data();

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 7);

  await loanRef.update({
    approvedAt: today(),
    dueDate,
    status: "approved"
  });

  // kurangi stok buku
  const bookRef = db.collection("books").doc(loan.bookId);
  const bookSnap = await bookRef.get();
  await bookRef.update({
    availableStock: bookSnap.data().availableStock - 1
  });

  // Kirim email ke user
  const user = await db.collection("users").doc(loan.userId).get();

  await sendEmail(
    user.data().email,
    "Peminjaman Buku Disetujui",
    `
      <h2>Peminjaman Anda Disetujui!</h2>
      <p>Buku Anda sudah bisa diambil di perpustakaan.</p>
      <p>Batas pengembalian: ${dueDate.toLocaleDateString("id-ID")}</p>
    `
  );

  return { success: true };
});


/* ============= 3. PENGEMBALIAN BUKU ============= */
exports.returnBook = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated");

  const adminUser = await db.collection("users").doc(context.auth.uid).get();
  if (!adminUser.exists || adminUser.data().role !== "admin") {
    throw new functions.https.HttpsError("permission-denied");
  }

  const loanRef = db.collection("loans").doc(data.loanId);
  const loan = (await loanRef.get()).data();

  await loanRef.update({
    returnedAt: today(),
    status: "returned"
  });

  const bookRef = db.collection("books").doc(loan.bookId);
  const bookSnap = await bookRef.get();

  await bookRef.update({
    availableStock: bookSnap.data().availableStock + 1
  });

  return { success: true };
});


/* ============= 4. PENGINGAT JATUH TEMPO ============= */
exports.dailyDueReminder = functions.pubsub
  .schedule("every 24 hours")
  .onRun(async () => {

    const now = new Date();
    const twoDays = new Date();
    twoDays.setDate(now.getDate() + 2);

    const snap = await db.collection("loans")
      .where("status", "==", "approved")
      .get();

    snap.forEach(async docu => {
      const loan = docu.data();
      if (!loan.dueDate) return;

      const due = loan.dueDate.toDate();
      if (due.toDateString() === twoDays.toDateString()) {
        const user = await db.collection("users").doc(loan.userId).get();

        sendEmail(
          user.data().email,
          "⏰ Pengingat Pengembalian Buku",
          `
            <h2>Buku akan jatuh tempo dalam 2 hari!</h2>
            <p>Segera lakukan pengembalian tepat waktu.</p>
          `
        );
      }
    });

    console.log("Pengingat due dikirim.");
  });


/* ============= 5. BACKUP FIRESTORE OTOMATIS ============= */
exports.backupFirestore = functions.pubsub
  .schedule("every 24 hours")
  .onRun(async () => {

    const bucket = admin.storage().bucket();
    const exportFolder = `backups/firestore-${Date.now()}`;

    await bucket.upload("/workspace/firestore-export", {
      destination: exportFolder
    });

    console.log("Backup Firestore selesai:", exportFolder);
  });


/* ============= 6. EXPORT CSV UNTUK ADMIN ============= */
exports.exportLoanCSV = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated");

  const adminUser = await db.collection("users").doc(context.auth.uid).get();
  if (!adminUser.exists || adminUser.data().role !== "admin") {
    throw new functions.https.HttpsError("permission-denied");
  }

  const loans = await db.collection("loans").get();

  const arr = loans.docs.map(d => ({
    id: d.id,
    userId: d.data().userId,
    bookId: d.data().bookId,
    status: d.data().status,
    requestAt: d.data().requestAt?.toDate().toISOString(),
    approvedAt: d.data().approvedAt?.toDate().toISOString(),
    returnedAt: d.data().returnedAt?.toDate().toISOString()
  }));

  const parser = new Parser();
  const csv = parser.parse(arr);

  return csv;
});


/* ============= 7. TRIGGER OTOMATIS POPULARITY SCORE ============= */
exports.updatePopularity = functions.firestore
  .document("reviews/{id}")
  .onCreate(async snap => {
    const rev = snap.data();

    const bookRef = db.collection("books").doc(rev.bookId);
    const bookSnap = await bookRef.get();

    await bookRef.update({
      popularityScore: bookSnap.data().popularityScore + rev.rating
    });
  });
