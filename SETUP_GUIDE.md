# CYBERTWIN — Step-by-Step Local Setup Guide

This guide walks you through every step to get the CYBERTWIN system running locally on your machine.

---

## Prerequisites

Before starting, ensure these are installed:

### Required Software

1. **Node.js v18+**
   - Download: https://nodejs.org/
   - Verify: `node --version`

2. **npm** (comes with Node.js)
   - Verify: `npm --version`

3. **Python 3.8+**
   - Download: https://python.org/
   - Verify: `python --version`

4. **pip** (comes with Python)
   - Verify: `pip --version`

---

## Step-by-Step Setup

### STEP 1: Open Terminal / PowerShell

Open a terminal or PowerShell window on your system.

### STEP 2: Navigate to Project Directory

```powershell
cd C:\Users\PRASANNA\Downloads\cybertwin
```

### STEP 3: Install Backend Dependencies

```powershell
cd backend
npm install
```

**What this installs:**
- express (web server framework)
- cors (cross-origin requests)
- dotenv (environment variables)
- jsonwebtoken (JWT auth)
- bcryptjs (password hashing)
- helmet (security headers)
- express-rate-limit (rate limiting)
- @supabase/supabase-js (database client)
- uuid (unique ID generation)

**Expected time:** ~30 seconds
**Expected output:** "added 107 packages" (approximately)

### STEP 4: Install Frontend Dependencies

```powershell
cd ..\frontend
npm install
```

**What this installs:**
- next v14 (React framework)
- react & react-dom (UI rendering)
- framer-motion (animations)
- chart.js (charts)
- lucide-react (icons)

**Expected time:** ~60 seconds

### STEP 5: Install Python ML Dependencies

```powershell
pip install numpy pandas scikit-learn
```

**Expected time:** ~2 minutes (first install)

### STEP 6: Train the ML Model

```powershell
cd ..\backend
python ml\train_model.py
```

**This will:**
1. Generate 6,500 synthetic behavioral biometrics samples
2. Train Isolation Forest for anomaly detection
3. Train Random Forest for attack classification
4. Export model weights and decision rules

**Expected output:**
```
TRAINING PIPELINE COMPLETE
  Isolation Forest: Accuracy ~0.94
  Random Forest: Accuracy ~0.98
```

**Expected time:** ~30 seconds

### STEP 7: Start the Backend Server

```powershell
cd backend
node server.js
```

**Expected output:**
```
╔══════════════════════════════════════════════╗
║           CYBERTWIN BACKEND SERVER           ║
╚══════════════════════════════════════════════╝

Server: http://localhost:5000
Mode: development
Database: in-memory (demo mode)
```

**Keep this terminal open!**

### STEP 8: Start the Frontend (NEW TERMINAL)

Open a **second terminal** (Ctrl+Shift+T or new PowerShell window):

```powershell
cd C:\Users\PRASANNA\Downloads\cybertwin\frontend
npm run dev
```

**Expected output:**
```
▲ Next.js 14.x
  - Local: http://localhost:3000
✓ Starting...
```

**Keep this terminal open too!**

### STEP 9: Open the Application

Open your browser and navigate to:

| Page | URL |
|------|-----|
| **🏠 Home (Hero)** | http://localhost:3000 |
| **📊 Dashboard** | http://localhost:3000/dashboard |
| **📐 Architecture** | http://localhost:3000/architecture |
| **📖 About** | http://localhost:3000/about |

---

## Running Demo Scenarios

Once on the **Dashboard** page (http://localhost:3000/dashboard):

### Demo 1: Normal User Session
1. Click the **"✅ Normal User"** button
2. **Expected:** Risk score 5-15, green gauge, "IDENTITY VERIFIED"
3. The behavioral baseline updates slightly

### Demo 2: Attacker with Stolen Credentials
1. Click the **"🚨 Simulate Attacker"** button
2. **Expected:** Risk score 75-95, red "ATTACK BLOCKED" overlay
3. Attack narrative appears with 5-stage analysis
4. Baseline update is rejected (poisoning protection)

### Demo 3: Social Engineering Attack
1. Click the **"⚡ Social Engineering"** button
2. **Expected:** Progressive escalation through 4 stages
3. Final risk score 65-85, full narrative generated
4. Session quarantined

### Reset Demo
- Click **"🔄 Reset"** to reset all data and start fresh

---

## Troubleshooting

### Port 5000 Already in Use
```powershell
# Kill the process using port 5000
Get-NetTCPConnection -LocalPort 5000 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
# Then restart: node server.js
```

### Port 3000 Already in Use
```powershell
# Kill the process using port 3000
Get-NetTCPConnection -LocalPort 3000 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
# Then restart: npm run dev
```

### Backend Not Responding
- Check that the backend terminal shows no errors
- Verify: `Invoke-WebRequest -Uri "http://localhost:5000/api/health"`
- Should return: `{"status":"operational",...}`

### Frontend Compilation Error
- Delete `.next` folder: `Remove-Item -Recurse -Force .next`
- Restart: `npm run dev`

### ML Training Fails
- Ensure Python 3.8+ is installed
- Ensure sklearn is installed: `pip install scikit-learn`
- Try: `python --version` to verify Python works

### Dashboard Not Loading Data
- Ensure backend is running (http://localhost:5000/api/health)
- Check browser console for CORS errors
- The dashboard auto-creates a demo token on load

---

## Supabase Integration (Optional)

For persistent database storage:

1. Create a Supabase project at https://supabase.com
2. Run the SQL schema in the Supabase SQL editor:

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE behavior_baseline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  avg_typing_speed DECIMAL DEFAULT 200,
  avg_click_interval DECIMAL DEFAULT 450,
  avg_mouse_speed DECIMAL DEFAULT 2.0,
  avg_read_time DECIMAL DEFAULT 3000,
  avg_navigation_entropy DECIMAL DEFAULT 0.35,
  login_time_pattern JSONB DEFAULT '{}',
  session_count INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE TABLE session_behavior (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  typing_speed DECIMAL,
  click_interval DECIMAL,
  mouse_speed DECIMAL,
  navigation_depth INTEGER,
  read_time DECIMAL,
  navigation_entropy DECIMAL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE risk_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(100),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  risk_score INTEGER,
  decision VARCHAR(20),
  narrative_reason TEXT,
  narrative_stages JSONB,
  deviations JSONB,
  attack_type VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

3. Update `backend/.env` with your Supabase credentials:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key
```

4. Restart the backend server

---

## Quick Start (TL;DR)

```powershell
# Terminal 1 — Backend
cd C:\Users\PRASANNA\Downloads\cybertwin\backend
npm install
python ml\train_model.py
node server.js

# Terminal 2 — Frontend
cd C:\Users\PRASANNA\Downloads\cybertwin\frontend
npm install
npm run dev

# Open in browser
# http://localhost:3000
```

---

**Built for Cybersecurity Hackathon 2026** | CYBERTWIN — Cognitive Attack Surface Intelligence
