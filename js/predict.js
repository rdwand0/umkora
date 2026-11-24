/**
 * UMKORA — Halaman Prediksi Kesehatan UMKM (sesuai modul "Otomasi Alur Data dan Dashboard Berpusat Pengguna")
 *
 * Alur modul   : formulir (ID UMKM + 6 skor) → Webhook POST /predict → validasi → hitung total → status → simpan prediksi_log → balas
 * Alur di sini : formulir → sb.rpc('predict_umkm')  (fungsi PostgreSQL di Supabase melakukan semua langkah di atas)
 *                masukan salah → HTTP 400 dari PostgREST → ditampilkan sebagai daftar galat.
 * Kebutuhan    : K1 respons segera (waktu respons ditampilkan), K3 slider 1–5 + tooltip, K4 rekomendasi per status,
 *                K5 riwayat prediksi tersimpan (prediksi_log).
 */
const STATUS_META = {
  SANGAT_SEHAT: { name: 'Sangat Sehat',  color: '#10b981' },
  SEHAT:        { name: 'Sehat',         color: '#f59e0b' },
  CUKUP_SEHAT:  { name: 'Cukup Sehat',   color: '#ef4444' },
  KURANG_SEHAT: { name: 'Kurang Sehat',  color: '#b91c1c' },
};
const STATUS_ORDER = ['SANGAT_SEHAT', 'SEHAT', 'CUKUP_SEHAT', 'KURANG_SEHAT'];

// Enam faktor modul (skor 1–5, total 6–30). Pemetaan dari enam pilar UMKORA ada di supabase/02_modul_pipeline.sql.
const FAKTOR = [
  { key: 'sumber_daya',      label: 'Sumber Daya',      hint: 'Ketersediaan modal, peralatan, dan tenaga kerja.' },
  { key: 'kepemimpinan',     label: 'Kepemimpinan',     hint: 'Arahan, keteladanan, dan pengambilan keputusan pemilik.' },
  { key: 'lingkungan_kerja', label: 'Lingkungan Kerja', hint: 'Kenyamanan, keselamatan, dan hubungan antarpegawai.' },
  { key: 'nilai_organisasi', label: 'Nilai Organisasi', hint: 'Budaya dan tujuan yang dianut bersama.' },
  { key: 'stabilitas',       label: 'Stabilitas',       hint: 'Kestabilan operasional dan keuangan dari bulan ke bulan.' },
  { key: 'kinerja',          label: 'Kinerja',          hint: 'Pencapaian target penjualan dan kualitas layanan.' },
];

const PredState = { built: false, ms: [], filter: '' };
const pEsc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pFmtWaktu = d => new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/** Satu-satunya tempat pemanggilan fungsi pipeline di Supabase. */
const PredictAPI = {
  async predict(payload) {
    const t0 = performance.now();
    const { data, error } = await sb.rpc('predict_umkm', { p: payload });
    const ms = Math.round(performance.now() - t0);
    if (error) return { ok: false, ms, errors: String(error.message || 'Galat tidak diketahui').split('; ') };
    return { ok: true, ms, data: data.data };
  },
  /** Dipanggil setelah kuesioner 35 pertanyaan disimpan; skor 6 faktor dihitung server dari data tersimpan. */
  async runSaya() {
    const t0 = performance.now();
    const { data, error } = await sb.rpc('predict_saya');
    const ms = Math.round(performance.now() - t0);
    if (error) {
      const pending = /belum lengkap/i.test(error.message || '');
      return { ok: false, pending, ms, message: error.message };
    }
    return { ok: true, ms, data: data.data };
  },
};

