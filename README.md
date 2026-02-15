# 🛡️ CYBERTWIN — Continuous Identity Verification & Cognitive Attack Narrative Reconstruction

<div align="center">

**Behavior-based security that detects who is still there, not just who logged in.**

*Zero-day resilient • Privacy-preserving • Content-agnostic*

</div>

---

## 📋 Table of Contents

- [System Overview](#-system-overview)
- [Core Insight](#-core-insight)
- [Architecture](#-architecture)
- [Features](#-features)
- [Technology Stack](#-technology-stack)
- [Setup Instructions](#-setup-instructions)
- [Running the System](#-running-the-system)
- [ML Training Pipeline](#-ml-training-pipeline)
- [API Documentation](#-api-documentation)
- [Demo Scenarios](#-demo-scenarios)
- [Database Schema](#-database-schema)
- [Privacy & Ethics](#-privacy--ethics)
- [Project Structure](#-project-structure)

---

## 🎯 System Overview

CYBERTWIN is a research-grade behavior-based security system that:

1. **Creates a Behavioral & Cognitive Digital Twin** for each user
2. **Performs continuous identity verification** after login
3. **Detects social-engineering attacks** post-delivery
4. **Generates human-readable attack narratives** (not binary alerts)
5. **Works without inspecting message content** — only behavioral metrics
6. **Is zero-day resilient** — no signatures, no reputation databases
7. **Is privacy-preserving** — GDPR-aligned by design

> **This is not phishing detection. This is human-centric cognitive attack intelligence.**

---

## 🧠 Core Insight

> *"Attackers can steal credentials and craft perfect messages. They cannot easily replicate human micro-behavior under cognitive stress."*

Therefore:
- **Detect WHO is still there**, not just who logged in
- **Detect cognitive deviation**, not malicious content
- **Reconstruct attack narratives**, not binary alerts

---

## 🏗️ Architecture

```
User Interaction
  → Behavior Capture (Custom React Hooks)
  → Telemetry Ingestion Pipeline
  → Cognitive / Behavioral Digital Twin (EMA α=0.1)
  → Deviation Analysis (Weighted Formula)
  → Attack Narrative Engine (5-Stage Reconstruction)
  → Risk Decision (Allow / Warn / Block)
```

### Pipeline Flow

| Component | Purpose | Technology |
|-----------|---------|------------|
| **Behavior Capture** | Silent micro-signal collection | Next.js Custom Hooks |
| **Ingestion Pipeline** | Validation, normalization, storage | Express.js REST API |
| **Cognitive Twin** | Per-user behavioral baseline | EMA with poisoning protection |
| **Risk Engine** | Behavioral deviation scoring | Weighted sigmoid normalization |
| **Narrative Engine** | 5-stage attack reconstruction | Template-based generation |
| **Decision Layer** | Allow / Warn / Block | Threshold-based automation |

---

## ⚡ Features

### Behavioral Signals Captured (ONLY these — never content)
| Signal | What We Capture | Privacy Guarantee |
|--------|----------------|-------------------|
| **Keystroke Dynamics** | Key timing (keydown→keyup delta) | NO key values captured |
| **Mouse Dynamics** | Velocity + acceleration | Position derivatives only |
| **Click Timing** | Inter-click interval variance | Timing only, no targets |
| **Navigation Entropy** | Route transition depth + Shannon entropy | Path patterns, not content |
| **Read Time** | Page dwell time per route | Duration only |
| **Mouse Speed** | Motor pattern velocity | Statistical aggregate only |

### Risk Decision Matrix
| Score Range | Decision | Action |
|-------------|----------|--------|
| **0–30** | ✅ ALLOW | Identity verified, full access |
| **31–60** | ⚠️ WARN | Enhanced monitoring, narrative generated |
| **61–100** | 🛑 BLOCK | Auto-logout, session quarantined, SOC notified |

### Attack Narrative Stages
1. **Engagement** — Initial interaction pattern analysis
2. **Cognitive Stress** — Behavioral indicators of manipulation
3. **Manipulation Success** — Progressive compliance detection
4. **Risky Action** — Unusual/dangerous user actions
5. **Attack Confirmation** — Pattern match confidence assessment

---

## 🔧 Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 14 (React) | Dashboard, Hero page, Behavior capture |
| **Backend** | Node.js + Express | API server, Risk engine, Narrative engine |
| **Database** | Supabase / PostgreSQL | Users, baselines, sessions, risk events |
| **ML Pipeline** | Python + Scikit-Learn | Anomaly detection + Attack classification |
| **Auth** | JWT (JSON Web Tokens) | Cryptographic session anchoring |
| **Styling** | Custom CSS Design System | Cybersecurity-themed dark mode |

---

## 🚀 Setup Instructions

### Prerequisites

Ensure you have the following installed:

- **Node.js** (v18 or later) — [Download](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Python 3.8+** (for ML training) — [Download](https://python.org/)
- **pip** (comes with Python)
- **Git** (optional) — [Download](https://git-scm.com/)

### Step 1: Clone / Navigate to Project Directory

```bash
cd C:\Users\PRASANNA\Downloads\cybertwin
```

### Step 2: Install Backend Dependencies

```bash
cd backend
npm install
```

This installs:
- `express` — Web framework
- `cors` — Cross-origin resource sharing
- `dotenv` — Environment variable management
- `jsonwebtoken` — JWT authentication
- `bcryptjs` — Password hashing
- `helmet` — Security headers
- `express-rate-limit` — Rate limiting
- `@supabase/supabase-js` — Database client
- `uuid` — Unique ID generation

### Step 3: Install Frontend Dependencies

```bash
cd ../frontend
npm install
```

This installs:
- `next` — React framework (v14)
- `react` & `react-dom` — UI library
- `framer-motion` — Animations
- `chart.js` & `react-chartjs-2` — Charts
- `lucide-react` — Icon library

### Step 4: Install Python ML Dependencies

```bash
pip install numpy pandas scikit-learn
```

### Step 5: Train the ML Model

```bash
cd ../backend
python ml/train_model.py
```

This will:
- Generate 6,500 synthetic behavioral biometrics samples
- Train Isolation Forest (anomaly detection, 200 estimators)
- Train Random Forest (attack classification, 200 estimators)
- Export model weights to `ml/models/model_weights.json`
- Export decision rules to `ml/models/decision_rules.json`
- Save dataset to `ml/data/behavioral_biometrics_dataset.csv`

**Expected output:**
```
Training Pipeline Complete
  Isolation Forest: ~94% accuracy
  Random Forest: ~98% accuracy
```

### Step 6: Configure Environment Variables

Backend `.env` is pre-configured for demo mode (in-memory database).

For Supabase integration, update `backend/.env`:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key
```

Frontend `.env.local` is pre-configured:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

---

## ▶️ Running the System

### Start Backend Server

```bash
cd backend
node server.js
```

**Expected output:**
```
╔══════════════════════════════════════════════╗
║           CYBERTWIN BACKEND SERVER           ║
╚══════════════════════════════════════════════╝

  Server:     http://localhost:5000
  Mode:       development
  Database:   in-memory (demo mode)
  ML Models:  loaded
```

### Start Frontend Development Server

Open a **new terminal**:

```bash
cd frontend
npm run dev
```

**Expected output:**
```
  ▲ Next.js 14.x
  - Local:        http://localhost:3000
  - Environments: .env.local
```

### Access the Application

| Page | URL | Description |
|------|-----|-------------|
| **Hero** | [http://localhost:3000](http://localhost:3000) | Landing page with animated overview |
| **Dashboard** | [http://localhost:3000/dashboard](http://localhost:3000/dashboard) | Interactive security command center |
| **Architecture** | [http://localhost:3000/architecture](http://localhost:3000/architecture) | Technical architecture details |
| **About** | [http://localhost:3000/about](http://localhost:3000/about) | Full system documentation |

---

## 🤖 ML Training Pipeline

### Dataset

| Metric | Value |
|--------|-------|
| Total Samples | 6,500 |
| Legitimate Sessions | 5,000 (100 users × 50 sessions) |
| Attack Samples | 1,500 |
| Features | 13 |
| Attack Types | 4 |

### Attack Type Distribution

| Attack Type | Samples | Description |
|-------------|---------|-------------|
| **Social Engineering** | 450 | Cognitive stress from manipulation |
| **Credential Theft** | 400 | Different operator motor patterns |
| **Session Hijack** | 350 | Abrupt behavioral discontinuity |
| **Behavioral Anomaly** | 300 | General multi-dimensional deviation |

### Models

| Model | Type | Purpose | Estimators |
|-------|------|---------|------------|
| **Isolation Forest** | Unsupervised | Anomaly detection | 200 |
| **Random Forest** | Supervised | Attack classification | 200 |

### Feature Importances (Top 5)

1. `typing_deviation` — Motor pattern uniqueness (highest discriminator)
2. `read_deviation` — Content processing anomalies
3. `click_deviation` — Action hesitation patterns
4. `mouse_deviation` — Motor control differences
5. `entropy_deviation` — Navigation pattern randomness

---

## 📡 API Documentation

### Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/demo-token` | POST | Get demo JWT token (no login needed) |
| `/api/auth/register` | POST | Register new user |
| `/api/auth/login` | POST | Login with credentials |
| `/api/auth/me` | GET | Verify current session |

### Behavioral Telemetry

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/session/behavior` | POST | Submit behavioral metrics |
| `/api/session/history` | GET | Get session behavior history |

### Digital Twin

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/twin/baseline` | GET | Get current behavioral baseline |
| `/api/twin/reset` | POST | Reset baseline to defaults |

### Risk Events

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/risk/events` | GET | Get risk event history |
| `/api/risk/events/:id` | GET | Get specific risk event |
| `/api/risk/stats` | GET | Get risk statistics |
| `/api/risk/trend` | GET | Get risk score trend |

### Demo Simulation

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/demo/simulate-normal` | POST | Simulate normal user (risk: 5-15) |
| `/api/demo/simulate-attacker` | POST | Simulate attacker (risk: 75-95) |
| `/api/demo/simulate-social-engineering` | POST | Simulate social engineering (risk: 65-85) |
| `/api/demo/reset` | POST | Reset demo state |

---

## 🎥 Demo Scenarios

### Scenario 1: Normal User ✅
- **Action:** Click "Normal User" button
- **Expected:** Risk score 5-15, green gauge, "IDENTITY VERIFIED"
- **Twin:** Baseline updated (low deviation accepted)

### Scenario 2: Stolen Credentials 🚨
- **Action:** Click "Simulate Attacker" button
- **Expected:** Risk score 75-95, red gauge, "ATTACK BLOCKED" overlay
- **Twin:** Update rejected (poisoning protection active)
- **Narrative:** Full attack narrative generated

### Scenario 3: Social Engineering ⚡
- **Action:** Click "Social Engineering" button
- **Expected:** Progressive risk escalation through 4 stages
- **Narrative:** 5-stage attack narrative reconstruction
- **Final:** Risk score 65-85, session quarantined

---

## 🗄️ Database Schema

### `users`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| email | VARCHAR(255) | Unique email |
| password_hash | VARCHAR(255) | Bcrypt hash |
| created_at | TIMESTAMPTZ | Account creation |

### `behavior_baseline`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | FK → users |
| avg_typing_speed | DECIMAL | Baseline typing cadence (ms) |
| avg_click_interval | DECIMAL | Baseline click timing (ms) |
| avg_mouse_speed | DECIMAL | Baseline mouse velocity (px/ms) |
| avg_read_time | DECIMAL | Baseline content dwell time (ms) |
| avg_navigation_entropy | DECIMAL | Baseline route entropy |
| login_time_pattern | JSONB | Time-of-day distribution |
| session_count | INTEGER | Sessions contributing to baseline |
| updated_at | TIMESTAMPTZ | Last baseline update |

### `session_behavior`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | FK → users |
| typing_speed | DECIMAL | Session typing cadence |
| click_interval | DECIMAL | Session click timing |
| mouse_speed | DECIMAL | Session mouse velocity |
| navigation_depth | INTEGER | Session route depth |
| read_time | DECIMAL | Session dwell time |
| navigation_entropy | DECIMAL | Session route entropy |
| timestamp | TIMESTAMPTZ | Data capture time |

### `risk_events`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| session_id | VARCHAR | Session identifier |
| risk_score | INTEGER | Computed risk (0-100) |
| decision | VARCHAR | allow / warn / block |
| narrative_reason | TEXT | Human-readable narrative |
| narrative_stages | JSONB | 5-stage attack reconstruction |
| deviations | JSONB | Per-metric deviation values |
| created_at | TIMESTAMPTZ | Event timestamp |

---

## 🔐 Privacy & Ethics

| Principle | Implementation |
|-----------|---------------|
| **No message content** | System never accesses or stores content |
| **No keystroke logging** | Only keydown→keyup timing deltas |
| **No personal data** | Only statistical interaction metrics |
| **Aggregated only** | Raw streams discarded after aggregation |
| **GDPR-aligned** | Privacy-preserving by architecture |
| **Per-user isolation** | No cross-user analysis |
| **Right to erasure** | Complete profile deletion supported |

**"We never see what the user types — only how they behave."**

---

## 📁 Project Structure

```
cybertwin/
├── backend/
│   ├── server.js                    # Express server entry point
│   ├── package.json                 # Backend dependencies
│   ├── .env                         # Environment configuration
│   ├── config/
│   │   └── supabase.js              # Database client (Supabase + in-memory fallback)
│   ├── middleware/
│   │   └── auth.js                  # JWT authentication middleware
│   ├── routes/
│   │   ├── auth.js                  # Authentication endpoints
│   │   ├── session.js               # Behavioral telemetry ingestion
│   │   ├── risk.js                  # Risk event management
│   │   ├── twin.js                  # Digital twin baseline management
│   │   └── demo.js                  # Demo simulation endpoints
│   ├── engines/
│   │   ├── twin.js                  # Cognitive Digital Twin Engine (EMA)
│   │   ├── risk.js                  # Risk Scoring Engine (sigmoid)
│   │   └── narrative.js             # Attack Narrative Engine (5-stage)
│   └── ml/
│       ├── train_model.py           # ML training pipeline
│       ├── data/
│       │   ├── behavioral_biometrics_dataset.csv
│       │   └── dataset_statistics.json
│       └── models/
│           ├── model_weights.json    # Exported model weights
│           └── decision_rules.json   # Lightweight inference rules
├── frontend/
│   ├── package.json                 # Frontend dependencies
│   ├── next.config.js               # Next.js configuration
│   ├── .env.local                   # Frontend environment variables
│   └── app/
│       ├── layout.js                # Root layout with navigation
│       ├── globals.css              # Global design system
│       ├── page.js                  # Hero landing page
│       ├── dashboard/
│       │   └── page.js              # Interactive security dashboard
│       ├── architecture/
│       │   └── page.js              # System architecture details
│       └── about/
│           └── page.js              # Comprehensive system documentation
└── README.md                        # This file
```

---

## 🏆 Key Technical Differentiators

1. **Post-login protection** — Most systems stop verifying after initial authentication
2. **Content-agnostic** — Works without reading messages, emails, or any content
3. **Human-centric** — Targets the cognitive attack surface, not technical signatures
4. **Narrative output** — Provides actionable explanations, not just yes/no alerts
5. **Zero-day resilient** — No dependency on known attack patterns
6. **Privacy-first** — Architecturally incapable of capturing personal content
7. **ML-enhanced** — Real trained models with 98%+ classification accuracy
8. **Poisoning-resistant** — Digital twin rejects high-deviation updates

---

## 📝 Judge-Ready Statements

- *"Behavioral identity is always tied to a cryptographically verified session."*
- *"We never see what the user types — only how they behave."*
- *"Every session becomes a behavioral time series."*
- *"The system learns slowly, attackers act suddenly."*
- *"No signatures. No reputation. Pure behavioral truth."*
- *"SOC teams don't want alerts — they want explanations."*

---

<div align="center">

**Built for CODE CRACK CHASE - CYBERSECURITY HACKATHON SRMIST 11/02/2026**

*Cognitive Attack Surface Intelligence • Continuous Identity Verification*

</div>
