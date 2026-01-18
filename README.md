<div align="center">

# 🔐 ATTENDIX

### Smart Attendance System

A modern, AI-powered biometric attendance and identity verification platform built for educational institutions.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Python-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169E1?logo=postgresql)](https://neon.tech/)
[![Pinecone](https://img.shields.io/badge/Pinecone-Vector_DB-000000)](https://www.pinecone.io/)


![attendix_landing_page](https://github.com/user-attachments/assets/3c327b8d-86f7-431a-a200-e33aeea231be)


</div>

## 📋 Overview

ATTENDIX is a full-stack identity verification platform that leverages computer vision and biometric authentication to streamline attendance tracking in educational environments. The system combines **facial recognition** with **fingerprint verification** to provide a secure, contactless, and efficient way to verify student and faculty presence.

The platform features dedicated dashboards for students, teachers, and administrators—each with role-specific functionality for attendance tracking, session management, analytics, and grievance handling.

## ✨ Features

| Feature | Description |
|---------|-------------|
| **Facial Recognition** | Real-time face detection using InsightFace (buffalo_l model) with ArcFace 512-dim embeddings |
| **Fingerprint Verification** | Hardware-integrated biometric authentication via Arduino serial communication |
| **Video Attendance** | Batch processing of uploaded video feeds to detect and log multiple attendees with annotated output |
| **Live Camera Attendance** | Real-time webcam-based face recognition with verification buffering |
| **Role-Based Dashboards** | Dedicated portals for Students, Teachers, and Administrators |
| **Session Management** | Create, schedule, and manage class sessions with attendance tracking |
| **Embedding Cache** | Local embedding cache for fast similarity search before Pinecone fallback |
| **Ambiguous Detection Handling** | System to flag and resolve low-confidence or duplicate detections |

## 🛠️ Tech Stack

### Frontend
- **Framework:** Next.js 16 (App Router) with React 19
- **Styling:** Tailwind CSS 4, shadcn/ui, Radix UI primitives
- **Authentication:** Clerk (OAuth)
- **Database ORM:** Drizzle ORM
- **Charts:** Recharts
- **Language:** TypeScript

### Backend
- **Framework:** FastAPI (Python 3.10)
- **Face Detection:** InsightFace (buffalo_l model with RetinaFace detector)
- **Face Embeddings:** ArcFace (512-dimensional vectors)
- **Computer Vision:** OpenCV
- **Vector Database:** Pinecone (cosine similarity search)
- **Hardware:** Arduino with fingerprint sensor (serial communication)
- **GPU Support:** ONNX Runtime with CUDA

### Infrastructure
- **Database:** PostgreSQL (Neon serverless)
- **Vector Store:** Pinecone
- **Analytics:** Vercel Analytics

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Next.js App   │────▶│   FastAPI API   │────▶│    Pinecone     │
│   (Frontend)    │     │   (Backend)     │     │  (Vector DB)    │
└────────┬────────┘     └────────┬────────┘     └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     Clerk       │     │   PostgreSQL    │     │    Arduino      │
│ (Authentication)│     │     (Neon)      │     │  (Fingerprint)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## 🚀 Getting Started

### Prerequisites

- Node.js v18+ and npm
- Python 3.10 (Conda recommended)
- PostgreSQL database (Neon)
- Clerk account
- Pinecone account
- Arduino with fingerprint sensor (optional)

### Frontend Setup

1. Navigate to the frontend directory and install dependencies:
   ```bash
   cd frontend && npm install
   ```

2. Configure environment variables in `.env`:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY`
   - `DATABASE_URL` (Neon PostgreSQL connection string)

3. Run database migrations:
   ```bash
   npm db:push
   ```

4. Run the development server:
   ```bash
   npm dev
   ```

5. Access at `http://localhost:3000`

### Backend Setup

1. Create and activate the Conda environment:
   ```bash
   conda create -n uiv python=3.10 -y && conda activate uiv
   ```

2. Install dependencies:
   ```bash
   cd backend && pip install -r requirements.txt
   ```

3. Configure `.env` with Pinecone credentials:
   - `PINECONE_API_KEY`
   - `PINECONE_INDEX_NAME`
   - `PINECONE_HOST`

4. Start the API server:
   ```bash
   python -m uvicorn app.main:app --reload
   ```

5. API available at `http://127.0.0.1:8000`

## 📂 Project Structure

```
HackCrypt/
├── frontend/                 # Next.js 16 application
│   ├── app/                  # App Router pages & API routes
│   │   ├── admin/            # Admin dashboard (create students, classes, timetable)
│   │   ├── student/          # Student portal (attendance, analytics, grievances)
│   │   ├── teacher/          # Teacher portal (attendance, sessions, analytics)
│   │   ├── login/            # Authentication flow (Clerk)
│   │   └── api/              # API routes (attendance, sessions, students)
│   ├── components/           # UI components (webcam, dialogs, navigation)
│   ├── db/                   # Drizzle schema & database connection
│   └── contexts/             # React context (auth)
│
├── backend/                  # FastAPI application
│   ├── app/
│   │   ├── api/              # Endpoints (enroll, identify, fingerprint, video-attendance)
│   │   ├── services/         # Face embedding & caching services
│   │   ├── core/             # Pinecone client & startup hooks
│   │   └── auth/             # Clerk auth & RBAC
│   ├── output/               # Annotated video outputs
│   └── TEST_SCRIPTS/         # Development & testing scripts
│
└── public/                   # Static assets
```

## 🔐 Authentication Flow

1. **Landing** → User selects role (Student/Faculty/Admin)
2. **Sign Up/In** → Clerk handles OAuth authentication
3. **Role Sync** → User profile synced to PostgreSQL via Drizzle
4. **Dashboard** → Redirected to role-specific portal

## 📄 License

This project is developed for educational and demonstration purposes.

<div align="center">

**Built with ❤️ by Inception.js**

</div>
