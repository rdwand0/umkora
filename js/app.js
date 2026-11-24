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
const ICON = {
 home: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
 clip: '<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4h6v3H9zM9 12h6M9 16h4"/>',
 chart: '<path d="M4 20V4M4 20h16M8 16l4-5 3 3 5-7"/>',
 file: '<path d="M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6"/>',
 book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 21V5M9 7h6"/>',
 user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>'
};
const ico = n => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[n]}</svg>`;

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


function lineChart(list) {
  const d = list.slice(-8), W = 640, H = 240, L = 40, R = 16, T = 16, B = 34;
  const x = i => d.length === 1 ? W / 2 : L + i * (W - L - R) / (d.length - 1), y = v => T + (25 - v) / 20 * (H - T - B);
  const pts = d.map((r, i) => `${x(i)},${y(r.total)}`).join(' ');
  return `<div class="chartbox"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Grafik skor DAR-5 dari waktu ke waktu">
    ${[5, 10, 15, 20, 25].map(v => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="#e1e7f5"/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="#5b6784">${v}</text>`).join('')}
    <line x1="${L}" x2="${W - R}" y1="${y(CUT)}" y2="${y(CUT)}" stroke="#b42318" stroke-dasharray="5 4"/><text x="${W - R}" y="${y(CUT) - 5}" text-anchor="end" font-size="11" fill="#b42318">Ambang ${CUT}</text>
    ${d.length > 1 ? `<polyline points="${pts}" fill="none" style="stroke:var(--brand)" stroke-width="2.5"/>` : ''}
    ${d.map((r, i) => `<circle cx="${x(i)}" cy="${y(r.total)}" r="5" style="fill:${over(r.total) ? '#b42318' : 'var(--brand)'}"/><text x="${x(i)}" y="${H - 12}" text-anchor="middle" font-size="11" fill="#5b6784">${fmtS(r.created_at)}</text>`).join('')}
  </svg></div>`;
}

const sb = (typeof supabase !== 'undefined' && typeof SUPABASE_URL !== 'undefined' && !SUPABASE_URL.includes('YOUR-'))
  ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const S = { page: 'landing', step: 1, age: '', ans: [], safety: null, user: null, authMode: 'login', msg: '', msgOk: false, email: '', hist: [], cur: null, report: null, tab: 'sum', sent: false };
const $ = s => document.querySelector(s);
const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = d => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
const fmtS = d => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
const total = a => a.reduce((s, v) => s + v, 0);
const toArr = r => [1, 2, 3, 4, 5].map(i => r.answers['q' + i]);
const over = t => t >= CUT;
const badge = t => `<span class="lvl ${over(t) ? 'l2' : 'l0'}" style="margin:0;padding:2px 10px;font-size:12px">${over(t) ? 'Di atas ambang' : 'Di bawah ambang'}</span>`;
const foot = `<footer class="noprint">Redam adalah alat skrining, bukan diagnosis, dan tidak menggantikan psikolog atau dokter.<br>Instrumen: DAR-5 (Forbes et al., 2014). Terjemahan Indonesia bersifat tidak resmi dan belum divalidasi.</footer>`;

/* ---------- Ilustrasi (SVG buatan sendiri) ---------- */
const art = () => `<svg class="art" viewBox="0 0 520 400" role="img" aria-label="Ilustrasi dasbor Redam dengan grafik skor dan tanaman">
 <circle cx="300" cy="215" r="165" fill="#bfe6e0" opacity=".6"/>
 <g transform="translate(34,150)"><path d="M62 172C22 122 30 52 72 0c20 52 24 122-10 172z" fill="#3f9d91"/><path d="M62 172c40-40 62-92 46-142-34 30-52 92-46 142z" fill="#7cc7b9"/><path d="M62 176C12 152-4 102 10 60c30 26 48 70 52 116z" fill="#2c8277"/>
  <path d="M22 172h80l-8 56a8 8 0 0 1-8 7H38a8 8 0 0 1-8-7z" fill="#fff"/></g>
 <g transform="translate(128,34)"><rect width="344" height="226" rx="14" fill="#1f2a44"/><rect x="10" y="10" width="324" height="206" rx="8" fill="#fff"/>
  <rect x="10" y="10" width="62" height="206" rx="8" fill="#f1f7f6"/><rect x="62" y="10" width="10" height="206" fill="#f1f7f6"/>
  <rect x="16" y="30" width="50" height="18" rx="6" fill="#d3ede8"/><rect x="22" y="36" width="34" height="6" rx="3" fill="#167a72"/>
  ${[60, 82, 104, 126].map(y => `<rect x="22" y="${y}" width="36" height="6" rx="3" fill="#cfd9e6"/>`).join('')}
  <rect x="88" y="24" width="112" height="9" rx="4" fill="#1f2a44"/><rect x="88" y="40" width="70" height="5" rx="2.5" fill="#c9d3e6"/><rect x="268" y="22" width="54" height="16" rx="8" fill="#167a72"/>
  <rect x="84" y="56" width="238" height="98" rx="8" fill="#fbfdfd" stroke="#e1e7f5"/>
  <line x1="94" x2="312" y1="106" y2="106" stroke="#d92d20" stroke-dasharray="4 3"/>
  <polyline points="96,134 130,122 164,128 200,98 236,112 272,86 306,94" fill="none" stroke="#3f68f5" stroke-width="2.6"/>
  ${[[96, 134], [130, 122], [164, 128], [200, 98], [236, 112], [272, 86], [306, 94]].map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="3.6" fill="#3f68f5"/>`).join('')}
  ${[['14', 'Terbaru'], ['17', 'Sebelumnya'], ['↓3', 'Perubahan']].map((c, i) => `<rect x="${84 + i * 82}" y="162" width="74" height="46" rx="8" fill="#fff" stroke="#e1e7f5"/><text x="${94 + i * 82}" y="182" font-size="15" font-weight="700" fill="#14213d" font-family="system-ui,sans-serif">${c[0]}</text><text x="${94 + i * 82}" y="198" font-size="8.5" fill="#5b6784" font-family="system-ui,sans-serif">${c[1]}</text>`).join('')}
  <path d="M-26 226h396l-14 18H-12z" fill="#d7dde8"/><rect x="150" y="226" width="44" height="5" rx="2.5" fill="#bcc5d4"/></g>
 ${[0, 1, 2, 3].map(r => [0, 1, 2, 3, 4].map(c => `<circle cx="${440 + c * 14}" cy="${300 + r * 14}" r="2.4" fill="#7cc7b9"/>`).join('')).join('')}
