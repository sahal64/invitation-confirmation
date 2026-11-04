# National Day Invitation Confirmation Website

A standalone, responsive web application for the **"invitation confirmation -National day"** event form, featuring a bilingual public RSVP form, production-grade Cloudflare Turnstile bot protection with server-side token verification, and a secure administrative management dashboard.

---

## 🌟 Key Features

1. **Faithful Form Reproduction & Modern Experience:**
   - Exact questions, answer options, and field requirements extracted directly from the original Google Form.
   - Elegant design themed with festive emerald and green accents.
   - Validations for required fields, standard email formatting, single-choice RSVP selection (`YES` or `No`), and multi-line paragraph text.
   - Interactive 5-star rating control for optional rating.
   - Immediate confirmation screen showing the exact message: *"Thanks for submitting your contact info!"* with option to submit another response.
   - Submission duplicate prevention (disables submit button and shows loading spinner during processing).

2. **Production-Grade Cloudflare Turnstile Bot Protection:**
   - **Seamless Non-Interactive Verification:** Uses Cloudflare Turnstile's standard managed widget, which verifies human visitors automatically using browser telemetry without requiring manual text entry or image puzzles.
   - **Strict Server-Side Token Verification:** Client-side checks are never trusted alone. Every token is verified against Cloudflare's `siteverify` API on the server before writing to the database.
   - **Fail-Safe Security:** If the site key, secret key, or Cloudflare verification service is unreachable, the system fails safely by blocking submission and alerting the user rather than saving unverified responses.
   - **Zero Test Keys in Production:** Test keys are strictly blocked in production builds. Production keys must be configured for the live domain.
   - **Secret Key Isolation:** The `TURNSTILE_SECRET_KEY` is kept exclusively server-side in environment variables and is never exposed in client bundles.
   - **Lifecycle Handling:** Bilingual error handling for expired, missing, or failed tokens, with a one-click manual retry option.

3. **Full Bilingual Support (English & Russian):**
   - Single, prominent language switcher in the sticky header available at all times.
   - Complete translations for form labels, placeholders, validation alerts, CAPTCHA statuses, confirmation screens, admin dashboard metrics, search/filter controls, and export files.
   - Respondent's active interface language (`en` or `ru`) is recorded with each submission and visible in the admin table and exports.

4. **Secure Admin Dashboard:**
   - Private admin access accessible via `/#admin` (or `?admin`), protected behind authentication.
   - High-level metric summary: Total Submissions, Attending count, Declined count, Average Star Rating.
   - Search across name, email, and job title in real time.
   - Filter by attendance status (`YES` / `No`) and interface language (`EN` / `RU`).
   - Column sorting by Submission Date, Name, Email, and Rating.
   - Paginated table showing newest submissions first.
   - Individual response detail modal with print / PDF export.

5. **Mobile-Optimized Submissions View:**
   - On screens `< 640px` (phones and small tablets), submissions render in high-density responsive cards with prominent timestamps, status badges, and actions, ensuring the submission date and key attendee details are never cut off.
   - On screens `≥ 640px` (desktops and laptops), submissions display in a dense sortable table with fixed column widths and clean alignment.

6. **Exporting & Printing:**
   - **Excel Export (`.xlsx`):** Generates structured spreadsheets using SheetJS with auto-sized columns.
   - **CSV Export:** Exports with UTF-8 BOM encoding so Microsoft Excel renders Russian Cyrillic characters properly without garbled symbols.
   - **Print / Save to PDF:** Clean, print-friendly confirmation slip for individual responses using `@media print` styles.

---

## 🛡️ Cloudflare Turnstile: Separate Domain & Key Configuration

Cloudflare Turnstile enforces domain restrictions: **a widget key will only validate requests coming from domains registered in your Cloudflare dashboard for that specific widget**.

Because of this, you should maintain separate Turnstile keys for **Production** and **Local Testing/Staging**:

