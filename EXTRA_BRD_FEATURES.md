# MobilityGrid — Extra-BRD Feature Tracker

> Features asked for beyond the original BRD/PRD.  
> Last updated: 2026-06-08

---

## Status key
- ✅ DONE — built and live in codebase
- ⚠️ PARTIAL — backend/frontend only half done
- ⏳ PENDING — not yet built, waiting on something

---

## Features

### 1. Driver Private Earnings Tracker
**Status:** ✅ DONE  
**What:** Driver can log their own daily earnings (trips, cash). Owner **cannot** see this — it's private to the driver only.  
**Frontend:** `frontend/src/pages/DriverPWA.js` — line 552, section comment "MY EARNINGS — private to driver, owner cannot see this"  
**Backend:** `POST /api/driver/earnings`, `GET /api/driver/earnings`  
**Notes:** Separate from the owner's rent collection view. Intentionally hidden.

---

### 2. Driver Onboarding Form (Owner adds driver)
**Status:** ✅ DONE  
**What:** Owner onboards a new driver with name, phone number, emergency contact.  
**Frontend:** `frontend/src/pages/owner/OwnerHandoverTab.js` — "Driver" tab, `submitDriver()`  
**Backend:** `POST /api/owner/drivers`  
**Notes:** Part of the 3-tab handover flow (Vehicle → Driver → Assign).

---

### 3. Agreement Upload (Owner uploads for driver)
**Status:** ⚠️ PARTIAL — backend done, frontend UI missing  
**What:** Owner should be able to upload a signed agreement PDF/image for a driver during or after onboarding.  
**Backend:** `POST /api/uploads/agreement` in `backend/src/routes/uploads.js` — stores in `user_documents` with `doc_type='AGREEMENT'`  
**Frontend:** ❌ No UI in `OwnerHandoverTab.js` — the driver form tab doesn't have a file picker for agreement  
**What's needed:** Add a file upload field (optional) to the Driver tab in OwnerHandoverTab, calling `POST /api/uploads/agreement` with `driverId` after driver is created  
**Priority:** P1 — user explicitly mentioned this

---

### 4. Single-Device Login / Session Invalidation
**Status:** ✅ DONE  
**What:** When a driver/owner logs in on a new device, their old session is automatically invalidated. Only one active session at a time.  
**Backend:**  
- `backend/src/routes/auth.js` — on OTP verify, generates `session_token` UUID and saves to DB  
- `backend/src/middleware/auth.middleware.js` — every request checks JWT's `session_token` matches DB; if not (logged in elsewhere), rejects with 401  
**DB columns:** `session_token` on `drivers` and `owners` tables  
**Scope:** Applies to drivers + owners only. Admins and managers are exempt.

---

### 5. Admin Auto-Login (REACT_APP_ADMIN_PHONE)
**Status:** ✅ DONE  
**What:** If `REACT_APP_ADMIN_PHONE` env var is set, the admin login phone field is pre-filled automatically so the admin doesn't have to type it every time.  
**Frontend:** `frontend/src/pages/admin/CompanyDashboard.js` — `const ADMIN_PHONE = process.env.REACT_APP_ADMIN_PHONE || ''`  
**How to use:** Add `REACT_APP_ADMIN_PHONE=9999999999` to `frontend/.env` and to Vercel env vars

---

### 6. Admin Back Buttons + Breadcrumb Drill-Down
**Status:** ✅ DONE  
**What:** In admin dashboard, when drilling down (Company → Owner → Driver → Vehicle), there's a Back button at each level and a breadcrumb trail (e.g., `Companies > TechCorp > John Owner`).  
**Frontend:** `frontend/src/pages/admin/CompanyDashboard.js` — uses a `stack` array (push/pop). Back = pop(), × = closeAll()  
**Breadcrumb:** Built from stack entries, rendered as a path trail in the modal header.

---

