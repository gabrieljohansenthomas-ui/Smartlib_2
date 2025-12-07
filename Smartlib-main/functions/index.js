/**
 * index.js - Firebase Cloud Functions for Perpustakaan
 * - sendNewBookNotification (onCreate books)
 * - sendDueReminder (scheduled daily)
 * - backupFirestore (scheduled daily)
 * - processLoan (https callable) -> approve/reject/return logic (admin-only)
 * - exportLoansCSV (https callable) -> admin export loan history CSV
 *
 * Important config:
 * - functions:config:set sendgrid.key="SENDGRID_KEY" sendgrid.from="noreply@domain.edu"
 * - Optionally functions:config:set app.public_url="https://your-hosting-url"
 *
 * NOTE: For scheduling (functions.pubsub.schedule) to run in production you may need Blaze plan.
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();
const { sendMail } = require('./lib/mailer');

// Utility: check user is admin by reading users/{uid}.role
async function isAdmin(uid) {
  if (!uid) return false;
  const udoc = await db.collection('users').doc(uid).get();
  return udoc.exists && udoc.data().role === 'admin' && udoc.data().active !== false;
}

// Utility: basic server-side validation for loans update
function validateLoanAction(action) {
  const allowed = ['approve', 'reject', 'return'];
  return allowed.includes(action);
}

/**
 * sendNewBookNotification:
 * Triggered when a new book doc is created; send email to subscribed active users.
 */
exports.sendNewBookNotification = functions.firestore
  .document('books/{bookId}')
  .onCreate(async (snap, context) => {
    const book = snap.data();
    const bookId = context.params.bookId;
    try {
      const subsSnap = await db.collection('users').where('subscribe', '==', true).where('active', '==', true).get();
      const tasks = [];
      subsSnap.forEach(u => {
        const to = u.data().email;
        const subject = `Buku baru: ${book.title}`;
        const publicUrl = functions.config().app && functions.config().app.public_url ? functions.config().app.public_url : '';
        const link = publicUrl ? `${publicUrl}/book_detail.html?bookId=${bookId}` : `book_detail.html?bookId=${bookId}`;
        const html = `<p>Halo ${u.data().displayName || ''},</p>
          <p>Buku baru telah ditambahkan: <strong>${book.title}</strong> oleh ${book.author}.</p>
          <p><a href="${link}">Lihat detail</a></p>`;
        tasks.push(sendMail(to, subject, html));
      });
      await Promise.all(tasks);
      return null;
    } catch (err) {
      console.error('sendNewBookNotification error', err);
      return null;
    }
  });

/**
 * sendDueReminder:
 * Runs every 24 hours. Finds loans with status 'approved' and:
 * - sends reminder if dueDate within next 3 days
 * - marks and notifies if overdue
 */
exports.sendDueReminder = functions.pubsub.schedule('every 24 hours').onRun(async (context) => {
  const now = admin.firestore.Timestamp.now().toDate();
  const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  try {
    const loansSnap = await db.collection('loans').where('status', '==', 'approved').get();
    const tasks = [];
    loansSnap.forEach(loanDoc => {
      const loan = loanDoc.data();
      if (!loan.dueDate) return;
      const dueDate = loan.dueDate.toDate ? loan.dueDate.toDate() : new Date(loan.dueDate);
      const userRef = db.collection('users').doc(loan.userId);
      // remind 3 days before
      if (dueDate >= now && dueDate <= threeDaysLater) {
        tasks.push(userRef.get().then(async (u) => {
          if (!u.exists) return;
          const to = u.data().email;
          const subject = `Pengingat: Peminjaman buku akan jatuh tempo`;
          const html = `<p>Halo ${u.data().displayName || ''},</p>
            <p>Pinjaman Anda untuk buku (ID: ${loan.bookId}) akan jatuh tempo pada ${dueDate.toLocaleDateString()}.</p>`;
          return sendMail(to, subject, html);
        }));
      } else if (dueDate < now) {
        // overdue
        tasks.push(userRef.get().then(async (u) => {
          if (!u.exists) return;
          const to = u.data().email;
          const subject = `Tenggat terlewat: segera kembalikan buku`;
          const html = `<p>Halo ${u.data().displayName || ''},</p>
            <p>Pinjaman Anda untuk buku (ID: ${loan.bookId}) telah melewati tenggat ${dueDate.toLocaleDateString()}. Silakan segera kembalikan.</p>`;
          // update loan status to overdue
          await loanDoc.ref.update({ status: 'overdue' });
          return sendMail(to, subject, html);
        }));
      }
    });
    await Promise.all(tasks);
    return null;
  } catch (err) {
    console.error('sendDueReminder error', err);
    return null;
  }
});

/**
 * backupFirestore:
 * Scheduled backup — copies small collections to backups collection as a snapshot.
 * For large datasets, replace with export to Cloud Storage or automated export.
 */
