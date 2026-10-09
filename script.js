'use strict';
const $ = s => document.querySelector(s);
const R = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = a => a[R(0, a.length - 1)];
const MAX_LIVES = 5, TARGET = 10, MAX_DIGITS = 4, LEVELS = 4;
const MODES = { k: 'Komutatif', a: 'Asosiatif', m: 'Campuran' };
const SUBS = { p: 'Menemukan Pola', s: 'Menjawab Soal' };
const lohi = d => d === 1 ? [1, 9] : d === 2 ? [10, 99] : [100, 999];
const n = d => { const [l, h] = lohi(d); return R(l, h); };         // bilangan d digit
const gt = d => { let x = n(d), y = n(d); while (x === y) y = n(d); return x > y ? [x, y] : [y, x]; };   // [besar, kecil]

/* ============ REKAP GOOGLE SHEETS ============
   Tempel URL Web App dari Google Apps Script (berakhiran /exec) di bawah ini.
   Jika dikosongkan, game tetap jalan normal tanpa mengirim data. */
const SHEET_URL = 'https://script.google.com/macros/s/AKfycbyj3qFue4pECEc_LDka4i5v-wWpFjMzKGRgL9Kz_A71iPvL8JHSZS3DYudsrlmPn_I/exec';
const SESI = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

function logSheet(event, extra = {}) {
  if (!SHEET_URL || !player) return;
  const json = JSON.stringify(Object.assign({ event, nama: player, sesi: SESI }, extra));
  // Cara 1: POST form (paling andal untuk Apps Script, tanpa preflight CORS)
  try {
    fetch(SHEET_URL, {
      method: 'POST',
      mode: 'no-cors',
      body: new URLSearchParams({ data: json })
    }).catch(() => kirimGet(json));
  } catch (e) { kirimGet(json); }
}
// Cara 2 (cadangan): kirim lewat GET gambar kecil
function kirimGet(json) {
  try { new Image().src = SHEET_URL + '?data=' + encodeURIComponent(json) + '&_=' + Date.now(); } catch (e) {}
}
// data umum yang selalu dikirim saat bermain
const info = () => ({ mode: MODES[G.mode], jenis: SUBS[G.sub], level: G.level });

/* ============ BANK SOAL ============
   Setiap pembuat soal mengembalikan { q: teks soal, a: jawaban (angka), e: penjelasan }
   Ada dua jenis permainan:
   - MENEMUKAN POLA : mengisi bilangan yang hilang (…)
   - MENJAWAB SOAL  : menghitung hasil, misalnya 3 + 4 =  atau  3 + (4 − 1) =        */
const blankAt = (t, p) => t.map((v, i) => i === p ? '…' : v);   // ganti bilangan ke-p dengan titik-titik

/* ================= MENEMUKAN POLA ================= */