</svg>`;

/* ---------- Halaman depan (sebelum login) ---------- */
function landing() {
  return `<div class="lnav"><span class="brand">Redam</span><nav><a href="#fitur">Fitur</a><a href="#cara">Cara Kerja</a><a href="#tentang">Tentang DAR-5</a></nav>
    <div><button class="pill g sm" data-auth="login">Masuk</button><button class="pill b sm" data-auth="register">Daftar Gratis</button></div></div>
  <section class="hero2"><div class="hin"><div><span class="tag">Skrining kemarahan berbasis DAR-5</span>
    <h1>Kenali tingkat <span>kemarahanmu</span>, kelola dengan lebih tenang</h1>
    <p>Lima pertanyaan singkat berbasis instrumen psikologi Dimensions of Anger Reactions-5, lengkap dengan analitik skor, pemantauan perkembangan, dan laporan yang bisa dibawa ke psikolog.</p>
    <div class="hbtn"><button class="pill w" data-auth="register">Mulai Sekarang →</button><a class="pill ghost" href="#cara">Lihat Cara Kerja</a></div>
    <div class="facts"><span>5 pertanyaan</span><span>Skor 5-25, ambang ${CUT}</span><span>Laporan PDF</span></div></div>
    <div class="artpanel">${art()}</div></div></section>
  <div class="band"><section id="fitur" class="sec2"><h2>Semua yang Anda butuhkan untuk memahami kemarahan</h2>
    <div class="feat4">${FEATURES.map((f, i) => `<div class="fc"><span class="num">${i + 1}</span><b>${f[0]}</b><p>${f[1]}</p></div>`).join('')}</div></section></div>
  <div class="band altbg"><section id="cara" class="sec2"><h2>Cara kerja</h2><div class="steps3">
    ${[['Daftar akun', 'Buat akun dengan email agar hasil Anda tersimpan dan hanya Anda yang bisa melihatnya.'], ['Isi DAR-5', 'Jawab 5 pernyataan tentang kemarahan Anda dalam 4 minggu terakhir. Sekitar 1 menit.'], ['Lihat hasil dan pantau', 'Dapatkan skor, tips, dan grafik. Ulangi tiap 4 minggu untuk melihat perkembangan.']].map((c, i) => `<div class="fc"><span class="num">${i + 1}</span><b>${c[0]}</b><p>${c[1]}</p></div>`).join('')}</div></section></div>
  <div class="band"><section id="tentang" class="sec2 about"><div><h2 style="text-align:left">Tentang DAR-5</h2>
    <p>DAR-5 (Dimensions of Anger Reactions-5) adalah skala singkat untuk menyaring kemarahan yang bermasalah. Lima butirnya menanyakan frekuensi, intensitas, durasi, agresi, dan gangguan hubungan sosial dalam 4 minggu terakhir.</p>
    <p>Skor total 5-25. Skor ${CUT} atau lebih menandakan kemarahan yang mungkin mengganggu (Forbes et al., 2014). Ini alat skrining, bukan diagnosis.</p></div>
    <div class="card"><h3 style="margin-top:0">Penting diketahui</h3><p class="small">Terjemahan Indonesia di aplikasi ini tidak resmi dan belum divalidasi.</p>
    <p class="small">Jika Anda merasa tidak aman, hubungi Healing119: telepon 119 lalu ekstensi 8, gratis 24 jam.</p></div></section></div>
  <section class="cta"><h2>Mulai pantau kemarahanmu hari ini</h2><button class="pill w" data-auth="register">Daftar Gratis</button></section>${foot}`;
}

/* ---------- Kerangka dasbor (setelah login) ---------- */
const TITLES = { dash: 'Dashboard', test: 'Asesmen DAR-5', history: 'Riwayat dan Perkembangan', report: 'Laporan Asesmen', learn: 'Psikoedukasi', account: 'Akun' };
function shell(body) {
  const sec = (t, p, l, i) => `<div class="sec">${t}</div><a class="item ${S.page === p ? 'on' : ''}" data-nav="${p}">${ico(i)}<span>${l}</span></a>`;
  return `<div class="shell"><aside class="side noprint"><span class="brand">Redam</span>
    ${sec('OVERVIEW', 'dash', 'Dashboard', 'home')}${sec('ASESMEN', 'test', 'Asesmen DAR-5', 'clip')}${sec('PEMANTAUAN', 'history', 'Riwayat dan Perkembangan', 'chart')}${sec('LAPORAN', 'report', 'Laporan Asesmen', 'file')}${sec('BELAJAR', 'learn', 'Psikoedukasi', 'book')}
    <div style="flex:1"></div><a class="item ${S.page === 'account' ? 'on' : ''}" data-nav="account">${ico('user')}<span>Akun</span></a></aside>
    <div class="main"><div class="top noprint"><b>${TITLES[S.page]}</b><div class="who"><span class="av">${esc(S.user.email[0].toUpperCase())}</span><span class="small">${esc(S.user.email)}</span></div></div>
    <div class="content">${body}${foot}</div></div></div>`;
}
const hdr = (t, sub, btn = '') => `<div class="hdr"><div><h1 class="pt">${t}</h1><p class="sub" style="margin:0">${sub}</p></div>${btn}</div>`;
const stat = (l, v, x = '') => `<div class="stat"><span class="small">${l}</span><b>${v}</b>${x}</div>`;

function dashPage() {
  const h = S.hist, last = h[h.length - 1], prev = h[h.length - 2], name = S.user.email.split('@')[0];
  const head = hdr('Halo, ' + esc(name), 'Pantau tingkat kemarahan Anda dari waktu ke waktu.', '<button class="pill b" data-nav="test">Mulai Asesmen</button>');
  if (!last) return head + `<div class="card empty"><h2>Belum ada asesmen</h2><p class="sub">Isi DAR-5 (5 pertanyaan, sekitar 1 menit) untuk melihat skor dan grafik perkembangan Anda.</p><button class="pill b" data-nav="test">Mulai Asesmen</button></div>`;
  const d = prev ? last.total - prev.total : null, next = new Date(+new Date(last.created_at) + 28 * 864e5);
  return head + `<div class="stats">${stat('Skor terbaru', last.total + '<small> / 25</small>', badge(last.total))}${stat('Skor sebelumnya', prev ? prev.total : '-')}
    ${stat('Perubahan', d === null ? '-' : d < 0 ? '↓ ' + -d : d > 0 ? '↑ ' + d : '0', `<span class="small">${d === null ? 'Belum ada pembanding' : d < 0 ? 'Membaik (skor lebih rendah)' : d > 0 ? 'Skor naik' : 'Tidak berubah'}</span>`)}</div>
    <div class="card"><h2>Skor DAR-5 dari waktu ke waktu</h2>${lineChart(h)}<p class="small">Asesmen berikutnya disarankan sekitar ${fmt(next)} (DAR-5 menanyakan 4 minggu terakhir).</p></div>
    <div class="card"><h2>Profil lima aspek (asesmen terbaru)</h2>${aspects(toArr(last))}<div class="row" style="justify-content:flex-end"><button class="pill g" data-rep="${h.length - 1}">Lihat Laporan</button></div></div>`;
}
function historyPage() {
  const h = S.hist;
  if (!h.length) return hdr('Riwayat dan Perkembangan', 'Semua hasil asesmen Anda.') + `<div class="card empty"><p class="sub">Belum ada riwayat.</p><button class="pill b" data-nav="test">Mulai Asesmen</button></div>`;
  return hdr('Riwayat dan Perkembangan', 'Skor lebih rendah berarti lebih baik.') + `<div class="card">${lineChart(h)}</div>
    <div class="card"><div class="tbl">${[...h].reverse().map((r, i) => `<div class="trow"><span>${fmt(r.created_at)}</span><b>${r.total}</b>${badge(r.total)}<button class="link" data-rep="${h.length - 1 - i}" style="margin:0">Laporan</button></div>`).join('')}</div></div>`;
}
function reportPage() {
  const r = S.report || S.hist[S.hist.length - 1];
  if (!r) return hdr('Laporan Asesmen', 'Belum ada hasil.') + `<div class="card empty"><p class="sub">Selesaikan satu asesmen untuk membuat laporan.</p><button class="pill b" data-nav="test">Mulai Asesmen</button></div>`;
  const a = toArr(r), t = S.tab, pn = (k, c) => `<div class="panel ${t === k ? 'on' : ''}">${c}</div>`;
  const list = S.hist.length > 1 ? `<select id="pick" class="noprint" style="max-width:260px;margin-bottom:14px">${[...S.hist].reverse().map(x => `<option value="${S.hist.indexOf(x)}" ${x === r ? 'selected' : ''}>${fmt(x.created_at)} (skor ${x.total})</option>`).join('')}</select>` : '';
  return hdr(`Hasil DAR-5 <span class="okb">Selesai</span>`, `${fmt(r.created_at)}${r.age_range ? ' · usia ' + esc(r.age_range) : ''} · ${esc(S.user.email)}`, '<button class="pill g noprint" id="print">Export Report</button>') + list +
    `<div class="tabs2 noprint">${[['sum', 'Ringkasan'], ['ans', 'Jawaban'], ['his', 'Riwayat']].map(x => `<button class="${t === x[0] ? 'on' : ''}" data-tab="${x[0]}">${x[1]}</button>`).join('')}</div>` +
    pn('sum', `<div class="card">${gauge(r.total)}<p>${interp(r.total)}</p>${r.safety_flag ? '<div class="alert red"><b>Catatan keselamatan:</b> pengguna menjawab "Ya" pada pertanyaan apakah pernah terpikir menyakiti diri sendiri atau orang lain saat marah dalam 1 bulan terakhir. Disarankan tindak lanjut segera.</div>' : ''}<h3>Profil lima aspek</h3>${aspects(a)}</div>
      <div class="card"><h3 style="margin-top:0">Catatan untuk profesional</h3><p class="small">DAR-5 adalah alat skrining satu faktor (frekuensi, intensitas, durasi, agresi, gangguan hubungan sosial). Ambang skrining ≥ ${CUT} berdasarkan Forbes et al. (2014). Hasil bukan diagnosis dan perlu ditafsirkan bersama wawancara klinis. Terjemahan Indonesia bersifat tidak resmi dan belum divalidasi; teks asli Inggris dicantumkan pada tab Jawaban.</p></div>`) +
    pn('ans', `<div class="card"><div class="tbl">${DAR.map((d, i) => `<div class="irow"><span><b>${i + 1}. ${d.k}</b><br>${d.id}<br><i class="small">${esc(d.en)}</i></span><b>${a[i]}</b><span class="small">${LABELS[a[i] - 1]}</span></div>`).join('')}</div>
      <p class="small">Skala: 1 = tidak pernah atau hampir tidak pernah, 2 = sebagian kecil waktu, 3 = sebagian waktu, 4 = sebagian besar waktu, 5 = selalu atau hampir selalu. Periode: 4 minggu terakhir. Skor total 5-25.</p></div>`) +
    pn('his', `<div class="card">${S.hist.length ? lineChart(S.hist) : '<p class="small">Belum ada riwayat tersimpan.</p>'}</div>`);
}
function learnPage() {
  return hdr('Psikoedukasi', 'Memahami DAR-5 dan dasar pengelolaan kemarahan.') + `<div class="card"><h2>Cara membaca skor DAR-5</h2>
    <p>Skor total 5-25. Skor <b>${CUT} atau lebih</b> menandakan kemarahan yang mungkin mengganggu keseharian dan layak dibicarakan dengan psikolog. Skor lebih rendah berarti lebih baik. DAR-5 menanyakan 4 minggu terakhir, jadi hasilnya bisa berubah dari waktu ke waktu.</p></div>
    <div class="card"><h2>Dasar pengelolaan kemarahan</h2>${DAR.map(d => `<div class="tip"><b>${d.k}</b>${d.tip}</div>`).join('')}
    <div class="tip"><b>Perawatan dasar</b>Tidur cukup, aktivitas fisik rutin, dan mengurangi alkohol membantu menjaga emosi lebih stabil.</div></div>
    <div class="card"><h2>Kapan mencari bantuan</h2><p>Jika kemarahan sering merusak hubungan atau pekerjaan, sulit dikendalikan, atau pernah melukai orang lain, temui psikolog atau tenaga kesehatan jiwa (puskesmas, rumah sakit, atau klinik psikologi).</p>${help(false)}</div>`;
}
function accountPage() {
  return hdr('Akun', 'Kelola akun dan data Anda.') + `<div class="card"><p><b>Email:</b> ${esc(S.user.email)}</p><p class="small">${S.hist.length} asesmen tersimpan. Hanya Anda yang dapat melihat dan menghapusnya.</p>
    <div class="row" style="justify-content:flex-start"><button class="pill g" id="delHist">Hapus semua riwayat</button><button class="pill b" id="logout">Keluar</button></div></div>`;
}
function testPage() {
  const st = S.step;
  if (st === 1) return `<div class="card narrow"><h2>Sebelum mulai</h2><p class="sub">Jawab sesuai pengalaman Anda dalam <b>4 minggu terakhir</b>. Tidak ada jawaban benar atau salah.</p>
    <label for="age"><b>Rentang usia</b></label><select id="age"><option value="">Pilih…</option>${AGES.map(a => `<option ${S.age === a ? 'selected' : ''}>${a}</option>`).join('')}</select>
    <div class="alert" style="margin-top:16px">Hasil disimpan di akun ini agar bisa dipantau dan dicetak. Hanya Anda yang dapat melihatnya, dan riwayat bisa dihapus kapan saja.</div>
    <div class="row"><span></span><button class="pill b" id="next" ${S.age ? '' : 'disabled'}>Lanjut</button></div></div>`;
  if (st === 2) return `<div class="prog"><i style="width:40%"></i></div><div class="step">Asesmen DAR-5 · 5 pertanyaan</div><div class="card narrow"><h2>Seberapa sering?</h2>
    <p class="sub">Dalam 4 minggu terakhir, seberapa sering pernyataan berikut berlaku pada Anda?</p>
    <div class="legend">1 = Tidak pernah atau hampir tidak pernah · 2 = Sebagian kecil waktu · 3 = Sebagian waktu · 4 = Sebagian besar waktu · 5 = Selalu atau hampir selalu</div>
    ${DAR.map((d, i) => `<div class="q"><p>${i + 1}. ${d.id}</p><div class="opts">${SHORT.map((l, k) => `<label><input type="radio" name="q${i}" value="${k + 1}" ${S.ans[i] === k + 1 ? 'checked' : ''}><span>${k + 1}<small>${l}</small></span></label>`).join('')}</div></div>`).join('')}
    <div class="row"><button class="pill g" id="back">Kembali</button><button class="pill b" id="next" ${DAR.every((_, i) => S.ans[i]) ? '' : 'disabled'}>Lanjut</button></div></div>`;
  if (st === 3) return `<div class="prog"><i style="width:85%"></i></div><div class="step">Pertanyaan terakhir</div><div class="card narrow"><h2>Pertanyaan keselamatan</h2>
    <p class="sub">Dalam 1 bulan terakhir, apakah Anda pernah terpikir untuk menyakiti diri sendiri atau orang lain saat marah? (Tidak termasuk skor DAR-5.)</p>
    <div class="opts" style="grid-template-columns:1fr 1fr"><label><input type="radio" name="sf" value="0" ${S.safety === false ? 'checked' : ''}><span>Tidak</span></label><label><input type="radio" name="sf" value="1" ${S.safety === true ? 'checked' : ''}><span>Ya</span></label></div>
    <div class="row"><button class="pill g" id="back">Kembali</button><button class="pill b" id="next" ${S.safety === null ? 'disabled' : ''}>Lihat Hasil</button></div></div>`;
  const r = S.cur, a = toArr(r), risk = r.safety_flag || a[3] >= 4, tips = DAR.filter((_, i) => a[i] >= 3);
  return `${risk ? help(true) : ''}<div class="card"><h2>Analitik Skor Anda</h2>${gauge(r.total)}<p>${interp(r.total)}</p><h3>Profil lima aspek</h3>
    <p class="small">Gambaran deskriptif per butir. DAR-5 dinilai sebagai satu skor total, bukan lima subskala terpisah.</p>${aspects(a)}</div>
    ${tips.length ? `<div class="card"><h2>Tips untuk Anda</h2><p class="sub">Berdasarkan butir dengan skor 3 ke atas.</p>${tips.map(d => `<div class="tip"><b>${d.k}</b>${d.tip}</div>`).join('')}</div>` : ''}
    ${risk ? '' : help(false)}<p class="small" id="saved"></p><div class="row"><button class="pill g" data-nav="dash">Ke Dashboard</button><button class="pill b" id="seeRep">Lihat Laporan</button></div>`;
}

/* ---------- Render ---------- */
function render() {
  let h;
  if (!S.user) h = S.page === 'auth' ? authView() : landing();
  else h = shell({ dash: dashPage, test: testPage, history: historyPage, report: reportPage, learn: learnPage, account: accountPage }[S.page]());
  $('#app').innerHTML = h; bind(); window.scrollTo(0, 0);
}
function go(p) {
  if (p === 'test') Object.assign(S, { step: 1, ans: [], safety: null, cur: null });
  if (p === 'report') { S.report = null; S.tab = 'sum'; }
  S.page = p; render(); if (p === 'dash' || p === 'history' || p === 'report') loadHist(true);
}

/* ---------- Data ---------- */
async function loadHist(quiet) {
  if (!sb || !S.user) return;
  const { data } = await sb.from('dar5_assessments').select('id,created_at,age_range,answers,total,safety_flag').order('created_at', { ascending: true }).limit(50);
  const changed = JSON.stringify((data || []).map(x => x.id)) !== JSON.stringify(S.hist.map(x => x.id));
  S.hist = data || [];
  if (changed && ['dash', 'history', 'report', 'account'].includes(S.page)) { const y = window.scrollY; render(); window.scrollTo(0, y); }
}
async function save(r) {
  S.sent = true;
  const { error } = await sb.rpc('submit_dar5', { p_age_range: S.age, p_answers: r.answers, p_safety: r.safety_flag });
  const el = $('#saved'); if (el) el.textContent = error ? 'Hasil tidak dapat disimpan, tetapi tetap bisa dilihat dan dicetak.' : 'Hasil tersimpan di akun Anda.';
  if (!error) loadHist();
}
async function clearHist() {
  if (!confirm('Hapus semua riwayat asesmen Anda? Tindakan ini tidak bisa dibatalkan.')) return;
  await sb.from('dar5_assessments').delete().eq('user_id', S.user.id); S.hist = []; render();
}

function bind() {
  document.querySelectorAll('[data-nav]').forEach(b => b.addEventListener('click', () => go(b.dataset.nav)));
  document.querySelectorAll('[data-auth]').forEach(b => b.addEventListener('click', () => { S.authMode = b.dataset.auth; S.msg = ''; S.page = 'auth'; render(); }));
  document.querySelectorAll('[data-rep]').forEach(b => b.addEventListener('click', () => { S.report = S.hist[+b.dataset.rep]; S.tab = 'sum'; S.page = 'report'; render(); }));
  document.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { S.tab = b.dataset.tab; render(); }));
  $('#pick')?.addEventListener('change', e => { S.report = S.hist[+e.target.value]; render(); });
  $('#next')?.addEventListener('click', () => {
    if (S.step === 3) { const a = DAR.map((_, i) => S.ans[i]);
      S.cur = { created_at: new Date().toISOString(), age_range: S.age, answers: Object.fromEntries(a.map((v, i) => ['q' + (i + 1), v])), total: total(a), safety_flag: !!S.safety };
      S.sent = false; S.step = 4; render(); if (sb && S.user) save(S.cur); return; }
    S.step++; render();
  });
  $('#back')?.addEventListener('click', () => { S.step--; render(); });
  $('#seeRep')?.addEventListener('click', () => { S.report = S.cur; S.tab = 'sum'; S.page = 'report'; render(); });
  $('#print')?.addEventListener('click', () => window.print());
  $('#delHist')?.addEventListener('click', clearHist);
  $('#logout')?.addEventListener('click', async e => { e.preventDefault(); await sb.auth.signOut(); });
  $('#age')?.addEventListener('change', e => { S.age = e.target.value; $('#next').disabled = !S.age; });
  document.querySelectorAll('input[type=radio]').forEach(el => el.addEventListener('change', () => {
    if (el.name === 'sf') S.safety = el.value === '1'; else S.ans[+el.name.slice(1)] = +el.value;
    const nx = $('#next'); if (nx) nx.disabled = S.step === 3 ? S.safety === null : !DAR.every((_, i) => S.ans[i]);
  }));
  bindAuth();
}

/* ---------- Masuk / Daftar ---------- */
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
    <h1>Pantau tingkat kemarahanmu dari waktu ke waktu</h1><p>Masuk untuk menyimpan hasil DAR-5, melihat grafik perkembangan, dan mencetak laporan.</p><div class="artpanel mini">${art()}</div></div>
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
  $('#toLanding')?.addEventListener('click', () => { S.page = 'landing'; S.msg = ''; render(); });
  $('#af')?.addEventListener('submit', async e => {
    e.preventDefault(); if (!sb) return;
    const email = $('#em').value.trim(), password = $('#pw').value, reg = S.authMode === 'register';
    S.email = email; $('#sub').disabled = true;
    const { data, error } = reg ? await sb.auth.signUp({ email, password }) : await sb.auth.signInWithPassword({ email, password });
    if (error) { S.msg = authErr(error.message); S.msgOk = false; return render(); }
    if (!data.session) { S.msg = 'Akun dibuat. Cek email Anda untuk konfirmasi, lalu masuk.'; S.msgOk = true; S.authMode = 'login'; return render(); }
    S.msg = ''; S.user = data.session.user; S.page = 'dash'; render(); loadHist();
  });
}

(async () => {
  if (sb) {
    const { data } = await sb.auth.getSession(); S.user = data.session?.user || null; if (S.user) S.page = 'dash';
    sb.auth.onAuthStateChange((ev, sess) => {
      const u = sess?.user || null;
      if ((u && u.id) === (S.user && S.user.id)) return;
      S.user = u; S.hist = [];
      if (!u) Object.assign(S, { page: 'landing', ans: [], safety: null, cur: null, report: null }); else S.page = 'dash';
      render(); if (u) loadHist();
    });
  }
  render(); loadHist();
})();