exports.backupFirestore = functions.pubsub.schedule('every 24 hours').onRun(async (context) => {
  try {
    const snapshot = {
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      data: {}
    };
    const collections = ['users', 'books', 'loans', 'reviews'];
    for (const c of collections) {
      const colSnap = await db.collection(c).get();
      snapshot.data[c] = {};
      colSnap.forEach(doc => {
        snapshot.data[c][doc.id] = doc.data();
      });
    }
    await db.collection('backups').add(snapshot);
    return null;
  } catch (err) {
    console.error('backupFirestore error', err);
    return null;
  }
});

/**
 * processLoan - https callable
 * Payload: { loanId, action } action = 'approve'|'reject'|'return'
 * Validates admin role, then performs server-side updates atomically.
 */
exports.processLoan = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'You must be authenticated');
  const uid = context.auth.uid;
  if (!await isAdmin(uid)) {
    throw new functions.https.HttpsError('permission-denied', 'Only admin can process loans');
  }
  const { loanId, action } = data || {};
  if (!loanId || !action) throw new functions.https.HttpsError('invalid-argument', 'loanId and action required');
  if (!validateLoanAction(action)) throw new functions.https.HttpsError('invalid-argument', 'Invalid action');

  const loanRef = db.collection('loans').doc(loanId);
  return db.runTransaction(async (t) => {
    const loanSnap = await t.get(loanRef);
    if (!loanSnap.exists) throw new functions.https.HttpsError('not-found', 'Loan not found');
    const loan = loanSnap.data();

    const bookRef = db.collection('books').doc(loan.bookId);
    const bookSnap = await t.get(bookRef);
    if (!bookSnap.exists) throw new functions.https.HttpsError('not-found', 'Book not found');
    const book = bookSnap.data();

    if (action === 'approve') {
      if (loan.status !== 'requested') throw new functions.https.HttpsError('failed-precondition', 'Loan not in requested state');
      if ((book.availableStock || 0) <= 0) throw new functions.https.HttpsError('failed-precondition', 'No available stock');
      const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      t.update(loanRef, {
        status: 'approved',
        approvedAt: admin.firestore.FieldValue.serverTimestamp(),
        dueDate: admin.firestore.Timestamp.fromDate(dueDate)
      });
      t.update(bookRef, { availableStock: (book.availableStock || 0) - 1 });
      // optional send email
      const userDoc = await db.collection('users').doc(loan.userId).get();
      if (userDoc.exists) {
        const to = userDoc.data().email;
        const subject = `Peminjaman disetujui: ${book.title || loan.bookId}`;
        const html = `<p>Pinjaman Anda telah disetujui. Tenggat: ${dueDate.toLocaleDateString()}.</p>`;
        await sendMail(to, subject, html);
      }
      return { success: true };
    } else if (action === 'reject') {
      if (loan.status !== 'requested') throw new functions.https.HttpsError('failed-precondition', 'Loan not in requested state');
      t.update(loanRef, { status: 'rejected', processedAt: admin.firestore.FieldValue.serverTimestamp() });
      // email
      const userDoc = await db.collection('users').doc(loan.userId).get();
      if (userDoc.exists) {
        const to = userDoc.data().email;
        const subject = `Peminjaman ditolak: ${book.title || loan.bookId}`;
        const html = `<p>Permintaan peminjaman Anda ditolak oleh admin.</p>`;
        await sendMail(to, subject, html);
      }
      return { success: true };
    } else if (action === 'return') {
      // mark returned and increment stock
      if (loan.status !== 'approved' && loan.status !== 'overdue') {
        throw new functions.https.HttpsError('failed-precondition', 'Loan not in approved/overdue state');
      }
      t.update(loanRef, { status: 'returned', returnedAt: admin.firestore.FieldValue.serverTimestamp() });
      t.update(bookRef, { availableStock: (book.availableStock || 0) + 1 });
      // optional email to user
      const userDoc = await db.collection('users').doc(loan.userId).get();
      if (userDoc.exists) {
        const to = userDoc.data().email;
        const subject = `Pengembalian tercatat: ${book.title || loan.bookId}`;
        const html = `<p>Terima kasih, pengembalian buku telah dicatat.</p>`;
        await sendMail(to, subject, html);
      }
      return { success: true };
    }
    throw new functions.https.HttpsError('invalid-argument', 'Unhandled action');
  });
});

/**
 * exportLoansCSV - https callable for admins
 * Returns: { csv: "...csv content..." }
 */
exports.exportLoansCSV = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'You must be authenticated');
  if (!await isAdmin(context.auth.uid)) throw new functions.https.HttpsError('permission-denied', 'Only admin');

  const loansSnap = await db.collection('loans').get();
  const rows = [['loanId','bookId','userId','status','requestAt','approvedAt','dueDate','returnedAt']];
  loansSnap.forEach(l => {
    const d = l.data();
    rows.push([
      l.id,
      d.bookId || '',
      d.userId || '',
      d.status || '',
      d.requestAt?.toDate?.().toISOString?.() || '',
      d.approvedAt?.toDate?.().toISOString?.() || '',
      d.dueDate?.toDate?.toISOString?.() || '',
      d.returnedAt?.toDate?.toISOString?.() || ''
    ]);
  });
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  return { csv };
});