/* ----- KOMUTATIF ----- */
// a + b = b + a  (titik-titik di salah satu dari 4 posisi)
const swap = (a, b) => {
  const t = [a, b, b, a], p = R(0, 3), s = blankAt(t, p);
  return { q: `${s[0]} + ${s[1]} = ${s[2]} + ${s[3]}`, a: t[p],
    e: `Sifat komutatif: ${a} + ${b} = ${b} + ${a}, jadi bilangan yang hilang adalah ${t[p]}.` };
};
// tiga bilangan ditukar urutannya
const PERMS = [[0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
const swap3 = (a, b, c) => {
  const o = [a, b, c], pm = pick(PERMS).map(i => o[i]);
  const t = [a, b, c, ...pm], p = R(0, 5), s = blankAt(t, p);
  return { q: `${s[0]} + ${s[1]} + ${s[2]} = ${s[3]} + ${s[4]} + ${s[5]}`, a: t[p],
    e: `Urutan penjumlahan boleh ditukar (komutatif): ${a} + ${b} + ${c} = ${pm[0]} + ${pm[1]} + ${pm[2]}, jadi yang hilang adalah ${t[p]}.` };
};
// hasil penjumlahan dipakai untuk penjumlahan yang ditukar
const same = (a, b) => {
  const s = a + b;
  const v = pick([
    { q: `Jika ${a} + ${b} = ${s}, maka ${b} + ${a} = …`, a: s },
    { q: `Jika ${a} + ${b} = ${s}, maka … = ${b} + ${a}`, a: s },
    { q: `Jika ${a} + ${b} = ${s}, maka ${b} + … = ${s}`, a: a },
    { q: `Jika ${a} + ${b} = ${s}, maka … + ${a} = ${s}`, a: b },
    { q: `Jika ${a} + ${b} = ${s}, maka ${s} = ${b} + …`, a: a }
  ]);
  v.e = `Sifat komutatif: ${a} + ${b} = ${b} + ${a} = ${s}, jadi jawabannya ${v.a}.`;
  return v;
};
// pengurangan: bukan komutatif
const subcGen = () => {
  const y = n(2), x = y + R(5, 60), z = x - y;
  const v = pick([
    { q: `${x} − ${y} = …`, a: z },
    { q: `… = ${x} − ${y}`, a: z },
    { q: `${x} − … = ${z}`, a: y },
    { q: `… − ${y} = ${z}`, a: x }
  ]);
  v.e = `Pada pengurangan, urutan tidak boleh ditukar (tidak komutatif): ${y} − ${x} tidak bisa dihitung pada bilangan cacah. Yang benar ${x} − ${y} = ${z}.`;
  return v;
};

/* ----- ASOSIATIF ----- */
// (a + b) + c = a + (b + c)  (titik-titik di salah satu dari 6 posisi, ruas kiri/kanan bisa terbalik)
const group = (a, b, c, rev) => {
  rev = rev === undefined ? R(0, 1) : rev;
  const t = [a, b, c, a, b, c], p = R(0, 5), s = blankAt(t, p);
  const L = `(${s[0]} + ${s[1]}) + ${s[2]}`, Rt = `${s[3]} + (${s[4]} + ${s[5]})`;
  return { q: rev ? `${Rt} = ${L}` : `${L} = ${Rt}`, a: t[p],
    e: `Sifat asosiatif: (${a} + ${b}) + ${c} = ${a} + (${b} + ${c}) = ${a + b + c}, jadi bilangan yang hilang adalah ${t[p]}.` };
};
const group2 = (a, b, c) => group(a, b, c, 1);
// menghitung hasil tiga bilangan; titik-titik bisa di kiri atau di kanan
const sum3 = (a, b, c) => {
  const r = a + b + c;
  const f = pick([`(${a} + ${b}) + ${c}`, `${a} + (${b} + ${c})`]);
  return { q: R(0, 1) ? `${f} = …` : `… = ${f}`, a: r,
    e: `${a} + ${b} = ${a + b}, lalu ${a + b} + ${c} = ${r}. Dengan sifat asosiatif, ${a} + (${b} + ${c}) juga hasilnya ${r}.` };
};
const SMART = [[68, 147, 32], [75, 35, 50], [174, 143, 26], [86, 48, 14], [125, 52, 48], [23, 21, 79], [753, 246, 247]];
const smartBook = () => {
  const [a, b, c] = pick(SMART), r = a + b + c, ab = a + b;
  const v = pick([
    { q: `${a} + ${b} + ${c} = …`, a: r },
    { q: `… = ${a} + ${b} + ${c}`, a: r },
    { q: `${a} + ${b} + ${c} = (${a} + ${b}) + …`, a: c },
    { q: `${a} + ${b} + ${c} = … + ${c}`, a: ab }
  ]);
  v.e = `${a} + ${b} = ${ab}, lalu ${ab} + ${c} = ${r}. Cari pasangan yang mudah dijumlahkan dulu.`;
  return v;
};
const pairs100 = () => {
  const p = R(10, 90), x = R(10, 99), q = 100 - p;
  const v = pick([
    { q: `${p} + ${x} + ${q} = …`, a: x + 100 },
    { q: `… = ${p} + ${x} + ${q}`, a: x + 100 },
    { q: `${p} + ${x} + ${q} = ${x} + …`, a: 100 },
    { q: `${p} + ${x} + ${q} = … + ${x}`, a: 100 },
    { q: `${p} + ${x} + ${q} = (${p} + ${q}) + …`, a: x }
  ]);
  v.e = `Tukar urutannya (komutatif): ${p} + ${q} = 100, lalu ${x} + 100 = ${x + 100}. Jawaban soal ini ${v.a}.`;
  return v;
};
const minus = () => {
  const x = R(60, 99), y = R(8, 25), z = R(3, 9), w = x - y;
  const v = pick([
    { q: `(${x} − ${y}) − ${z} = …`, a: w - z },
    { q: `… = (${x} − ${y}) − ${z}`, a: w - z },
    { q: `(${x} − ${y}) − ${z} = ${w} − …`, a: z }
  ]);
  v.e = `Hati-hati: (${x} − ${y}) − ${z} = ${w - z}, sedangkan ${x} − (${y} − ${z}) = ${x - (y - z)}. Hasilnya beda, jadi pengurangan tidak asosiatif.`;
  return v;
};

/* ================= MENJAWAB SOAL ================= */
// a + b =   (urutan boleh ditukar, hasil sama)
const ksAdd = (d1, d2) => {
  const a = n(d1), b = n(d2), r = a + b;
  return { q: `${a} + ${b} =`, a: r,
    e: `${a} + ${b} = ${r}. Karena komutatif, ${b} + ${a} hasilnya juga ${r}.` };
};
// a + (b + a) =   (bilangan yang sama muncul dua kali)
const ksRepeat = d => {
  const a = n(d), b = n(d), r = a + b + a;
  return { q: `${a} + (${b} + ${a}) =`, a: r,
    e: `Hitung dalam kurung dulu: ${b} + ${a} = ${b + a}, lalu ${a} + ${b + a} = ${r}.` };
};
// x − y =   (pengurangan, urutan tidak boleh ditukar)
const subSoal = d => {
  const [x, y] = gt(d), r = x - y;
  return { q: `${x} − ${y} =`, a: r,
    e: `${x} − ${y} = ${r}. Ingat, pengurangan tidak komutatif: ${y} − ${x} tidak bisa dihitung pada bilangan cacah.` };
};
// (a + b) + c = atau a + (b + c) =
const asNest = d => {
  const a = n(d), b = n(d), c = n(d), r = a + b + c;
  const left = R(0, 1);
  return left
    ? { q: `(${a} + ${b}) + ${c} =`, a: r, e: `Kurung dulu: ${a} + ${b} = ${a + b}, lalu ${a + b} + ${c} = ${r}. (Asosiatif: a + (b + c) hasilnya juga ${r}.)` }
    : { q: `${a} + (${b} + ${c}) =`, a: r, e: `Kurung dulu: ${b} + ${c} = ${b + c}, lalu ${a} + ${b + c} = ${r}. (Asosiatif: (a + b) + c hasilnya juga ${r}.)` };
};
// (x − y) − z = atau x − (y − z) =   (pengurangan tidak asosiatif)
const SUBP = { 1: [1, 3, 5, 5], 2: [5, 30, 40, 69], 3: [50, 300, 400, 690] };   // [zMin, zMax, selisih y-z maks, y maks]
const asSub = d => {
  const [zl, zh, gap, ym] = SUBP[d];
  const z = R(zl, zh), y = R(z + 1, Math.min(z + gap, ym)), x = R(y + z, lohi(d)[1]);
  const r1 = (x - y) - z, r2 = x - (y - z);
  const left = R(0, 1);
  return left
    ? { q: `(${x} − ${y}) − ${z} =`, a: r1, e: `Kurung dulu: ${x} − ${y} = ${x - y}, lalu ${x - y} − ${z} = ${r1}. Bandingkan: ${x} − (${y} − ${z}) = ${r2}. Hasilnya beda, jadi pengurangan tidak asosiatif.` }
    : { q: `${x} − (${y} − ${z}) =`, a: r2, e: `Kurung dulu: ${y} − ${z} = ${y - z}, lalu ${x} − ${y - z} = ${r2}. Bandingkan: (${x} − ${y}) − ${z} = ${r1}. Hasilnya beda, jadi pengurangan tidak asosiatif.` };
};
const smartSoal = () => {
  const [a, b, c] = pick(SMART), r = a + b + c;
  return { q: `${a} + ${b} + ${c} =`, a: r,
    e: `${a} + ${b} = ${a + b}, lalu ${a + b} + ${c} = ${r}. Cari pasangan yang mudah dijumlahkan dulu.` };
};
const pairsSoal = () => {
  const p = R(10, 90), x = R(10, 99), q = 100 - p;
  return { q: `${p} + ${x} + ${q} =`, a: x + 100,
    e: `Pasangkan ${p} + ${q} = 100, lalu ${x} + 100 = ${x + 100}.` };
};
// ----- campuran penjumlahan dan pengurangan -----
const mixA = d => { const a = n(d), [b, c] = gt(d), r = a + (b - c);
  return { q: `${a} + (${b} − ${c}) =`, a: r, e: `Kurung dulu: ${b} − ${c} = ${b - c}, lalu ${a} + ${b - c} = ${r}.` }; };
const mixB = d => { const [a, b] = gt(d), c = n(d), r = (a - b) + c;
  return { q: `(${a} − ${b}) + ${c} =`, a: r, e: `Kurung dulu: ${a} − ${b} = ${a - b}, lalu ${a - b} + ${c} = ${r}.` }; };
const mixC = d => { const a = n(d), b = n(d), [lo, hi] = lohi(d), c = R(lo, Math.min(hi, a + b - 1)), r = (a + b) - c;
  return { q: `(${a} + ${b}) − ${c} =`, a: r, e: `Kurung dulu: ${a} + ${b} = ${a + b}, lalu ${a + b} − ${c} = ${r}.` }; };
const MIXD = { 1: [1, 3, 9], 2: [10, 40, 99], 3: [100, 400, 999] };   // [min, maks b dan c, maks a]
const mixD = d => { const [lo, mx, hi] = MIXD[d], b = R(lo, mx), c = R(lo, mx), a = R(b + c + 1, hi), r = a - (b + c);
  return { q: `${a} − (${b} + ${c}) =`, a: r, e: `Kurung dulu: ${b} + ${c} = ${b + c}, lalu ${a} − ${b + c} = ${r}.` }; };
const mixE = d => { const [lo, hi] = lohi(d), c = R(lo, hi - 2), b = R(c + 1, hi - 1), a = R(b + 1, hi), r = a - (b - c);
  return { q: `${a} − (${b} − ${c}) =`, a: r, e: `Kurung dulu: ${b} − ${c} = ${b - c}, lalu ${a} − ${b - c} = ${r}.` }; };

/* ----- SOAL KONTEKSTUAL (cerita / deskripsi) ----- */
const NAMA = ['Ani', 'Budi', 'Citra', 'Dedi', 'Eka', 'Fajar', 'Gita', 'Hana', 'Indra', 'Joko', 'Lina', 'Maya', 'Rafi', 'Sinta'];
const ITEMS = [
  { n: 'kelereng', u: 'butir' }, { n: 'permen', u: 'butir' }, { n: 'buku', u: 'buah' }, { n: 'pensil', u: 'batang' },
  { n: 'stiker', u: 'lembar' }, { n: 'apel', u: 'buah' }, { n: 'kue', u: 'buah' }, { n: 'balon', u: 'buah' }
];
const people = k => { const s = NAMA.slice(), o = []; while (o.length < k) o.push(s.splice(R(0, s.length - 1), 1)[0]); return o; };
const U = (a, it) => `${a} ${it.u} ${it.n}`;           // contoh: "12 butir kelereng"

// Komutatif: dua kelompok digabung
const ctxAdd = d => {
  const [p, q] = people(2), it = pick(ITEMS), a = n(d), b = n(d), r = a + b;
  const t = pick([
    `${p} memiliki ${U(a, it)}. ${q} memiliki ${U(b, it)}. Berapa jumlah ${it.n} mereka berdua?`,
    `Pada pagi hari ${p} mengumpulkan ${U(a, it)}, dan pada sore hari ia mengumpulkan ${b} ${it.u} lagi. Berapa ${it.n} yang ia kumpulkan seluruhnya?`
  ]);
  return { q: t, a: r, e: `Model matematikanya: ${a} + ${b} = ${r}. Karena komutatif, ${b} + ${a} juga ${r}, jadi urutan menjumlahkan boleh ditukar.` };
};
// Komutatif: a + (b + a)
const ctxRepeat = d => {
  const [p] = people(1), it = pick(ITEMS), a = n(d), b = n(d), r = a + b + a;
  return { q: `${p} menjual ${U(a, it)} pada hari Senin, ${b} ${it.u} pada hari Selasa, dan ${a} ${it.u} pada hari Rabu. Berapa ${it.n} yang terjual seluruhnya?`, a: r,
    e: `Model matematikanya: ${a} + (${b} + ${a}). Kurung dulu: ${b} + ${a} = ${b + a}, lalu ${a} + ${b + a} = ${r}.` };
};
// Pengurangan (tidak komutatif)
const ctxSub = d => {
  const [p, q] = people(2), it = pick(ITEMS), [x, y] = gt(d), r = x - y;
  const t = pick([
    `${p} memiliki ${U(x, it)}. Ia memberikan ${y} ${it.u} kepada ${q}. Berapa ${it.n} ${p} sekarang?`,
    `Di rak ada ${U(x, it)}. Sebanyak ${y} ${it.u} sudah dipinjam. Berapa ${it.n} yang masih ada di rak?`
  ]);
  return { q: t, a: r, e: `Model matematikanya: ${x} − ${y} = ${r}. Pengurangan tidak komutatif: ${y} − ${x} tidak bisa dihitung pada bilangan cacah.` };
};
// Asosiatif: tiga kelompok digabung dengan urutan pengelompokan berbeda
const ctxNest = d => {
  const [p, q, s] = people(3), it = pick(ITEMS), a = n(d), b = n(d), c = n(d), r = a + b + c;
  const head = `${p} memiliki ${U(a, it)}, ${q} memiliki ${b} ${it.u}, dan ${s} memiliki ${c} ${it.u}.`;
  return R(0, 1)
    ? { q: `${head} ${p} dan ${q} menggabungkan ${it.n} mereka lebih dulu, lalu digabung dengan milik ${s}. Berapa jumlah seluruhnya?`, a: r,
        e: `Model matematikanya: (${a} + ${b}) + ${c}. Kurung dulu: ${a} + ${b} = ${a + b}, lalu ${a + b} + ${c} = ${r}. (Asosiatif: ${a} + (${b} + ${c}) juga ${r}.)` }
    : { q: `${head} ${q} dan ${s} menggabungkan ${it.n} mereka lebih dulu, lalu digabung dengan milik ${p}. Berapa jumlah seluruhnya?`, a: r,
        e: `Model matematikanya: ${a} + (${b} + ${c}). Kurung dulu: ${b} + ${c} = ${b + c}, lalu ${a} + ${b + c} = ${r}. (Asosiatif: (${a} + ${b}) + ${c} juga ${r}.)` };
};
// Pengurangan tidak asosiatif: (x − y) − z  atau  x − (y − z)
const ctxAsSub = d => {
  const [zl, zh, gap, ym] = SUBP[d], [p, q, s] = people(3), it = pick(ITEMS);
  const z = R(zl, zh), y = R(z + 1, Math.min(z + gap, ym)), x = R(y + z, lohi(d)[1]);
  const r1 = (x - y) - z, r2 = x - (y - z);
  return R(0, 1)
    ? { q: `${p} memiliki ${U(x, it)}. Ia memberikan ${y} ${it.u} kepada ${q}, lalu memberikan ${z} ${it.u} lagi kepada ${s}. Berapa ${it.n} ${p} sekarang?`, a: r1,
        e: `Model matematikanya: (${x} − ${y}) − ${z}. Kurung dulu: ${x} − ${y} = ${x - y}, lalu ${x - y} − ${z} = ${r1}. Bandingkan: ${x} − (${y} − ${z}) = ${r2}. Hasilnya beda, jadi pengurangan tidak asosiatif.` }
    : { q: `Toko ${p} memiliki ${U(x, it)}. Hari ini terjual ${y} ${it.u}, tetapi ${z} ${it.u} di antaranya dikembalikan pembeli. Berapa ${it.n} yang ada di toko sekarang?`, a: r2,
        e: `Model matematikanya: ${x} − (${y} − ${z}). Kurung dulu: ${y} − ${z} = ${y - z}, lalu ${x} − ${y - z} = ${r2}. Bandingkan: (${x} − ${y}) − ${z} = ${r1}. Hasilnya beda, jadi pengurangan tidak asosiatif.` };
};
// Campuran penjumlahan dan pengurangan
const ctxMixA = d => { const [p] = people(1), it = pick(ITEMS), a = n(d), [b, c] = gt(d), r = a + (b - c);
  return { q: `${p} memiliki ${U(a, it)}. Ia membeli ${b} ${it.u} lagi, tetapi ${c} ${it.u} dari yang baru dibeli itu rusak dan dibuang. Berapa ${it.n} ${p} sekarang?`, a: r,
    e: `Model matematikanya: ${a} + (${b} − ${c}). Kurung dulu: ${b} − ${c} = ${b - c}, lalu ${a} + ${b - c} = ${r}.` }; };
const ctxMixB = d => { const [p, q] = people(2), it = pick(ITEMS), [a, b] = gt(d), c = n(d), r = (a - b) + c;
  return { q: `${p} memiliki ${U(a, it)}. Ia memberikan ${b} ${it.u} kepada ${q}, lalu mendapat ${c} ${it.u} dari ibunya. Berapa ${it.n} ${p} sekarang?`, a: r,
    e: `Model matematikanya: (${a} − ${b}) + ${c}. Kurung dulu: ${a} − ${b} = ${a - b}, lalu ${a - b} + ${c} = ${r}.` }; };
const ctxMixC = d => { const [p, q] = people(2), it = pick(ITEMS), a = n(d), b = n(d), [lo, hi] = lohi(d), c = R(lo, Math.min(hi, a + b - 1)), r = (a + b) - c;
  return { q: `${p} memiliki ${U(a, it)} dan ${q} memiliki ${b} ${it.u}. Mereka menggabungkannya, lalu ${c} ${it.u} dibagikan kepada teman-teman. Berapa ${it.n} yang tersisa?`, a: r,
    e: `Model matematikanya: (${a} + ${b}) − ${c}. Kurung dulu: ${a} + ${b} = ${a + b}, lalu ${a + b} − ${c} = ${r}.` }; };
const ctxMixD = d => { const [p, q, s] = people(3), it = pick(ITEMS), [lo, mx, hi] = MIXD[d], b = R(lo, mx), c = R(lo, mx), a = R(b + c + 1, hi), r = a - (b + c);
  return { q: `${p} memiliki ${U(a, it)}. Ia memberikan ${b} ${it.u} kepada ${q} dan ${c} ${it.u} kepada ${s}. Berapa ${it.n} ${p} yang tersisa?`, a: r,
    e: `Model matematikanya: ${a} − (${b} + ${c}). Kurung dulu: ${b} + ${c} = ${b + c}, lalu ${a} − ${b + c} = ${r}.` }; };
const ctxMixE = d => { const [p] = people(1), it = pick(ITEMS), [lo, hi] = lohi(d), c = R(lo, hi - 2), b = R(c + 1, hi - 1), a = R(b + 1, hi), r = a - (b - c);
  return { q: `Toko ${p} memiliki ${U(a, it)}. Pagi hari terjual ${b} ${it.u}, tetapi ${c} ${it.u} dikembalikan pembeli. Berapa ${it.n} yang ada di toko sekarang?`, a: r,
    e: `Model matematikanya: ${a} − (${b} − ${c}). Kurung dulu: ${b} − ${c} = ${b - c}, lalu ${a} − ${b - c} = ${r}.` }; };

/* ================= PENGELOMPOKAN PER LEVEL (4 level) ================= */
// Menemukan pola
const KP = [
  [() => swap(n(1), n(1))],                                                       // L1 1 digit
  [() => swap(n(2), n(2)), () => same(n(2), n(2))],                               // L2 2 digit
  [() => swap3(n(2), n(2), n(2)), () => swap(n(3), n(3)), () => same(n(3), n(3))], // L3 tiga bilangan & 3 digit
  [() => swap3(n(3), n(3), n(3)), () => same(n(3), n(3)), subcGen]                // L4 + pengurangan bukan komutatif
];
const AP = [
  [() => group(n(1), n(1), n(1))],                                                // L1
  [() => group(n(2), n(2), n(2)), () => group2(n(2), n(2), n(2))],                // L2
  [() => sum3(n(2), n(2), n(2)), smartBook, () => group2(n(2), n(2), n(2))],      // L3 hitung cerdas
  [smartBook, pairs100, minus, () => sum3(n(3), n(3), n(3))]                      // L4 + pengurangan bukan asosiatif
];
const MP = KP.map((ks, i) => ks.concat(AP[i]));                                   // campuran = komutatif + asosiatif

// Menjawab soal (hitungan langsung + soal kontekstual/cerita)
const KS = [
  [() => ksAdd(1, 1), () => subSoal(1), () => ctxAdd(1), () => ctxSub(1)],                                   // L1
  [() => ksAdd(2, 2), () => ksAdd(2, 1), () => subSoal(2), () => ctxAdd(2), () => ctxSub(2)],                 // L2
  [() => ksRepeat(1), () => ksRepeat(2), () => subSoal(2), () => ctxRepeat(1), () => ctxRepeat(2), () => ctxSub(2)],   // L3 a + (b + a)
  [() => ksAdd(3, 3), () => ksRepeat(3), () => subSoal(3), () => ctxAdd(3), () => ctxRepeat(3), () => ctxSub(3)]      // L4 3 digit
];
const AS = [
  [() => asNest(1), () => asSub(1), () => ctxNest(1), () => ctxAsSub(1)],                                     // L1
  [() => asNest(2), () => asSub(2), () => ctxNest(2), () => ctxAsSub(2)],                                     // L2
  [() => asNest(2), smartSoal, () => asSub(2), () => ctxNest(2), () => ctxAsSub(2)],                          // L3
  [() => asNest(3), smartSoal, pairsSoal, () => asSub(3), () => ctxNest(3), () => ctxAsSub(3)]                // L4
];
const MS = [
  [() => mixA(1), () => mixB(1), () => mixC(1), () => ctxMixA(1), () => ctxMixB(1), () => ctxMixC(1)],        // L1 1 digit
  [() => mixA(2), () => mixB(2), () => mixC(2), () => ctxMixA(2), () => ctxMixB(2), () => ctxMixC(2)],        // L2 2 digit
  [() => mixD(2), () => mixE(2), () => mixA(2), () => ctxMixD(2), () => ctxMixE(2), () => ctxMixC(2)],        // L3 kurung pengurangan
  [() => mixA(3), () => mixC(3), () => mixD(3), () => mixE(3), () => ctxMixA(3), () => ctxMixB(3), () => ctxMixD(3), () => ctxMixE(3)]   // L4 3 digit
];

const BANK = { k: { p: KP, s: KS }, a: { p: AP, s: AS }, m: { p: MP, s: MS } };

/* ============ DATA TERSIMPAN ============ */
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};
let player = store.get('gm_name', '');
let prog = store.get('gm_prog2', {});                         // prog['kp'][level] = bintang terbaik (1-3); kunci = mode + jenis
const pkey = () => G.mode + G.sub;
const stars = lv => (prog[pkey()] && prog[pkey()][lv]) || 0;
const unlocked = lv => lv === 1 || stars(lv - 1) > 0;

/* ============ NAVIGASI LAYAR ============ */
const SCREENS = ['login', 'home', 'sub', 'materi', 'levels', 'game', 'over'];
let timer = null;
function show(id) {
  if (id !== 'game') clearInterval(timer);
  SCREENS.forEach(s => $('#' + s).classList.toggle('hidden', s !== id));
}
const fmt = s => String(Math.floor(s / 60)).padStart(2, '0') + ' : ' + String(s % 60).padStart(2, '0');

/* ============ SUARA ============ */
let ac;
function audio() {
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume();
    return ac;
  } catch (e) { return null; }
}
// satu nada dengan envelope halus: frekuensi, jeda mulai, durasi, bentuk gelombang, volume
function tone(freq, start = 0, dur = .15, type = 'sine', vol = .2, slideTo = 0) {
  const c = audio(); if (!c) return;
  try {
    const t = c.currentTime + start, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + .02);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + .03);
  } catch (e) {}
}
const beep = (freq, dur = .06) => tone(freq, 0, dur, 'sine', .08);   // klik tombol angka
function sfxBenar() { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * .09, .22, 'triangle', .25)); }
function sfxSalah() {
  tone(233, 0, .28, 'sawtooth', .16, 200);
  tone(175, .22, .4, 'sawtooth', .16, 120);
}
function sfxMenang() { [523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, i * .12, .25, 'triangle', .25)); }
function sfxKalah() { [392, 330, 262].forEach((f, i) => tone(f, i * .2, .35, 'sine', .22)); }

