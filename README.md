# WebGIS

Aplikasi WebGIS (Sistem Informasi Geografis berbasis web) statis: HTML + CSS (menyatu di tiap halaman) + JavaScript.

## Alur halaman

**Sebelum login** → `index.html` (beranda) → `register.html` (daftar) → `login.html`
**Sesudah login** → `home.html` (dashboard) → kategori, maps, bookmarks
**Logout** → `logout.html` → kembali ke `login.html` / `index.html`

| Halaman | File |
|---|---|
| Beranda publik | `index.html` |
| Daftar / Login / Logout | `register.html`, `login.html`, `logout.html` |
| Home (dashboard) | `home.html` |
| Category | `geografis.html`, `infrastruktur.html`, `lingkungan.html`, `sosial.html` |
| Maps | `maps-overview.html`, `pooling-data.html`, `make-a-map.html` |
| Bookmarks | `bookmarks.html` |

Skrip: `auth.js` (login/daftar/logout & penjaga halaman) dan `app.js` (peta, tabel, bookmark).

## Akun demo

- Email: `demo@webgis.id`
- Password: `demo123`

## Upload ke GitHub & aktifkan GitHub Pages

1. Buat repository baru di GitHub, lalu upload **semua isi folder ini** ke root repository.
2. Buka **Settings → Pages**.
3. Pada *Build and deployment* pilih **Deploy from a branch**, branch `main`, folder `/ (root)`, lalu **Save**.
4. Tunggu sebentar, situs tersedia di `https://USERNAME.github.io/NAMA-REPO/`.

## Catatan penting

- GitHub Pages hanya hosting statis, jadi **login ini simulasi di browser** (akun disimpan di localStorage, password di-hash). Jangan dipakai untuk data rahasia. Untuk login sungguhan, hubungkan ke backend (mis. Firebase, Supabase).
- Peta memakai Leaflet dan tile OpenStreetMap/Esri, sehingga perlu koneksi internet.
- Ganti data contoh pada konstanta `DATA` di `app.js`.
