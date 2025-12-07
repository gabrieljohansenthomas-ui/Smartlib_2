/**
 * book_manage.js
 * Admin CRUD for books and member activation management.
 * - init() to manage books
 * - initMembers() to list and toggle user active status
 *
 * Uses firebaseDb (compat).
 */

const BookManage = (function () {
  const db = window.firebaseDb;

  async function init() {
    bindForm();
    await renderList();
  }

  function bindForm() {
    const form = document.getElementById('book-form');
    const clearBtn = document.getElementById('clear');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('book-id').value || null;
      const data = {
        title: document.getElementById('title').value.trim(),
        author: document.getElementById('author').value.trim(),
        isbn: document.getElementById('isbn').value.trim(),
        category: document.getElementById('category').value.trim(),
        description: document.getElementById('description').value.trim(),
        coverUrl: document.getElementById('coverUrl').value.trim(),
        totalStock: Number(document.getElementById('totalStock').value || 0),
      };
      // validation
      if (!Utils.validateText(data.title, 2)) return alert('Judul minimal 2 karakter');
      if (!Utils.validateText(data.author, 2)) return alert('Penulis minimal 2 karakter');
      if (!Utils.validateText(data.category, 1)) return alert('Kategori wajib');

      try {
        if (id) {
          // update: if totalStock changes, adjust availableStock accordingly (simple policy: set availableStock = totalStock if increased)
          const docRef = db.collection('books').doc(id);
          const snap = await docRef.get();
          if (snap.exists) {
            const current = snap.data();
            let availableStock = current.availableStock || 0;
            // if totalStock decreased below available, clamp availableStock
            if (data.totalStock < (current.totalStock || 0)) {
              availableStock = Math.min(availableStock, data.totalStock);
            } else if (data.totalStock > (current.totalStock || 0)) {
              // increase availableStock by diff
              availableStock = (availableStock || 0) + (data.totalStock - (current.totalStock || 0));
            }
            await docRef.update({ ...data, updatedAt: firebase.firestore.FieldValue.serverTimestamp(), availableStock });
          }
        } else {
          // create new book
          await db.collection('books').add({
            ...data,
            availableStock: data.totalStock,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            popularityScore: 0
          });
        }
        form.reset();
        await renderList();
      } catch (err) {
        console.error('save book', err);
        alert('Gagal menyimpan buku: ' + err.message);
      }
    });

    clearBtn.addEventListener('click', () => form.reset());
  }

  async function renderList() {
    const list = document.getElementById('book-list');
    list.innerHTML = 'Memuat...';
    try {
      const snap = await db.collection('books').orderBy('title').get();
      if (snap.empty) { list.innerHTML = '<p>Tidak ada buku.</p>'; return; }
      list.innerHTML = '';
      snap.forEach(doc => {
        const d = doc.data();
        const el = document.createElement('div');
        el.className = 'p-3 border rounded flex justify-between items-center';
        el.innerHTML = `
          <div>
            <div class="font-semibold">${Utils.escapeHTML(d.title)}</div>
            <div class="text-sm text-slate-600">${Utils.escapeHTML(d.author)} — ${Utils.escapeHTML(d.category)}</div>
            <div class="text-sm">Stok: ${d.availableStock || 0} / ${d.totalStock || 0}</div>
          </div>
          <div class="flex gap-2">
            <button data-id="${doc.id}" class="edit-btn px-3 py-1 border rounded">Edit</button>
            <button data-id="${doc.id}" class="delete-btn px-3 py-1 border rounded">Hapus</button>
          </div>
        `;
        list.appendChild(el);
      });
      // handlers
      list.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const snap = await db.collection('books').doc(id).get();
        if (!snap.exists) return;
        const d = snap.data();
        document.getElementById('book-id').value = id;
        document.getElementById('title').value = d.title || '';
        document.getElementById('author').value = d.author || '';
        document.getElementById('isbn').value = d.isbn || '';
        document.getElementById('category').value = d.category || '';
        document.getElementById('description').value = d.description || '';
        document.getElementById('coverUrl').value = d.coverUrl || '';
        document.getElementById('totalStock').value = d.totalStock || 0;
      }));

      list.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        if (!confirm('Hapus buku ini?')) return;
        try {
          await db.collection('books').doc(id).delete();
          await renderList();
        } catch (e) { console.error(e); alert('Gagal menghapus'); }
      }));

    } catch (err) {
      console.error('renderList', err);
      list.innerHTML = '<p>Gagal memuat daftar buku.</p>';
    }
  }

  // member management
  async function initMembers() {
    const container = document.getElementById('members-list');
    container.innerHTML = 'Memuat...';
    try {
      const snap = await db.collection('users').orderBy('joinedAt').get();
      if (snap.empty) { container.innerHTML = '<p>Tidak ada anggota.</p>'; return; }
      container.innerHTML = '';
      snap.forEach(doc => {
        const d = doc.data();
        const el = document.createElement('div');
        el.className = 'p-3 border rounded flex justify-between items-center';
        el.innerHTML = `
          <div>
            <div class="font-semibold">${Utils.escapeHTML(d.displayName || d.email)}</div>
            <div class="text-sm text-slate-600">${Utils.escapeHTML(d.email)}</div>
            <div class="text-sm">Role: ${Utils.escapeHTML(d.role || 'member')}</div>
          </div>
          <div>
            <button data-id="${doc.id}" data-active="${d.active !== false}" class="toggle-btn px-3 py-1 border rounded">${d.active !== false ? 'Nonaktifkan' : 'Aktifkan'}</button>
          </div>
        `;
        container.appendChild(el);
      });

      container.querySelectorAll('.toggle-btn').forEach(btn => btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const current = btn.dataset.active === 'true';
        try {
          await db.collection('users').doc(id).update({ active: !current });
          initMembers(); // refresh
        } catch (e) {
          console.error('toggle active', e);
          alert('Gagal update status');
        }
      }));
    } catch (err) {
      console.error('initMembers', err);
      container.innerHTML = '<p>Gagal memuat anggota.</p>';
    }
  }

  return {
    init,
    initMembers
  };
})();

window.BookManage = BookManage;
