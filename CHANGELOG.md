# Changelog

All notable changes to the Family Tree application will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-08-04

### Added
- 🔍 **SEO support** — meta description, Open Graph + Twitter Card tags, JSON-LD structured data, canonical URL, `robots.txt` and `sitemap.xml`
- 📄 Per-page titles & descriptions (login, register, reset password, feedback)
- 🌳 **Dynamic share-page SEO** — shared tree links show the tree name + person count in search results and chat previews (WhatsApp/Telegram/Facebook)
- ✏️ **Rename family tree** — each tree card now has a Rename action with a custom modal (pre-filled name, Enter to save, validation); uses the existing `PATCH /trees/:id` endpoint
- 🌐 `rename`, `renameTree`, `renamePlaceholder` i18n keys (EN + AR)

## [1.1.0] - 2026-08-04

### Added
- 🗑️ **Cascade delete** — deleting a person/couple now removes their children & grandchildren (with their spouses), so no orphaned nodes remain. Confirmation shows a couple-specific message.
- 👪 Couple nodes are deleted as a whole (both spouses) in a single batch call.

### Changed
- CI/CD: replaced deprecated `burnett01/rsync-deployments` action with native rsync + `appleboy/ssh-action` (fixes intermittent deploy failures)
- CI/CD: Prisma client regenerated on the server after every deploy

### Fixed
- Deleting a couple node sent `couple-N` as the person ID → "Validation failed (numeric string is expected)". Now resolves to the real person IDs.
- Children of a deleted couple were left as orphaned, unconnected nodes.

## [1.0.0] - 2026-08-04

### Added
- 🌳 Interactive family tree editor with React Flow (add/remove persons, couples, relationships)
- 🔗 Share trees via unique share code link (public view, no login needed)
- 📸 Profile photos with crop before upload (react-easy-crop), 10 MB limit
- 🌐 Full Arabic (RTL) and English support
- 🔑 Authentication: register, login, forgot/reset password (email via SMTP)
- 🖨️ Print/download tree as PNG image
- 🛡️ Custom modals & toasts (no browser popups)
- 👤 Optional full name at registration
- 🎯 Admin dashboard at `/dashboard` (admin-only):
  - Overview stats (users, trees, registrations charts)
  - Users management (paginated list)
  - Admins management (add/edit/delete admins, change passwords)
  - Analytics (page views, daily chart, top pages, unique visitors)
  - Feedback management (priority, done/archive/delete, image lightbox)
- 👁️ View tracking on every page (SPA route-aware, public `POST /track`)
- 💬 Public feedback page with optional image upload → emailed to ahmed@bermawy.tech
- 👤 Profile page: edit name/email, change password, round-crop avatar upload
- 📦 Version `v1.0.0` in footer (injected from package.json at build time)
- 🗄️ Separate staging (`family_tree_db_staging`) and production databases

### Changed
- Smart dynamic tree layout (children centered under parents, no overlap)
- Gender-based labels (Husband/Wife) in couple editing
- File size validation on file select (before crop/save)
- Header shows user avatar + name (instead of email), click → profile
- Image URLs resolve from environment API base (staging vs production)

### Fixed
- Mobile responsiveness for tree editor and admin dashboard
- Reset password flow (email sends link, no on-screen link)
- `sendBeacon` dropped JSON tracking requests (CORS) → switched to `fetch + keepalive`
- Images/avatars pointing at production URL when running on staging
- Uploaded images no longer committed to the repo (`uploads/` gitignored)
