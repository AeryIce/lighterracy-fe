Lighterracy Purchase CTA Full v1

ISI:
1) BE patch: Periplus fallback auto-generate
   - GET /api/books/{isbn}/purchase-links selalu menambahkan channel periplus jika belum ada row DB.
   - /go/books/{isbn}/periplus tetap mencatat click event, lalu redirect ke https://www.periplus.com/p/{isbn}.

2) FE patch: PurchaseLinksPanel di BookDetailModal
   - Menampilkan tombol Beli di Periplus / Tokopedia / Shopee dari endpoint BE.
   - Click tetap lewat redirect_url BE + visitor_token.

URUTAN APPLY YANG DISARANKAN:

A. Dari root BE:
  git apply .\lighterracy_purchase_cta_full_v1_patch\be\lighterracy_periplus_fallback_be_v1.patch
  php -l app/Http/Controllers/Public/BookPurchaseLinkController.php
  git add .
  git commit -m "feat(purchase-links): add Periplus fallback redirect"
  git push origin dev

B. Setelah Railway redeploy BE dev, test:
  Invoke-RestMethod "https://lighterracy-be-development.up.railway.app/api/books/9781398860568/purchase-links"

C. Dari root FE:
  git apply .\lighterracy_purchase_cta_full_v1_patch\fe\lighterracy_purchase_cta_fe_v1.patch
  git add .
  git commit -m "feat(books): show marketplace purchase CTAs"
  git push origin dev

D. Setelah Vercel redeploy FE dev:
  Buka halaman /isbn/9781398860568 atau detail buku lain.
