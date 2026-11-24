/* Redam — Skrining kemarahan dengan DAR-5 (Dimensions of Anger Reactions-5)
   Sumber: Forbes et al. (2014), Depression and Anxiety, 31(2):166-173. Bukan alat diagnosis. */
const CUT = 12; // skor total 5-25; >=12 = di atas ambang skrining
const LABELS = ['Tidak pernah atau hampir tidak pernah', 'Sebagian kecil waktu', 'Sebagian waktu', 'Sebagian besar waktu', 'Selalu atau hampir selalu'];
const SHORT = ['Tidak pernah', 'Sedikit', 'Kadang', 'Sering', 'Selalu'];
const AGES = ['<18', '18-24', '25-34', '35-44', '45-54', '55+'];
const DAR = [
 { k: 'Frekuensi', id: 'Saya mendapati diri saya marah pada orang atau situasi.', en: 'I found myself getting angry at people or situations.',
   tip: 'Catat 3 situasi terakhir yang memicu marah dan cari kesamaannya. Cukupi tidur dan makan, karena lelah dan lapar menurunkan ambang marah.' },
 { k: 'Intensitas', id: 'Ketika marah, saya sangat marah.', en: 'When I got angry, I got really mad.',
   tip: 'Latih napas 4-6: tarik napas 4 hitungan, hembuskan pelan 6 hitungan, ulangi 5 kali. Beri jeda 10-20 menit sebelum berbicara atau bertindak.' },
 { k: 'Durasi', id: 'Ketika marah, saya tetap marah (sulit reda).', en: 'When I got angry, I stayed angry.',
   tip: 'Tuliskan kejadiannya lalu satu sudut pandang lain yang mungkin benar. Batasi waktu merenung (mis. 10 menit), lalu alihkan dengan bergerak atau bercerita pada orang tepercaya.' },
 { k: 'Agresi', id: 'Ketika marah pada seseorang, saya ingin memukulnya.', en: 'When I got angry at someone, I wanted to hit them.',
   tip: 'Dorongan melukai adalah tanda untuk menjauh dari situasi sejenak. Jika sering muncul, bicarakan dengan psikolog atau layanan kesehatan jiwa.' },
 { k: 'Hubungan sosial', id: 'Kemarahan saya membuat saya sulit bergaul dengan orang lain sebaik yang saya inginkan.', en: "My anger prevented me from getting along with people as well as I'd have liked to.",
   tip: 'Pakai kalimat "Saya": "Saya kesal karena ... dan saya butuh ...". Setelah reda, perbaiki hubungan dengan meminta maaf bila perlu dan membahas inti masalahnya.' }
];
const FEATURES = [
 ['Asesmen Psikologis', 'Kuesioner DAR-5, alat skrining kemarahan 5 butir yang telah diuji validitasnya di beberapa negara.'],
 ['Analitik Skor Kemarahan', 'Skor total dibandingkan dengan ambang skrining, plus profil lima aspek kemarahan.'],
 ['Pemantauan Perkembangan', 'Grafik perubahan skor dari waktu ke waktu agar kemajuan terlihat jelas.'],
 ['Laporan Asesmen', 'Laporan yang bisa dicetak atau disimpan sebagai PDF untuk Anda dan psikolog yang menangani.']
];

const sb = (typeof supabase !== 'undefined' && typeof SUPABASE_URL !== 'undefined' && !SUPABASE_URL.includes('YOUR-'))
  ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const S = { step: 0, age: '', ans: [], safety: null, user: null, authMode: 'login', msg: '', msgOk: false, email: '', hist: [], cur: null, report: null, sent: false };
const $ = s => document.querySelector(s);
const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = d => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
const fmtS = d => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
const total = a => a.reduce((s, v) => s + v, 0);
const toArr = r => [1, 2, 3, 4, 5].map(i => r.answers['q' + i]);
const over = t => t >= CUT;

const navBar = () => `<div class="nav noprint"><span class="brand">Redam</span>${S.user
  ? `<span class="small">${esc(S.user.email)} · <a href="#" id="logout">Keluar</a></span>`
  : `<button class="pill g sm" id="goLogin">Masuk</button>`}</div>`;