// ── Bangun halaman (sekali) ───────────────────────────────────
function buildPredictPage() {
  if (PredState.built) return;
  const sliders = FAKTOR.map(f => `
    <div class="pred-slider-row">
      <div class="pred-slider-head">
        <span class="pred-slider-name" title="${pEsc(f.hint)}">${f.label}</span>
        <span class="pred-slider-val" id="pv-${f.key}">3</span>
      </div>
      <input type="range" min="1" max="5" step="1" value="3" id="ps-${f.key}" aria-label="${f.label}" aria-describedby="ph-${f.key}"
             oninput="onPredSlider('${f.key}')">
      <div class="pred-slider-scale" id="ph-${f.key}"><span>1 Sangat buruk</span><span>${pEsc(f.hint)}</span><span>5 Sangat baik</span></div>
    </div>`).join('');

  document.getElementById('predictRoot').innerHTML = `
    <div class="pred-grid">
      <div class="pred-card">
        <h3>Input Penilaian UMKM</h3>
        <p class="pred-sub">Isi ID UMKM dan geser enam faktor (1–5). Hasil dihitung di server saat tombol ditekan.</p>
        <div class="pred-field">
          <label for="predId">ID UMKM</label>
          <input type="text" id="predId" list="predIdList" placeholder="UMKM008" maxlength="7" autocomplete="off">
          <datalist id="predIdList"></datalist>
          <div class="pred-note">Format UMKM + 3 angka, contoh UMKM008.</div>
        </div>
        ${sliders}
        <div class="pred-total"><span>Total sementara (6–30)</span><b id="predTotal">18</b></div>
        <div id="predError"></div>
        <button class="btn-primary" id="btnPredict" style="width:100%;justify-content:center" onclick="submitPrediksi()">Hitung Prediksi</button>
      </div>

      <div>
        <div class="pred-card" id="predResultCard">
          <div class="pred-empty">Belum ada prediksi.<br>Isi formulir di kiri lalu tekan <b>Hitung Prediksi</b>.</div>
        </div>
        <div class="pred-pipeline"><b>Alur data</b>Formulir → fungsi <code>predict_umkm</code> di Supabase (validasi → total skor → status → simpan ke <code>prediksi_log</code>) → hasil. Pemantauan 10 menit dan ringkasan harian berjalan otomatis lewat pg_cron.</div>
      </div>
    </div>

    <div class="pred-charts">
      <div class="pred-card"><h3>Sebaran Status Kesehatan</h3><p class="pred-sub">Jumlah survei per kelas status (Q7).</p><div class="pred-chart-box"><canvas id="predSebaran"></canvas></div></div>
      <div class="pred-card"><h3>Rata-rata Tiap Faktor</h3><p class="pred-sub">Semua survei tersimpan (Q8). Faktor terlemah perlu intervensi.</p><div class="pred-chart-box"><canvas id="predRataFaktor"></canvas></div></div>
      <div class="pred-card"><h3>Rata-rata Skor per Sektor</h3><p class="pred-sub">Skor total 6–30 (Q5).</p><div class="pred-chart-box"><canvas id="predSektor"></canvas></div></div>
    </div>

    <div class="pred-card" style="margin-top:20px">
      <div class="pred-toolbar">
        <div><h3>Riwayat Prediksi</h3><p class="pred-sub" style="margin:0">10 prediksi terbaru dari tabel <code>prediksi_log</code>.</p></div>
        <select id="predFilter" aria-label="Filter status" onchange="onPredFilter(this.value)">
          <option value="">Semua status</option>
          ${STATUS_ORDER.map(s => `<option value="${s}">${STATUS_META[s].name}</option>`).join('')}
        </select>
      </div>
      <div class="pred-table-wrap"><table class="pred-table">
        <thead><tr><th>Waktu</th><th>ID UMKM</th><th>Total</th><th>Status</th><th>Sumber</th></tr></thead>
        <tbody id="predHistory"><tr><td colspan="5" class="pred-empty">Memuat…</td></tr></tbody>
      </table></div>
    </div>`;
  PredState.built = true;
  onPredSlider();
}

function currentScores() {
  const o = {};
  FAKTOR.forEach(f => { o[f.key] = Number(document.getElementById('ps-' + f.key).value); });
  return o;
}

