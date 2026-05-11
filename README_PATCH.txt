Lighterracy FE Patch — Info & Izin Data / Privacy Trust Center

Copy files in this zip into the FE project root, preserving paths.

Files added:
- src/app/(public)/privacy/page.tsx
- src/app/(public)/me/privacy/page.tsx

Files updated:
- src/components/lighterracy/PublicRegisterForm.tsx
- src/components/lighterracy/Footer.tsx

Purpose:
- Add public user-facing explanation page for data usage and consent.
- Add logged-in Data Saya page explaining what data is used and what controls are planned.
- Update registration consent copy with a link to Info & Izin Data.
- Add footer link to Info & Izin Data.

No backend changes.
No migration needed.

Recommended checks:
- npm run lint
- npm run build

Suggested commit:
feat(privacy): add user-facing data consent information
