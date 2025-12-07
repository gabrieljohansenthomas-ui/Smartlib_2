/**
 * Auth logic:
 * - Register member (default role)
 * - Login
 * - Redirect based on role
 * - Prevent inactive users
 */

import { auth, db } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

import {
  doc, getDoc, setDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";


/* REGISTER --------------------------------------------- */
const regBtn = document.getElementById("registerBtn");
if (regBtn) {
  regBtn.addEventListener("click", async () => {
    const name = sanitizeHTML(regName.value.trim());
    const email = regEmail.value.trim();
    const pw = regPassword.value.trim();

    if (!name || !email || pw.length < 6) {
      alert("Lengkapi semua kolom dengan benar.");
      return;
    }

    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, pw);
      const uid = userCred.user.uid;

      await setDoc(doc(db, "users", uid), {
        displayName: name,
        email,
        role: "member",
        active: true,
        joinedAt: new Date()
      });

      alert("Registrasi sukses!");
      window.location.href = "dashboard.html";

    } catch (err) {
      alert("Error: " + err.message);
    }
  });
}


/* LOGIN ------------------------------------------------- */
const loginBtn = document.getElementById("loginBtn");
if (loginBtn) {
  loginBtn.addEventListener("click", async () => {
    const email = document.getElementById("email").value.trim();
    const pw = document.getElementById("password").value.trim();

    try {
      await signInWithEmailAndPassword(auth, email, pw);
      window.location.href = "dashboard.html";
    } catch (err) {
      alert("Login gagal: " + err.message);
    }
  });
}


/* ROLE CHECK & REDIRECT -------------------------------- */
onAuthStateChanged(auth, async user => {
  const roleDiv = document.getElementById("roleRedirect");
  if (!user || !roleDiv) return;

  const snap = await getDoc(doc(db, "users", user.uid));
  if (!snap.exists()) return;

  const data = snap.data();

  if (!data.active) {
    alert("Akun Anda dinonaktifkan.");
    signOut(auth);
    return;
  }

  if (data.role === "admin") {
    roleDiv.innerHTML = `
      <a href="admin/books.html"
         class="px-4 py-2 bg-sky-600 text-white rounded">Masuk Panel Admin</a>`;
  } else {
    roleDiv.innerHTML = `
      <a href="katalog.html"
         class="px-4 py-2 bg-green-600 text-white rounded">Masuk Katalog</a>`;
  }
});


/* ADMIN GUARD ------------------------------------------ */
export async function requireAdmin() {
  return new Promise(resolve => {
    onAuthStateChanged(auth, async user => {
      if (!user) return (window.location.href = "../login.html");

      const snap = await getDoc(doc(db, "users", user.uid));
      if (!snap.exists() || snap.data().role !== "admin") {
        alert("Akses khusus admin.");
        window.location.href = "../katalog.html";
      } else resolve(true);
    });
  });
}
