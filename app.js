/*
 * app.js
 * Logika halaman dashboard WebGIS: sidebar, peta (Leaflet), tabel data,
 * bookmark, dan fitur Make a Map.
 */
(function () {
  "use strict";

  // Kalau belum login, auth.js sudah mengarahkan ke login.html,
  // jadi di sini cukup berhenti.
  const WG = window.WG;
  if (!WG || !WG.session()) return;

  // Nama halaman diambil dari <body data-page="...">
  const PAGE = document.body.dataset.page;

  /* ==========================================================
     Data & konstanta
     ========================================================== */

  const CATEGORIES = {
    geografis: { label: "Geografis", color: "#6b8e23" },
    infrastruktur: { label: "Infrastruktur", color: "#2b7bb9" },
    lingkungan: { label: "Lingkungan", color: "#2f8f4e" },
    sosial: { label: "Sosial", color: "#c2703a" },
  };

  // Data contoh. Ganti dengan data asli kalau sudah ada.
  // pop = populasi, area = luas (sq km), elev = elevasi (m)
  const SAMPLE_DATA = [
    {
      id: "G01",
      name: "City Park",
      type: "Park",
      cat: "geografis",
      lat: -6.2088,
      lng: 106.8456,
      pop: null,
      area: 1.5,
      elev: 20,
      date: "2024-01-01",
    },
    {
      id: "G02",
      name: "River A",
      type: "Waterway",
      cat: "geografis",
      lat: -6.2177,
      lng: 106.8545,
      pop: null,
      area: null,
      elev: null,
      date: "2024-01-02",
    },
    {
      id: "G03",
      name: "Downtown",
      type: "Urban",
      cat: "geografis",
      lat: -6.2097,
      lng: 106.8467,
      pop: 5000,
      area: 3.2,
      elev: 15,
      date: "2024-01-03",
    },
    {
      id: "G04",
      name: "Mountain X",
      type: "Terrain",
      cat: "geografis",
      lat: -6.3,
      lng: 106.85,
      pop: null,
      area: null,
      elev: 800,
      date: "2024-01-04",
    },
    {
      id: "G05",
      name: "Residential",
      type: "Housing",
      cat: "geografis",
      lat: -6.2155,
      lng: 106.8478,
      pop: 2000,
      area: 2.1,
      elev: 25,
      date: "2024-01-05",
    },
    {
      id: "I01",
      name: "Jembatan Layang A",
      type: "Transportasi",
      cat: "infrastruktur",
      lat: -6.225,
      lng: 106.8,
      pop: null,
      area: 0.4,
      elev: 12,
      date: "2024-02-01",
    },
    {
      id: "I02",
      name: "Terminal Pusat",
      type: "Transportasi",
      cat: "infrastruktur",
      lat: -6.195,
      lng: 106.823,
      pop: 12000,
      area: 2.8,
      elev: 8,
      date: "2024-02-03",
    },
    {
      id: "I03",
      name: "Bendungan B",
      type: "Irigasi",
      cat: "infrastruktur",
      lat: -6.27,
      lng: 106.88,
      pop: null,
      area: 5.5,
      elev: 60,
      date: "2024-02-08",
    },
    {
      id: "L01",
      name: "Hutan Kota",
      type: "Ruang Hijau",
      cat: "lingkungan",
      lat: -6.23,
      lng: 106.83,
      pop: null,
      area: 4.2,
      elev: 18,
      date: "2024-03-02",
    },
    {
      id: "L02",
      name: "Stasiun Pemantau Udara",
      type: "Kualitas Udara",
      cat: "lingkungan",
      lat: -6.18,
      lng: 106.84,
      pop: null,
      area: 0.1,
      elev: 10,
      date: "2024-03-05",
    },
    {
      id: "L03",
      name: "Danau Retensi",
      type: "Perairan",
      cat: "lingkungan",
      lat: -6.26,
      lng: 106.81,
      pop: null,
      area: 1.9,
      elev: 6,
      date: "2024-03-09",
    },
    {
      id: "S01",
      name: "Puskesmas Kelurahan",
      type: "Kesehatan",
      cat: "sosial",
      lat: -6.2,
      lng: 106.86,
      pop: 8000,
      area: 0.2,
      elev: 14,
      date: "2024-04-01",
    },
    {
      id: "S02",
      name: "SMA Negeri 1",
      type: "Pendidikan",
      cat: "sosial",
      lat: -6.24,
      lng: 106.865,
      pop: 1200,
      area: 0.6,
      elev: 22,
      date: "2024-04-04",
    },
    {
      id: "S03",
      name: "Pasar Tradisional",
      type: "Ekonomi",
      cat: "sosial",
      lat: -6.212,
      lng: 106.825,
      pop: 3500,
      area: 0.8,
      elev: 11,
      date: "2024-04-07",
    },
  ];

  /* ==========================================================
     Fungsi bantu
     ========================================================== */

  const $ = (selector, parent) => (parent || document).querySelector(selector);
  const $$ = (selector, parent) => Array.from((parent || document).querySelectorAll(selector));

  // Baca/tulis localStorage dengan aman (bisa gagal di mode privat)
  const storage = {
    get(key, fallback) {
      try {
        const value = JSON.parse(localStorage.getItem(key));
        return value == null ? fallback : value;
      } catch (err) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (err) {
        // abaikan kalau penyimpanan penuh / diblokir
      }
    },
  };

  // Titik buatan pengguna (dari halaman Make a Map)
  const getUserPoints = () => storage.get("webgis_user_points", []);
  const getAllPoints = () => SAMPLE_DATA.concat(getUserPoints());
  const getBookmarks = () => storage.get("webgis_bookmarks", []);

  function escapeHtml(text) {
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return String(text).replace(/[&<>"']/g, (char) => map[char]);
  }

  // Nilai kosong ditampilkan sebagai "-"
  function showValue(value) {
    return value == null || value === "" ? "-" : value;
  }

  // Jumlahkan satu kolom angka (nilai kosong dianggap 0)
  function sumBy(rows, key) {
    return rows.reduce((total, row) => total + (row[key] || 0), 0);
  }

  function showToast(text) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = text;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2200);
  }

  function downloadFile(filename, mimeType, content) {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([content], { type: mimeType }));
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  /* ==========================================================
     Sidebar
     ========================================================== */

  const sidebar = $("#sidebar");
  const overlay = $("#overlay");

  // Dipakai di tampilan HP: sidebar geser masuk/keluar
  function toggleSidebar(open) {
    sidebar.classList.toggle("open", open);
    overlay.classList.toggle("show", open);
  }

  $("#menuBtn").addEventListener("click", () => {
    toggleSidebar(!sidebar.classList.contains("open"));
  });
  overlay.addEventListener("click", () => toggleSidebar(false));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") toggleSidebar(false);
  });

  // Buka/tutup sub menu (Category dan Maps)
  $$(".nav-parent").forEach((button) => {
    button.addEventListener("click", () => {
      const group = button.parentElement;
      group.classList.toggle("open");
      button.setAttribute("aria-expanded", group.classList.contains("open"));
    });
  });

  /* ==========================================================
     Modal, profil, bantuan, dan logout
     ========================================================== */

  function openModal(html, onOpen) {
    const backdrop = document.createElement("div");
    backdrop.className = "modal-bg";
    backdrop.innerHTML = '<div class="modal" role="dialog" aria-modal="true">' + html + "</div>";
    document.body.appendChild(backdrop);

    const closeModal = () => backdrop.remove();
    // klik area gelap di luar kotak = tutup
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) closeModal();
    });
    $$("[data-close]", backdrop).forEach((button) => button.addEventListener("click", closeModal));

    if (onOpen) onOpen(backdrop, closeModal);
  }

  function showUserName() {
    $("#loginBtn").textContent = WG.session().name;
  }

  function openProfileForm() {
    openModal(
      "<h3>Profile Edit</h3><p>Ubah nama yang tampil di dashboard.</p>" +
        '<input id="nm" maxlength="40" value="' +
        escapeHtml(WG.session().name) +
        '" autofocus>' +
        '<div class="row"><button class="btn ghost" data-close>Batal</button><button class="btn" id="sv">Simpan</button></div>',
      (modal, closeModal) => {
        $("#sv", modal).onclick = () => {
          const newName = $("#nm", modal).value.trim();
          if (!newName) {
            showToast("Nama tidak boleh kosong");
            return;
          }
          WG.updateName(newName);
          showUserName();
          const welcome = $("#welcome");
          if (welcome) welcome.textContent = newName;
          closeModal();
          showToast("Profil tersimpan");
        };
      },
    );
  }

  function openHelp() {
    openModal(
      "<h3>Setting and Support</h3><p>WebGIS membantu Anda menjelajahi data spasial secara daring. Pilih kategori untuk melihat data, " +
        "gunakan <b>Make a Map</b> untuk menambah titik, dan simpan data penting dengan ikon bintang.</p>" +
        '<p>Butuh bantuan? Hubungi admin sistem Anda.</p><div class="row"><button class="btn" data-close>Tutup</button></div>',
    );
  }

  function confirmLogout() {
    openModal(
      "<h3>Keluar dari WebGIS?</h3><p>Sesi Anda akan diakhiri. Bookmark dan titik peta tetap tersimpan di browser ini.</p>" +
        '<div class="row"><button class="btn ghost" data-close>Batal</button><button class="btn danger" id="out">Ya, Logout</button></div>',
      (modal) => {
        $("#out", modal).onclick = () => {
          WG.logout();
          location.href = "logout.html";
        };
      },
    );
  }

  $("#loginBtn").addEventListener("click", openProfileForm);
  $$('[data-modal="profile"]').forEach((button) =>
    button.addEventListener("click", openProfileForm),
  );
  $$('[data-modal="help"]').forEach((button) => button.addEventListener("click", openHelp));
  $("#logoutBtn").addEventListener("click", confirmLogout);
  showUserName();

  /* ==========================================================
     Peta (Leaflet)
     ========================================================== */

  // Membuat peta di elemen dengan id tertentu.
  // Mengembalikan objek peta yang punya method drawPoints(rows, fit).
  function createMap(elementId, options) {
    options = options || {};
    const element = document.getElementById(elementId);
    if (!element) return null;

    // Leaflet dimuat dari internet; kalau gagal, tampilkan pesan
    if (typeof L === "undefined") {
      element.innerHTML =
        '<p class="map-fail">Peta memerlukan koneksi internet untuk memuat Leaflet.</p>';
      return null;
    }

    const map = L.map(elementId, { scrollWheelZoom: options.scroll !== false }).setView(
      [-6.23, 106.84],
      options.zoom || 11,
    );

    const streets = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);
    const satellite = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        maxZoom: 19,
        attribution: "Tiles &copy; Esri",
      },
    );
    L.control.layers({ "Peta Jalan": streets, Satelit: satellite }).addTo(map);

    const markers = L.featureGroup().addTo(map);

    // Gambar ulang semua titik. fit = false supaya zoom peta tidak berubah.
    map.drawPoints = function (rows, fit) {
      markers.clearLayers();
      rows.forEach((row) => {
        const category = CATEGORIES[row.cat] || CATEGORIES.geografis;
        const popup =
          "<b>" +
          escapeHtml(row.name) +
          "</b><br>" +
          escapeHtml(row.type) +
          " · " +
          escapeHtml(category.label) +
          "<br>" +
          "<small>" +
          row.lat +
          ", " +
          row.lng +
          "</small>";

        L.circleMarker([row.lat, row.lng], {
          radius: 9,
          color: "#fff",
          weight: 2,
          fillColor: category.color,
          fillOpacity: 0.95,
        })
          .bindPopup(popup)
          .addTo(markers);
      });

      if (fit !== false && rows.length) {
        map.fitBounds(markers.getBounds().pad(0.3), { maxZoom: 14 });
      }
    };

    // Ukuran peta kadang belum benar saat halaman baru dimuat
    setTimeout(() => map.invalidateSize(), 200);
    return map;
  }

  /* ==========================================================
     Tabel data
     ========================================================== */

  function buildTable(rows) {
    if (!rows.length) return '<div class="empty">Belum ada data yang cocok.</div>';

    const bookmarks = getBookmarks();
    const headers = [
      "ID",
      "Name",
      "Type",
      "Latitude",
      "Longitude",
      "Population",
      "Area (sq km)",
      "Elevation (m)",
      "Date",
      "Simpan",
    ];

    const headerHtml = headers.map((title) => "<th>" + title + "</th>").join("");
    const bodyHtml = rows
      .map((row) => {
        const starClass = bookmarks.includes(row.id) ? "star on" : "star";
        return (
          "<tr>" +
          "<td>" +
          escapeHtml(row.id) +
          "</td>" +
          "<td>" +
          escapeHtml(row.name) +
          "</td>" +
          "<td>" +
          escapeHtml(row.type) +
          "</td>" +
          "<td>" +
          row.lat +
          "</td>" +
          "<td>" +
          row.lng +
          "</td>" +
          "<td>" +
          showValue(row.pop) +
          "</td>" +
          "<td>" +
          showValue(row.area) +
          "</td>" +
          "<td>" +
          showValue(row.elev) +
          "</td>" +
          "<td>" +
          escapeHtml(row.date) +
          "</td>" +
          '<td><button class="' +
          starClass +
          '" data-bm="' +
          escapeHtml(row.id) +
          '" aria-label="Bookmark ' +
          escapeHtml(row.name) +
          '">&#9733;</button></td>' +
          "</tr>"
        );
      })
      .join("");

    return (
      '<div class="table-wrap"><table><thead><tr>' +
      headerHtml +
      "</tr></thead><tbody>" +
      bodyHtml +
      "</tbody></table></div>"
    );
  }

  function renderTable(selector, rows) {
    $(selector).innerHTML = buildTable(rows);
  }

  // Klik ikon bintang = tambah/hapus bookmark
  document.addEventListener("click", (e) => {
    const star = e.target.closest("[data-bm]");
    if (!star) return;

    const id = star.dataset.bm;
    let bookmarks = getBookmarks();

    if (bookmarks.includes(id)) {
      bookmarks = bookmarks.filter((item) => item !== id);
      showToast("Dihapus dari bookmark");
    } else {
      bookmarks.push(id);
      showToast("Ditambahkan ke bookmark");
    }
    storage.set("webgis_bookmarks", bookmarks);

    // samakan tampilan semua bintang untuk data yang sama
    $$('[data-bm="' + id + '"]').forEach((el) => el.classList.toggle("on", bookmarks.includes(id)));

    if (PAGE === "bookmarks") initBookmarks();
  });

  /* ==========================================================
     Kartu statistik
     ========================================================== */

  function statCard(label, value, color) {
    return (
      '<div class="stat" style="--c:' +
      (color || "var(--primary)") +
      '">' +
      "<small>" +
      label +
      "</small><b>" +
      value +
      "</b></div>"
    );
  }

  /* ==========================================================
     Isi tiap halaman
     ========================================================== */

  // Home: peta kecil + 5 data pertama
  function initHome() {
    const welcome = $("#welcome");
    if (welcome) welcome.textContent = WG.session().name;

    const map = createMap("map", { scroll: false });
    if (map) map.drawPoints(getAllPoints());

    renderTable("#tbl", SAMPLE_DATA.slice(0, 5));
  }

  // Geografis, Infrastruktur, Lingkungan, Sosial
  function initCategory() {
    const categoryRows = getAllPoints().filter((row) => row.cat === PAGE);
    const color = CATEGORIES[PAGE].color;

    const rowsWithElevation = categoryRows.filter((row) => row.elev != null);
    const averageElevation = Math.round(
      sumBy(categoryRows, "elev") / Math.max(1, rowsWithElevation.length),
    );

    $("#stats").innerHTML =
      statCard("Jumlah Titik Data", categoryRows.length, color) +
      statCard("Total Populasi", sumBy(categoryRows, "pop").toLocaleString("id-ID"), color) +
      statCard("Total Luas (sq km)", sumBy(categoryRows, "area").toFixed(1), color) +
      statCard("Rata-rata Elevasi (m)", averageElevation, color);

    const map = createMap("map");

    function showRows() {
      const keyword = $("#q").value.toLowerCase();
      const rows = categoryRows.filter((row) =>
        (row.name + row.type + row.id).toLowerCase().includes(keyword),
      );
      if (map) map.drawPoints(rows);
      renderTable("#tbl", rows);
    }

    $("#q").addEventListener("input", showRows);
    showRows();
  }

  // Maps > Overview: peta besar dengan filter kategori
  function initOverview() {
    const rows = getAllPoints();

    $("#stats").innerHTML =
      statCard("Total Titik Data", rows.length) +
      statCard("Kategori", 4, "#2b7bb9") +
      statCard("Total Populasi", sumBy(rows, "pop").toLocaleString("id-ID"), "#c2703a") +
      statCard("Total Luas (sq km)", sumBy(rows, "area").toFixed(1), "#6b8e23");

    const activeCategories = new Set(Object.keys(CATEGORIES));

    $("#chips").innerHTML = Object.keys(CATEGORIES)
      .map(
        (key) =>
          '<button class="chip on" data-k="' +
          key +
          '" style="--c:' +
          CATEGORIES[key].color +
          '">' +
          CATEGORIES[key].label +
          "</button>",
      )
      .join("");

    const map = createMap("map", {});

    function showActiveCategories() {
      if (map) map.drawPoints(getAllPoints().filter((row) => activeCategories.has(row.cat)));
    }

    $$(".chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        const key = chip.dataset.k;
        if (activeCategories.has(key)) {
          activeCategories.delete(key);
        } else {
          activeCategories.add(key);
        }
        chip.classList.toggle("on", activeCategories.has(key));
        showActiveCategories();
      });
    });

    showActiveCategories();
  }

  // Maps > Pooling Data: semua data, bisa dicari, difilter, diurutkan, dan diunduh
  function initPooling() {
    $("#cat").innerHTML =
      '<option value="">Semua kategori</option>' +
      Object.keys(CATEGORIES)
        .map((key) => '<option value="' + key + '">' + CATEGORIES[key].label + "</option>")
        .join("");

    let visibleRows = [];

    function showRows() {
      const keyword = $("#q").value.toLowerCase();
      const category = $("#cat").value;
      const [sortKey, sortDirection] = $("#sort").value.split(":");

      visibleRows = getAllPoints().filter((row) => {
        const matchCategory = !category || row.cat === category;
        const matchKeyword = (row.name + row.type + row.id).toLowerCase().includes(keyword);
        return matchCategory && matchKeyword;
      });

      // data kosong dianggap paling kecil
      visibleRows.sort((a, b) => {
        const x = a[sortKey] == null ? -Infinity : a[sortKey];
        const y = b[sortKey] == null ? -Infinity : b[sortKey];
        const result = x > y ? 1 : x < y ? -1 : 0;
        return sortDirection === "desc" ? -result : result;
      });

      $("#count").textContent = visibleRows.length + " data ditampilkan";
      renderTable("#tbl", visibleRows);
    }

    ["#q", "#cat", "#sort"].forEach((selector) => $(selector).addEventListener("input", showRows));

    $("#csv").addEventListener("click", () => {
      const header = [
        "id",
        "name",
        "type",
        "category",
        "latitude",
        "longitude",
        "population",
        "area_sqkm",
        "elevation_m",
        "date",
      ];
      const lines = [header.join(",")];

      visibleRows.forEach((row) => {
        const cells = [
          row.id,
          row.name,
          row.type,
          row.cat,
          row.lat,
          row.lng,
          showValue(row.pop),
          showValue(row.area),
          showValue(row.elev),
          row.date,
        ];
        lines.push(cells.map((cell) => '"' + String(cell).replace(/"/g, '""') + '"').join(","));
      });

      // ﻿ supaya Excel membaca file sebagai UTF-8
      downloadFile("pooling-data.csv", "text/csv;charset=utf-8", "﻿" + lines.join("\n"));
    });

    showRows();
  }

  // Maps > Make a Map: klik peta untuk menambah titik sendiri
  function initMakeMap() {
    $("#mcat").innerHTML = Object.keys(CATEGORIES)
      .map((key) => '<option value="' + key + '">' + CATEGORIES[key].label + "</option>")
      .join("");

    const map = createMap("map", {});
    let tempMarker = null; // penanda sementara sebelum titik disimpan

    function showUserPoints() {
      const points = getUserPoints();
      if (map) map.drawPoints(points, false);

      if (!points.length) {
        $("#plist").innerHTML = "<li>Belum ada titik. Klik peta untuk memulai.</li>";
        return;
      }
      $("#plist").innerHTML = points
        .map(
          (point) =>
            "<li><span><b>" +
            escapeHtml(point.id) +
            "</b> · " +
            escapeHtml(point.name) +
            "</span>" +
            '<button class="btn danger" style="padding:4px 10px" data-del="' +
            escapeHtml(point.id) +
            '">Hapus</button></li>',
        )
        .join("");
    }

    if (map) {
      map.on("click", (e) => {
        $("#lat").value = e.latlng.lat.toFixed(5);
        $("#lng").value = e.latlng.lng.toFixed(5);
        if (tempMarker) tempMarker.remove();
        tempMarker = L.marker(e.latlng).addTo(map);
        $("#nm").focus();
      });
    }

    $("#add").addEventListener("click", () => {
      const name = $("#nm").value.trim();
      const lat = parseFloat($("#lat").value);
      const lng = parseFloat($("#lng").value);

      if (!name || isNaN(lat) || isNaN(lng)) {
        showToast("Isi nama dan pilih lokasi di peta");
        return;
      }

      const points = getUserPoints();
      points.push({
        id: "U" + String(Date.now()).slice(-5),
        name: name,
        type: $("#typ").value.trim() || "Titik Baru",
        cat: $("#mcat").value,
        lat: lat,
        lng: lng,
        pop: null,
        area: null,
        elev: null,
        date: new Date().toISOString().slice(0, 10),
      });
      storage.set("webgis_user_points", points);

      $("#nm").value = "";
      $("#typ").value = "";
      if (tempMarker) {
        tempMarker.remove();
        tempMarker = null;
      }
      showUserPoints();
      showToast("Titik disimpan & masuk ke Pooling Data");
    });

    // tombol Hapus di daftar titik
    $("#plist").addEventListener("click", (e) => {
      const button = e.target.closest("[data-del]");
      if (!button) return;
      storage.set(
        "webgis_user_points",
        getUserPoints().filter((point) => point.id !== button.dataset.del),
      );
      showUserPoints();
    });

    $("#geo").addEventListener("click", () => {
      const features = getUserPoints().map((point) => ({
        type: "Feature",
        properties: {
          id: point.id,
          name: point.name,
          type: point.type,
          category: point.cat,
          date: point.date,
        },
        geometry: { type: "Point", coordinates: [point.lng, point.lat] }, // GeoJSON: lng dulu, baru lat
      }));

      if (!features.length) {
        showToast("Belum ada titik untuk diekspor");
        return;
      }
      const geojson = { type: "FeatureCollection", features: features };
      downloadFile("peta-saya.geojson", "application/geo+json", JSON.stringify(geojson, null, 2));
    });

    showUserPoints();
  }

  // Bookmarks: data yang diberi bintang
  function initBookmarks() {
    const bookmarks = getBookmarks();
    const rows = getAllPoints().filter((row) => bookmarks.includes(row.id));

    $("#count").textContent = rows.length + " data tersimpan";

    if (!rows.length) {
      $("#tbl").innerHTML =
        '<div class="empty">Belum ada bookmark.<br>Klik ikon &#9733; pada tabel data untuk menyimpan.</div>';
      return;
    }
    renderTable("#tbl", rows);
  }

  /* ==========================================================
     Jalankan fungsi yang sesuai dengan halaman
     ========================================================== */

  const pageInitializers = {
    home: initHome,
    overview: initOverview,
    pooling: initPooling,
    make: initMakeMap,
    bookmarks: initBookmarks,
  };

  if (pageInitializers[PAGE]) {
    pageInitializers[PAGE]();
  } else if (CATEGORIES[PAGE]) {
    initCategory();
  }
})();
