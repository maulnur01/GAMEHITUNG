'use strict';
const $ = s => document.querySelector(s);
const R = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = a => a[R(0, a.length - 1)];
const MAX_LIVES = 5, TARGET = 10, MAX_DIGITS = 4, LEVELS = 9;
const MODES = { k: 'Komutatif', a: 'Asosiatif', m: 'Campuran' };
const n = d => d === 1 ? R(1, 9) : d === 2 ? R(10, 99) : R(100, 999);   // bilangan d digit

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

/* ============ BANK SOAL ============
   Setiap pembuat soal mengembalikan { q: teks soal, a: jawaban (angka), e: penjelasan }
   Posisi titik-titik (…) diacak: bisa di kiri, tengah, atau kanan tanda sama dengan. */
const blankAt = (t, p) => t.map((v, i) => i === p ? '…' : v);   // ganti bilangan ke-p dengan titik-titik

/* ----- KOMUTATIF ----- */
// a + b = b + a  (titik-titik di salah satu dari 4 posisi)
const swap = (a, b) => {
  const t = [a, b, b, a], p = R(0, 3), s = blankAt(t, p);
  return { q: `${s[0]} + ${s[1]} = ${s[2]} + ${s[3]}`, a: t[p],
    e: `Sifat komutatif: ${a} + ${b} = ${b} + ${a}, jadi bilangan yang hilang adalah ${t[p]}.` };
};
// tiga bilangan ditukar urutannya (titik-titik di salah satu dari 6 posisi)
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
const SMART = [[68,147,32],[75,35,50],[174,143,26],[86,48,14],[125,52,48],[23,21,79],[753,246,247]];
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

/* Pembuat soal tiap level (indeks 0 = level 1 ... indeks 8 = level 9) */
const K = [
  [() => swap(n(1), n(1))],                                   // L1 komutatif 1 digit
  [() => swap(n(2), n(2))],                                   // L2 2 digit
  [() => same(n(2), n(2))],                                   // L3 hasil penjumlahan ditukar
  [() => swap(n(3), n(3))],                                   // L4 3 digit
  [() => same(n(3), n(3))],                                   // L5
  [() => swap3(n(2), n(2), n(2))],                            // L6 tiga bilangan
  [() => swap3(n(3), n(3), n(3)), () => same(n(3), n(3))],    // L7
  [subcGen, () => swap3(n(3), n(3), n(3))]                    // L8 pengurangan bukan komutatif
];
K.push(K.slice(3, 8).flat());                                 // L9 gabungan

const A = [
  [() => group(n(1), n(1), n(1))],                            // L1 asosiatif 1 digit
  [() => group(n(2), n(2), n(2))],                            // L2
  [() => sum3(n(2), n(2), n(2))],                             // L3 hitung tiga bilangan
  [() => sum3(n(3), n(3), n(3))],                             // L4 3 digit
  [() => group2(n(2), n(2), n(2))],                           // L5 a+(b+c) = (a+b)+c
  [smartBook],                                                // L6 hitung cerdas (buku)
  [pairs100],                                                 // L7 pasangan 100
  [minus]                                                     // L8 pengurangan bukan asosiatif
];
A.push(A.slice(3).flat());                                    // L9 gabungan

const BANK = { k: K, a: A, m: K.map((ks, i) => ks.concat(A[i])) };   // campuran = komutatif + asosiatif

/* ============ DATA TERSIMPAN ============ */
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};
let player = store.get('gm_name', '');
let prog = store.get('gm_prog', { k: {}, a: {}, m: {} });     // prog[mode][level] = bintang terbaik (1-3)
const stars = (mode, lv) => (prog[mode] && prog[mode][lv]) || 0;
const unlocked = (mode, lv) => lv === 1 || stars(mode, lv - 1) > 0;

/* ============ NAVIGASI LAYAR ============ */
const SCREENS = ['login', 'home', 'materi', 'levels', 'game', 'over'];
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
// jawaban benar: nada naik ceria (do-mi-sol-do)
function sfxBenar() {
  [523, 659, 784, 1047].forEach((f, i) => tone(f, i * .09, .22, 'triangle', .25));
}
// jawaban salah: nada turun "buzz"
function sfxSalah() {
  tone(233, 0, .28, 'sawtooth', .16, 200);
  tone(175, .22, .4, 'sawtooth', .16, 120);
}
// level selesai: fanfare singkat
function sfxMenang() {
  [523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, i * .12, .25, 'triangle', .25));
}
function sfxKalah() {
  [392, 330, 262].forEach((f, i) => tone(f, i * .2, .35, 'sine', .22));
}

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

