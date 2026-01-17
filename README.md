<div align="center">

# 🔐 HackCrypt

### Unified Identity Verification System

A modern, AI-powered biometric attendance and identity verification platform built for educational institutions.

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169E1?logo=postgresql)](https://neon.tech/)
[![Pinecone](https://img.shields.io/badge/Pinecone-Vector_DB-000000)](https://www.pinecone.io/)

</div>

---

## 📋 Overview

HackCrypt is a full-stack identity verification platform that leverages computer vision and biometric authentication to streamline attendance tracking in educational environments. The system combines facial recognition with fingerprint verification to provide a secure, contactless, and efficient way to verify student and faculty presence.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| **Facial Recognition** | Real-time face detection and matching using InsightFace and RetinaFace |
| **Fingerprint Verification** | Hardware-integrated biometric authentication via Arduino |
| **Video Attendance** | Batch processing of video feeds to detect and log multiple attendees |
| **Role-Based Dashboards** | Dedicated portals for Students, Teachers, and Administrators |
| **Smart Analytics** | Visual attendance reports, trends, and session insights |
| **Secure Authentication** | OAuth-based auth with Clerk and PostgreSQL user management |
| **Vector Search** | High-performance face embedding storage and similarity search with Pinecone |

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** Next.js 15 (App Router)
- **Styling:** Tailwind CSS, shadcn/ui
- **Authentication:** Clerk
- **Database ORM:** Drizzle ORM
- **Language:** TypeScript

### Backend
- **Framework:** FastAPI (Python)
- **Computer Vision:** InsightFace, RetinaFace, OpenCV
- **ML/Embeddings:** ArcFace embeddings
- **Vector Database:** Pinecone
- **Hardware Integration:** Arduino (Fingerprint sensor)

### Infrastructure
- **Database:** PostgreSQL (Neon)
- **Vector Store:** Pinecone
- **Deployment:** Vercel (Frontend), Uvicorn (Backend)

---

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Next.js App   │────▶│   FastAPI API   │────▶│    Pinecone     │
│   (Frontend)    │     │   (Backend)     │     │  (Vector DB)    │
└────────┬────────┘     └────────┬────────┘     └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│     Clerk       │     │   PostgreSQL    │
│ (Authentication)│     │     (Neon)      │
└─────────────────┘     └─────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js v18+
- Python 3.10 (Conda recommended)
- PostgreSQL database (Neon)
- Clerk account
- Pinecone account

### Frontend Setup

1. Navigate to the frontend directory and install dependencies:
   ```bash
   cd frontend && pnpm install
   ```

2. Configure environment variables in `.env`:
   - Clerk API keys
   - Database connection URL
   - Backend API endpoint

3. Run the development server:
   ```bash
   pnpm dev
   ```

4. Access at `http://localhost:3000`

### Backend Setup

1. Create and activate the Conda environment:
   ```bash
   conda create -n uiv python=3.10 -y && conda activate uiv
   ```

2. Install dependencies:
   ```bash
   cd backend && pip install -r requirements.txt
   ```

3. Configure environment variables for Pinecone and database connections.

4. Start the API server:
   ```bash
   uvicorn app.main:app --reload
   ```

5. API available at `http://127.0.0.1:8000`

---

## 📂 Project Structure

```
HackCrypt/
├── frontend/                # Next.js application
│   ├── app/                 # App Router pages & API routes
│   │   ├── admin/           # Admin dashboard
│   │   ├── student/         # Student portal
│   │   ├── teacher/         # Teacher portal
│   │   └── login/           # Authentication pages
│   ├── components/          # Reusable UI components
│   ├── db/                  # Database schema & connection
│   └── lib/                 # Utilities & helpers
│
├── backend/                 # FastAPI application
│   ├── app/
│   │   ├── api/             # REST API endpoints
│   │   ├── services/        # Face embedding & caching
│   │   └── core/            # Pinecone client & startup
│   └── scripts/             # Enrollment & analysis utilities
│
└── public/                  # Static assets
```

---

## 🔐 Authentication Flow

1. **Landing** → User selects role (Student/Faculty)
2. **Sign Up/In** → Clerk handles OAuth authentication
3. **Role Sync** → User profile synced to PostgreSQL
4. **Dashboard** → Redirected to role-specific portal

---

## 📄 License

This project is developed for educational and demonstration purposes.

---

<div align="center">

**Built with ❤️ by the HackCrypt Team**

</div>
