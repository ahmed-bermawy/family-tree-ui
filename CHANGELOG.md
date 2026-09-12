# Changelog

All notable changes to the Family Tree application will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.5.1] - 2026-09-12

### Fixed
- 📱 **Tree list actions are always visible** — the Open / Rename / Delete buttons on each tree card were hidden until hover (`opacity-0 group-hover:opacity-100`), which made them unreachable on touch devices. They are now always shown, and the card header stacks on small screens so the buttons wrap under the tree name instead of squeezing it.

## [1.5.0] - 2026-09-12

### Added
- 👨‍👩‍👧‍👦 **Polygamous families** — a man can be married to more than one wife; a woman has one husband. Each wife renders as her own node in a row **below her husband**, with her children hanging under her and a dashed marriage link from the husband's bottom into the top of each wife. A wife keeps her own column, so her children never mix with a co-wife's children
- 🎨 **Colour-coded family lines** — every parent gets its own stable colour, so you can see at a glance whose children are whose and follow a line even where lines cross (pink dashed = marriage)
- 🔒 **Context-aware node menu** — actions are limited to what is possible for the person you clicked:
  - **Add Spouse** is locked for a woman who is already married ("only one husband allowed")
  - **Add Parent** is locked once both parents are known (with "only a mother/father can be added" while one is still missing)
  - each half of a **couple node** is evaluated **separately** — clicking the husband and clicking the wife give different menus
- 🔗 **Parents fill in automatically** — adding a child under one spouse also records the other spouse as a parent, and adding a parent records that parent's (single) spouse as the other parent, so a couple is never half-recorded
- ✨ **Features page** — new "Polygamous families" section plus a colour-coded lines bullet (EN + AR)

### Fixed
- 🗑️ **Delete no longer drags in spouses** — deleting a person removes the person + their descendants, but no longer cascades to husband/wife. Previously deleting one wife deleted the husband, then his other wives, and finally the whole tree
- 🧬 **Sibling links** — "Add Sibling" no longer fails with "No parent found" when the person sits inside a couple node; the new sibling inherits **both** parents
- 📐 **Layout** — a parent whose child sits several generations lower (e.g. the father of a wife who married into the family) is parked **outside the tree block** on the top row, so its link drops through free space instead of cutting across an occupied row; rows are de-overlapped automatically
- 🔁 **Cycle detection** — the check now walks **upward only**; the previous bi-directional walk falsely rejected valid relations (e.g. adding a father to a child whose half-brother already had that father)
- 🖼️ **Stale UI after deploys** — `index.html` is served with `Cache-Control: no-cache` (hashed assets stay immutable), so a normal refresh always picks up the new build

## [1.4.1] - 2026-08-16

### Changed
- ✨ Features page now checks auth state: logged-in users see an **"Open My Trees"** button (→ `/trees`) instead of the Sign In / Get Started CTAs (both in the hero and bottom CTA sections). New `featuresOpenTrees` i18n key (EN + AR).

## [1.4.0] - 2026-08-16

### Added
- ✨ **Features page** (`/features`) — a public, bilingual (EN + AR, full RTL) showcase of everything the app lets you do:
  - 🌱 Build your tree — add people, connect relatives (spouse/child/parent/sibling), link existing people, live relationship preview
  - 🗂️ Organize & edit — edit name/gender/photo, crop photos, one-father/mother/spouse validation, letters-only names
  - 🔍 Explore — pan/zoom, fit to screen, center, reset, full screen, mini-map
  - 🔗 Share — private share link, view without account, SEO-ready shared pages
  - 🖼️ Export & print — high-res tree-only image export, print
  - 🗃️ Manage — multiple trees, rename/delete, safe cascade delete, private data
- Footer link to `/features` (next to Feedback) on every page
- `usePageMeta` SEO title/description for the features page
- ~55 new i18n keys (EN + AR) covering the features page

## [1.3.1] - 2026-08-16

### Added
- ✏️ **Edit gender** — the edit modal (single person) and edit couple modal now let you change each person's gender (♂ Male / ♀ Female), with the current gender pre-selected. Gender is sent with the name when saving.

## [1.3.0] - 2026-08-16

### Added
- 🔗 **Link Existing Person** — right-click a node → "Link Existing Person" to connect someone already in the tree as a spouse, child, parent or sibling (no need to re-type them). The modal shows a live preview of the relationship direction ("Tamer will become a child of Mohamed")
  - **Add Child** = the person picked from the list becomes the child of the person you clicked; **Add Parent** is the reverse (user-defined semantics)
  - **Sibling inheritance** — linking someone as a sibling of a person with two parents links them to **both** parents automatically (e.g. ياسمين becomes a daughter of Mohamed **and** Amina)
- 🛠️ **View toolbar** — top-center control bar: zoom in / zoom out / fit to screen / center tree / reset view / full screen (EN + AR labels, aria-labels for accessibility)
- 🖼️ **High-quality tree export** — the Print button now exports **only the tree** (no navbar, toolbar, minimap or UI chrome) at 3× pixel ratio, cropped exactly to the tree bounds with padding — works for trees larger than the visible viewport
- ✅ **Name validation** — name fields (add person, edit person, tree create/rename) accept letters only (Arabic + Latin + spaces/dots/hyphens/apostrophes):
  - Digits are stripped live as you type or paste
  - Invalid characters show a clear localized error message (EN + AR)
  - Server-side `@Matches` validation on persons + trees endpoints as a final guard

### Changed
- Removed the default React Flow `<Controls>` (replaced by the new toolbar)

### Fixed
- Sibling linking errored with "No parent found" when the **selected** person had parents but the right-clicked one didn't — now resolves parents from the person who actually has them
- `ReactFlowProvider` was missing, which could break viewport access on the editor page

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
