# Planora 🚀

Planora is a high-fidelity project management SaaS built using the MERN stack (MongoDB, Express, React, Node.js) styled with a custom dark-mode design system. The entire codebase is implemented in **TypeScript** for type safety and clean architectural structure.

## 📂 Project Structure

```
Planora/
├── backend/                  # Node.js + Express + Mongoose (TypeScript API server)
│   ├── src/
│   │   ├── config/           # Database setup
│   │   ├── controllers/      # Route logic handlers (Auth, Projects, Tasks)
│   │   ├── middleware/       # Auth guards and validation
│   │   ├── models/           # Mongoose schemas
│   │   ├── routes/           # Express router endpoints
│   │   └── server.ts         # Server configuration
│   ├── package.json
│   └── tsconfig.json
└── frontend/                 # React + Vite + TypeScript (Client Dashboard)
    ├── src/
    │   ├── components/       # Reusable components (Modal, Sidebar)
    │   ├── context/          # State sharing providers (Auth Context)
    │   ├── pages/            # View pages (Login, Register, Dashboard, Project details)
    │   ├── services/         # Axios API HTTP client
    │   └── index.css         # Styling system theme & global variables
    ├── package.json
    └── vite.config.ts
```

## 🛠️ Tech Stack & Key Libraries

- **Backend**: Express, Mongoose, JWT, bcryptjs, Helmet (security headers), Morgan (HTTP logger).
- **Frontend**: React (Vite), Axios, Lucide React (vector icons), Recharts (responsive analytics charts).
- **Type Safety**: TypeScript definitions shared between routing handlers and React views.

---

## 💻 Getting Started Locally

### Prerequisites
- [Node.js](https://nodejs.org/) installed (v18+ recommended)
- [MongoDB](https://www.mongodb.com/try/download/community) installed and running locally, or an Atlas connection string.

### Setup Instructions

1. **Clone & Open Project Workspace**:
   ```bash
   cd Planora
   ```

2. **Start Backend Server**:
   ```bash
   cd backend
   npm install
   npm run dev
   ```
   *The server starts on `http://localhost:5001/` by default.*

3. **Start Frontend App**:
   ```bash
   cd ../frontend
   npm install
   npm run dev
   ```
   *Open the URL printed in the terminal (usually `http://localhost:5173`) to interact with Planora.*

---

## 🚀 Live Deployment Guide

Please refer to the detailed [walkthrough.md](file:///Users/nancy/.gemini/antigravity-ide/brain/827d59fa-85aa-4850-8cf5-886a7a85ad76/walkthrough.md) artifact in the agent brain directory for step-by-step instructions on deploying the database to MongoDB Atlas (Free M0), the server to Render (Free Web Service), and the React SPA to Vercel (Free Hobby Tier).


frontend prod link: https://planora-6iln.vercel.app/
backend prod link: https://planora-psi-jade.vercel.app/
name: Nancy , dummy user
email: bhadiyadranancy@gmail.com , dummyuser@yopmail.com
password: 123456