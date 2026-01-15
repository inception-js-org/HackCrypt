# Unified Identity Verification System

A full-stack AI-based identity verification platform designed for secure attendance and presence validation using computer vision and multi-factor authentication concepts.

---

## 📁 Project Structure

```
Hack-Crypt/
├── frontend/        # Next.js frontend
├── backend/         # FastAPI backend (Python)
└── README.md
```

---

## 🚀 Frontend Setup (Next.js)

### Prerequisites
- Node.js (v18+ recommended)
- npm

### Installation & Run

```bash
cd frontend
npm install
npm run dev
```

### Access Frontend

```
http://localhost:3000
```

## 🧠 Backend Setup (FastAPI + Conda)

### Prerequisites

* Anaconda or Miniconda
* Python 3.9 or 3.10 (recommended for MediaPipe compatibility)

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
