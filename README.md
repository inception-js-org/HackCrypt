# Unified Identity Verification System

A full-stack AI-based identity verification platform designed for secure attendance and presence validation using computer vision and multi-factor authentication concepts.

## 🎯 Features

- **Face Recognition**: AI-powered face detection for attendance
- **Fingerprint Detection**: Biometric verification
- **Smart Analytics**: Comprehensive attendance tracking
- **Role-Based Access**: Student, Teacher, and Admin portals
- **Secure Authentication**: Clerk + PostgreSQL integration

---

## 📁 Project Structure

```
unified-identity-verification/
├── frontend/               # Next.js frontend
│   ├── app/               # Next.js App Router
│   │   ├── login/         # Authentication pages
│   │   │   ├── choose-role/
│   │   │   ├── sign-in/
│   │   │   ├── sign-up/
│   │   │   ├── set-role/
│   │   │   └── api/       # API routes
│   │   ├── student/       # Student dashboard
│   │   ├── teacher/       # Teacher dashboard
│   │   └── admin/         # Admin dashboard
│   ├── db/                # Database schema & connection
│   ├── components/        # UI components
│   └── lib/               # Utilities & helpers
├── backend/               # FastAPI backend (Python)
│   ├── app/              # Backend application
│   └── scripts/          # Face recognition scripts
├── documentation/         # Project documentation
└── README.md
```

---

## 🚀 Quick Start

### Frontend Setup (Next.js)

#### Prerequisites

- Node.js (v18+ recommended)
- npm or pnpm
- PostgreSQL database (Neon recommended)
- Clerk account for authentication

#### Installation

```bash
cd frontend

# Install dependencies
npm install
# or
pnpm install

# Copy environment file
cp .env.example .env
# Edit .env with your credentials
```

#### Environment Variables

Update `.env` with your credentials:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_publishable_key
CLERK_SECRET_KEY=your_secret_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/login/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/login/set-role
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/login/set-role

# PostgreSQL Database
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require
```

#### Test Database Connection

```bash
npx tsx scripts/test-db-connection.ts
```

#### Run Development Server

```bash
npm run dev
```

### Access Frontend

```
http://localhost:3000
```

---

## 🔐 Authentication Flow

1. **Landing Page** → Click "Get Started"
2. **Choose Role** → Select Student or Faculty
3. **Sign Up/Sign In** → Complete Clerk authentication
4. **Set Role** → Automatic sync to PostgreSQL
5. **Dashboard** → Redirect to role-specific dashboard

For detailed flow documentation, see [AUTHENTICATION_FLOW.md](./documentation/AUTHENTICATION_FLOW.md)

---

## 🧠 Backend Setup (FastAPI + Conda)

### Prerequisites

- Anaconda or Miniconda
- Python 3.9 or 3.10 (recommended for MediaPipe compatibility)

---

### 1️⃣ Create Conda Environment

```bash
conda create -n uiv python=3.10 -y
```

Activate the environment:

```bash
conda activate uiv
```

---

### 2️⃣ Install Backend Dependencies

Navigate to the backend directory:

```bash
cd backend
```

## 📦 Python Dependencies

All backend Python dependencies are listed in the `requirements.txt` file.

### Install dependencies using pip

```bash
pip install -r requirements.txt

```

Install required Python packages:

```bash
pip install fastapi uvicorn mediapipe opencv-python numpy
```

---

### 3️⃣ Backend Folder Structure

```
backend/
├── app/
│   ├── main.py
│   ├── api/
│   ├── services/
│   └── core/
└── requirements.txt
```

---

## ▶️ Run Backend Server

From the `backend/` directory with the Conda environment activated:

```bash
uvicorn app.main:app --reload
```

### Backend Server URL

```
http://127.0.0.1:8000
```

---

## 🛠 Common Commands

### Frontend

```bash
npm install
npm run dev
```

### Backend

```bash
conda activate uiv
uvicorn app.main:app --reload
```

---
