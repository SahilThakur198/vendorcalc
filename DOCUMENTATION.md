# VendorCalc — Complete Documentation

> **Version 1.0.0** · Last updated 27 Feb 2026  
> Premium vendor billing & invoice management — Web + Android

---

## Table of Contents

1. [Overview](#overview)
2. [Key Features](#key-features)
3. [Technology Stack](#technology-stack)
4. [Architecture & Data Flow](#architecture--data-flow)
5. [Project Structure](#project-structure)
6. [Module Reference](#module-reference)
7. [Data Models](#data-models)
8. [How to Use](#how-to-use)
9. [Developer Setup](#developer-setup)
10. [Android Build & Deploy](#android-build--deploy)
11. [Firebase Cloud Sync](#firebase-cloud-sync)
12. [Security Audit Report](#security-audit-report)
13. [Bug Report & Known Issues](#bug-report--known-issues)
14. [License](#license)

---

## Overview

**VendorCalc** is a high-performance, mobile-first billing application built for street vendors, small shop owners, and freelance sellers. It lets you manage a product catalogue, generate professional digital invoices with a single tap, and optionally back up every bill to Firebase Cloud via Google Sign-In.

The app runs as a **Progressive Web App (PWA)** inside any modern browser and can be packaged as a native **Android APK** through Capacitor.

---

## Key Features

| Feature | Description |
|---|---|
| **Product Management** | Add, edit, and delete products with names, prices, and categories from the Settings page. |
| **Dynamic Calculator** | Real-time grand total calculation as you adjust per-product quantities with tap or hold-to-repeat buttons. |
| **Invoice Generation** | Creates beautifully formatted digital invoices with auto-incrementing invoice numbers (e.g. `INV-001`). |
| **Customer Name Field** | Optionally attach a customer name to each invoice for record-keeping. |
| **Discount Support** | Data model supports percentage-based discounts with pre-calculated discount amounts. |
| **PDF Share** | Generates a PDF from the invoice card via `html2canvas` + `jsPDF` and shares through the native Share Sheet (WhatsApp, Telegram, etc.). Falls back to direct download on desktop. |
| **Invoice History** | Searchable, sortable list of all saved invoices with swipe-to-delete on mobile. |
| **Sales Summary** | Dashboard view with period filters (Today / This Week / This Month) showing total revenue, invoice count, and item-wise revenue breakdown with visual progress bars. |
| **Cloud Backup** | Google Sign-In via Firebase Auth. All products and invoices are synced bidirectionally to Firestore. |
| **Data Export / Import** | One-click JSON backup export and file-based restore for full data portability. |
| **Dark Mode** | System-aware dark mode toggle persisted to `localStorage`. |
| **Haptic Feedback** | Subtle vibration feedback on mobile for increment/decrement and save actions. |
| **Offline-First** | All data stored locally in IndexedDB via Dexie. Cloud sync is optional and additive. |
| **Mobile Ready** | Built with Capacitor for seamless Android deployment as a native APK. |
| **Premium UI** | Modern glassmorphic design, spring animations (Motion/Framer), Inter + JetBrains Mono typography. |

---

## Technology Stack

| Layer | Technology | Version |
|---|---|---|
| **Runtime** | React (TypeScript) | 19.0 |
| **Build Tool** | Vite | 6.2 |
| **Styling** | Tailwind CSS (v4 Vite plugin) + Vanilla CSS | 4.1 |
| **Typography** | Inter, JetBrains Mono (Google Fonts) | — |
| **Animations** | Motion (formerly Framer Motion) | 12.x |
| **Icons** | Lucide React | 0.546 |
| **Local Database** | Dexie (IndexedDB wrapper) | 4.3 |
| **Reactive Queries** | dexie-react-hooks (`useLiveQuery`) | 4.2 |
| **Cloud Database** | Firebase Firestore | 12.9 |
| **Authentication** | Firebase Auth (Google provider) | 12.9 |
| **PDF Generation** | jsPDF + html2canvas | 4.2 / 1.4 |
| **Notifications** | react-hot-toast | 2.6 |
| **Mobile Layer** | Capacitor (Android) | 8.1 |

---

## Architecture & Data Flow

```
┌────────────────────────────────────────────────────────────────┐
│                        index.html                               │
│  └─ main.tsx → <StrictMode> → <App />                          │
│       └─ <AppProvider>   ← React Context (global state)        │
│            └─ <InnerApp> ← View router (state-based)           │
│                 ├─ CalculatorView  ── onShowBill ──→ BillView  │
│                 ├─ SettingsView                                 │
│                 ├─ HistoryView ─── onViewBill ──→ BillView     │
│                 ├─ SummaryView                                  │
│                 └─ DeveloperView                                │
└────────────────────────────────────────────────────────────────┘

Data Flow:
  User Action → AppContext method → Dexie (IndexedDB)
                                  → Firebase Firestore (if signed in)
                                  ← useLiveQuery re-renders UI
```

### State Management

- **AppContext** (`src/context/AppContext.tsx`) is the single source of truth.
- Local data is stored in **Dexie** (IndexedDB), providing instant reads via `useLiveQuery`.
- When a user is signed in via Google, every write (add/update/delete product, save/delete bill) is **mirrored** to Firestore in the background.
- On sign-in, the app performs a **bidirectional merge**: cloud-only items are pulled into Dexie, and local-only items are pushed to Firestore.

### View Routing

Navigation is handled by a simple `useState<View>` in `InnerApp`. The `View` union type defines all 6 screens:

```typescript
type View = 'calculator' | 'settings' | 'history' | 'bill' | 'developer' | 'summary';
```

Transitions are animated via `<AnimatePresence mode="wait">` from the Motion library.

---

## Project Structure

```
vendorcalc/
├── android/                   # Capacitor Android platform
├── dist/                      # Production build output
├── public/
│   └── app_logo.png           # App icon / PWA icon
├── src/
│   ├── main.tsx               # React entry point
│   ├── App.tsx                # Root component, view router, header nav
│   ├── index.css              # Tailwind v4 config, fonts, utilities
│   ├── types.ts               # Shared TypeScript interfaces
│   ├── context/
│   │   └── AppContext.tsx     # Global state provider (products, history, auth, settings)
│   ├── lib/
│   │   ├── db.ts              # Dexie database schema, migration, invoice numbering
│   │   └── firebase.ts        # Firebase app/auth/firestore initialisation
│   └── components/
│       ├── CalculatorView.tsx  # Main calculator with product rows & grand total
│       ├── ProductRow.tsx      # Single product row with qty controls & hold-to-repeat
│       ├── BillView.tsx        # Invoice preview with PDF share & save actions
│       ├── SettingsView.tsx    # Vendor name, Google sign-in, product CRUD
│       ├── HistoryView.tsx     # Searchable/sortable invoice history with swipe-delete
│       ├── SummaryView.tsx     # Sales analytics dashboard (Today/Week/Month)
│       └── DeveloperView.tsx   # Developer profile / about page
├── index.html                 # HTML shell with PWA meta tags
├── capacitor.config.ts        # Capacitor config (appId, webDir)
├── firebase.json              # Firebase project config (Firestore, Auth)
├── firestore.rules            # Firestore Security Rules
├── firestore.indexes.json     # Composite indexes
├── vite.config.ts             # Vite build config with Tailwind plugin
├── tsconfig.json              # TypeScript config
├── package.json               # Dependencies & scripts
└── DOCUMENTATION.md           # ← You are here
```

---

## Module Reference

### `src/main.tsx`
Entry point. Renders `<App />` inside `<StrictMode>` and imports global CSS.

### `src/App.tsx`
- Wraps everything in `<AppProvider>` for global state.
- `InnerApp` manages the current `View` state and renders the appropriate component.
- Contains the sticky header with navigation icons (Calculator, Developer, History, Summary, Settings) and a dark mode toggle.
- Handles the bill lifecycle: preview → save → view from history.

### `src/context/AppContext.tsx`
The brain of the app. Provides via React Context:
- **Products CRUD**: `addProduct`, `updateProduct`, `deleteProduct`
- **Bill lifecycle**: `saveBill` (auto-assigns invoice number), `deleteHistoryItem`
- **Settings**: `saveVendorName`, `toggleDarkMode`
- **Auth**: `signInWithGoogle`, `signOutUser`
- **Data portability**: `exportJSON`, `importJSON`
- **Firebase sync helpers**: push/pull/merge with Firestore on every mutation and on sign-in.

### `src/lib/db.ts`
- Defines the **Dexie** database schema with 3 tables: `products`, `history`, `settings`.
- `migrateFromLocalStorage()`: One-time migration from legacy `localStorage` format to Dexie.
- `getNextInvoiceNo()`: Atomic auto-increment counter stored in the `settings` table.

### `src/lib/firebase.ts`
- Initialises Firebase App, Firestore, and Auth from a hardcoded config object.
- Exports `isFirebaseConfigured` flag so the rest of the app degrades gracefully when unconfigured.

### `src/components/CalculatorView.tsx`
- Renders the product list with `<ProductRow>` for each product.
- Customer name input field.
- Computes `grandTotal` via `useMemo`.
- Fixed bottom bar with grand total, reset button, and "Show Bill" button.
- Redirects to Settings if vendor name is not set.

### `src/components/ProductRow.tsx`
- Individual product row with name, price, quantity controls, and row total.
- **Hold-to-repeat**: pointer-down starts a 400ms timeout, then repeats every 80ms.
- Haptic feedback via `navigator.vibrate()`.

### `src/components/BillView.tsx`
- Renders the full invoice card (header with invoice number, from/to, date; item table; total).
- **Share PDF**: Uses `html2canvas` to screenshot the card → `jsPDF` to create a PDF → `navigator.share()` with the file. Falls back to direct download.
- Save button (calls `AppContext.saveBill`).
- Receipt printer-style spring animation on mount.

### `src/components/SettingsView.tsx`
- Vendor/business name with save.
- Google Sign-In section (shows signed-in user with sync status, or sign-in button).
- Product CRUD: add new product (name + price), edit inline, delete.

### `src/components/HistoryView.tsx`
- Search bar (filters by vendor, customer, or invoice number).
- Sort toggle cycling through: Newest, Oldest, Highest Amount, Lowest Amount.
- Swipe-to-reveal delete button on mobile (touch-based).
- Always-visible share and delete icons on the right side.
- Clicking a history card opens it in `BillView`.

### `src/components/SummaryView.tsx`
- Period filter tabs: Today, This Week, This Month.
- Revenue and invoice count cards.
- Item-wise breakdown table sorted by revenue, with visual progress bars showing relative contribution.

### `src/components/DeveloperView.tsx`
- Developer profile card with image, name, title, and link to portfolio.

---

## Data Models

### `Product`
```typescript
interface Product {
    id?: number;       // auto-assigned by Dexie
    name: string;
    price: number;
    category: string;  // default: "General"
}
```

### `BillItem`
```typescript
interface BillItem {
    name: string;
    price: number;
    quantity: number;
    total: number;     // price × quantity
}
```

### `HistoryItem` (Invoice)
```typescript
interface HistoryItem {
    id?: number;            // auto-assigned by Dexie
    invoice_no: string;     // e.g. "INV-001"
    vendor_name: string;
    customer_name: string;
    items: BillItem[];
    grand_total: number;
    discount: number;       // percentage (0–100)
    discount_amount: number;// calculated ₹ amount
    final_total: number;    // grand_total − discount_amount
    created_at: string;     // ISO 8601
}
```

### `AppSettings`
```typescript
interface AppSettings {
    key: string;   // e.g. "vendorName", "invoiceCounter"
    value: string;
}
```

### Dexie Schema (IndexedDB)
```
products:  ++id, name, category
history:   ++id, invoice_no, vendor_name, customer_name, created_at
settings:  key
```

---

## How to Use

### 1. Set Up Your Business
Navigate to **Settings** (gear icon). Enter your **business/vendor name** and tap **Save**. This name appears on every invoice.

### 2. Add Products
In Settings → **Manage Products**, enter a product name and price, then tap **Add Product**. You can edit or delete products anytime.

### 3. Generate an Invoice
On the **Calculator** page (home):
1. Enter the **Customer Name** (optional).
2. Adjust the **Quantity** for each product using the up/down buttons (tap or hold to repeat).
3. The **Grand Total** updates in real-time at the bottom.
4. Tap **Show Bill** to preview the invoice.

### 4. Save & Share
In the **Bill View**:
- Tap the green **Share PDF** button to generate a PDF and share via WhatsApp, Telegram, or any app. On desktop, the PDF downloads directly.
- Tap **Save** to store the invoice in your local history with an auto-generated invoice number.

### 5. View History
Tap the **History** icon (clock) to see all saved invoices. You can:
- **Search** by customer, vendor, or invoice number.
- **Sort** by date or amount.
- **Swipe left** on mobile to reveal the delete button.
- **Tap** any invoice to re-view it in full.

### 6. Sales Summary
Tap the **Summary** icon (bar chart) to see revenue analytics for Today, This Week, or This Month. The item-level breakdown shows which products earn the most.

### 7. Cloud Backup (Optional)
In Settings → **Account**, tap **Sign in with Google**. Once signed in, all products and invoices are automatically synced to Firebase Firestore. Your data is safe even if you uninstall the app.

### 8. Data Export / Import
Use the JSON export/import feature (available in AppContext methods) for full data portability.

---

## Developer Setup

### Prerequisites
- **Node.js** ≥ 18
- **npm** ≥ 9
- **Git**

### Install & Run

```bash
# Clone the repository
git clone https://github.com/SahilThakur198/vendorcalc.git
cd vendorcalc

# Install dependencies
npm install

# Start development server (http://localhost:5173)
npm run dev

# Type-check without emitting
npm run lint

# Production build
npm run build

# Preview production build
npm run preview
```

### Environment Variables
The `vite.config.ts` supports loading a `GEMINI_API_KEY` from `.env` (used for AI Studio integrations). Create a `.env` file if needed:

```env
GEMINI_API_KEY=your_key_here
```

---

## Android Build & Deploy

VendorCalc uses **Capacitor 8.1** for native Android packaging.

```bash
# 1. Build the web app
npm run build

# 2. Sync web assets to the Android project
npx cap sync

# 3. Open in Android Studio
npx cap open android
```

**Capacitor Config** (`capacitor.config.ts`):
- **App ID**: `com.sahil.vendorcalc`
- **App Name**: `VendorCalc`
- **Web Dir**: `dist`

From Android Studio, you can run on a connected device/emulator or generate a signed APK/AAB for Google Play Store distribution.

---

## Firebase Cloud Sync

### Setup
The Firebase project `vendorcalc-54e45` is pre-configured. The config is in `src/lib/firebase.ts`.

### Firestore Data Structure
```
users/
  └── {uid}/
       ├── products/
       │    └── {productId}  → Product document
       └── history/
            └── {historyId}  → HistoryItem document
```

### Sync Behaviour
1. **On Sign-In**: All local data is pushed to Firestore, then cloud-only data is pulled into Dexie (merge, not overwrite).
2. **On Every Mutation**: When signed in, every add/update/delete is mirrored to Firestore in the background (fire-and-forget with `.catch(console.error)`).
3. **On Auth State Change**: If a session is restored on app load, data is synced from Firestore automatically.

### Firestore Security Rules
Currently using **time-based open rules** (expires 29 Mar 2026). In production, these should be replaced with user-scoped rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## Security Audit Report

### 🛡️ 1. Security

| Severity | Issue | Location | Recommendation |
|---|---|---|---|
| ⚠️ HIGH | **Hardcoded Firebase API key** | `src/lib/firebase.ts:9-15` | Move to `.env` file and load via `import.meta.env.VITE_*`. Firebase API keys are not _secret_ (they're public client identifiers), but hardcoding them makes key rotation difficult and clutters version control. |
| ⚠️ HIGH | **Open Firestore rules** | `firestore.rules:15` | The current rule `allow read, write: if request.time < timestamp.date(2026, 3, 29)` lets **anyone** read/write the entire database until the expiry date. Replace with user-scoped rules immediately. |
| 🟡 MEDIUM | **Support email exposed** | `firebase.json:13` | `sahiluselessfellow@gmail.com` is visible in the repository. Consider using a dedicated no-reply or support email. |
| ℹ️ LOW | **`err: any` type in BillView** | `BillView.tsx:44` | Use `unknown` instead of `any` for catch clause types — provides better type safety. |

### 🧠 2. Logic & Syntax

| Severity | Issue | Location | Recommendation |
|---|---|---|---|
| 🟡 MEDIUM | **Stale closure in hold-to-repeat** | `ProductRow.tsx:18-25` | `startHold` captures `quantity` at creation time. During a long-hold, the interval callback always uses the initial quantity value, so after the first repeat tick, all subsequent increments compute from the same base. Use a `useRef` to track the latest quantity. |
| 🟡 MEDIUM | **Race condition in `getNextInvoiceNo`** | `db.ts:78-83` | If two bills are saved concurrently (unlikely but possible), both could read the same counter value. Wrap in a Dexie transaction for atomicity. |
| ℹ️ LOW | **Non-null assertions on `product.id!`** | `CalculatorView.tsx:27,33,36,37`, `SettingsView.tsx` | Dexie auto-assigns `id` on insert, but the type says `id?: number`. Consider making a `SavedProduct` type where `id` is required. |
| ℹ️ LOW | **Unused `batch` variable** | `AppContext.tsx:86-87` | `writeBatch` is imported and created but never used. Remove it. |

### 🎨 3. Visual & UI/UX

| Severity | Issue | Location | Recommendation |
|---|---|---|---|
| 🟡 MEDIUM | **No delete confirmation** | `HistoryView.tsx:56-60`, `SettingsView.tsx:41` | Deleting products or invoices happens instantly with no "Are you sure?" prompt. Accidental deletes cannot be undone. Add a confirmation dialog or undo toast. |
| ℹ️ LOW | **Missing ARIA labels on nav buttons** | `App.tsx:76-117` | Navigation icon buttons use `title` attributes but lack `aria-label`. Screen readers may not announce them properly. |
| ℹ️ LOW | **`vendor_calc.db` in root** | Root directory | A stale SQLite file remains in the project root. Should be deleted and `.gitignore`'d. |

### ⚡ 4. Performance

| Severity | Issue | Location | Recommendation |
|---|---|---|---|
| ℹ️ LOW | **Dynamic imports for jsPDF/html2canvas** | `BillView.tsx:25-26` | Already using lazy imports — good. Consider preloading these on `BillView` mount to reduce share button latency. |
| ℹ️ LOW | **`ActionButtons` always-visible + swipe-reveal both present** | `HistoryView.tsx:178-198` | The share/delete buttons are visible AND there's a swipe-to-reveal delete. On mobile, both are active simultaneously, which could confuse users. Consider showing only one interaction pattern per viewport. |

### 🛑 5. Regression Risk

All identified issues are safe to fix without breaking existing functionality:
- Moving Firebase config to `.env` is a config-only change.
- Fixing the stale closure in `ProductRow` improves correctness without UI changes.
- Adding delete confirmation is additive.
- Firestore rules changes are server-side only.

---

## Bug Report & Known Issues

| # | Bug | Status | Notes |
|---|---|---|---|
| 1 | Hold-to-repeat quantity buttons use stale value after first tick | 🟡 Open | See Security Audit §2 |
| 2 | No confirmation before deleting products or invoices | 🟡 Open | UX improvement needed |
| 3 | `vendor_calc.db` leftover file in root | 🟡 Open | Should be removed |
| 4 | Firestore rules expire on 29 Mar 2026 | ⚠️ Urgent | Will break cloud sync after expiry |
| 5 | Discount UI not yet implemented in CalculatorView | ℹ️ Planned | Data model supports it; UI pending |

---

## License

Proprietary. Developed by **Sahil Thakur**.

---

*Generated from a full-depth codebase audit on 27 Feb 2026.*
