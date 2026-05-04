Lighterracy FE Patch - /me Dashboard v2
======================================

Scope:
- Upgrade halaman /me dari placeholder menjadi ruang bacaan personal yang lebih hidup.
- Tambah quick actions.
- Tambah carousel buku "Untukmu Hari Ini" sebagai preview personalisasi genre.
- Tambah section promo aktif dari /public/data/promos.json.
- Tambah section 3 toko terdekat, dengan tombol izin lokasi manual.
- Percantik tombol logout menjadi button proper.

Apply dari root FE:

  git apply .\lighterracy_me_dashboard_v2_patch\lighterracy_me_dashboard_v2.patch

Atau kalau file .patch sudah dicopy ke root FE:

  git apply .\lighterracy_me_dashboard_v2.patch

Flow cloud:

  git add .
  git commit -m "feat(me): enrich public reading space dashboard"
  git push origin dev

QA setelah Vercel redeploy:
1. Login sebagai user public.
2. Buka /me.
3. Pastikan hero, quick actions, carousel buku, promo aktif, toko terdekat, Reading DNA/Rak Saya/Data Privasi tampil.
4. Klik Izinkan lokasi di section toko; browser minta izin lokasi dan toko diurutkan 3 terdekat.
5. Klik Keluar dulu; token hilang dan diarahkan ke /register.
6. Staff flow /staff tidak terganggu.

Catatan:
- Ini FE-only patch.
- Carousel masih preview/kurasi awal, belum berdasarkan Reading DNA real.
- Promo dan toko masih memakai JSON publik yang sudah ada di FE.
- Lokasi hanya dipakai di browser untuk sorting jarak, belum dikirim ke backend.
