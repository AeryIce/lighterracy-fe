Lighterracy Purchase Panel Personal ISBN v1

Isi patch:
1) /isbn/[code] mengirim ISBN asli dari route ke BookDetailModal sebagai purchaseIsbn.
2) BookDetailModal memakai purchaseIsbn untuk lookup purchase links, bukan ISBN hasil enrich Google Books.
3) PurchaseLinksPanel dipoles:
   - Periplus custom text badge merah, bukan gambar snipping.
   - Tokopedia/Shopee pakai text-brand + warna + icon umum, bukan logo resmi.
   - Layout adaptif untuk 0/1/2/3 link.
   - Empty state jelas kalau link belum tersedia.
   - Copy menjelaskan bahwa Google Books hanya enrich metadata, link beli dari data internal.

Cara apply dari root FE:
  git apply .\lighterracy_purchase_panel_personal_isbn_v1_patch\lighterracy_purchase_panel_personal_isbn_v1.patch

Kalau patch gagal, copy replace-all file dari folder files/ ke path project yang sama.

Setelah apply:
  npm run build
  git add .
  git commit -m "feat(books): polish purchase panel and use route ISBN"
  git push origin dev