const foot = `<footer class="noprint">Redam adalah alat skrining, bukan diagnosis, dan tidak menggantikan psikolog atau dokter.<br>Instrumen: DAR-5 (Forbes et al., 2014). Terjemahan Indonesia bersifat tidak resmi dan belum divalidasi.</footer>`;

function help(red) {
  return `<div class="alert ${red ? 'red' : ''}"><b>${red ? 'Anda tidak sendirian. Bantuan tersedia sekarang.' : 'Butuh teman bicara?'}</b><br>
  Healing119 (Kemenkes) melayani konseling kesehatan jiwa gratis 24 jam: telepon <a href="tel:119">119</a> lalu tekan <b>ekstensi 8</b>, atau kunjungi <a href="https://healing119.id" target="_blank" rel="noopener">healing119.id</a>.
  Untuk kekerasan terhadap perempuan dan anak: <a href="tel:129">SAPA 129</a>. Jika ada bahaya langsung, hubungi polisi <a href="tel:110">110</a>.</div>`;
}

/* ---------- Analitik ---------- */
function gauge(t) {
  const pos = (t - 5) / 20 * 100, cut = (CUT - 5) / 20 * 100;
  return `<div class="gauge"><b>${t}</b><span class="small">dari 25 (rentang 5-25)</span>
    <div class="track"><i style="width:${pos}%" class="${over(t) ? 'hi' : ''}"></i><u style="left:${cut}%"><em>Ambang ${CUT}</em></u></div>
    <span class="lvl ${over(t) ? 'l2' : 'l0'}">${over(t) ? 'Di atas ambang skrining' : 'Di bawah ambang skrining'}</span></div>`;
}
function aspects(a) {
  return DAR.map((d, i) => `<div class="bar"><div><span>${d.k}</span><span>${a[i]} / 5 · ${SHORT[a[i] - 1]}</span></div><i style="--w:${a[i] / 5 * 100}%"></i></div>`).join('');
}
function interp(t) {
  return over(t)
    ? `Skor Anda <b>${t}</b> berada pada atau di atas ambang skrining DAR-5 (${CUT}). Ini menandakan kemarahan yang mungkin mengganggu keseharian. Disarankan berkonsultasi dengan psikolog atau tenaga kesehatan jiwa untuk penilaian lebih lanjut.`
    : `Skor Anda <b>${t}</b> berada di bawah ambang skrining DAR-5 (${CUT}). Kemarahan Anda tampak belum pada tingkat yang perlu dikhawatirkan, tetapi latihan pengelolaan emosi tetap bermanfaat.`;
}

