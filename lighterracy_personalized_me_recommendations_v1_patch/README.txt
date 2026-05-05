Lighterracy FE Patch — Personalized /me Recommendations v1

Scope:
- FE-only update for /me dashboard.
- Uses Reading DNA favorite_genres from /api/me/reading-dna.
- Changes "Untukmu Hari Ini" carousel from static preview to genre-based starter recommendations.
- Adds reader-type badge and explanatory copy.

Apply from FE root:
  git apply .\lighterracy_personalized_me_recommendations_v1_patch\lighterracy_personalized_me_recommendations_v1.patch

Then:
  git add .
  git commit -m "feat(me): personalize recommendations from Reading DNA"
  git push origin dev

QA after Vercel deploy:
1. Login as public user.
2. Open /me/reading-dna and choose genres like self_help, psychology, faith_spiritual.
3. Save.
4. Open /me.
5. "Untukmu Hari Ini" should show copy based on selected genres and different cards.
6. Change genres, save, return /me, and confirm carousel changes.