/* ============ LOGIN ============ */
$('#login-form').addEventListener('submit', e => {
  e.preventDefault();
  const input = $('#name'), v = input.value.trim().replace(/\s+/g, ' ');
  if (v.length < 2) {                                         // validasi nama
    $('#login-err').textContent = 'Tulis namamu dulu ya (minimal 2 huruf).';
    input.classList.add('invalid'); input.focus();
    setTimeout(() => input.classList.remove('invalid'), 400);
    return;
  }
  $('#login-err').textContent = '';
  player = v; store.set('gm_name', v);
  logSheet('login');
  goHome();
});
function goHome() { $('#hello-name').textContent = player; show('home'); }
$('#logout').onclick = () => { logSheet('logout'); $('#name').value = player; show('login'); $('#name').focus(); };

/* ============ BERANDA, PILIH JENIS, MATERI & PILIH LEVEL ============ */
let G = { mode: 'k', sub: 'p', level: 1 };
document.querySelectorAll('.menu-btn[data-mode]').forEach(b => b.onclick = () => openSub(b.dataset.mode));
document.querySelectorAll('.menu-btn[data-sub]').forEach(b => b.onclick = () => openLevels(G.mode, b.dataset.sub));
$('#btn-materi').onclick = () => { logSheet('materi'); show('materi'); $('#materi').scrollTop = 0; };
$('#mt-back').onclick = goHome;
$('#mt-play').onclick = goHome;
$('#sub-back').onclick = goHome;
$('#lv-back').onclick = () => openSub(G.mode);

