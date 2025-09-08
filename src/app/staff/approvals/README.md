# Approvals (split, plug‑and‑play)

Paste this entire folder into your project at `src/approval/`.
It replaces your 2000+ line `page.js` with a tiny wrapper + a fully wired component set.

## Structure
- `page.js` – minimal page that mounts `ApprovalsContainer`
- `ApprovalsContainer.tsx` – original logic/effects/handlers/API calls
- `ui/` – Tabs, Search, Filters, DataTable, FloatingControls
- `modals/` – Revert to L2, Archive Invite, Export
- `rows/` – all table row components

No changes needed elsewhere. All props, classNames, and flows match your original file.
