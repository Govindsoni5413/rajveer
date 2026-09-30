# RAJVEER — Customer Ledger Dashboard

**Rajveer** is a mobile-first, production-ready web application built for jeweller and goldsmith business owners to track custom work done for customers and payments received from them. It replaces traditional manual spreadsheets with a secure, multi-device dashboard and private customer portals.

---

## 🌟 Key Features

### For the Business Owner:
- **Comprehensive Ledger Dashboard:** Real-time visibility into Revenue (cash received), Total Billed, Outstanding Pending balances, and Gold Weight totals (billed vs. received).
- **Timeframe Filters:** Instant switching between *This Month*, *Last Month*, *This Year*, *All Time*, and *Custom Date Ranges*.
- **Interactive Monthly Comparisons:** 6-month visual bar chart comparing work billed against cash collected.
- **Customer Management:**
  - Create customers with private usernames and optional phone numbers.
  - Choose between **4-Digit PIN Access** or a **Direct Random Link** (`/c/<token>`).
  - Auto-generate PINs, reset PINs, regenerate direct links, and toggle customer active status.
  - Safe deletion requiring typing the customer's exact name to confirm.
- **Dual Ledger Tracking (Work vs. Payments):**
  - **Work Done (Bills):** Automatic sequential Bill Numbers (`#0001`), item description with autosuggestions, gold weight in grams, and rupee amount.
  - **Payments Received (Receipts):** Cash received, gold weight received, date, and reference note.
  - Supports advance balances (displayed in green).
- **WhatsApp Share:** One-click WhatsApp link formatting (`wa.me`) with balances and personalized login links.
- **Formatted Excel Exports:**
  - Sheet 1: Consolidated summary table with grand totals.
  - Individual sheets for every customer in the classic goldsmith ledger layout.
  - Indian currency formatting (`₹`), gold formatting (`35.17 g`), frozen headers, and styled totals.
- **Luxury PDF Statements:** Clean black and gold branded statements for individual customer accounts.
- **Automated 6-Monthly Backup Reminder:**
  - Sticky warning banner and daily first-login modal when backup is due (every 1, 3, or 6 months).
  - One-click **Download Full Backup (ZIP)** containing `Rajveer_All_Data.xlsx` plus individual `.xlsx` workbooks for each client.
  - Snooze reminder for 7 days if needed.

### For Customers (Read-Only Portal):
- **Private Access:** Customers view **only** their own ledger. Customer sessions are cryptographically enforced on the server.
- **Zero Exposure:** Customers can never view, query, or edit any other customer's records.
- **Complete Timeline:** View full bill-wise details, payment receipts, and chronological transaction history.
- **PDF Download:** Customers can download their own official statement directly.
- **Search & Filters:** Search for specific jewelry items or filter by date.
- **SEO & Robot Protection:** Strict `noindex, nofollow` and `X-Robots-Tag` headers ensure customer data is never indexed by search engines.

---

## 🛠️ Technology Stack

- **Framework:** Next.js (App Router) + TypeScript
- **Styling:** Tailwind CSS + Lucide Icons (light-only luxury gold shop aesthetic: yellow, white, and black)
- **Database:** Supabase Postgres (accessed **strictly server-side** using the service role key)
- **Security:**
  - Row Level Security (RLS) on all tables with all public grants revoked (`anon` and `authenticated` have zero access).
  - Signed HTTP-only, SameSite=Lax, Secure JWT cookies using `jose`.
  - Database-backed rate limiting (5 attempts within 15 minutes triggers a 15-minute lockout).
  - PIN and password hashing with `bcryptjs`.
- **Exports & Backups:**
  - Excel Workbooks: `exceljs`
  - Backup ZIP Archives: `jszip`
  - PDF Statements: `jspdf` + `jspdf-autotable`
  - Data Visualizations: `recharts`
- **Dates & Currency:** `date-fns` in `Asia/Kolkata` timezone with Indian digit grouping (`en-IN`).

---

## 🚀 Getting Started Locally

### 1. Clone & Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Fill in your configuration:
```env
NEXT_PUBLIC_APP_NAME=Rajveer
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
SESSION_SECRET=a-secure-random-string-at-least-32-chars-long
OWNER_USERNAME=gauravsoni
OWNER_PASSWORD=your-secure-password
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 3. Initialize Supabase Database
1. Open your Supabase project dashboard.
2. Go to **SQL Editor**.
3. Open `supabase/schema.sql` in this repo and paste its contents into the SQL Editor.
4. Click **Run**.
   *(This creates all tables, triggers, sequences, indexes, the security-invoker `customer_balances` view, and enables deny-all RLS).*

### 4. Seed the Owner Account
Run the owner seeding script:
```bash
npm run seed:owner
```
*(This hashes your `OWNER_PASSWORD` using bcrypt and registers the owner account in the database).*

### 5. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ☁️ Deploying to Netlify

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/Govindsoni5413/rajveer)

### Steps to Deploy:
1. Click the **Deploy to Netlify** button above or log into [Netlify](https://app.netlify.com).
2. Click **Add new site** > **Import an existing project** > **GitHub**.
3. Choose the repository: **`Govindsoni5413/rajveer`**.
4. In **Site configuration**:
   - Change the site name to **`rajveer`** (will give `https://rajveer.netlify.app`).
   - Build settings are automatically detected via `netlify.toml` (Build command: `npm run build`, Publish directory: `.next`, Plugin: `@netlify/plugin-nextjs`).
5. Under **Environment variables**, add the following:
   - `NEXT_PUBLIC_APP_NAME` = `Rajveer`
   - `SUPABASE_URL` = `https://sealmjuokweiwoecwkfg.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY` = `<your_supabase_service_role_key>`
   - `SESSION_SECRET` = `rajveer-super-secure-production-jwt-session-secret-2026-key`
   - `OWNER_USERNAME` = `revntrix@gmail.com`
   - `OWNER_PASSWORD` = `govind5413N`
   - `NEXT_PUBLIC_SITE_URL` = `https://rajveer.netlify.app`
6. Click **Deploy rajveer**.

---

## 💡 Weekly Manual-Backup Best Practice

While Rajveer includes an automated **6-monthly backup reminder** with an in-app banner and daily login modal, we strongly recommend:
> **Weekly Best Practice:**
> Every Saturday or Sunday evening, navigate to `/export` and click **Download Full Backup Archive (ZIP)**.
> Save the downloaded `Rajveer_Backup_<YYYY-MM-DD>.zip` file to your Google Drive, Dropbox, or an external hard drive. This guarantees you have an offline, audit-proof copy of all your clients' individual Excel sheets and transaction ledgers.
