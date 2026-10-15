/*
 * auth.js
 * Login, daftar, dan logout untuk WebGIS.
 *
 * Catatan: GitHub Pages hanya hosting statis (tidak ada server), jadi
 * autentikasi di sini hanya simulasi di browser. Akun disimpan di
 * localStorage. Jangan dipakai untuk data yang benar-benar rahasia.
 */
(function () {
  "use strict";

  /* ==========================================================
     Penyimpanan
     ========================================================== */

  // Pembungkus Storage supaya tidak error kalau diblokir browser
  function createStore(storage) {
    return {
      get(key, fallback) {
        try {
          const value = JSON.parse(storage.getItem(key));
          return value == null ? fallback : value;
        } catch (err) {
          return fallback;
        }
      },
      set(key, value) {
        try {
          storage.setItem(key, JSON.stringify(value));
        } catch (err) {
          // abaikan
        }
      },
      remove(key) {
        try {
          storage.removeItem(key);
        } catch (err) {
          // abaikan
        }
      },
    };
  }

  const local = createStore(localStorage); // dipakai kalau "Ingat saya" dicentang
  const temporary = createStore(sessionStorage); // hilang saat tab ditutup

  // Halaman yang boleh dituju lewat ?next= (supaya tidak bisa diarahkan ke situs lain)
  const PRIVATE_PAGES = [
    "home.html",
    "geografis.html",
    "infrastruktur.html",
    "lingkungan.html",
    "sosial.html",
    "maps-overview.html",
    "pooling-data.html",
    "make-a-map.html",
    "bookmarks.html",
  ];

  const DEMO_ACCOUNT = { name: "Pengguna Demo", email: "demo@webgis.id", password: "demo123" };

  /* ==========================================================
     Akun & sesi
     ========================================================== */

  // Password di-hash (SHA-256) sebelum disimpan.
  // Kalau browser tidak mendukung crypto.subtle, pakai base64 sebagai cadangan.
  async function hashPassword(password) {
    if (window.crypto && crypto.subtle && window.TextEncoder) {
      const bytes = new TextEncoder().encode("webgis:" + password);
      const digest = await crypto.subtle.digest("SHA-256", bytes);
      return Array.from(new Uint8Array(digest))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
    }
    return "b64:" + btoa(unescape(encodeURIComponent("webgis:" + password)));
  }

  const getUsers = () => local.get("webgis_users", []);

  function getSession() {
    return temporary.get("webgis_session", null) || local.get("webgis_session", null);
  }

  function saveSession(user, remember) {
    const session = { email: user.email, name: user.name };
    const target = remember ? local : temporary;
    const other = remember ? temporary : local;
    target.set("webgis_session", session);
    other.remove("webgis_session");
  }

  // Pastikan akun demo selalu ada
  async function ensureDemoAccount() {
    const users = getUsers();
    const exists = users.some((user) => user.email === DEMO_ACCOUNT.email);
    if (exists) return;

    users.push({
      name: DEMO_ACCOUNT.name,
      email: DEMO_ACCOUNT.email,
      pass: await hashPassword(DEMO_ACCOUNT.password),
    });
    local.set("webgis_users", users);
  }

  async function register(name, email, password) {
    await ensureDemoAccount();
    email = email.toLowerCase();

    const users = getUsers();
    if (users.some((user) => user.email === email)) {
      return { ok: false, error: "Email sudah terdaftar. Silakan login." };
    }

    users.push({ name: name, email: email, pass: await hashPassword(password) });
    local.set("webgis_users", users);
    return { ok: true };
  }

  async function login(email, password, remember) {
    await ensureDemoAccount();
    email = email.toLowerCase();

    const user = getUsers().find((item) => item.email === email);
    if (!user || user.pass !== (await hashPassword(password))) {
      return { ok: false, error: "Email atau password salah." };
    }

    saveSession(user, remember);
    return { ok: true };
  }

  function updateName(newName) {
    const session = getSession();
    if (!session) return;

    // simpan di tempat sesi yang sedang dipakai
    const store = local.get("webgis_session", null) ? local : temporary;
    session.name = newName;
    store.set("webgis_session", session);

    const users = getUsers();
    const user = users.find((item) => item.email === session.email);
    if (user) {
      user.name = newName;
      local.set("webgis_users", users);
    }
  }

  function logout() {
    local.remove("webgis_session");
    temporary.remove("webgis_session");
  }

  // Dipakai oleh app.js
  window.WG = {
    session: getSession,
    login: login,
    register: register,
    logout: logout,
    updateName: updateName,
  };

  /* ==========================================================
     Penjaga halaman
     Atribut <html data-access="..."> menentukan aturannya:
       private = wajib login
       guest   = hanya untuk yang belum login (login & daftar)
       logout  = menghapus sesi saat dibuka
     ========================================================== */

  const access = document.documentElement.dataset.access;

  if (access === "private" && !getSession()) {
    const currentFile = location.pathname.split("/").pop() || "home.html";
    location.replace("login.html?next=" + encodeURIComponent(currentFile));
    return;
  }
  if (access === "guest" && getSession()) {
    location.replace("home.html");
    return;
  }
  if (access === "logout") {
    logout();
  }

  /* ==========================================================
     Halaman publik: beranda, login, daftar
     ========================================================== */

  document.addEventListener("DOMContentLoaded", () => {
    const $ = (selector) => document.querySelector(selector);
    const session = getSession();
    const params = new URLSearchParams(location.search);

    // Tombol Login/Daftar disembunyikan kalau sudah login (diganti "Buka Dashboard")
    document.querySelectorAll('[data-auth="guest"]').forEach((el) => (el.hidden = !!session));
    document.querySelectorAll('[data-auth="user"]').forEach((el) => (el.hidden = !session));

    // Menu hamburger di HP
    const burger = $("#burger");
    if (burger) {
      burger.addEventListener("click", () => document.body.classList.toggle("nav-open"));
      document.querySelectorAll(".links a").forEach((link) => {
        link.addEventListener("click", () => document.body.classList.remove("nav-open"));
      });
    }

    // Tombol mata: tampilkan/sembunyikan password
    const eye = $("#eye");
    if (eye) {
      eye.addEventListener("click", () => {
        const input = $("#pw");
        const willShow = input.type === "password";
        input.type = willShow ? "text" : "password";
        eye.textContent = willShow ? "🙈" : "👁";
        eye.setAttribute("aria-label", willShow ? "Sembunyikan password" : "Tampilkan password");
      });
    }

    // kind: "err" | "ok" | "info" (class .alert di CSS)
    function showMessage(text, kind) {
      const box = $("#msg");
      if (!box) return;
      box.textContent = text;
      box.className = "alert " + kind;
      box.hidden = false;
    }

    /* ---------- Form login ---------- */
    const loginForm = $("#loginForm");
    if (loginForm) {
      if (params.get("registered")) {
        showMessage("Akun berhasil dibuat. Silakan login.", "ok");
      } else if (params.get("next")) {
        showMessage("Silakan login untuk membuka halaman tersebut.", "info");
      }

      loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = $("#email").value.trim();
        const password = $("#pw").value;

        if (!email || !password) {
          showMessage("Email dan password wajib diisi.", "err");
          return;
        }

        const submitButton = loginForm.querySelector("[type=submit]");
        submitButton.disabled = true;
        const result = await login(email, password, $("#remember").checked);
        submitButton.disabled = false;

        if (!result.ok) {
          showMessage(result.error, "err");
          return;
        }

        const next = params.get("next");
        location.href = PRIVATE_PAGES.includes(next) ? next : "home.html";
      });

      // Tombol "Coba dengan akun demo": isi form lalu kirim
      const demoButton = $("#demo");
      if (demoButton) {
        demoButton.addEventListener("click", () => {
          $("#email").value = DEMO_ACCOUNT.email;
          $("#pw").value = DEMO_ACCOUNT.password;
          if (loginForm.requestSubmit) {
            loginForm.requestSubmit();
          } else {
            loginForm.dispatchEvent(new Event("submit", { cancelable: true }));
          }
        });
      }
    }

    /* ---------- Form daftar ---------- */
    const registerForm = $("#registerForm");
    if (registerForm) {
      registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const name = $("#name").value.trim();
        const email = $("#email").value.trim();
        const password = $("#pw").value;
        const confirmPassword = $("#pw2").value;

        if (name.length < 2) return showMessage("Nama minimal 2 karakter.", "err");
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
          return showMessage("Format email tidak valid.", "err");
        if (password.length < 6) return showMessage("Password minimal 6 karakter.", "err");
        if (password !== confirmPassword)
          return showMessage("Konfirmasi password tidak sama.", "err");

        const submitButton = registerForm.querySelector("[type=submit]");
        submitButton.disabled = true;
        const result = await register(name, email, password);
        submitButton.disabled = false;

        if (!result.ok) return showMessage(result.error, "err");
        location.href = "login.html?registered=1";
      });
    }
  });
})();
