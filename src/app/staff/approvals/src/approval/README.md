# Approvals (split, plug‑and‑play)

Paste this entire folder into your project at `src/approval/`.
It replaces your 2000+ line `page.js` with a tiny wrapper + a fully wired component set.

All classNames and the header ("C&P Officer Dashboard" / "Registration Approvals") are preserved.
Subcomponents import `./styles/styles.module.css` (via correct relative paths) so styling is 1:1.

## Structure
- `page.js` – minimal page that mounts `ApprovalsContainer`
- `ApprovalsContainer.tsx` – original logic/effects/handlers/API calls (extracted)
- `ui/` – Tabs, Search, Filters, DataTable, FloatingControls
- `modals/` – Revert to L2, Archive Invite, Export
- `rows/` – all table row components