function onPredSlider(key) {
  if (key) document.getElementById('pv-' + key).textContent = document.getElementById('ps-' + key).value;
  const s = currentScores();
  document.getElementById('predTotal').textContent = Object.values(s).reduce((a, b) => a + b, 0);
}

// ── Kirim ke pipeline ─────────────────────────────────────────
async function submitPrediksi() {
  const id = document.getElementById('predId').value.trim().toUpperCase();
  const box = document.getElementById('predError');
  box.innerHTML = '';
  const btn = document.getElementById('btnPredict');
  btn.disabled = true; btn.textContent = 'Menghitung…';

  const res = await PredictAPI.predict({ id_umkm: id, ...currentScores() });
  btn.disabled = false; btn.textContent = 'Hitung Prediksi';

  if (!res.ok) {
    box.innerHTML = `<div class="pred-error" role="alert"><b>Masukan belum valid</b><ul>${res.errors.map(e => `<li>${pEsc(e)}</li>`).join('')}</ul></div>`;
    return;
  }
  PredState.ms.push(res.ms); if (PredState.ms.length > 10) PredState.ms.shift();
  renderPredictResult(res.data, res.ms, currentScores());
  showToast('Prediksi tersimpan di riwayat.', 'success');
  loadPredictData();
}

function renderPredictResult(d, ms, scores) {
  const meta = STATUS_META[d.status] || { name: d.status, color: '#6b7280' };
  const avg = Math.round(PredState.ms.reduce((a, b) => a + b, 0) / PredState.ms.length);
  document.getElementById('predResultCard').innerHTML = `
    <div class="pred-result-top">
      <div><div class="pred-score">${d.total_skor}<small> / 30</small></div>
        <div class="pred-label">${pEsc(d.id_umkm)} · ${pEsc(d.label)}</div></div>
      <span class="pred-chip" style="background:${meta.color}">${meta.name}</span>
    </div>
    <div class="pred-reco"><b>Rekomendasi:</b> ${pEsc(d.rekomendasi)}</div>
    <div class="pred-chart-box" style="height:260px"><canvas id="predRadar"></canvas></div>
    <div class="pred-meta">
      <span>Waktu respons: <b>${ms} ms</b> ${ms < 500 ? '(di bawah target 500 ms)' : '(di atas target 500 ms)'}</span>
      <span>Rata-rata ${PredState.ms.length} permintaan: <b>${avg} ms</b></span>
      <span>Log #${d.log_id}</span>
    </div>`;
  destroyChart('predRadar');
  new Chart(document.getElementById('predRadar'), {
    type: 'radar',
    data: { labels: FAKTOR.map(f => f.label),
      datasets: [{ label: 'Skor', data: FAKTOR.map(f => scores[f.key]), backgroundColor: meta.color + '33', borderColor: meta.color,
                   pointBackgroundColor: meta.color, borderWidth: 2.5, pointRadius: 4 }] },
    options: { maintainAspectRatio: false, plugins: { legend: { display: false } },
      scales: { r: { min: 0, max: 5, ticks: { stepSize: 1, backdropColor: 'transparent' }, pointLabels: { font: { size: 11, weight: '700' } } } } },
  });
}

// ── Data dashboard dari PostgreSQL (view Q5/Q7/Q8 + prediksi_log) ─────────────
function onPredFilter(v) { PredState.filter = v; loadHistory(); }

async function loadHistory() {
  const tb = document.getElementById('predHistory');
  if (!tb) return;
  let q = sb.from('prediksi_log').select('*').order('log_id', { ascending: false }).limit(10);
  if (PredState.filter) q = q.eq('status', PredState.filter);
  const { data, error } = await q;
  if (error) { tb.innerHTML = `<tr><td colspan="5" class="pred-empty">Gagal memuat: ${pEsc(error.message)}</td></tr>`; return; }
  if (!data.length) { tb.innerHTML = '<tr><td colspan="5" class="pred-empty">Belum ada riwayat untuk filter ini.</td></tr>'; return; }
  tb.innerHTML = data.map(r => {
    const m = STATUS_META[r.status] || { name: r.status, color: '#6b7280' };
    return `<tr><td>${pFmtWaktu(r.dibuat_pada)}</td><td><b>${pEsc(r.id_umkm)}</b></td><td>${r.total_skor}</td>
      <td><span class="pred-chip" style="background:${m.color};font-size:11px;padding:2px 10px">${m.name}</span></td><td>${pEsc(r.sumber)}</td></tr>`;
  }).join('');
}

