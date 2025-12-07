/**
 * auth.js (compat)
 * Handles registration, login, sign-out, and role-based redirection.
 *
 * Relies on global variables from firebase-config.js:
 * - window.firebaseAuth
 * - window.firebaseDb
 *
 * Exposes Auth object with:
 * - initRegister()
 * - initLogin()
 * - setupAuthGuard()
 * - requireAdmin()
 * - signOutButton(buttonId)
 */

const Auth = (function () {
  const auth = window.firebaseAuth;
  const db = window.firebaseDb;

  // Register: create user in Firebase Auth and corresponding user doc in Firestore
  async function initRegister() {
    const form = document.getElementById('register-form');
    if (!form) return;
    const msg = document.getElementById('register-msg');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      msg.textContent = '';
      const displayName = document.getElementById('displayName').value.trim();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const subscribe = document.getElementById('subscribe').checked;
      if (!Utils.validateText(displayName, 2)) { msg.textContent = 'Nama minimal 2 karakter.'; return; }
      try {
        const userCred = await auth.createUserWithEmailAndPassword(email, password);
        const uid = userCred.user.uid;
        // write user doc
        await db.collection('users').doc(uid).set({
          displayName,
          email,
          role: 'member',
          active: true,
          joinedAt: firebase.firestore.FieldValue.serverTimestamp(),
          subscribe: !!subscribe
        });
        // redirect to dashboard
        window.location.href = 'dashboard.html';
      } catch (err) {
        msg.textContent = err.message;
      }
    });
  }

  // Login
  async function initLogin() {
    const form = document.getElementById('login-form');
    if (!form) return;
    const msg = document.getElementById('login-msg');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      msg.textContent = '';
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      try {
        const userCred = await auth.signInWithEmailAndPassword(email, password);
        const uid = userCred.user.uid;
        const udoc = await db.collection('users').doc(uid).get();
        if (udoc.exists && udoc.data().active === false) {
          await auth.signOut();
          msg.textContent = 'Akun Anda dinonaktifkan. Hubungi admin.';
          return;
        }
        window.location.href = 'dashboard.html';
      } catch (err) {
        msg.textContent = err.message;
      }
    });
  }

  // Sign out button wiring
  function signOutButton(buttonId = 'signout') {
    const btn = document.getElementById(buttonId);
    if (!btn) return;
    btn.addEventListener('click', async () => {
      await auth.signOut();
      window.location.href = 'index.html';
    });
  }

  // Setup generic auth guard and show admin links in dashboard
  function setupAuthGuard() {
    auth.onAuthStateChanged(async (user) => {
      if (!user) {
        // if on protected page, redirect to login or allow public pages
        // Silently return
        return;
      }
      try {
        const udoc = await db.collection('users').doc(user.uid).get();
        if (udoc.exists) {
          const data = udoc.data();
          // show admin panel link on dashboard
          const adminPanel = document.getElementById('admin-panel');
          if (adminPanel) {
            if (data.role === 'admin' && data.active !== false) adminPanel.classList.remove('hidden');
            else adminPanel.classList.add('hidden');
          }
          // show profile info
          const profile = document.getElementById('profile');
          if (profile) {
            profile.innerHTML = `
              <div class="">${Utils.escapeHTML(data.displayName || user.email)}</div>
              <div class="text-sm text-slate-600">${Utils.escapeHTML(user.email)}</div>
              <div class="text-sm">Role: ${Utils.escapeHTML(data.role || 'member')}</div>
            `;
          }
        }
      } catch (e) {
        console.error('Auth guard error', e);
      }
    });
  }

  // Force page to admin-only, otherwise redirect to katalog
  function requireAdmin() {
    auth.onAuthStateChanged(async (user) => {
      if (!user) return window.location.href = '../login.html';
      const udoc = await db.collection('users').doc(user.uid).get();
      if (!udoc.exists || udoc.data().role !== 'admin' || udoc.data().active === false) {
        window.location.href = '../katalog.html';
      }
    });
  }

  // Force authentication
  function requireAuth() {
    auth.onAuthStateChanged(user => {
      if (!user) window.location.href = 'login.html';
    });
  }

  return {
    initRegister,
    initLogin,
    signOutButton,
    setupAuthGuard,
    requireAdmin,
    requireAuth
  };
})();

// expose globally
window.Auth = Auth;

// If register/login pages present, start their handlers (prevent duplicate init)
document.addEventListener('DOMContentLoaded', () => {
  // Callers will include this script; auto-init if forms exist
  if (document.getElementById('register-form')) Auth.initRegister();
  if (document.getElementById('login-form')) Auth.initLogin();
});