function openSub(mode) {
  G.mode = mode;
  $('#sub-title').textContent = MODES[mode];
  show('sub');
}

function openLevels(mode, sub) {
  G.mode = mode; G.sub = sub || G.sub;
  $('#lv-title').textContent = `${MODES[G.mode]} · ${SUBS[G.sub]}`;
  $('#lv-grid').innerHTML = Array.from({ length: LEVELS }, (_, i) => {
    const lv = i + 1, st = stars(lv), open = unlocked(lv);
    const starTxt = open ? [1, 2, 3].map(s => `<span class="${s <= st ? '' : 'st-off'}">★</span>`).join('') : '🔒';
    return `<button class="lv ${st ? 'done' : ''}" data-l="${lv}" ${open ? '' : 'disabled'} aria-label="Level ${lv}${open ? '' : ', terkunci'}">${lv}<small>${starTxt}</small></button>`;
  }).join('');
  document.querySelectorAll('.lv:not(:disabled)').forEach(b => b.onclick = () => startLevel(+b.dataset.l));
  show('levels');
}

/* ============ GAME ============ */
function startLevel(level) {
  clearInterval(timer);
  G = { mode: G.mode, sub: G.sub, level, ok: 0, lives: MAX_LIVES, t: 0, v: '', lock: false, lastQ: '' };
  show('game');
  logSheet('start', info());
  timer = setInterval(() => { G.t++; $('#time').textContent = fmt(G.t); }, 1000);
  nextQuestion();
}
function makeQuestion() {
  const gens = BANK[G.mode][G.sub][G.level - 1];
  let q, tries = 0;
  do { q = pick(gens)(); } while (q.q === G.lastQ && ++tries < 10);
  return q;
}
function nextQuestion() {
  G.cur = makeQuestion();
  G.lastQ = G.cur.q; G.v = ''; G.lock = false;
  $('#question').textContent = G.cur.q;
  $('#question').classList.toggle('long', G.cur.q.length > 30);   // soal cerita: huruf lebih kecil
  $('#feedback').innerHTML = '';
  $('#answer').className = 'answer';
  renderHUD(); renderAnswer();
}
function renderHUD(popIndex = -1) {
  $('#time').textContent = fmt(G.t);
  $('#score').textContent = `${G.ok}/${TARGET}`;
  $('#level').textContent = G.level;
  $('#hearts').innerHTML = Array.from({ length: MAX_LIVES }, (_, i) =>
    `<span class="${i >= G.lives ? 'lost' : ''} ${i === popIndex ? 'pop' : ''}">❤️</span>`).join('');
}
function renderAnswer() { $('#answer').textContent = G.v || '\u00A0'; }

