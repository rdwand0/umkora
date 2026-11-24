# UCD ISO 9241-210 — Dashboard Kesehatan UMKM (UMKORA)

## 1. Context of use
| Aspek | Isi |
|---|---|
| Pengguna | Pemilik UMKM, pegawai UMKM, pendamping/analis UMKM |
| Tugas | Mengisi penilaian, melihat status kesehatan organisasi, menindaklanjuti rekomendasi |
| Lingkungan | Peramban di laptop/ponsel, koneksi internet seluler, waktu terbatas di sela operasional usaha |

## 2. Persona (≥2)
| Persona | Tujuan | Hambatan |
|---|---|---|
| **Bu Sari**, pemilik warung (Owner) | Tahu kondisi usahanya tanpa istilah teknis | Waktu sedikit, formulir panjang membingungkan |
| **Dimas**, pendamping UMKM (Analis) | Membandingkan banyak UMKM dan memilih yang perlu intervensi | Data tersebar di Excel, hitung manual berhari-hari |

## 3. User journey manual dan pain point
Petugas mengumpulkan data → analis menginput ke Excel → hitung rata-rata/standar deviasi → grafik manual → laporan.

| Pain point | Dampak |
|---|---|
| P1 Proses manual berhari-hari | Keputusan terlambat |
| P2 Risiko salah hitung | Status UMKM keliru |
| P3 Tidak ada visualisasi interaktif | Sulit membandingkan UMKM |
| P4 Tidak ada prediksi/rekomendasi | Pendamping tidak tahu langkah lanjut |

## 4. Matriks keterlacakan (kebutuhan → rancangan → komponen → uji)
| ID | Kebutuhan | Keputusan rancangan | Komponen pipeline | Wujud di website | Metrik uji |
|---|---|---|---|---|---|
| K1 | Hasil muncul segera setelah form dikirim | RPC `predict_umkm` (setara Webhook /predict) | Ingestion + pemrosesan | Menu Prediksi: tombol Hitung Prediksi | Respons < 500 ms (ditampilkan di hasil) |
| K2 | Ringkasan semua UMKM tanpa Excel | View SQL + pg_cron harian | Penyimpanan + penyajian | Tiga grafik di menu Prediksi | Ringkasan tampil < 1 detik |
| K3 | Form mudah dipahami | Slider 1–5 + tooltip faktor | Penyajian | Slider di menu Prediksi | Skor SUS ≥ 80 (target modul) |
| K4 | Pendamping butuh rekomendasi | Rekomendasi per kelas status | Pemrosesan | Kotak Rekomendasi pada hasil | Kelas status benar 100% pada uji batas |
| K5 | Hasil dapat ditelusuri | Setiap prediksi ke `prediksi_log`; log cron | Penyimpanan + pemantauan | Tabel Riwayat Prediksi, Pusat Notifikasi | 100% prediksi tercatat |

## 5. Pemetaan tahap UCD → komponen pipeline
| Tahap | Komponen | Keputusan pada UMKORA |
|---|---|---|
| Plan | Sumber data dan tujuan | Data survei UMKM + form baru; tujuan prediksi kesehatan otomatis |
| Research | Ingestion | Form butuh respons segera → RPC real-time; ringkasan periodik → pg_cron |
| Design | Pemrosesan + penyimpanan | Validasi → total → status → simpan `prediksi_log` → balas |
| Adapt | Pemrosesan + penyajian | Slider, tooltip, filter status tunggal; perbaikan berdasar temuan uji |
| Measure | Pemantauan | Waktu respons, skor SUS, log eksekusi cron |

> Angka target (500 ms, SUS 80) berasal dari modul sebagai contoh. Tetapkan ulang bersama pengguna pada tahap Plan,
> dan isi hasil ukur nyata di `02_pengujian_dan_SUS.md`. Persona dan pain point di atas adalah **usulan awal**; ganti dengan hasil wawancara Anda.
