
// =========================
// 1. PENGATURAN
// =========================

const fileCSV = document.getElementById("fileCSV");
const fileName = document.getElementById("fileName");
const tabelTamu = document.getElementById("tabelTamu");
const statusMessage = document.getElementById("statusMessage");

const totalTamu = document.getElementById("totalTamu");
const dataValid = document.getElementById("dataValid");
const dataError = document.getElementById("dataError");
const resetButton = document.getElementById("resetButton");

let daftarTamu = [];

const formatKolom = [
    "id",
    "nama_tamu",
    "instansi",
    "kategori",
    "no_whatsapp"
];

// Batas penggunaan.
const BATAS_FILE = 1024 * 1024;
const BATAS_TAMU = 500;


// =========================
// 2. MEMBACA FILE CSV
// =========================

fileCSV.addEventListener("change", function () {

    const file = this.files[0];

    if (!file) return;

    // Menghapus data lama sebelum membaca file baru.
    daftarTamu = [];
    tampilkanTabel();

    statusMessage.textContent = "";
    statusMessage.className = "status-message";

    fileName.textContent = file.name;

    // Memeriksa format file.
    if (!file.name.toLowerCase().endsWith(".csv")) {
        tampilkanStatus("File harus berformat CSV.", "error");
        return;
    }

    // Membatasi ukuran file maksimal 1 MB.
    if (file.size === 0 || file.size > BATAS_FILE) {
        tampilkanStatus("Ukuran file harus lebih dari 0 dan maksimal 1 MB.", "error");
        return;
    }

    const reader = new FileReader();

    reader.onload = function (event) {

        try {

            const isiCSV = event.target.result;

            if (typeof isiCSV !== "string") {
                throw new Error("Isi file tidak dapat dibaca.");
            }

            const hasil = bacaCSV(isiCSV);

            daftarTamu = hasil;

            tampilkanTabel();

            tampilkanStatus(
                "CSV berhasil dibaca. Periksa data sebelum mengirim undangan.",
                "success"
            );

        } catch (error) {

            daftarTamu = [];
            tampilkanTabel();

            tampilkanStatus(error.message, "error");
        }
    };

    reader.onerror = function () {
        tampilkanStatus("Gagal membaca file CSV.", "error");
    };

    reader.readAsText(file, "UTF-8");
});


// =========================
// 3. PARSER CSV
// =========================

function parseCSV(teks) {

    const baris = [];

    let kolom = [];
    let nilai = "";
    let dalamKutipan = false;
    let setelahKutipan = false;

    for (let i = 0; i < teks.length; i++) {

        const karakter = teks[i];
        const berikutnya = teks[i + 1];

        if (dalamKutipan) {

            if (karakter === '"') {

                if (berikutnya === '"') {
                    nilai += '"';
                    i++;
                } else {
                    dalamKutipan = false;
                    setelahKutipan = true;
                }

            } else {
                nilai += karakter;
            }

        } else if (setelahKutipan) {

            if (karakter === ",") {

                kolom.push(nilai);
                nilai = "";
                setelahKutipan = false;

            } else if (karakter === "\n" || karakter === "\r") {

                kolom.push(nilai);
                simpanBaris();

                if (karakter === "\r" && berikutnya === "\n") {
                    i++;
                }

            } else if (karakter === " " || karakter === "\t") {

                // Mengizinkan spasi setelah tanda kutip.
                continue;

            } else {

                throw new Error("Format tanda kutip CSV tidak valid.");
            }

        } else if (karakter === '"') {

            if (nilai.length !== 0) {
                throw new Error("Format tanda kutip CSV tidak valid.");
            }

            dalamKutipan = true;

        } else if (karakter === ",") {

            kolom.push(nilai);
            nilai = "";

        } else if (karakter === "\n" || karakter === "\r") {

            kolom.push(nilai);
            simpanBaris();

            if (karakter === "\r" && berikutnya === "\n") {
                i++;
            }

        } else {

            nilai += karakter;
        }
    }

    if (dalamKutipan) {
        throw new Error("Terdapat tanda kutip CSV yang belum ditutup.");
    }

    kolom.push(nilai);

    if (kolom.some(item => item.trim() !== "")) {
        simpanBaris();
    }

    function simpanBaris() {

        if (kolom.some(item => item.trim() !== "")) {

            baris.push(kolom);

            if (baris.length > BATAS_TAMU + 1) {
                throw new Error("Jumlah data maksimal 500 tamu.");
            }
        }

        kolom = [];
        nilai = "";
        setelahKutipan = false;
    }

    return baris;
}


// =========================
// 4. VALIDASI CSV
// =========================