function press(k) {
  if (G.lock) return;
  if (k === 'del') G.v = G.v.slice(0, -1);
  else if (G.v.length < MAX_DIGITS) G.v += k;
  renderAnswer();
}

function check() {
  if (G.lock) return;
  const box = $('#answer');
  if (!G.v) {                                                 // validasi: jawaban kosong
    box.classList.add('shake'); setTimeout(() => box.classList.remove('shake'), 400);
    $('#feedback').innerHTML = '<div class="no">Isi jawabanmu dulu ya!</div>';
    return;
  }
  G.lock = true;
  const benar = Number(G.v) === G.cur.a;
  if (benar) {                                                // BENAR
    G.ok++; sfxBenar();
    box.classList.add('good');
    $('#feedback').innerHTML = '<div class="ok">Benar!</div>';
    renderHUD();
    logSheet('answer', Object.assign(info(), { soal: G.cur.q, jawabanSiswa: Number(G.v), jawabanBenar: G.cur.a, hasil: 'Benar', nyawa: G.lives, skor: G.ok, waktu: G.t }));
    setTimeout(() => G.ok >= TARGET ? finish(true) : nextQuestion(), 800);
  } else {                                                    // SALAH
    G.lives--; sfxSalah();
    box.classList.add('bad');
    renderHUD(G.lives);
    logSheet('answer', Object.assign(info(), { soal: G.cur.q, jawabanSiswa: Number(G.v), jawabanBenar: G.cur.a, hasil: 'Salah', nyawa: G.lives, skor: G.ok, waktu: G.t }));
    const last = G.lives <= 0;
    $('#feedback').innerHTML =
      `<div class="no">Belum tepat. Jawaban yang benar: <b>${G.cur.a}</b><small>${G.cur.e}</small></div>
       <button class="jelly" id="cont">${last ? 'Selesai' : 'Lanjut'}</button>`;
    $('#cont').onclick = last ? () => finish(false) : nextQuestion;
  }
}

