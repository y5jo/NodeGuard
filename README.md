# NodeGuard: Digital Forensic Incident Management System

NodeGuard provides a structured reporting interface for citizens to lodge cyber incident reports with supporting evidence files, while giving forensic investigators an authenticated console to examine evidence, verify file integrity on disk via cryptographic checksums, and inspect Fixed chain-of-custody audit logs.

## System Capabilities

* **Citizen Intake & Tracking:** Public reporting form capturing incident category, platform, suspect identifiers, narrative, and evidence file attachments. Issues an incident tracking code (`CASE-YYYY-XXXXX`) for status inquiry.
* **Cryptographic Verification:** Ingested evidence files are hashed using streaming SHA-256 and MD5 in constant $O(1)$ memory. Analysts can execute on-demand re-hashing against disk contents to detect tampering.
* **Fixed/Unchangeable Custody Ledger:** Chain-of-custody events (ingestion, viewing, hash verification, timeline notes, status transitions) commit to an append-only log safeguarded by database-level mutation-rejection hooks.
* **Staff Console:** Role-based access control (`ADMIN` and `INVESTIGATOR`), case queue filtering, timeline notes, dossier review, and court-admissible custody exports.

## Architecture & Tech Stack

* **Frontend:** React 18, Vite, Tailwind CSS, Lucide Icons, Axios, React Router
* **Backend:** Node.js, Express.js (REST API)
* **Database:** MongoDB via Mongoose ODM
* **Core Utilities & Security:** Native Node `crypto` streaming, Multer storage, Bcrypt.js, JSON Web Tokens, Helmet, Express Rate Limit

## Project Structure

```text
nodeguard/
├── backend/
│   ├── samples/             # Git-tracked sample files used by seed.js
│   ├── src/
│   │   ├── config/          # MongoDB connection
│   │   ├── controllers/     # Auth, Incident, and Evidence controllers
│   │   ├── middleware/      # JWT auth, role validation, Multer upload
│   │   ├── models/          # User, Incident, EvidenceFile, ChainOfCustodyLog
│   │   ├── routes/          # Express API route declarations
│   │   ├── services/        # Forensic crypto hashing stream service
│   │   └── utils/           # Incident helpers and tracking ID generator
│   ├── uploads/             # Runtime evidence vault (git-ignored)
│   ├── seed.js              # Developer seed script - demo cases & sample files
│   └── server.js            # Express server entry point
├── frontend/
│   ├── src/
│   │   ├── api/             # Axios client instance with interceptors
│   │   ├── Components/      # UI components (navbar, elements, design, calendar)
│   │   ├── context/         # AuthContext state provider
│   │   ├── pages/           # Portals: Admin/, Analyst/, Client/, and Log-in.jsx
│   │   ├── App.jsx          # Route configurations
│   │   └── main.jsx         # React application bootstrap
│   └── index.html
└── README.md
```

## Installation & Getting Started

### Prerequisites

* **Node.js**: v18.x or higher
* **npm**: v9.x or higher
* **MongoDB**: Community Edition v6.0+ (Windows: `winget install MongoDB.Server` or MSI installer), Docker, or MongoDB Atlas
* **Git**

---

### Step 1: Clone the Repository

```bash
git clonehttps://github.com/y5jo/NodeGuard.git
cd NodeGuard
```

---

### Step 2: Install & Start MongoDB

Ensure MongoDB is installed and active before launching the project:

**Windows (Auto-install via winget):**
```powershell
# 1. Install MongoDB Server (run once in PowerShell / CMD):
winget install MongoDB.Server

# 2. Start the service (if not already running):
net start MongoDB
# (Or run standalone daemon manually: mongod)
```

**Linux (systemd):**
```bash
sudo systemctl start mongod
```
---

### Step 3: Install & Seed

From the **project root**, install all dependencies and fill the database:

```bash
# 1. Install dependencies (concurrently)
npm install

# 2. Install backend and frontend dependencies
npm run install:all

# 3. Configure backend environment variables
# Windows CMD:
copy backend\.env.example backend\.env
# Linux / macOS / PowerShell:
cp backend/.env.example backend/.env

# 4. Seed database with demo accounts and sample cases
npm run seed
```

> `npm run seed` wipes and re-creates the database with two pre-built sample cases
> (including evidence files copied from `backend/samples/`) every time it is run.

---

### Step 4: Run the Project

```bash
npm run dev
```


> **Windows PowerShell Tip:** If script execution is restricted (`npm.ps1 cannot be loaded`), either run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` or invoke commands using `npm.cmd` (e.g., `npm.cmd run dev`).

---

### Root-Level Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts backend `:5000` + frontend `:5173` simultaneously |
| `npm run seed` | Wipes and re-seeds the DB with demo accounts and sample cases |
| `npm run install:all` | Installs dependencies for both `backend/` and `frontend/` |

---

## Application Access & Test Credentials

| Portal / Resource | URL | Description |
| :--- | :--- | :--- |
| **Public Portal** | [http://localhost:5173](http://localhost:5173) | Citizen home (redirects to `/client`) |
| **Report Incident** | [http://localhost:5173/client/report](http://localhost:5173/client/report) | Public incident reporting form & evidence upload |
| **Track Incident** | [http://localhost:5173/client/track](http://localhost:5173/client/track) | Track status using case ID (e.g. `CASE-2026-00001`) |
| **Staff Login** | [http://localhost:5173/login](http://localhost:5173/login) | Authenticated console for analysts & admins |
| **Analyst Portal** | [http://localhost:5173/analyst](http://localhost:5173/analyst) | Case triage, evidence hashing & timeline notes |
| **Admin Portal** | [http://localhost:5173/admin](http://localhost:5173/admin) | User provisioning, audit ledger & system settings |
| **Backend API** | [http://localhost:5000](http://localhost:5000) | Express REST API |

### Default Staff Accounts

* **Administrator:**
  * Email: `admin@nodeguard.local`
  * Password: `Admin123!`
  * Permissions: System administration, all investigator capabilities, user management
* **Investigator:**
  * Email: `analyst@nodeguard.local`
  * Password: `Analyst123!`
  * Permissions: Case management, file integrity verification, timeline log entries

### Sample Cases (seeded by `npm run seed`)

| Tracking ID | Title | Evidence File |
| :--- | :--- | :--- |
| `CASE-2026-00001` | Targeted Spear Phishing Campaign | `phishing_sample_payload.eml` |
| `CASE-2026-00002` | GCash Online Payment Scam | `gcash_payment_receipt.jpeg` - GCash receipt showing ₱100.00 transfer |

Evidence files can be **downloaded** or **integrity-verified** (SHA-256 re-hash) from the case dossier page in the staff console.
