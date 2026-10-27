/**
 * SuratBase — script.js
 * ================================================================
 * Mesin utama aplikasi Document-to-Database untuk surat dinas.
 * Arsitektur: flat module pattern (IIFE) dengan namespace tunggal.
 *
 * Bagian:
 *  1. CONSTANTS & STATE
 *  2. SAMPLE LETTERS (3 contoh surat dummy)
 *  3. EXTRACTION ENGINE (regex + keyword rules)
 *  4. XSS HELPER
 *  5. STORAGE (localStorage)
 *  6. STATS RENDERER
 *  7. TABLE RENDERER
 *  8. PREVIEW PANEL
 *  9. CRUD OPERATIONS
 * 10. SEARCH & FILTER
 * 11. EXPORT (CSV + JSON)
 * 12. TOAST NOTIFICATION
 * 13. EVENT WIRING
 * ================================================================
 */

(() => {
  'use strict';

  /* ════════════════════════════════════════════════════════════
   * 1. CONSTANTS & STATE
   * ════════════════════════════════════════════════════════════ */

  const STORAGE_KEY = 'suratbase_v1';

  /** Aplikasi state: daftar surat tersimpan + query aktif */
  const state = {
    records:    [],     // Array of SuratRecord objects
    searchQuery:'',     // string pencarian
    filterSifat:'',     // string filter sifat
    editingId:  null,   // ID record yang sedang diedit
    sampleIndex: 0,     // Rotasi contoh surat
  };

  /** @typedef {{ id:string, nomor:string, tanggal:string, pengirim:string, perihal:string, jenis:string, sifat:string, lampiran:string, createdAt:string }} SuratRecord */

  /* ════════════════════════════════════════════════════════════
   * 2. SAMPLE LETTERS — 3 contoh surat dummy
   * ════════════════════════════════════════════════════════════ */

  const SAMPLE_LETTERS = [
    /* ── Contoh 1: Surat Undangan Rapat ──────────────────── */
    `PEMERINTAH KABUPATEN SUNGAI BENING
DINAS PENDIDIKAN DAN KEBUDAYAAN
Jl. Merdeka No. 10, Sungai Bening 75100
Telp. (0541) 123456 | Email: disdik@sungaibening.go.id

Nomor  : 005/DISDIK/IV/2026
Lampiran : 1 (satu) berkas
Sifat  : Segera
Perihal : Undangan Rapat Koordinasi Peningkatan Mutu Pendidikan

Kepada Yth.
Kepala Sekolah SMP/SMA Negeri se-Kabupaten Sungai Bening
di Tempat

Dengan hormat,
Sehubungan dengan program peningkatan mutu pendidikan Tahun Ajaran 2026/2027, bersama ini kami mengundang Saudara/i untuk hadir dalam Rapat Koordinasi yang akan dilaksanakan pada:

Hari/Tanggal : Senin, 12 Mei 2026
Waktu        : 09.00 WIB s.d. selesai
Tempat       : Aula Dinas Pendidikan Kabupaten Sungai Bening

Demikian undangan ini kami sampaikan, atas kehadiran Saudara/i kami ucapkan terima kasih.

Sungai Bening, 28 April 2026

Kepala Dinas Pendidikan dan Kebudayaan,

ttd

Dr. Hendra Wijaya, M.Pd.
NIP. 196804051994031001`,

    /* ── Contoh 2: Surat Permohonan Dana ──────────────────── */
    `PEMERINTAH PROVINSI KALIMANTAN UTARA
BADAN PERENCANAAN PEMBANGUNAN DAERAH
Jl. Kolonel Soetadji No. 5, Tanjung Selor 77212

No.    : 120/BAPPEDA-KU/05/2026
Hal    : Permohonan Pencairan Dana APBD Tahap II
Lampiran : 3 (tiga) lembar
Sifat  : Penting

Kepada Yth.
Kepala BPKAD Provinsi Kalimantan Utara
di Tanjung Selor

Dengan hormat,
Dalam rangka pelaksanaan kegiatan pembangunan infrastruktur wilayah perbatasan Tahun Anggaran 2026, bersama ini kami mengajukan permohonan pencairan dana APBD Tahap II sebesar Rp 2.750.000.000,- (dua miliar tujuh ratus lima puluh juta rupiah).

Berkas pendukung terlampir untuk pemrosesan lebih lanjut.

Tanjung Selor, 15/05/2026

Kepala Bappeda Provinsi Kalimantan Utara,

ttd

Ir. Siti Rahmawati, M.T.
NIP. 197203101998032002`,

    /* ── Contoh 3: Surat Keterangan ──────────────────────── */
    `KEMENTERIAN KESEHATAN REPUBLIK INDONESIA
RUMAH SAKIT UMUM DAERAH PROF. DR. ISAK TULALESSY
Jl. Kesehatan No. 1, Kota Masohi, Maluku Tengah

SURAT KETERANGAN
Nomor: 440/RSUD-MC/VI/2026

Yang bertanda tangan di bawah ini, Direktur RSUD Prof. Dr. Isak Tulalessy, dengan ini menerangkan bahwa:

Nama    : Ahmad Fauzan
NIK     : 8101041206890003
Alamat  : Jl. Pahlawan No. 22, Masohi

Telah menjalani rawat inap di rumah sakit ini selama 5 (lima) hari terhitung mulai tanggal 10 Juni 2026 sampai dengan 14 Juni 2026.

Surat keterangan ini dibuat untuk keperluan administrasi yang bersangkutan.

Masohi, 14 Juni 2026

Direktur RSUD Prof. Dr. Isak Tulalessy,

ttd

dr. Mariana Pattipeilohy, Sp.PD
NIP. 198012202010012005`,

    /* ── Contoh 4: Surat Tugas (tanpa label Perihal/Lampiran) ── */
    `PEMERINTAH KABUPATEN BONE BOLANGO
DINAS KESEHATAN
Jl. Trans Sulawesi No. 88, Suwawa, Gorontalo 96183
Telp. (0435) 881200 | Website: dinkes.bonebolango.go.id

SURAT TUGAS
Nomor : 094/DINKES-BB/VI/2026

Kepala Dinas Kesehatan Kabupaten Bone Bolango dengan ini menugaskan kepada:

1. Nama     : dr. Irwan Mohamad, M.Kes
   NIP      : 198005152009041003
   Jabatan  : Kepala Bidang Pencegahan dan Pengendalian Penyakit

2. Nama     : Ns. Sartika Hunawa, S.Kep
   NIP      : 199102212015032002
   Jabatan  : Staf Seksi Surveilans

Untuk melaksanakan monitoring dan evaluasi program imunisasi di wilayah kerja Puskesmas Suwawa dan Puskesmas Tilongkabila pada tanggal 20 s.d. 22 Juni 2026.

Demikian surat tugas ini dibuat untuk dilaksanakan sebagaimana mestinya.

Suwawa, 18 Juni 2026

Kepala Dinas Kesehatan
Kabupaten Bone Bolango,

ttd

dr. Hamka Djafar, M.Kes
NIP. 197611202006041007`,
  ];

  /* ════════════════════════════════════════════════════════════
   * 3. EXTRACTION ENGINE
   * ════════════════════════════════════════════════════════════
   *
   * Setiap fungsi ekstrak menerima string teks surat penuh dan
   * mengembalikan string hasil (atau '' jika tidak ditemukan).
   * Komentar menjelaskan pola regex yang digunakan.
   * ════════════════════════════════════════════════════════════ */

  /**
   * Nama bulan Indonesia → nomor bulan (1–12)
   * Digunakan untuk normalisasi tanggal teks ke YYYY-MM-DD.
   */
  const MONTH_MAP = {
    januari:1, februari:2, maret:3, april:4, mei:5, juni:6,
    juli:7, agustus:8, september:9, oktober:10, november:11, desember:12,
  };

  /**
   * Normalisasi tanggal ke format ISO YYYY-MM-DD.
   * Mendukung dua format:
   *   (a) "12 Oktober 2026"   → teks panjang Indonesia
   *   (b) "12/10/2026"        → numerik DD/MM/YYYY
   * @param {string} raw
   * @returns {string} ISO date string atau '' jika gagal
   */
  function normalizeDate(raw) {
    if (!raw) return '';

    // (a) Format teks: "12 Oktober 2026" atau "Senin, 14 Juni 2026"
    // Regex: angka hari (1-2 digit), spasi opsional koma, nama bulan, spasi, tahun 4 digit
    const textMatch = raw.match(
      /(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/
    );
    if (textMatch) {
      const day   = textMatch[1].padStart(2, '0');
      const month = MONTH_MAP[textMatch[2].toLowerCase()];
      const year  = textMatch[3];
      if (month) return `${year}-${String(month).padStart(2,'0')}-${day}`;
    }

    // (b) Format numerik: "12/10/2026" atau "12-10-2026"
    // Regex: DD/MM/YYYY atau DD-MM-YYYY
    const numMatch = raw.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (numMatch) {
      const [, d, m, y] = numMatch;
      return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
    }

    return '';
  }

  /**
   * Ekstrak NOMOR SURAT.
   * Pola: label "Nomor", "No.", "No :" diikuti nilai nomor surat.
   * Contoh: "Nomor : 005/DISDIK/IV/2026" → "005/DISDIK/IV/2026"
   * Regex: kata kunci (Nomor|No\.|No\s*:) diikuti spasi/titik dua,
   *        lalu teks non-newline.
   * @param {string} text
   * @returns {string}
   */
  function extractNomor(text) {
    // Iterasi baris per baris agar hanya menangkap label di awal baris,
    // sehinggga "No." yang muncul di alamat kop surat (mis. "Jl. Sudirman No. 1")
    // tidak ikut terambil.
    //
    // Aturan penerimaan:
    //   (a) Baris diawali label "Nomor" atau "No" (diikuti titik atau tanpa)
    //       lalu spasi/tab fleksibel, titik dua wajib, spasi/tab fleksibel.
    //       Regex: /^\s*(Nomor|No\.?)\s*[\t ]*:[\t ]*(.+)/i
    //   (b) Nilai HARUS mengandung karakter "/" (ciri khas nomor surat dinas,
    //       mis. "440/RSUD-MC/VI/2026"). Tanpa "/", baris diabaikan.
    //   (c) Jika nilai di baris label kosong, cek baris berikutnya (nilai
    //       kadang ditulis di baris terpisah setelah label).
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      // Regex: awal baris → label "Nomor" atau "No" opsional titik
      //        → spasi/tab bebas → titik dua wajib → spasi/tab bebas → nilai
      const match = lines[i].match(/^\s*(Nomor|No\.?)\s*[\t ]*:[\t ]*(.*)$/i);
      if (!match) continue;

      let value = match[2].trim();

      // Jika nilai kosong pada baris yang sama, cek baris berikutnya
      if (!value && i + 1 < lines.length) {
        value = lines[i + 1].trim();
      }

      // Nilai harus mengandung "/" agar dianggap nomor surat dinas yang valid
      if (value && value.includes('/')) return value;
    }
    return '';
  }

  /**
   * Ekstrak TANGGAL SURAT.
   * Mencari dua pola:
   *   (a) Baris yang mengandung nama bulan Indonesia (paling lazim di surat dinas)
   *   (b) Format numerik DD/MM/YYYY di mana saja dalam teks
   * Normalkan hasilnya ke YYYY-MM-DD via normalizeDate().
   * @param {string} text
   * @returns {string} ISO date atau ''
   */
  function extractTanggal(text) {
    // (a) Tanggal teks lengkap — cari "N NamaBulan YYYY" di seluruh teks
    const textMatch = text.match(
      /\b(\d{1,2}\s+(?:Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+\d{4})\b/i
    );
    if (textMatch) return normalizeDate(textMatch[1]);

    // (b) Tanggal numerik DD/MM/YYYY atau DD-MM-YYYY
    const numMatch = text.match(/\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})\b/);
    if (numMatch) return normalizeDate(numMatch[1]);

    return '';
  }

  /**
   * Ekstrak PENGIRIM / INSTANSI.
   * Strategi: ambil baris pertama yang tidak kosong dari teks surat,
   * yang umumnya adalah nama instansi dari kop surat.
   * Baris yang diawali angka atau pola alamat (Jl., Telp.) dilewati.
   * @param {string} text
   * @returns {string}
   */
  function extractPengirim(text) {
    // Strategi baru: kumpulkan SEMUA baris kop surat yang valid (sebelum
    // baris alamat/telp pertama atau baris kosong kedua), lalu ambil baris
    // TERAKHIR yang bukan baris infrastruktur. Pada kop multi-level seperti:
    //   KEMENTERIAN KESEHATAN REPUBLIK INDONESIA
    //   RUMAH SAKIT UMUM DAERAH PROF. DR. ISAK TULALESSY
    //   Jl. Kesehatan No. 1, ...
    // baris "RSUD …" adalah instansi paling spesifik dan paling dekat ke
    // alamat, sehingga menjadi pengirim yang paling relevan.
    //
    // Regex baris infrastruktur — baris yang bukan nama instansi:
    // Diawali: Jl./Jalan, Telp/Fax/Email/Website/http, digit, atau label surat.
    const infraRe = /^(?:Jl\.|Jalan|Telp|Fax|Email|Website|http|www|\d|Nomor|No\.|Lampiran|Sifat|Perihal|Hal\b|Kepada|Dengan|Yang|Demikian|SURAT\b)/i;

    const lines = text.split('\n').map(l => l.trim());
    const kandidat = [];

    for (const line of lines) {
      if (!line) {
        // Baris kosong pertama menandai akhir blok kop surat; berhenti
        if (kandidat.length > 0) break;
        continue;
      }
      if (infraRe.test(line)) {
        // Temukan baris infrastruktur; jika sudah ada kandidat, tandai akhir kop
        if (kandidat.length > 0) break;
        continue;
      }
      // Baris cukup panjang dan bukan infrastruktur → masuk sebagai kandidat
      if (line.length >= 5) kandidat.push(line);
    }

    // Ambil baris paling bawah (paling spesifik) dari blok kop
    return kandidat.length > 0 ? kandidat[kandidat.length - 1] : '';
  }

  /**
   * Ekstrak PERIHAL.
   * Label: "Perihal", "Hal" diikuti ":" atau spasi, lalu nilai.
   * Mendukung perihal multi-token hingga akhir baris.
   * @param {string} text
   * @returns {string}
   */
  function extractPerihal(text) {
    // ── Pass 1: cari label eksplisit "Perihal" atau "Hal" ──────────────
    // Regex label: awal baris → "Perihal" atau "Hal" (whole-word, bukan "Halaman")
    //              → spasi/tab bebas → titik dua wajib → spasi/tab bebas → sisa baris.
    // \b setelah "Hal" mencegah mencocokkan kata seperti "Halaman" atau "Hal-hal".
    const lines = text.split('\n');

    const labelRe = /^\s*(?:Perihal|Hal\b)\s*[\t ]*:[\t ]*(.*)/i;
    // Baris penghenti: blok baru dalam surat (penerima, tubuh surat)
    const stopRe  = /^\s*(?:Kepada|Yth\.?|Yang\s+Terhormat|Dengan\s+hormat)/i;

    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(labelRe);
      if (!match) continue;

      const parts = [match[1].trim()].filter(Boolean);

      // Gabungkan baris lanjutan perihal hingga bertemu penghenti / baris kosong
      for (let j = i + 1; j < lines.length; j++) {
        const next = lines[j].trim();
        if (!next || stopRe.test(next)) break;
        // Hentikan jika baris berikutnya adalah label surat lain
        if (/^\s*(?:Nomor|No\.|Lampiran|Sifat|Tanggal)\s*:/i.test(lines[j])) break;
        parts.push(next);
      }

      return parts.join(' ').trim();
    }

    // ── Pass 2: fallback ke judul "SURAT …" jika tidak ada label Perihal ─
    // Judul surat dikenali sebagai baris yang:
    //   (a) Seluruhnya huruf kapital (boleh ada spasi dan tanda baca)
    //   (b) Diawali kata "SURAT" (mis. SURAT KETERANGAN, SURAT TUGAS, dst.)
    //   (c) Tidak mengandung pola nomor surat (no "/")
    // Regex: baris hanya berisi A-Z, spasi, dan tanda baca umum, diawali SURAT.
    const judulRe = /^\s*(SURAT(?:\s+[A-Z][A-Z\s\-\.]*)+)\s*$/;

    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(judulRe);
      if (!match) continue;

      // Cek apakah baris berikutnya juga merupakan lanjutan judul (masih kapital semua)
      const parts = [match[1].trim()];
      for (let j = i + 1; j < lines.length; j++) {
        const next = lines[j].trim();
        // Baris kosong atau baris yang tidak semua kapital → hentikan
        if (!next || /[a-z]/.test(next)) break;
        // Baris berikutnya masih kata-kata kapital → gabungkan
        if (/^[A-Z][A-Z\s\-\.]*$/.test(next) && !next.includes('/')) {
          parts.push(next);
        } else {
          break;
        }
      }

      return parts.join(' ').trim();
    }

    return '';
  }

  /**
   * Ekstrak SIFAT SURAT.
   * Nilai yang dicari: Biasa | Penting | Segera | Rahasia (case-insensitive).
   * Dua pendekatan:
   *   (a) Baris "Sifat : Segera" — label eksplisit
   *   (b) Kata kunci berdiri sendiri (whole-word match) di seluruh teks
   * @param {string} text
   * @returns {string} Sifat dengan kapitalisasi normal, atau ''
   */
  function extractSifat(text) {
    // Daftar nilai sifat yang dikenali, urutan dari spesifik ke umum
    // sehingga "Sangat Segera" ditemukan sebelum "Segera".
    // Regex nilai: /(?:Sangat\s+Segera|Segera|Rahasia|Penting|Biasa)/i
    const SIFAT_VALUES = /(?:Sangat\s+Segera|Segera|Rahasia|Penting|Biasa)/i;

    // (a) Label eksplisit "Sifat" diikuti titik dua (wajib), spasi/tab bebas,
    //     lalu nilai sifat. Nilai boleh ada di baris yang sama ATAU baris berikut.
    // Regex: "Sifat" → spasi/tab → titik dua wajib → spasi/tab → sisa baris.
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const labelMatch = lines[i].match(/^\s*Sifat\s*[\t ]*:[\t ]*(.*)/i);
      if (!labelMatch) continue;

      let valueLine = labelMatch[1].trim();
      // Jika nilai kosong di baris yang sama, ambil baris berikutnya
      if (!valueLine && i + 1 < lines.length) {
        valueLine = lines[i + 1].trim();
      }

      const found = valueLine.match(SIFAT_VALUES);
      if (found) return normalizeSifat(found[0]);

      // Label "Sifat:" ditemukan tapi nilai tidak dikenali → tetap return ''
      // agar ditandai "perlu dicek" (bukan default Biasa)
      return '';
    }

    // (b) Label "Sifat" tidak ditemukan sama sekali.
    // Return nilai sentinel khusus '__default__' yang akan ditangani showPreview
    // untuk mengisi "Biasa" sekaligus menandai field sebagai perlu dicek.
    return '__default__';
  }

  /**
   * Ekstrak LAMPIRAN.
   * Pola: "Lampiran :" diikuti nilai.
   * @param {string} text
   * @returns {string}
   */
  function extractLampiran(text) {
    // ── Pass 1: cari label eksplisit "Lampiran" ────────────────────────
    // Regex label: awal baris → "Lampiran" → spasi/tab bebas
    //              → titik dua wajib → spasi/tab bebas → sisa baris.
    // Jika nilai di baris yang sama kosong, cek baris berikutnya.
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const labelMatch = lines[i].match(/^\s*Lampiran\s*[\t ]*:[\t ]*(.*)/i);
      if (!labelMatch) continue;

      let value = labelMatch[1].trim();
      if (!value && i + 1 < lines.length) {
        value = lines[i + 1].trim();
      }
      if (!value) return '';

      // Normalisasi: nilai "-", "–", "---", atau frasa "Tidak ada" / "Nihil"
      // dianggap sebagai "Tidak ada" untuk konsistensi database.
      // Regex: string yang hanya terdiri dari strip/dash atau kata "tidak ada"/"nihil".
      if (/^[-–—]+$/.test(value) || /^(?:Tidak\s+ada|Nihil)$/i.test(value)) {
        return 'Tidak ada';
      }

      // Nilai angka atau teks bebas (mis. "1 (satu) berkas", "Satu lembar") dikembalikan apa adanya.
      return value;
    }

    // ── Pass 2: label Lampiran tidak ditemukan ─────────────────────────
    // Kembalikan sentinel '__default__' agar showPreview mengisi "Tidak ada"
    // sekaligus menandai field sebagai perlu dicek (oranye).
    return '__default__';
  }

  /**
   * Ekstrak JENIS SURAT dari judul eksplisit (baris kapital diawali "SURAT")
   * atau dari kata kunci di nilai perihal.
   *
   * Prioritas:
   *   1. Judul "SURAT …" kapital penuh di badan surat (paling andal)
   *   2. Kata kunci dalam perihal / isi (lebih longgar)
   *
   * Nilai kanonik: 'Surat Dinas' | 'Surat Keterangan' | 'Surat Tugas' |
   *                'Surat Edaran' | 'Undangan' | 'Surat Dinas' (default)
   *
   * @param {string} text teks surat penuh
   * @param {string} perihal nilai perihal yang sudah diekstrak
   * @returns {string}
   */
  function extractJenis(text, perihal) {
    // Tabel pemetaan kata kunci → jenis kanonik.
    // Urutan dari spesifik ke umum agar tidak salah cocok.
    // Regex setiap baris: whole-word, case-insensitive.
    const JENIS_RULES = [
      { re: /\bKETERANGAN\b/i,  jenis: 'Surat Keterangan' },
      { re: /\bTUGAS\b/i,       jenis: 'Surat Tugas'      },
      { re: /\bEDARAN\b/i,      jenis: 'Surat Edaran'     },
      // "Undangan" bisa muncul sebagai judul SURAT UNDANGAN atau di Perihal
      { re: /\bUNDANGAN\b/i,    jenis: 'Undangan'         },
      // "Permohonan", "Pemberitahuan", "Rekomendasi" → Surat Dinas
      { re: /\bPERMOHONAN\b/i,  jenis: 'Surat Dinas'      },
      { re: /\bPEMBERITAHUAN\b/i,jenis:'Surat Dinas'      },
      { re: /\bREKOMENDASI\b/i, jenis: 'Surat Dinas'      },
    ];

    // Pass 1: cari pada baris judul "SURAT …" kapital penuh
    // Regex: baris seluruhnya kapital diawali SURAT
    const lines = text.split('\n');
    for (const line of lines) {
      if (!/^\s*SURAT\b/.test(line)) continue;
      if (/[a-z]/.test(line)) continue; // bukan judul kapital penuh
      for (const rule of JENIS_RULES) {
        if (rule.re.test(line)) return rule.jenis;
      }
    }

    // Pass 2: cari pada nilai perihal yang sudah diekstrak
    if (perihal) {
      for (const rule of JENIS_RULES) {
        if (rule.re.test(perihal)) return rule.jenis;
      }
    }

    // Default: jika tidak ada penanda khusus, klasifikasikan sebagai Surat Dinas
    return 'Surat Dinas';
  }

  /**
   * Jalankan semua ekstraktor pada teks surat dan kembalikan objek field.
   *
   * Flag sentinel:
   *   sifatDefaulted    — true jika label "Sifat" tidak ada; nilai "Biasa" adalah default
   *   lampiranDefaulted — true jika label "Lampiran" tidak ada; nilai "Tidak ada" adalah default
   *
   * @param {string} text teks surat mentah
   * @returns {{ nomor:string, tanggal:string, pengirim:string, perihal:string,
   *             jenis:string, sifat:string, lampiran:string,
   *             sifatDefaulted:boolean, lampiranDefaulted:boolean }}
   */
  function extractAll(text) {
    const rawSifat    = extractSifat(text);
    const sifatDefaulted = rawSifat === '__default__';

    const rawLampiran = extractLampiran(text);
    const lampiranDefaulted = rawLampiran === '__default__';

    // Perihal diekstrak lebih dulu karena extractJenis membutuhkannya
    const perihal = extractPerihal(text);

    return {
      nomor:    extractNomor(text),
      tanggal:  extractTanggal(text),
      pengirim: extractPengirim(text),
      perihal,
      jenis:    extractJenis(text, perihal),
      // Sentinel '__default__' → isi nilai default tapi tandai perlu dicek
      sifat:    sifatDefaulted    ? 'Biasa'      : rawSifat,
      lampiran: lampiranDefaulted ? 'Tidak ada'  : rawLampiran,
      sifatDefaulted,
      lampiranDefaulted,
    };
  }

  /* ════════════════════════════════════════════════════════════
   * 4. XSS HELPER
   * ════════════════════════════════════════════════════════════ */

  /**
   * Escape karakter HTML berbahaya untuk mencegah XSS.
   * Gunakan ini SEBELUM memasukkan teks pengguna ke innerHTML.
   * @param {string} str
   * @returns {string}
   */
  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Kapitalisasi huruf pertama.
   * @param {string} str
   * @returns {string}
   */
  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  /**
   * Normalisasi string sifat ke bentuk kanonik yang disimpan di database.
   * Menangani "Sangat Segera" (dua kata) dan nilai satu kata lainnya.
   * @param {string} raw string mentah dari regex match
   * @returns {string}
   */
  function normalizeSifat(raw) {
    const normalized = raw.trim().replace(/\s+/g, ' ');
    // "Sangat Segera" dijaga utuh dengan Title Case
    if (/^sangat\s+segera$/i.test(normalized)) return 'Sangat Segera';
    return capitalize(normalized);
  }

  /**
   * Buat ID unik sederhana berbasis timestamp + random.
   * @returns {string}
   */
  function generateId() {
    return `sr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  }

  /* ════════════════════════════════════════════════════════════
   * 5. STORAGE (localStorage)
   * ════════════════════════════════════════════════════════════ */

  function loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      state.records = raw ? JSON.parse(raw) : [];
    } catch {
      state.records = [];
    }
  }

  function saveToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.records));
  }

  /* ════════════════════════════════════════════════════════════
   * 6. STATS RENDERER
   * ════════════════════════════════════════════════════════════ */

  const SIFAT_LIST = ['Biasa', 'Penting', 'Segera', 'Sangat Segera', 'Rahasia'];

  function renderStats() {
    const container = document.getElementById('stats-section');
    const total = state.records.length;

    // Hitung jumlah per sifat
    const counts = Object.fromEntries(SIFAT_LIST.map(s => [s, 0]));
    state.records.forEach(r => {
      if (counts[r.sifat] !== undefined) counts[r.sifat]++;
    });

    let html = `
      <div class="stat-card col-span-2 sm:col-span-1">
        <span class="stat-label">Total Surat</span>
        <span class="stat-value">${total}</span>
      </div>`;

    SIFAT_LIST.forEach(sifat => {
      html += `
        <div class="stat-card">
          <span class="stat-label">${escHtml(sifat)}</span>
          <span class="stat-value stat-accent">${counts[sifat]}</span>
        </div>`;
    });

    container.innerHTML = html;
  }

  /* ════════════════════════════════════════════════════════════
   * 7. TABLE RENDERER
   * ════════════════════════════════════════════════════════════ */

  /**
   * Kembalikan class CSS sesuai nilai sifat untuk badge warna.
   * @param {string} sifat
   * @returns {string}
   */
  function sifatBadgeClass(sifat) {
    const map = {
      'Biasa':        'sifat-biasa',
      'Penting':      'sifat-penting',
      'Segera':       'sifat-segera',
      'Sangat Segera':'sifat-segera', // sama merahnya dengan Segera
      'Rahasia':      'sifat-rahasia',
    };
    return map[sifat] || 'sifat-unknown';
  }

  /**
   * Highlight teks pencarian dalam string cell.
   * Teks pengguna di-escape sebelum ditampilkan; match dibungkus <mark>.
   * @param {string} text
   * @param {string} query kata pencarian (boleh kosong)
   * @returns {string} HTML aman
   */
  function highlightMatch(text, query) {
    const safe = escHtml(text);
    if (!query) return safe;
    // Escape karakter regex khusus dalam query pengguna
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(${escapedQuery})`, 'gi');
    return safe.replace(re, '<mark class="search-mark">$1</mark>');
  }

  /**
   * Filter records berdasarkan state.searchQuery dan state.filterSifat.
   * @returns {SuratRecord[]}
   */
  function getFilteredRecords() {
    const q = state.searchQuery.toLowerCase();
    return state.records.filter(r => {
      // Filter sifat
      if (state.filterSifat && r.sifat !== state.filterSifat) return false;
      // Pencarian teks: nomor ATAU pengirim ATAU perihal
      if (q) {
        const haystack = `${r.nomor} ${r.pengirim} ${r.perihal}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }

  /**
   * Render tabel database surat.
   * Semua teks pengguna di-escape atau di-highlight (yang juga di-escape).
   */
  /**
   * Kembalikan class CSS badge untuk Jenis Surat.
   * @param {string} jenis
   * @returns {string}
   */
  function jenisBadgeClass(jenis) {
    const map = {
      'Surat Dinas':       'jenis-dinas',
      'Surat Keterangan':  'jenis-keterangan',
      'Surat Tugas':       'jenis-tugas',
      'Surat Edaran':      'jenis-edaran',
      'Undangan':          'jenis-undangan',
    };
    return map[jenis] || 'jenis-unknown';
  }

  function renderTable() {
    const tbody    = document.getElementById('table-body');
    const empty    = document.getElementById('table-empty');
    const filtered = getFilteredRecords();

    if (filtered.length === 0) {
      tbody.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');

    const q = state.searchQuery;

    tbody.innerHTML = filtered.map(r => `
      <tr>
        <td class="font-mono text-xs text-slate-600">
          <span class="cell-truncate" title="${escHtml(r.nomor)}">${highlightMatch(r.nomor, q)}</span>
        </td>
        <td class="text-xs text-slate-500 whitespace-nowrap">${escHtml(r.tanggal || '—')}</td>
        <td>
          <span class="cell-truncate text-sm" title="${escHtml(r.pengirim)}">${highlightMatch(r.pengirim, q)}</span>
        </td>
        <td>
          <span class="cell-truncate text-sm" title="${escHtml(r.perihal)}">${highlightMatch(r.perihal, q)}</span>
        </td>
        <td>
          <span class="sifat-badge ${escHtml(jenisBadgeClass(r.jenis))}">${escHtml(r.jenis || '—')}</span>
        </td>
        <td>
          <span class="sifat-badge ${escHtml(sifatBadgeClass(r.sifat))}">${escHtml(r.sifat || '—')}</span>
        </td>
        <td class="text-right">
          <div class="flex justify-end gap-1.5">
            <button class="btn-icon btn-edit" data-action="edit" data-id="${escHtml(r.id)}" aria-label="Edit surat ${escHtml(r.nomor)}">
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H8v-2.414a2 2 0 01.586-1.414z"/></svg>
            </button>
            <button class="btn-icon btn-delete" data-action="delete" data-id="${escHtml(r.id)}" aria-label="Hapus surat ${escHtml(r.nomor)}">
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M8 7V4a1 1 0 011-1h6a1 1 0 011 1v3"/></svg>
            </button>
          </div>
        </td>
      </tr>`).join('');
  }

  /** Render semua UI sekaligus */
  function renderAll() {
    renderStats();
    renderTable();
  }

  /* ════════════════════════════════════════════════════════════
   * 8. PREVIEW PANEL
   * ════════════════════════════════════════════════════════════ */

  /**
   * ID semua input/select di form pratinjau, dalam urutan tampilan.
   * Dipakai bersama oleh showPreview, updatePreviewBadge, confirmField.
   */
  const PREVIEW_FIELD_IDS = ['f-nomor','f-tanggal','f-pengirim','f-perihal',
                              'f-jenis','f-sifat','f-lampiran'];

  /**
   * Baca status semua field-group di form pratinjau dan perbarui badge skor.
   *
   * Tiga keadaan per field-group:
   *   • (tidak ada class khusus)  → terdeteksi otomatis    [hijau implisit]
   *   • field-undetected          → perlu dicek            [oranye]
   *   • field-confirmed           → dikonfirmasi pengguna  [hijau]
   *
   * Badge menampilkan: "N terdeteksi · M default · K kosong"
   * Warna badge: hijau jika tidak ada field oranye tersisa, kuning/merah jika ada.
   */
  function updatePreviewBadge() {
    const badge = document.getElementById('preview-badge');

    let detected = 0, defaulted = 0, empty = 0;

    PREVIEW_FIELD_IDS.forEach(id => {
      const el    = document.getElementById(id);
      const group = el.closest('.field-group');
      const val   = el.value.trim();

      if (group.classList.contains('field-confirmed')) {
        // Pengguna sudah mengonfirmasi (baik via edit maupun tombol OK)
        detected++;
      } else if (group.classList.contains('field-undetected')) {
        // Masih berupa nilai default atau kosong — belum dikonfirmasi
        if (val) defaulted++;   // ada nilai tapi berasal dari default
        else     empty++;       // benar-benar kosong
      } else {
        // Terdeteksi langsung oleh mesin ekstraksi
        detected++;
      }
    });

    const total   = PREVIEW_FIELD_IDS.length; // 7
    const allClear = defaulted === 0 && empty === 0;

    // Susun teks badge: segmen dengan nilai 0 tetap ditampilkan agar konsisten
    badge.textContent =
      `${detected} terdeteksi · ${defaulted} default · ${empty} kosong`;

    badge.className = 'text-xs px-2 py-0.5 rounded-full font-semibold ';
    if (allClear)              badge.className += 'bg-green-100 text-green-700';
    else if (detected >= total / 2) badge.className += 'bg-yellow-100 text-yellow-700';
    else                       badge.className += 'bg-red-100 text-red-700';
  }

  /**
   * Tandai sebuah field-group sebagai "dikonfirmasi":
   *   - Hapus field-undetected
   *   - Tambahkan field-confirmed
   *   - Perbarui badge skor
   *
   * Dipanggil dari:
   *   (a) Tombol "OK" (konfirmasi tanpa mengubah nilai)
   *   (b) Event change/input pada field yang masih bertanda perlu dicek
   *
   * @param {HTMLElement} group — elemen .field-group
   */
  function confirmField(group) {
    group.classList.remove('field-undetected');
    group.classList.add('field-confirmed');
    updatePreviewBadge();
  }

  /**
   * Tampilkan panel pratinjau dengan hasil ekstraksi.
   * Field yang tidak terdeteksi (nilai kosong, atau nilai yang di-default)
   * diberi class field-undetected (border oranye + teks "perlu dicek").
   * Skor awal ditampilkan di preview-badge via updatePreviewBadge().
   *
   * Listener change/input dan klik OK dipasang di sini (event delegation
   * pada form sehingga tidak perlu dibersihkan satu-per-satu).
   *
   * @param {{ nomor:string, tanggal:string, pengirim:string, perihal:string,
   *            jenis:string, sifat:string, lampiran:string,
   *            sifatDefaulted:boolean, lampiranDefaulted:boolean }} data
   */
  function showPreview(data) {
    const section = document.getElementById('preview-section');
    const form    = document.getElementById('preview-form');

    // ── Isi nilai dan set state awal setiap field ──────────────
    PREVIEW_FIELD_IDS.forEach(id => {
      const el    = document.getElementById(id);
      const key   = id.replace('f-', '');   // 'f-nomor' → 'nomor'
      const value = (data[key] ?? '');
      const group = el.closest('.field-group');

      el.value = value;

      // Reset: hapus kedua state lama sebelum menerapkan yang baru
      group.classList.remove('field-undetected', 'field-confirmed');

      // Field "perlu dicek" jika:
      //   (a) nilainya kosong, ATAU
      //   (b) sifat diisi default "Biasa" tanpa label eksplisit, ATAU
      //   (c) lampiran diisi default "Tidak ada" tanpa label eksplisit
      const isDefault =
        !value ||
        (key === 'sifat'    && data.sifatDefaulted) ||
        (key === 'lampiran' && data.lampiranDefaulted);

      if (isDefault) group.classList.add('field-undetected');
    });

    updatePreviewBadge(); // Render badge sesuai state awal

    // ── Delegasi event pada form pratinjau ────────────────────
    // Satu listener per form (tidak duplikat saat ekstrak ulang)
    // karena kita memakai flag data-wired.
    if (!form.dataset.wired) {
      form.dataset.wired = '1';

      // (A) Pengguna mengedit nilai field yang masih "perlu dicek"
      //     → otomatis konfirmasi (ganti oranye → hijau)
      form.addEventListener('input', e => {
        const group = e.target.closest('.field-group');
        if (!group) return;
        // Hanya proses jika field masih dalam state undetected
        if (group.classList.contains('field-undetected')) {
          confirmField(group);
        }
      });

      // (B) Untuk <select>: gunakan 'change' karena 'input' tidak selalu
      //     terpicu di semua browser saat pilihan select berubah
      form.addEventListener('change', e => {
        if (e.target.tagName !== 'SELECT') return;
        const group = e.target.closest('.field-group');
        if (!group) return;
        if (group.classList.contains('field-undetected')) {
          confirmField(group);
        }
      });

      // (C) Tombol "OK" — konfirmasi tanpa mengubah nilai
      form.addEventListener('click', e => {
        const btn = e.target.closest('.btn-ok');
        if (!btn) return;
        // btn-ok adalah type="button" jadi tidak men-submit form
        const group = btn.closest('.field-group');
        if (group) confirmField(group);
      });
    } else {
      // Form sudah di-wire sebelumnya; reset state field-group
      // sudah dilakukan di loop PREVIEW_FIELD_IDS di atas.
      // Tidak perlu melakukan apa-apa lagi di sini.
    }

    // Hapus id edit lama (mode tambah baru)
    state.editingId = null;

    section.classList.remove('hidden');
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /** Sembunyikan panel pratinjau dan bersihkan semua state field */
  function hidePreview() {
    document.getElementById('preview-section').classList.add('hidden');
    document.getElementById('preview-form').reset();
    // Bersihkan semua kelas state dari field-group
    document.querySelectorAll('#preview-form .field-group').forEach(g => {
      g.classList.remove('field-undetected', 'field-confirmed');
    });
    state.editingId = null;
  }

  /* ════════════════════════════════════════════════════════════
   * 9. CRUD OPERATIONS
   * ════════════════════════════════════════════════════════════ */

  /**
   * Simpan record baru dari data form pratinjau.
   * @param {FormData|object} formData
   */
  function saveRecord(formData) {
    /** @type {SuratRecord} */
    const record = {
      id:        generateId(),
      nomor:     formData.get('nomor').trim(),
      tanggal:   formData.get('tanggal').trim(),
      pengirim:  formData.get('pengirim').trim(),
      perihal:   formData.get('perihal').trim(),
      jenis:     formData.get('jenis').trim(),
      sifat:     formData.get('sifat').trim(),
      lampiran:  formData.get('lampiran').trim(),
      createdAt: new Date().toISOString(),
    };
    state.records.unshift(record); // Terbaru di atas
    saveToStorage();
    renderAll();
    hidePreview();
    showToast('Surat berhasil disimpan ke database.', 'success');
  }

  /**
   * Update record yang sudah ada dari form edit modal.
   * @param {string} id ID record yang akan diperbarui
   * @param {FormData} formData
   */
  function updateRecord(id, formData) {
    const idx = state.records.findIndex(r => r.id === id);
    if (idx === -1) return;
    state.records[idx] = {
      ...state.records[idx],
      nomor:    formData.get('nomor').trim(),
      tanggal:  formData.get('tanggal').trim(),
      pengirim: formData.get('pengirim').trim(),
      perihal:  formData.get('perihal').trim(),
      jenis:    formData.get('jenis').trim(),
      sifat:    formData.get('sifat').trim(),
      lampiran: formData.get('lampiran').trim(),
    };
    saveToStorage();
    renderAll();
    closeModal();
    showToast('Surat berhasil diperbarui.', 'success');
  }

  /**
   * Hapus record setelah konfirmasi pengguna.
   * @param {string} id
   */
  function deleteRecord(id) {
    const record = state.records.find(r => r.id === id);
    if (!record) return;
    const label = record.nomor || 'surat ini';
    if (!window.confirm(`Hapus ${label}? Tindakan ini tidak dapat dibatalkan.`)) return;
    state.records = state.records.filter(r => r.id !== id);
    saveToStorage();
    renderAll();
    showToast('Surat berhasil dihapus.', 'info');
  }

  /**
   * Buka modal edit dan isi dengan data record.
   * @param {string} id
   */
  function openEditModal(id) {
    const record = state.records.find(r => r.id === id);
    if (!record) return;

    document.getElementById('edit-id').value       = record.id;
    document.getElementById('edit-nomor').value    = record.nomor;
    document.getElementById('edit-tanggal').value  = record.tanggal;
    document.getElementById('edit-pengirim').value = record.pengirim;
    document.getElementById('edit-perihal').value  = record.perihal;
    document.getElementById('edit-jenis').value    = record.jenis   || '';
    document.getElementById('edit-sifat').value    = record.sifat;
    document.getElementById('edit-lampiran').value = record.lampiran;

    document.getElementById('edit-modal').classList.remove('hidden');
    document.getElementById('edit-nomor').focus();
  }

  function closeModal() {
    document.getElementById('edit-modal').classList.add('hidden');
    document.getElementById('edit-form').reset();
  }

  /* ════════════════════════════════════════════════════════════
   * 10. SEARCH & FILTER
   * ════════════════════════════════════════════════════════════ */

  function onSearchInput(e) {
    state.searchQuery = e.target.value.trim();
    renderTable();
  }

  function onFilterChange(e) {
    state.filterSifat = e.target.value;
    renderTable();
  }

  /* ════════════════════════════════════════════════════════════
   * 11. EXPORT (CSV + JSON)
   * ════════════════════════════════════════════════════════════ */

  /** Header kolom CSV — kolom jenis ditambahkan setelah perihal */
  const CSV_HEADERS = ['id','nomor','tanggal','pengirim','perihal','jenis','sifat','lampiran','createdAt'];

  /**
   * Escape nilai untuk sel CSV (RFC 4180):
   * Bungkus dengan tanda kutip ganda jika mengandung koma, kutip, atau newline.
   * @param {string} val
   * @returns {string}
   */
  function csvEscape(val) {
    const s = String(val ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  }

  /** Unduh file ke perangkat pengguna menggunakan Blob + anchor click. */
  function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function exportCsv() {
    if (state.records.length === 0) {
      showToast('Tidak ada data untuk diekspor.', 'error'); return;
    }
    const rows = [
      CSV_HEADERS.join(','),
      ...state.records.map(r =>
        CSV_HEADERS.map(h => csvEscape(r[h])).join(',')
      ),
    ];
    downloadFile(rows.join('\r\n'), 'suratbase_export.csv', 'text/csv;charset=utf-8;');
    showToast(`${state.records.length} surat diekspor ke CSV.`, 'success');
  }

  function exportJson() {
    if (state.records.length === 0) {
      showToast('Tidak ada data untuk diekspor.', 'error'); return;
    }
    const json = JSON.stringify(state.records, null, 2);
    downloadFile(json, 'suratbase_export.json', 'application/json');
    showToast(`${state.records.length} surat diekspor ke JSON.`, 'success');
  }

  /* ════════════════════════════════════════════════════════════
   * 12. TOAST NOTIFICATION
   * ════════════════════════════════════════════════════════════ */

  let _toastTimer = null;

  /**
   * Tampilkan notifikasi toast sementara.
   * @param {string} message Pesan yang ditampilkan (di-escape di sini)
   * @param {'success'|'error'|'info'} type
   * @param {number} [duration=3000] ms sebelum hilang
   */
  function showToast(message, type = 'info', duration = 3000) {
    const toast = document.getElementById('toast');
    // Hapus semua kelas tipe lama
    toast.classList.remove('toast-success', 'toast-error', 'toast-info', 'hidden');
    toast.classList.add(`toast-${type}`);
    toast.textContent = message; // textContent — tidak perlu escape
    if (_toastTimer) clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => toast.classList.add('hidden'), duration);
  }

  /* ════════════════════════════════════════════════════════════
   * 13. EVENT WIRING
   * ════════════════════════════════════════════════════════════ */

  function init() {
    loadFromStorage();
    renderAll();

    /* ── Tombol "Ekstrak Data" ───────────────────────── */
    document.getElementById('btn-extract').addEventListener('click', () => {
      const text = document.getElementById('surat-input').value.trim();
      if (!text) {
        showToast('Tempel teks surat terlebih dahulu.', 'error'); return;
      }
      const data = extractAll(text);
      showPreview(data);
    });

    /* ── Tombol "Muat Contoh" ───────────────────────── */
    document.getElementById('btn-load-sample').addEventListener('click', () => {
      document.getElementById('surat-input').value =
        SAMPLE_LETTERS[state.sampleIndex % SAMPLE_LETTERS.length];
      state.sampleIndex++;
      showToast(`Contoh surat ${((state.sampleIndex - 1) % SAMPLE_LETTERS.length) + 1} dimuat.`, 'info');
    });

    /* ── Tombol "Bersihkan" input ───────────────────── */
    document.getElementById('btn-clear-input').addEventListener('click', () => {
      document.getElementById('surat-input').value = '';
      hidePreview();
    });

    /* ── Form pratinjau: submit "Simpan ke Database" ── */
    document.getElementById('preview-form').addEventListener('submit', e => {
      e.preventDefault();
      saveRecord(new FormData(e.target));
    });

    /* ── Tombol "Batal" di pratinjau ─────────────────── */
    document.getElementById('btn-cancel-preview').addEventListener('click', hidePreview);

    /* ── Delegasi klik pada tbody (Edit / Delete) ─── */
    document.getElementById('table-body').addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const { action, id } = btn.dataset;
      if (action === 'edit')   openEditModal(id);
      if (action === 'delete') deleteRecord(id);
    });

    /* ── Form edit modal: submit ─────────────────────── */
    document.getElementById('edit-form').addEventListener('submit', e => {
      e.preventDefault();
      const id = document.getElementById('edit-id').value;
      updateRecord(id, new FormData(e.target));
    });

    /* ── Tutup modal ─────────────────────────────────── */
    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('modal-cancel').addEventListener('click', closeModal);
    // Klik di luar modal-box menutup modal
    document.getElementById('edit-modal').addEventListener('click', e => {
      if (e.target === document.getElementById('edit-modal')) closeModal();
    });
    // ESC key menutup modal
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeModal();
    });

    /* ── Pencarian real-time ─────────────────────────── */
    document.getElementById('search-input').addEventListener('input', onSearchInput);

    /* ── Filter Sifat ────────────────────────────────── */
    document.getElementById('filter-sifat').addEventListener('change', onFilterChange);

    /* ── Ekspor CSV ──────────────────────────────────── */
    document.getElementById('btn-export-csv').addEventListener('click', exportCsv);

    /* ── Ekspor JSON ─────────────────────────────────── */
    document.getElementById('btn-export-json').addEventListener('click', exportJson);
  }

  /* ────────────────────────────────────────────────────────── */
  /* Bootstrap saat DOM siap                                    */
  /* ────────────────────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