### 7. Admin Document Upload + Approve/Reject
**Status:** ✅ DONE  
**What:** Admin can upload documents on behalf of any company/owner/driver, and can approve or reject documents submitted by users.  
**Frontend:** `frontend/src/pages/admin/CompanyDashboard.js` — `DocumentsSection` component (reusable, works for DRIVER/OWNER/COMPANY)  
**Backend:**  
- `GET  /api/admin/user-docs/:userType/:userId` — list all docs  
- `POST /api/admin/user-docs/upload` — admin uploads a doc (multipart)  
- `PATCH /api/admin/user-docs/:docId/status` — approve / reject / mark under review  
**All actions are audit-logged via `logAudit()`.**

---

### 8. SOS Map Embed for Owner
**Status:** ✅ DONE  
**What:** When a driver sends an SOS alert with GPS coordinates, the owner sees a toggleable Google Maps iframe showing exactly where the driver is. Also has "Open in Google Maps ↗" and "Get Directions ↗" links.  
**Frontend:** `frontend/src/pages/owner/OwnerDashboardTab.js` — expandable iframe in the SOS alerts section  
**Map URL:** `https://maps.google.com/maps?q={lat},{lng}&z=15&output=embed` (no API key required)  
**If no GPS:** Shows "⚠ Location not shared" message  

---

### 9. Nearby Stations (Driver Help/SOS screen)
**Status:** ✅ DONE (degrades gracefully without Maps API key)  
**What:** Driver can tap "Locate Me" and then tap tiles (EV Charging, Petrol Pump, Hospital, Repair Shop, Police Station, Grocery) to find nearby services on Google Maps.  
**Frontend:** `frontend/src/pages/HelpSOS.js` — `NEARBY_TILES` array, `locateMe()` function  
**Without API key:** Tiles open `google.com/maps/search/{query}/@{lat},{lng},15z` in browser/app  
**With API key:** "Show map ▼" inline embed via `maps.google.com/maps/embed/v1/search`  
**Env var needed:** `REACT_APP_GOOGLE_MAPS_API_KEY` (Maps JavaScript API + Places API + Maps Embed API)

---

### 10. Enter Key on All OTP/Login Inputs
**Status:** ✅ DONE  
**What:** Every OTP input and phone input triggers the correct action when user presses Enter — no need to tap the button.  
**Frontend:** `frontend/src/pages/Login.js` — `onKeyDown` handlers on all inputs  
**Inputs covered:** driver phone, driver OTP, admin phone, admin OTP, owner/manager OTP  
**Pattern used:** `onKeyDown={e => { if (e.key === 'Enter' && !loading) action(); }}`  
**Admin panel login** (`CompanyDashboard.js`) uses `<form onSubmit>` — Enter works natively there.

---

### 11. Google Maps API Integration (Full Embed)
**Status:** ⏳ PENDING — code ready, waiting for API key  
**What:** Full Google Maps JavaScript API for richer embeds (SOS + nearby stations).  
**What's already in code:** `REACT_APP_GOOGLE_MAPS_API_KEY` is read in `HelpSOS.js`. When present, nearby stations show embedded map panel.  
**What's needed:**  
1. Go to [Google Cloud Console](https://console.cloud.google.com/) → Enable: Maps JavaScript API, Maps Embed API, Places API  
2. Create API key, restrict to your domain  
3. Add to `frontend/.env`: `REACT_APP_GOOGLE_MAPS_API_KEY=AIzaXXXXX`  
4. Add same key to Vercel env vars → redeploy  
**Note:** Free quota is generous for small-scale use. No billing unless >$200/month of usage.

---

## Identified Gaps (needs follow-up)

| # | Feature | Gap | Priority |
|---|---------|-----|----------|
| 3 | Agreement upload | Frontend UI missing in OwnerHandoverTab driver form | P1 |
| 11 | Google Maps | API key pending from Google Cloud | P1 |

---

## Notes
- `backend/.env` must NEVER be committed to git
- `DEV_BYPASS_OTP=true` is for local/demo only — must be `false` in production
- All admin actions are audit-logged via `logAudit()` in `backend/src/utils/audit.js`
- S3 is not wired yet — documents are stored as metadata only (no actual file storage). Papa is handling AWS S3 setup.
