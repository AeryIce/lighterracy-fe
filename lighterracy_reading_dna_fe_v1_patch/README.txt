Lighterracy Reading DNA FE v1 Patch
===================================

Scope:
- Add /me/reading-dna protected UI page.
- Add auth-client helpers for GET/PUT /api/me/reading-dna.
- Update /me quick action and Reading DNA card to open the new page.
- /me card now attempts to read Reading DNA status from BE.

Apply from FE root:
  git apply .\lighterracy_reading_dna_fe_v1_patch\lighterracy_reading_dna_fe_v1.patch

Cloud flow:
  git add .
  git commit -m "feat(reading-dna): add public user Reading DNA UI"
  git push origin dev

QA after Vercel deploy:
1. Login as public user.
2. Open /me/reading-dna.
3. Select reading purpose, genres, language, reading depth.
4. Save.
5. Confirm success message.
6. Return to /me and check Reading DNA card shows reader type.