function bacaCSV(teks) {

    const baris = parseCSV(teks.replace(/^\uFEFF/, ""));

    if (baris.length < 2) {
        throw new Error("CSV belum memiliki data tamu.");
    }

    // Memeriksa nama kolom.
    const header = baris[0].map(item =>
        item.trim().toLowerCase()
    );

    // Mencegah nama kolom ganda.
    if (new Set(header).size !== header.length) {
        throw new Error("Terdapat nama kolom CSV yang duplikat.");
    }

    const headerValid = formatKolom.every(item =>
        header.includes(item)
    );

    if (!headerValid || header.length !== formatKolom.length) {
        throw new Error("Kolom CSV tidak sesuai format.");
    }

    const daftarID = new Set();

    return baris.slice(1).map(function (barisData) {

        if (barisData.length !== header.length) {
            return {
                id: barisData[0] || "-",
                nama_tamu: "Data tidak lengkap",
                instansi: "-",
                kategori: "-",
                no_whatsapp: "-",
                nomorNormal: "",
                valid: false
            };
        }

        const tamu = {};

        formatKolom.forEach(function (kolom) {

            const posisi = header.indexOf(kolom);

            tamu[kolom] = barisData[posisi].trim();
        });

        // Memeriksa panjang dan karakter input.
        const batasPanjang = {
            id: 20,
            nama_tamu: 100,
            instansi: 100,
            kategori: 50,
            no_whatsapp: 20
        };

        const inputValid = formatKolom.every(function (kolom) {

            const nilai = tamu[kolom];

            return (
                nilai.length > 0 &&
                nilai.length <= batasPanjang[kolom] &&
                !/[\u0000-\u001F\u007F]/.test(nilai)
            );
        });

        // ID hanya boleh menggunakan huruf, angka,
        // garis bawah, dan tanda hubung.
        const idValid = /^[a-zA-Z0-9_-]{1,20}$/.test(tamu.id);

        // Mencegah ID ganda.
        const idDuplikat = daftarID.has(tamu.id);

        daftarID.add(tamu.id);

        // Memeriksa nomor WhatsApp.
        const nomor = normalisasiNomor(tamu.no_whatsapp);

        const nomorValid = /^62\d{9,12}$/.test(nomor);

        tamu.nomorNormal = nomor;

        tamu.valid =
            inputValid &&
            idValid &&
            !idDuplikat &&
            nomorValid;

        return tamu;
    });
}


// =========================
// 5. NORMALISASI NOMOR
// =========================

function normalisasiNomor(nomor) {

    // Hanya menerima angka, spasi, +, -, (, dan ).
    if (!/^[0-9+\s()-]+$/.test(nomor)) {
        return "";
    }

    let hasil = nomor.replace(/[\s+()-]/g, "");

    // Mengubah 08 menjadi 628.
    if (hasil.startsWith("0")) {
        hasil = "62" + hasil.slice(1);
    }

    return hasil;
}


// =========================
// 6. MENAMPILKAN TABEL
// =========================

function tampilkanTabel() {

    tabelTamu.replaceChildren();

    let jumlahValid = 0;
    let jumlahError = 0;

    totalTamu.textContent = daftarTamu.length;

    daftarTamu.forEach(function (tamu) {

        const baris = document.createElement("tr");

        const data = [
            tamu.id,
            tamu.nama_tamu,
            tamu.instansi,
            tamu.kategori,
            tamu.no_whatsapp
        ];

        data.forEach(function (isi) {

            const sel = document.createElement("td");

            // Menampilkan teks tanpa menginterpretasikan HTML.
            sel.textContent = isi;

            baris.appendChild(sel);
        });

        const aksi = document.createElement("td");
        const tombol = document.createElement("a");

        tombol.textContent = "Kirim WhatsApp";
        tombol.className = "btn btn-whatsapp";

        if (tamu.valid) {

            jumlahValid++;

            tombol.href = buatLinkWhatsApp(tamu);
            tombol.target = "_blank";
            tombol.rel = "noopener noreferrer";

        } else {

            jumlahError++;

            tombol.classList.add("disabled");
            tombol.setAttribute("aria-disabled", "true");
            tombol.title = "Data tidak valid.";
        }

        aksi.appendChild(tombol);
        baris.appendChild(aksi);

        tabelTamu.appendChild(baris);
    });

    if (daftarTamu.length === 0) {

        const baris = document.createElement("tr");
        const sel = document.createElement("td");

        sel.colSpan = 6;
        sel.className = "empty-data";
        sel.textContent = "Belum ada data tamu.";

        baris.appendChild(sel);
        tabelTamu.appendChild(baris);
    }

    dataValid.textContent = jumlahValid;
    dataError.textContent = jumlahError;
}


// =========================
// 7. GENERATOR WHATSAPP
// =========================

function buatLinkWhatsApp(tamu) {

    const alamatUndangan = new URL(
        "index.html",
        window.location.href
    );

    // Membuat parameter URL secara aman.
    alamatUndangan.searchParams.set("to", tamu.instansi);
    alamatUndangan.searchParams.set("kategori", tamu.kategori);

    const pesan =
        `Yth. ${tamu.nama_tamu},\n\n` +
        `Kami mengundang perwakilan ${tamu.instansi} ` +
        `untuk menghadiri Edu Fair & Career Day 2026 ` +
        `SMKN 6 Kota Tangerang Selatan.\n\n` +
        `Silakan kunjungi undangan berikut:\n` +
        `${alamatUndangan.href}\n\n` +
        `Kami menantikan kehadiran Anda.\n\n` +
        `Panitia Edu Fair 2026`;

    return (
        "https://wa.me/" +
        tamu.nomorNormal +
        "?text=" +
        encodeURIComponent(pesan)
    );
}


// =========================
// 8. PESAN STATUS
// =========================

function tampilkanStatus(pesan, jenis) {

    statusMessage.textContent = pesan;
    statusMessage.className = "status-message " + jenis;
}


// =========================
// 9. RESET DATA
// =========================

resetButton.addEventListener("click", function () {

    daftarTamu = [];

    fileCSV.value = "";
    fileName.textContent = "Belum ada file dipilih";

    statusMessage.textContent = "";
    statusMessage.className = "status-message";

    tampilkanTabel();
});
