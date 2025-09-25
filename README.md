# 🧠 Smart AI Tutor (10th Science)

An interactive learning platform for **10th-grade science students** built with modern web technologies.  
Smart AI Tutor helps students learn through **AI-powered chat**, **quizzes**, **lectures**, **simulations**, **leaderboards**, and more.  
Built by **Code Storm ⚡**.

---

## 🚀 Features

### 🏠 Welcome Page
- Clean introduction with **Start Journey** button.
- Authentication using **Supabase Auth** (login/signup).
- UI inspired by [calmchase.com](https://calmchase.com/).

### 📊 Dashboard
- Navbar, collapsible sidebar (burger menu), footer.
- Tracks:
  - Daily streaks  
  - Quiz results  
  - Seen lectures  
  - Visited simulations  
  - Chatbot conversations  
- Data stored in Supabase buckets and tables.

### 🤖 Smart Tutor (Chatbot)
- Chatbot UI like **ChatGPT**.
- History + “New Chat” option.
- Smart recommendations like **Meta AI** but focused on **10th Science syllabus**.
- Powered by **Groq API**.

### 📝 Quizzes
- Auto-generated quizzes from **Open Trivia DB**.
- Difficulty filters (easy/medium/hard).
- Gamified UI design (exam-like with game feel).
- Results stored in Supabase → contribute to **progress tracker** + **leaderboard**.

### 🔬 Simulations
- Integrated **PhET simulations** (10th Science syllabus).
- Grid layout with “Launch” button.

### 🎥 Lectures
- Embedded **YouTube lectures** via iframe (branding removed).
- **YouTube Data API v3** integration for syllabus-specific search.
- UI inspired by **YouTube** (simplified & minimal).

### 📚 Notes
- NCERT solutions (10th Science) in PDF format.
- Embedded from:  
  [📄 Polite Tanuki Netlify link](https://68cebbd7150fee3c8fb2afc4--polite-tanuki-fce128.netlify.app/).
- Theme + color palette adjusted to match app design.

### 🏆 Leaderboard
- Competitive ranking based on quiz scores.
- Ranking system works **per question**.
- Students can **chat with each other (1-to-1, WhatsApp style)**.
- Chats stored in Supabase tables/buckets.

### 👤 Profile
- Edit personal details + profile picture.
- Manage Smart Tutor chats:
  - Edit & delete conversations (like ChatGPT).
  - Edit & delete personal chats (like WhatsApp).
- Dark/Light mode toggle with **sun–moon animation**.
- Theme preference saved to DB.

---

## 🛠️ Tech Stack

- **Frontend**: React + Tailwind + Vite
- **Backend**: Node.js (API + business logic)
- **Database & Auth**: Supabase
- **AI & APIs**:
  - Groq API (chatbot)
  - Open Trivia DB (quizzes)
  - YouTube Data API v3 (lectures)
  - PhET Simulations (iframe embedding)
- **UI Libraries**:
  - [shadcn/ui](https://ui.shadcn.com/) (components)
  - [lucide-react](https://lucide.dev/) (icons)
  - [framer-motion](https://www.framer.com/motion/) (animations)

---

## 📂 Project Structure

```bash
smart-ai-tutor/
│
├── frontend/                # React + Tailwind + Vite app
│   ├── src/
│   │   ├── components/      # UI components
│   │   ├── pages/           # Page-level views (Dashboard, Tutor, etc.)
│   │   ├── hooks/           # Custom hooks
│   │   ├── utils/           # Helpers
│   │   └── App.tsx
│   └── public/              # Static assets (favicon, logos, etc.)
│
├── backend/                 # Node.js APIs
│   ├── routes/              # Express routes
│   ├── controllers/         # Business logic
│   └── db/                  # Supabase integration
│
├── supabase/                # DB schema, SQL policies, migrations
│
├── docs/                    # Project docs
│
└── README.md
