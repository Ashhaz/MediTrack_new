# MediTrack Backend

Professional Express.js API scaffold for the MediTrack medication management application.

---

## Architecture Overview

The MediTrack **frontend** (React + Vite) communicates **directly with Supabase** for all data operations — authentication, medicine CRUD, adherence history, and real-time updates. The frontend does not route any requests through this backend.

This backend exists as a **clean, production-ready foundation** for future server-side features that Supabase alone cannot provide.

---

## Getting Started

### 1. Install dependencies

```bash
cd backend
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your values
```

### 3. Start the server

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

### 4. Verify

Visit: [http://localhost:5000/api/health](http://localhost:5000/api/health)

Expected response:

```json
{
  "success": true,
  "message": "MediTrack Backend Running",
  "version": "1.0.0"
}
```

---

## Project Structure

```
backend/
│
├── config/
│   └── db.js               # Reserved for future DB / API client setup
│
├── controllers/
│   └── healthController.js # Handler for GET /api/health
│
├── middleware/
│   ├── authMiddleware.js   # Placeholder for future JWT authentication
│   └── errorHandler.js     # Global Express error handler
│
├── routes/
│   └── healthRoutes.js     # GET /api/health route
│
├── .env.example            # Environment variable template
├── package.json
└── server.js               # Express app entry point
```

---

## API Endpoints

| Method | Endpoint      | Auth     | Description           |
|--------|---------------|----------|-----------------------|
| GET    | /api/health   | None     | Health check          |

---

## Planned Future Features

This backend is the foundation for the following planned capabilities:

| Feature                    | Description                                                                 |
|----------------------------|-----------------------------------------------------------------------------|
| **AI Medicine Analysis**   | Server-side LLM integration to analyse dosage schedules and flag conflicts  |
| **Email Reminders**        | Scheduled emails for missed doses using SendGrid or Nodemailer              |
| **Background Jobs**        | Cron-based tasks for daily adherence summaries and refill alerts            |
| **PDF Report Generation**  | Server-rendered PDF exports of medication history and adherence reports     |
| **Admin APIs**             | Privileged endpoints using the Supabase Service Role key                    |
| **Analytics**              | Aggregated usage metrics and adherence trend analysis                       |

---

## Environment Variables

| Variable                   | Description                                         |
|----------------------------|-----------------------------------------------------|
| `PORT`                     | Port the server listens on (default: `5000`)        |
| `SUPABASE_URL`             | Your Supabase project URL                           |
| `SUPABASE_SERVICE_ROLE_KEY`| Service Role key for privileged Supabase operations |
| `JWT_SECRET`               | Secret used to sign/verify JWTs (future auth)       |
| `NODE_ENV`                 | `development` or `production`                       |

---

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js 5
- **CORS:** cors
- **Environment:** dotenv
- **Dev Server:** nodemon

---

## Author

**Mohammed Ashhaz Ahmed** — Computer Science Engineering Student