/* ============ BERANDA, MATERI & PILIH LEVEL ============ */
let G = { mode: 'k', level: 1 };
document.querySelectorAll('.menu-btn[data-mode]').forEach(b => b.onclick = () => openLevels(b.dataset.mode));
$('#btn-materi').onclick = () => { logSheet('materi'); show('materi'); $('#materi').scrollTop = 0; };
$('#mt-back').onclick = goHome;
$('#mt-play').onclick = goHome;
$('#lv-back').onclick = goHome;

function openLevels(mode) {
  G.mode = mode;
  $('#lv-title').textContent = MODES[mode];
  $('#lv-grid').innerHTML = Array.from({ length: LEVELS }, (_, i) => {
    const lv = i + 1, st = stars(mode, lv), open = unlocked(mode, lv);
    const starTxt = open ? [1, 2, 3].map(s => `<span class="${s <= st ? '' : 'st-off'}">★</span>`).join('') : '🔒';
    return `<button class="lv ${st ? 'done' : ''}" data-l="${lv}" ${open ? '' : 'disabled'} aria-label="Level ${lv}${open ? '' : ', terkunci'}">${lv}<small>${starTxt}</small></button>`;
  }).join('');
  document.querySelectorAll('.lv:not(:disabled)').forEach(b => b.onclick = () => startLevel(+b.dataset.l));
  show('levels');
}

/* ============ GAME ============ */
function startLevel(level) {
  clearInterval(timer);
  G = { mode: G.mode, level, ok: 0, lives: MAX_LIVES, t: 0, v: '', lock: false, lastQ: '' };
  show('game');
  logSheet('start', { mode: MODES[G.mode], level });
  timer = setInterval(() => { G.t++; $('#time').textContent = fmt(G.t); }, 1000);
  nextQuestion();
}
function makeQuestion() {
  const gens = BANK[G.mode][G.level - 1];
  let q, tries = 0;
  do { q = pick(gens)(); } while (q.q === G.lastQ && ++tries < 10);
  return q;
}
function nextQuestion() {
  G.cur = makeQuestion();
  G.lastQ = G.cur.q; G.v = ''; G.lock = false;
  $('#question').textContent = G.cur.q;
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
    logSheet('answer', { mode: MODES[G.mode], level: G.level, soal: G.cur.q, jawabanSiswa: Number(G.v), jawabanBenar: G.cur.a, hasil: 'Benar', nyawa: G.lives, skor: G.ok, waktu: G.t });
    setTimeout(() => G.ok >= TARGET ? finish(true) : nextQuestion(), 800);
  } else {                                                    // SALAH
    G.lives--; sfxSalah();
    box.classList.add('bad');
    renderHUD(G.lives);
    logSheet('answer', { mode: MODES[G.mode], level: G.level, soal: G.cur.q, jawabanSiswa: Number(G.v), jawabanBenar: G.cur.a, hasil: 'Salah', nyawa: G.lives, skor: G.ok, waktu: G.t });
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
  if (win && st > stars(G.mode, G.level)) { prog[G.mode][G.level] = st; store.set('gm_prog', prog); }
  setTimeout(win ? sfxMenang : sfxKalah, 150);
  logSheet('finish', { mode: MODES[G.mode], level: G.level, hasil: win ? 'Selesai' : 'Gagal', nyawa: G.lives, skor: G.ok, waktu: G.t, bintang: st });
  const last = G.level >= LEVELS;
  $('#over-title').textContent = win ? (last ? 'Semua level selesai!' : 'Level selesai!') : 'Nyawa habis';
  $('#over-stars').textContent = win ? '★'.repeat(st) + '☆'.repeat(3 - st) : '';
  $('#r-score').textContent = `${G.ok}/${TARGET}`;
  $('#r-time').textContent = fmt(G.t);
  $('#r-level').textContent = G.level;
  $('#over-msg').textContent = win
    ? (last ? `Hebat, ${player}! Kamu sudah menamatkan semua level ${MODES[G.mode]}.` : `Bagus, ${player}! Level ${G.level + 1} sudah terbuka.`)
    : 'Baca penjelasan tiap soal yang salah, lalu coba lagi.';
  $('#next').classList.toggle('hidden', !(win && !last));
  show('over');
}
$('#next').onclick = () => startLevel(G.level + 1);
$('#retry').onclick = () => startLevel(G.level);
$('#tolevels').onclick = () => openLevels(G.mode);
$('#back').onclick = () => openLevels(G.mode);

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