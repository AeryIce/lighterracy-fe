Lighterracy purchase detail UI/UX v2

Copy replace-all 3 file ini dari folder files ke project FE:

1) files/src/app/isbn/[code]/page.tsx
   -> src/app/isbn/[code]/page.tsx

2) files/src/components/lighterracy/BookDetailModal.tsx
   -> src/components/lighterracy/BookDetailModal.tsx

3) files/src/components/lighterracy/PurchaseLinksPanel.tsx
   -> src/components/lighterracy/PurchaseLinksPanel.tsx

PowerShell dari root FE:

Copy-Item -LiteralPath ".\lighterracy_purchase_detail_ui_v2_patch\files\src\app\isbn\[code]\page.tsx" `
  -Destination ".\src\app\isbn\[code]\page.tsx" -Force

Copy-Item -LiteralPath ".\lighterracy_purchase_detail_ui_v2_patch\files\src\components\lighterracy\BookDetailModal.tsx" `
  -Destination ".\src\components\lighterracy\BookDetailModal.tsx" -Force

Copy-Item -LiteralPath ".\lighterracy_purchase_detail_ui_v2_patch\files\src\components\lighterracy\PurchaseLinksPanel.tsx" `
  -Destination ".\src\components\lighterracy\PurchaseLinksPanel.tsx" -Force

Lalu hapus folder patch dari root FE sebelum npm run build supaya TypeScript tidak ikut mengecek file patch:

Remove-Item .\lighterracy_purchase_detail_ui_v2_patch -Recurse -Force -ErrorAction SilentlyContinue

Test:
npm run build

git add src/app/isbn/[code]/page.tsx src/components/lighterracy/BookDetailModal.tsx src/components/lighterracy/PurchaseLinksPanel.tsx
git commit -m "ux(books): prioritize book detail before purchase CTAs"
git push origin dev