/* ============ HASIL ============ */
function finish(win) {
  clearInterval(timer);
  const st = !win ? 0 : G.lives >= 4 ? 3 : G.lives >= 2 ? 2 : 1;
  if (win && st > stars(G.level)) {
    prog[pkey()] = prog[pkey()] || {};
    prog[pkey()][G.level] = st;
    store.set('gm_prog2', prog);
  }
  setTimeout(win ? sfxMenang : sfxKalah, 150);
  logSheet('finish', Object.assign(info(), { hasil: win ? 'Selesai' : 'Gagal', nyawa: G.lives, skor: G.ok, waktu: G.t, bintang: st }));
  const last = G.level >= LEVELS;
  $('#over-title').textContent = win ? (last ? 'Semua level selesai!' : 'Level selesai!') : 'Nyawa habis';
  $('#over-stars').textContent = win ? '★'.repeat(st) + '☆'.repeat(3 - st) : '';
  $('#r-score').textContent = `${G.ok}/${TARGET}`;
  $('#r-time').textContent = fmt(G.t);
  $('#r-level').textContent = G.level;
  $('#over-msg').textContent = win
    ? (last ? `Hebat, ${player}! Kamu sudah menamatkan semua level ${MODES[G.mode]} (${SUBS[G.sub]}).` : `Bagus, ${player}! Level ${G.level + 1} sudah terbuka.`)
    : 'Baca penjelasan tiap soal yang salah, lalu coba lagi.';
  $('#next').classList.toggle('hidden', !(win && !last));
  show('over');
}
$('#next').onclick = () => startLevel(G.level + 1);
$('#retry').onclick = () => startLevel(G.level);
$('#tolevels').onclick = () => openLevels(G.mode, G.sub);
$('#back').onclick = () => openLevels(G.mode, G.sub);

/* ============ EVENT UMUM ============ */
$('#keypad').addEventListener('click', e => {
  const b = e.target.closest('.key');
  if (b && !b.disabled) { beep(420); press(b.dataset.k); }
});
$('#check').onclick = check;
addEventListener('keydown', e => {
  if ($('#game').classList.contains('hidden')) return;
  if (/^\d$/.test(e.key)) press(e.key);
  else if (e.key === 'Backspace') press('del');
  else if (e.key === 'Enter') { const c = $('#cont'); G.lock && c ? c.click() : check(); }
});

/* ============ MULAI ============ */
$('#name').value = player;
show('login');