async function loadPredictData() {
  loadHistory();
  const [sebaran, faktor, sektor, ids] = await Promise.all([
    sb.from('v_sebaran_status').select('*'),
    sb.from('v_rata_faktor').select('*').maybeSingle(),
    sb.from('v_ringkasan_sektor').select('*').order('rata_skor', { ascending: false }),
    sb.from('umkm').select('id_umkm,nama_umkm').order('id_umkm'),
  ]);

  if (ids.data) document.getElementById('predIdList').innerHTML =
    ids.data.map(u => `<option value="${pEsc(u.id_umkm)}">${pEsc(u.nama_umkm)}</option>`).join('');

  if (sebaran.data) {
    const map = Object.fromEntries(sebaran.data.map(r => [r.status_kesehatan, r.jumlah]));
    destroyChart('predSebaran');
    new Chart(document.getElementById('predSebaran'), {
      type: 'bar',
      data: { labels: STATUS_ORDER.map(s => STATUS_META[s].name),
        datasets: [{ data: STATUS_ORDER.map(s => map[s] || 0), backgroundColor: STATUS_ORDER.map(s => STATUS_META[s].color), borderRadius: 6 }] },
      options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } },
    });
  }
  if (faktor.data && faktor.data.jumlah_survei) {
    destroyChart('predRataFaktor');
    new Chart(document.getElementById('predRataFaktor'), {
      type: 'radar',
      data: { labels: FAKTOR.map(f => f.label),
        datasets: [{ data: FAKTOR.map(f => Number(faktor.data[f.key])), backgroundColor: 'rgba(0,87,184,0.18)', borderColor: '#0057b8', pointBackgroundColor: '#0057b8', borderWidth: 2.5, pointRadius: 4 }] },
      options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { r: { min: 0, max: 5, ticks: { stepSize: 1, backdropColor: 'transparent' }, pointLabels: { font: { size: 11, weight: '700' } } } } },
    });
  }
  if (sektor.data) {
    destroyChart('predSektor');
    new Chart(document.getElementById('predSektor'), {
      type: 'bar',
      data: { labels: sektor.data.map(r => `${r.nama_sektor} (${r.jumlah_survei})`),
        datasets: [{ data: sektor.data.map(r => Number(r.rata_skor)), backgroundColor: '#0057b8', borderRadius: 6 }] },
      options: { indexAxis: 'y', maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { min: 6, max: 30 } } },
    });
  }
}

function initPredictPage() { buildPredictPage(); loadPredictData(); }

// ── Notifikasi nyata dari pg_cron (tabel notifikasi) ──────────
async function renderNotifikasiPipeline() {
  const box = document.getElementById('notif-list-container');
  if (!box) return;
  const { data } = await sb.from('notifikasi').select('*').order('dibuat_pada', { ascending: false }).limit(5);
  if (!data || !data.length) return;
  const cls = { best_practice: 'success', intervensi: 'danger', ringkasan: 'primary' };
  const tipe = { best_practice: 'BEST PRACTICE', intervensi: 'PERLU INTERVENSI', ringkasan: 'RINGKASAN HARIAN' };
  box.insertAdjacentHTML('afterbegin', data.map(n => `
    <div class="notif-item ${cls[n.jenis] || 'primary'}">
      <div class="notif-item-content">
        <div class="notif-item-type">${tipe[n.jenis] || 'PIPELINE'}</div>
        <div class="notif-item-title">${pEsc(n.pesan)}</div>
      </div>
      <div class="notif-item-time">${pFmtWaktu(n.dibuat_pada)}</div>
    </div>`).join(''));
}
