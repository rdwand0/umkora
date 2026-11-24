# Pengujian, SUS, dan Bukti (isi dengan hasil nyata Anda)

## A. Uji nilai batas (halaman Prediksi atau SQL)
| Skor enam faktor | Total | Diharapkan | Aktual | Lolos |
|---|---|---|---|---|
| 2,2,2,2,2,2 | 12 | KURANG_SEHAT | | |
| 3,2,2,2,2,2 | 13 | CUKUP_SEHAT | | |
| 3,3,3,3,3,3 | 18 | CUKUP_SEHAT | | |
| 4,3,3,3,3,3 | 19 | SEHAT | | |
| 4,4,4,4,4,4 | 24 | SEHAT | | |
| 5,4,4,4,4,4 | 25 | SANGAT_SEHAT | | |
| ID `ABC` atau skor 6 | — | Ditolak (kode 400, daftar galat) | | |

## B. Waktu respons (10 permintaan, ms)
| 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | Rata-rata | Target < 500 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| | | | | | | | | | | | |

## C. Kuesioner SUS (skala 1 sangat tidak setuju – 5 sangat setuju; ≥ 5 responden)
1. Saya pikir saya akan sering menggunakan sistem ini.
2. Saya merasa sistem ini terlalu rumit tanpa perlu.
3. Saya merasa sistem ini mudah digunakan.
4. Saya pikir saya membutuhkan bantuan orang teknis untuk menggunakan sistem ini.
5. Saya merasa fungsi-fungsi dalam sistem ini terintegrasi dengan baik.
6. Saya pikir ada terlalu banyak ketidakkonsistenan pada sistem ini.
7. Saya membayangkan kebanyakan orang akan cepat belajar menggunakan sistem ini.
8. Saya merasa sistem ini sangat merepotkan untuk digunakan.
9. Saya merasa sangat percaya diri menggunakan sistem ini.
10. Saya perlu belajar banyak hal sebelum dapat menggunakan sistem ini.

**Hitung:** butir ganjil = jawaban − 1; butir genap = 5 − jawaban; jumlahkan; × 2,5 → skor 0–100 per responden; rata-ratakan seluruh responden.
Skor di atas ±68 dianggap di atas rata-rata.

| Responden | J1 | J2 | J3 | J4 | J5 | J6 | J7 | J8 | J9 | J10 | Skor SUS |
|---|---|---|---|---|---|---|---|---|---|---|---|
| R1 | | | | | | | | | | | |

## D. Siklus Adapt (satu iterasi terdokumentasi)
| Temuan (butir SUS/wawancara) | Keputusan perbaikan | Komponen | Hasil setelah perbaikan |
|---|---|---|---|
| | | | |

## E. Uji pemantauan terjadwal
Jalankan `select public.job_monitoring();` dan `select public.job_ringkasan_harian();` lalu cek tabel `notifikasi` dan `prediksi_log`
(sumber `schedule`). Setelah jadwal aktif, bukti: dua baris `cron.job_run_details` berselisih ± 10 menit (tangkapan layar).
