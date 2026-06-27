#  MediTrack

A modern medication reminder and adherence tracking web application built with **React, Vite, Supabase, and Node.js**. MediTrack helps users manage medications, receive reminder notifications, monitor adherence, track inventory, and generate health reports through a clean and responsive interface.

---

##  Features

### 👤 Authentication
- User Registration
- Secure Login
- Protected Routes
- User-specific data

### Medicine Management
- Add medicines
- Edit medicines
- Delete medicines
- Archive & Restore medicines
- Search medicines
- Track dosage and schedule

###  Smart Reminders
- Browser notifications
- Service Worker support
- Multiple reminder times
- Daily reminder tracking

###  Health Reports
- Daily adherence
- Overall adherence percentage
- Taken vs Missed doses
- Medication performance
- Inventory tracking
- Medication insights
- Recent activity

###  Inventory Management
- Stock tracking
- Refill reminders
- Days remaining calculation

###  Modern UI
- Responsive design
- Dark theme
- Fast loading
- Optimized production build

---

# 🛠 Tech Stack

## Frontend
- React
- Vite
- JavaScript (ES6+)
- CSS3

## Backend
- Node.js
- Express.js

## Database
- Supabase (PostgreSQL)

## Notifications
- Browser Notification API
- Service Workers

---

# 📁 Project Structure

```
Medi-track/
│
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── routes/
│   └── server.js
│
└── meditrack/
    ├── public/
    ├── src/
    │   ├── components/
    │   ├── hooks/
    │   ├── pages/
    │   ├── utils/
    │   ├── store/
    │   └── lib/
    │
    ├── package.json
    └── vite.config.js
```

---

# 🚀 Installation

## Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/MediTrack.git
```

Go into the project

```bash
cd MediTrack
```

---

## Frontend

```bash
cd meditrack
npm install
npm run dev
```

---

## Backend

```bash
cd backend
npm install
npm start
```

---

# ⚙ Environment Variables

## Frontend (.env)

```env
VITE_SUPABASE_URL=YOUR_SUPABASE_URL
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

## Backend (.env)

```env
PORT=5000
JWT_SECRET=YOUR_SECRET
```

---

# 📷 Screenshots

Add screenshots here after deployment.

Examples:

- Dashboard
- Medicines Page
- Reports Page
- Login
- Register

---

# 🌐 Deployment

Frontend:
- Vercel

Backend:
- Render / Railway / VPS

Database:
- Supabase

---

# 📈 Future Improvements

- Email reminders
- SMS notifications
- Doctor dashboard
- Family member accounts
- Medicine image recognition
- PDF report export
- Mobile application

---

# 👨‍💻 Author

**Mohammed Ashhaz Ahmed**

Computer Science Engineering Student

GitHub:
https://github.com/YOUR_USERNAME

LinkedIn:
https://linkedin.com/in/YOUR_PROFILE

---

# 📄 License

This project is licensed under the MIT License.

---

## ⭐ If you found this project useful, consider giving it a star!