### 1. Production Domain Setup (Live Website)
1. Go to the [Cloudflare Dashboard](https://dash.cloudflare.com/) &rarr; **Turnstile** &rarr; **Add Site**.
2. **Site Name:** e.g. `National Day Event - Production`.
3. **Domain:** Enter your production domain(s) (e.g. `nationalday.events.com`).
4. **Widget Mode:** **Managed** (Recommended: standard smart check, no manual puzzle solving required).
5. Copy the generated keys into your production `.env` (or hosting provider environment settings):
   ```env
   # Frontend Client (Public Site Key)
   VITE_TURNSTILE_SITE_KEY=0x4AAAAAAABBBBBBBBBBBBBB

   # Backend Server ONLY (Private Secret Key - NEVER expose in client bundles)
   TURNSTILE_SECRET_KEY=0x4AAAAAAABBBBBBBBBBBBBBCCCCCCCCCCCCCC
   ```
   > [!IMPORTANT]
   > In production builds, the app strictly validates that a real production key is set. If a test key (`1x000...`) or empty key is detected in production, submissions are blocked safely with a security configuration error.

---

### 2. Localhost & Development Domain Setup
For testing on your local machine (`localhost:5173` or `127.0.0.1`), choose one of the following approaches:

#### Option A: Dedicated Cloudflare Localhost Widget (Recommended)
1. In Cloudflare Dashboard, click **Turnstile** &rarr; **Add Site**.
2. **Site Name:** `National Day - Local Dev`.
3. **Domain:** Enter `localhost` and `127.0.0.1`.
4. Copy the keys into `.env.development` or your local `.env`.

#### Option B: Cloudflare Official Local Testing Keys
During local offline development (`import.meta.env.DEV`), you can use Cloudflare's official testing keys:
- **Always Pass (Local testing):**
  - Site Key: `1x00000000000000000000AA`
  - Secret Key: `1x0000000000000000000000000000000AA`
- **Always Fail (To test error handling):**
  - Site Key: `2x00000000000000000000AB`
  - Secret Key: `2x0000000000000000000000000000000AB`

---

### 3. Fail-Safe Server-Side Verification Pipeline

The verification pipeline implements strict fail-safe behavior:
1. **Frontend Challenge:** The Turnstile widget runs in the browser. The "Submit" button remains disabled until a token is received.
2. **Server-Side Verification:** The token is forwarded to the server (`/api/submit-form` or Supabase Edge Function).
3. **Fail-Safe Rules:**
   - If `TURNSTILE_SECRET_KEY` is missing or is a test key in production, the server returns **HTTP 503** (*Service Not Configured*).
   - If Cloudflare's verification service is down or times out, the server returns **HTTP 503** (*Verification Service Temporarily Unavailable*).
   - If the token is invalid, expired, or generated for the wrong domain, the server returns **HTTP 403** (*Challenge Failed*).
   - **Database Insertion:** The response is written to the database **only after** Cloudflare returns `{"success": true}`.

---

### Server-Side Verification Deployment Options

#### Option 1: Supabase Edge Function (`supabase/functions/submit-form`)
Deploy the included edge function directly to your Supabase project:
```bash
# 1. Set secret key in Supabase
supabase secrets set TURNSTILE_SECRET_KEY=0x4AAAAAA...

# 2. Deploy function
supabase functions deploy submit-form --no-verify-jwt
```
Set in your frontend `.env`:
```env
VITE_SUPABASE_FUNCTIONS_URL=https://<your-project-ref>.functions.supabase.co
```

#### Option 2: Standalone Node.js Server (`server.js`)
For Docker, Render, Railway, or VM hosting:
```bash
npm run build
node server.js
```
The server serves static production assets from `dist/` and handles `POST /api/submit-form`.

---

## 🚀 Quick Start & Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Local Development Server
```bash
npm run dev
```
Open `http://localhost:5173`.  
*(Vite dev server middleware automatically intercepts `/api/submit-form` and verifies Turnstile server-side).*

### 3. Production Build
```bash
npm run build
```

---

## 🔐 Supabase Database & Security Setup

The application uses **PostgreSQL with Row Level Security (RLS)** via Supabase. Submissions on the live production site must always be saved to Supabase to guarantee that organizers receive all attendee data.

### Step 1: Run SQL Migration
In your Supabase project dashboard, navigate to the **SQL Editor**, paste the script from `supabase/schema.sql`, and click **Run**.

### Step 2: Create Admin Account
1. In your Supabase Dashboard, go to **Authentication &rarr; Users**.
2. Click **Add User &rarr; Create User**.
3. Enter your administrative email and password.
4. Check **Auto Confirm User** so you can log in immediately.