/* ---------- Pemantauan ---------- */
function lineChart(list) {
  const d = list.slice(-8), W = 640, H = 240, L = 40, R = 16, T = 16, B = 34;
  const x = i => d.length === 1 ? W / 2 : L + i * (W - L - R) / (d.length - 1), y = v => T + (25 - v) / 20 * (H - T - B);
  const pts = d.map((r, i) => `${x(i)},${y(r.total)}`).join(' ');
  return `<div class="chartbox"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Grafik skor DAR-5 dari waktu ke waktu">
    ${[5, 10, 15, 20, 25].map(v => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="#e1e7f5"/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="#5b6784">${v}</text>`).join('')}
    <line x1="${L}" x2="${W - R}" y1="${y(CUT)}" y2="${y(CUT)}" stroke="#b42318" stroke-dasharray="5 4"/><text x="${W - R}" y="${y(CUT) - 5}" text-anchor="end" font-size="11" fill="#b42318">Ambang ${CUT}</text>
    ${d.length > 1 ? `<polyline points="${pts}" fill="none" stroke="#3f68f5" stroke-width="2.5"/>` : ''}
    ${d.map((r, i) => `<circle cx="${x(i)}" cy="${y(r.total)}" r="5" fill="${over(r.total) ? '#b42318' : '#3f68f5'}"/><text x="${x(i)}" y="${H - 12}" text-anchor="middle" font-size="11" fill="#5b6784">${fmtS(r.created_at)}</text>`).join('')}
  </svg></div>`;
}
function progressCard() {
  const h = S.hist; if (!h.length) return '';
  let delta = '';
  if (h.length > 1) { const d = h[h.length - 1].total - h[h.length - 2].total;
    delta = `<div class="alert ${d > 0 ? '' : ''}">${d < 0 ? `Skor turun <b>${-d}</b> poin dibanding asesmen sebelumnya (membaik).` : d > 0 ? `Skor naik <b>${d}</b> poin dibanding asesmen sebelumnya.` : 'Skor sama dengan asesmen sebelumnya.'}</div>`; }
  return `<div class="card"><h2>Pemantauan Perkembangan</h2><p class="sub">Skor lebih rendah berarti lebih baik. DAR-5 menanyakan 4 minggu terakhir, jadi ulangi sekitar 4 minggu sekali.</p>
    ${h.length > 1 ? lineChart(h) : '<p class="small">Baru ada satu hasil. Ulangi asesmen setelah sekitar 4 minggu untuk melihat grafik perkembangan.</p>'}
    ${delta}<div class="tbl">${[...h].reverse().map((r, i) => `<div class="trow"><span>${fmt(r.created_at)}</span><b>${r.total}</b>
      <span class="lvl ${over(r.total) ? 'l2' : 'l0'}" style="margin:0;padding:2px 10px">${over(r.total) ? 'Di atas ambang' : 'Di bawah ambang'}</span>
      <button class="link" data-rep="${h.length - 1 - i}" style="margin:0">Laporan</button></div>`).join('')}</div>
    <button class="link" id="delHist">Hapus semua riwayat saya</button></div>`;
}

/* ---------- Laporan ---------- */
function reportView(r) {
  const a = toArr(r);
  return `<div class="wrap"><div class="card" id="report"><h2>Laporan Asesmen DAR-5</h2>
    <p class="sub">Redam · ${fmt(r.created_at)}${r.age_range ? ' · Rentang usia ' + esc(r.age_range) : ''}${S.user ? ' · ' + esc(S.user.email) : ''}</p>
    ${gauge(r.total)}<p>${interp(r.total)}</p>
    ${r.safety_flag ? '<div class="alert red"><b>Catatan keselamatan:</b> pengguna menjawab "Ya" pada pertanyaan apakah pernah terpikir menyakiti diri sendiri atau orang lain saat marah dalam 1 bulan terakhir. Disarankan tindak lanjut segera.</div>' : ''}
    <h3>Jawaban per butir</h3><div class="tbl">${DAR.map((d, i) => `<div class="irow"><span><b>${i + 1}. ${d.k}</b><br>${d.id}<br><i class="small">${esc(d.en)}</i></span><b>${a[i]}</b><span class="small">${LABELS[a[i] - 1]}</span></div>`).join('')}</div>
    <p class="small">Skala: 1 = tidak pernah atau hampir tidak pernah, 2 = sebagian kecil waktu, 3 = sebagian waktu, 4 = sebagian besar waktu, 5 = selalu atau hampir selalu. Periode: 4 minggu terakhir. Skor total 5-25.</p>
    ${S.hist.length > 1 ? `<h3>Riwayat skor</h3>${lineChart(S.hist)}` : ''}
    <h3>Catatan untuk profesional</h3><p class="small">DAR-5 adalah alat skrining satu faktor (frekuensi, intensitas, durasi, agresi, dan gangguan hubungan sosial). Ambang skrining ≥ ${CUT} berdasarkan Forbes et al. (2014). Hasil ini bukan diagnosis dan perlu ditafsirkan bersama wawancara klinis. Terjemahan Indonesia pada aplikasi ini bersifat tidak resmi dan belum divalidasi; teks asli Inggris dicantumkan di atas.</p>
    <div class="row noprint"><button class="pill g" id="repBack">Kembali</button><button class="pill b" id="print">Cetak atau simpan PDF</button></div></div></div>`;
}

/* ---------- Tampilan utama ---------- */
function render() {
  const st = S.step; let h = st === 9 ? '' : navBar();
  if (st === 0) h += `<section class="hero"><div class="in"><h1>Kenali tingkat <span>kemarahanmu</span> dengan DAR-5</h1>
    <p>Skrining singkat 5 pertanyaan berbasis instrumen psikologi Dimensions of Anger Reactions-5, lengkap dengan analitik, pemantauan perkembangan, dan laporan.</p>
    <button class="pill w" id="start">Mulai Asesmen →</button>
    <div class="facts"><span>5 pertanyaan</span><span>Ambang skrining ≥ ${CUT}</span><span>Laporan PDF</span></div></div></section>
    <div class="wrap"><div class="feat">${FEATURES.map((f, i) => `<div class="fc"><span class="num">${i + 1}</span><b>${f[0]}</b><p>${f[1]}</p></div>`).join('')}</div>${S.user ? '<div id="hist">' + progressCard() + '</div>' : ''}</div>`;
  else if (st === 1) h += `<div class="wrap"><div class="card"><h2>Sebelum mulai</h2>
    <p class="sub">Jawab sesuai pengalaman Anda dalam <b>4 minggu terakhir</b>. Tidak ada jawaban benar atau salah.</p>
    <label for="age"><b>Rentang usia</b></label><select id="age"><option value="">Pilih…</option>${AGES.map(a => `<option ${S.age === a ? 'selected' : ''}>${a}</option>`).join('')}</select>
    <div class="alert" style="margin-top:16px">Hasil disimpan di akun ini agar bisa dipantau dan dicetak. Hanya Anda yang dapat melihatnya, dan riwayat bisa dihapus kapan saja.</div>
    <div class="row"><button class="pill g" id="back">Kembali</button><button class="pill b" id="next" ${S.age ? '' : 'disabled'}>Lanjut</button></div></div></div>`;
  else if (st === 2) h += `<div class="wrap"><div class="prog"><i style="width:40%"></i></div><div class="step">Asesmen DAR-5 · 5 pertanyaan</div>
    <div class="card"><h2>Seberapa sering?</h2><p class="sub">Dalam 4 minggu terakhir, seberapa sering pernyataan berikut berlaku pada Anda?</p>
    <div class="legend">1 = Tidak pernah atau hampir tidak pernah · 2 = Sebagian kecil waktu · 3 = Sebagian waktu · 4 = Sebagian besar waktu · 5 = Selalu atau hampir selalu</div>
    ${DAR.map((d, i) => `<div class="q"><p>${i + 1}. ${d.id}</p><div class="opts">${SHORT.map((l, k) => `<label><input type="radio" name="q${i}" value="${k + 1}" ${S.ans[i] === k + 1 ? 'checked' : ''}><span>${k + 1}<small>${l}</small></span></label>`).join('')}</div></div>`).join('')}
    <div class="row"><button class="pill g" id="back">Kembali</button><button class="pill b" id="next" ${DAR.every((_, i) => S.ans[i]) ? '' : 'disabled'}>Lanjut</button></div></div></div>`;
  else if (st === 3) h += `<div class="wrap"><div class="prog"><i style="width:85%"></i></div><div class="step">Pertanyaan terakhir</div>
    <div class="card"><h2>Pertanyaan keselamatan</h2><p class="sub">Dalam 1 bulan terakhir, apakah Anda pernah terpikir untuk menyakiti diri sendiri atau orang lain saat marah? (Tidak termasuk skor DAR-5.)</p>
    <div class="opts" style="grid-template-columns:1fr 1fr"><label><input type="radio" name="sf" value="0" ${S.safety === false ? 'checked' : ''}><span>Tidak</span></label><label><input type="radio" name="sf" value="1" ${S.safety === true ? 'checked' : ''}><span>Ya</span></label></div>
    <div class="row"><button class="pill g" id="back">Kembali</button><button class="pill b" id="next" ${S.safety === null ? 'disabled' : ''}>Lihat Hasil</button></div></div></div>`;
  else if (st === 4) { const r = S.cur, a = toArr(r), risk = r.safety_flag || a[3] >= 4, tips = DAR.filter((_, i) => a[i] >= 3);
    h += `<div class="wrap">${risk ? help(true) : ''}<div class="card"><h2>Analitik Skor Anda</h2>${gauge(r.total)}<p>${interp(r.total)}</p>
    <h3>Profil lima aspek</h3><p class="small">Gambaran deskriptif per butir. DAR-5 dinilai sebagai satu skor total, bukan lima subskala terpisah.</p>${aspects(a)}</div>
    ${tips.length ? `<div class="card"><h2>Tips untuk Anda</h2><p class="sub">Berdasarkan butir dengan skor 3 ke atas.</p>${tips.map(d => `<div class="tip"><b>${d.k}</b>${d.tip}</div>`).join('')}</div>` : ''}
    ${risk ? '' : help(false)}<p class="small" id="saved"></p>
    <div class="row"><button class="pill g" id="home">Ke Beranda</button><button class="pill b" id="seeRep">Lihat Laporan</button></div></div>`; }
  else if (st === 9) h += authView();
  else if (st === 10) h += reportView(S.report);
  $('#app').innerHTML = h + (st === 0 || st === 9 ? '' : foot);
  bind(); bindAuth(); window.scrollTo(0, 0);
}

/* ---------- Data ---------- */
async function loadHist() {
  if (!sb || !S.user) return;
  const { data } = await sb.from('dar5_assessments').select('id,created_at,age_range,answers,total,safety_flag').order('created_at', { ascending: true }).limit(50);
  S.hist = data || [];
  if (S.step === 0) { const el = $('#hist'); if (el) { el.innerHTML = progressCard(); bindHist(); } }
}
async function save(r) {
  S.sent = true;
  const { error } = await sb.rpc('submit_dar5', { p_age_range: S.age, p_answers: r.answers, p_safety: r.safety_flag });
  const el = $('#saved'); if (el) el.textContent = error ? 'Hasil tidak dapat disimpan, tetapi tetap bisa dilihat dan dicetak.' : 'Hasil tersimpan di akun Anda.';
  if (!error) loadHist();
}
function bindHist() {
  document.querySelectorAll('[data-rep]').forEach(b => b.addEventListener('click', () => { S.report = S.hist[+b.dataset.rep]; S.step = 10; render(); }));
  $('#delHist')?.addEventListener('click', async () => {
    if (!confirm('Hapus semua riwayat asesmen Anda? Tindakan ini tidak bisa dibatalkan.')) return;
    await sb.from('dar5_assessments').delete().eq('user_id', S.user.id); S.hist = []; render();
  });
}

function bind() {
  const go = n => () => { S.step += n; render(); };
  $('#start')?.addEventListener('click', () => { S.step = S.user ? 1 : 9; render(); });
  $('#next')?.addEventListener('click', () => {
    if (S.step === 3) { const a = DAR.map((_, i) => S.ans[i]);
      S.cur = { created_at: new Date().toISOString(), age_range: S.age, answers: Object.fromEntries(a.map((v, i) => ['q' + (i + 1), v])), total: total(a), safety_flag: !!S.safety };
      S.sent = false; S.step = 4; render(); if (sb && S.user) save(S.cur); return; }
    go(1)();
  });
  $('#back')?.addEventListener('click', go(-1));
  $('#home')?.addEventListener('click', () => { Object.assign(S, { step: 0, ans: [], safety: null }); render(); loadHist(); });
  $('#seeRep')?.addEventListener('click', () => { S.report = S.cur; S.step = 10; render(); });
  $('#repBack')?.addEventListener('click', () => { S.step = S.report === S.cur && S.cur ? 4 : 0; render(); if (S.step === 0) loadHist(); });
  $('#print')?.addEventListener('click', () => window.print());
  $('#age')?.addEventListener('change', e => { S.age = e.target.value; $('#next').disabled = !S.age; });
  document.querySelectorAll('input[type=radio]').forEach(el => el.addEventListener('change', () => {
    if (el.name === 'sf') S.safety = el.value === '1'; else S.ans[+el.name.slice(1)] = +el.value;
    const nx = $('#next'); if (nx) nx.disabled = S.step === 3 ? S.safety === null : !DAR.every((_, i) => S.ans[i]);
  }));
  bindHist();
}

/* ---------- Autentikasi ---------- */
function authErr(m) {
  m = (m || '').toLowerCase();
  if (m.includes('invalid login')) return 'Email atau kata sandi salah.';
  if (m.includes('already registered')) return 'Email sudah terdaftar. Silakan masuk.';
  if (m.includes('at least')) return 'Kata sandi minimal 6 karakter.';
  if (m.includes('not confirmed')) return 'Email belum dikonfirmasi. Cek kotak masuk Anda.';
  if (m.includes('rate limit')) return 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.';
  return 'Terjadi kesalahan. Coba lagi.';
}
function authView() {
  const reg = S.authMode === 'register';
  return `<div class="authpage"><div class="authleft"><span class="brand w">Redam</span>
    <h1>Pantau tingkat kemarahanmu dari waktu ke waktu</h1><p>Masuk untuk menyimpan hasil DAR-5, melihat grafik perkembangan, dan mencetak laporan.</p></div>
    <div class="card authcard"><div class="tabs"><button class="tab ${reg ? '' : 'on'}" data-m="login">Masuk</button><button class="tab ${reg ? 'on' : ''}" data-m="register">Daftar</button></div>
    <h2>${reg ? 'Buat akun baru' : 'Selamat datang kembali'}</h2>
    <form id="af"><label>Email<input type="email" id="em" required autocomplete="email" value="${esc(S.email)}"></label>
    <label>Kata sandi<input type="password" id="pw" required minlength="6" autocomplete="${reg ? 'new-password' : 'current-password'}"></label>
    ${S.msg ? `<div class="alert ${S.msgOk ? '' : 'red'}">${S.msg}</div>` : ''}
    ${sb ? '' : '<div class="alert red">Supabase belum dikonfigurasi di js/config.js.</div>'}
    <button class="pill b full" id="sub">${reg ? 'Daftar' : 'Masuk'}</button></form>
    <button class="link" id="toLanding">← Kembali ke beranda</button></div></div>`;
}
function bindAuth() {
  document.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => { S.authMode = b.dataset.m; S.msg = ''; render(); }));
  $('#toLanding')?.addEventListener('click', () => { S.step = 0; S.msg = ''; render(); loadHist(); });
  $('#goLogin')?.addEventListener('click', () => { S.step = 9; render(); });
  $('#logout')?.addEventListener('click', async e => { e.preventDefault(); await sb.auth.signOut(); });
  $('#af')?.addEventListener('submit', async e => {
    e.preventDefault(); if (!sb) return;
    const email = $('#em').value.trim(), password = $('#pw').value, reg = S.authMode === 'register';
    S.email = email; $('#sub').disabled = true;
    const { data, error } = reg ? await sb.auth.signUp({ email, password }) : await sb.auth.signInWithPassword({ email, password });
    if (error) { S.msg = authErr(error.message); S.msgOk = false; return render(); }
    if (!data.session) { S.msg = 'Akun dibuat. Cek email Anda untuk konfirmasi, lalu masuk.'; S.msgOk = true; S.authMode = 'login'; return render(); }
    S.msg = ''; S.user = data.session.user; S.step = 1; render();
  });
}

(async () => {
  if (sb) {
    const { data } = await sb.auth.getSession(); S.user = data.session?.user || null;
    sb.auth.onAuthStateChange((ev, sess) => {
      const u = sess?.user || null;
      if ((u && u.id) === (S.user && S.user.id)) return;
      S.user = u; if (!u) Object.assign(S, { step: 0, ans: [], safety: null, hist: [], cur: null, report: null });
      render(); if (u) loadHist();
    });
  }
  render(); loadHist();
})();
