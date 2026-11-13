
// =========================
// 1. PERSONALISASI UNDANGAN
// =========================

const namaPenerima = document.getElementById("namaPenerima");
const kategoriPenerima = document.getElementById("kategoriPenerima");

const parameterURL = new URLSearchParams(window.location.search);

const nama = (parameterURL.get("to") || "").trim();
const kategori = (parameterURL.get("kategori") || "").trim();

// Membatasi panjang input.
namaPenerima.textContent =
    nama.length > 0 && nama.length <= 100
        ? nama
        : "Tamu Undangan";

kategoriPenerima.textContent =
    kategori.length > 0 && kategori.length <= 50
        ? kategori
        : "Tamu Kehormatan";


// =========================
// 2. MENU RESPONSIVE
// =========================

const menuToggle = document.getElementById("menuToggle");
const navLinks = document.getElementById("navLinks");

if (menuToggle && navLinks) {

    menuToggle.addEventListener("click", function () {

        const menuTerbuka = navLinks.classList.toggle("active");

        menuToggle.setAttribute("aria-expanded", String(menuTerbuka));
        menuToggle.textContent = menuTerbuka ? "×" : "☰";
    });

    // Menutup menu setelah tautan diklik.
    navLinks.querySelectorAll("a").forEach(function (link) {

        link.addEventListener("click", function () {
            navLinks.classList.remove("active");
            menuToggle.setAttribute("aria-expanded", "false");
            menuToggle.textContent = "☰";
        });

    });

}
