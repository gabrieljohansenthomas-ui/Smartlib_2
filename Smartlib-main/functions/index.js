const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

// Import mailer
const { sendEmail } = require('./lib/mailer');

// Scheduled function: Kirim pengingat tenggat (3 hari sebelum & overdue)
exports.sendDueReminder = functions.pubsub.schedule('every 24 hours').onRun(async (context) => {
  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const db = admin.firestore();

  // Query loans yang approved dan belum returned
  const loansRef = db.collection('loans').where('status', '==', 'approved');
  const snapshot = await loansRef.get();

  for (const doc of snapshot.docs) {
    const loan = doc.data();
    const dueDate = loan.dueDate.toDate();
    const userDoc = await db.collection('users').doc(loan.userId).get();
    const email = userDoc.data().email;

    if (dueDate <= now && loan.status !== 'overdue') {
      // Overdue: Update status dan kirim email
      await doc.ref.update({ status: 'overdue' });
      await sendEmail(email, 'Pengingat: Buku Terlambat Dikembalikan', `Buku Anda lewat tenggat. Kembalikan segera.`);
    } else if (dueDate <= threeDaysFromNow && dueDate > now) {
      // 3 hari sebelum: Kirim pengingat
      await sendEmail(email, 'Pengingat: Tenggat Peminjaman', `Buku Anda akan jatuh tempo dalam 3 hari.`);
    }
  }
  return null;
});

// Trigger onCreate books: Kirim notifikasi ke anggota yang subscribe (opsional: tambah field subscribe di users)
exports.sendNewBookNotification = functions.firestore.document('books/{bookId}').onCreate(async (snap, context) => {
  const book = snap.data();
  const db = admin.firestore();
  const usersRef = db.collection('users').where('subscribe', '==', true); // Asumsikan field subscribe
  const snapshot = await usersRef.get();

  for (const doc of snapshot.docs) {
    const email = doc.data().email;
    await sendEmail(email, 'Buku Baru Tersedia', `Buku baru: ${book.title} oleh ${book.author}.`);
  }
  return null;
});

// Scheduled backup: Snapshot Firestore ke backups collection (atau Cloud Storage)
exports.backupFirestore = functions.pubsub.schedule('every 7 days').onRun(async (context) => {
  const db = admin.firestore();
  const backupRef = db.collection('backups').doc();
  const collections = ['users', 'books', 'loans', 'reviews'];
  const backupData = {};

  for (const col of collections) {
    const snapshot = await db.collection(col).get();
    backupData[col] = snapshot.docs.map(doc => ({ id: doc.id, data: doc.data() }));
  }

  await backupRef.set({
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    data: backupData
  });

  console.log('Backup completed to backups collection.');
  return null;
});

// HTTPS callable: Export CSV riwayat peminjaman (admin only)
exports.exportLoansCSV = functions.https.onCall(async (data, context) => {
  if (!context.auth || context.auth.token.role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Admin only.');
  }

  const db = admin.firestore();
  const snapshot = await db.collection('loans').get();
  let csv = 'BookID,UserID,Status,DueDate\n';
  snapshot.forEach(doc => {
    const loan = doc.data();
    csv += `${loan.bookId},${loan.userId},${loan.status},${loan.dueDate?.toDate().toISOString() || 'N/A'}\n`;
  });

  return csv; // Return CSV string, handle download di frontend
});
