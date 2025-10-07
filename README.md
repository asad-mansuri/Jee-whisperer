
# 🧠 Smart AI Tutor (JEE)

An interactive learning platform for **JEE aspirants** built with modern web technologies.  
Smart AI Tutor helps JEE aspirants master Physics, Chemistry, and Mathematics through **AI-powered chat**, **quizzes**, **lectures**, **simulations**, **leaderboards**, and more.  
Built by **Code Storm ⚡**.

---

## 🚀 Features

### 🏠 Welcome Page
- Clean introduction with **Start Journey** button.
- Authentication using **Supabase Auth** (login/signup).

### � Dashboard
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
- Smart recommendations like **Meta AI** but focused on **JEE syllabus**.
- Powered by **Groq API**.

### 📝 Quizzes
- Auto-generated quizzes from **Open Trivia DB**.
- Difficulty filters (easy/medium/hard).
- Gamified UI design (exam-like with game feel).
- JEE-level questions for Physics, Chemistry, and Mathematics.
- Results stored in Supabase → contribute to **progress tracker** + **leaderboard**.

### 🔬 Simulations
- Integrated **PhET simulations** (JEE Physics & Chemistry topics).
- Grid layout with “Launch” button.

### 🎥 Lectures
- Embedded **YouTube lectures** via iframe (branding removed).
- **YouTube Data API v3** integration for JEE-specific search.
- UI inspired by **YouTube** (simplified & minimal).

### 📚 Notes
- JEE revision notes and formula sheets in PDF format.
- Embedded from trusted sources.
- Theme + color palette adjusted to match app design.

### 🏆 Leaderboard
- Competitive ranking based on quiz scores.
- Ranking system works **per question**.
- Chats stored in Supabase tables.

### 👤 Profile
- Edit personal details + profile picture.
- Manage Smart Tutor chats:
  - Edit & delete conversations (like ChatGPT).
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
science-whisperer/
│
├── frontend/                # React + Vite + TypeScript + Tailwind app (the website you open)
│   ├── src/
│   │   ├── pages/           # Page files like PersonalChat.tsx, Dashboard, Profile — each is a full screen
│   │   ├── components/      # Small reusable pieces: ChatList, MessageBubble, Header, Buttons
│   │   ├── hooks/           # Reusable logic: useAuth, useToast, useSupabase (like tiny helpers)
│   │   ├── lib/             # Third-party setup: supabase client, api helpers (connects to DB)
│   │   ├── utils/           # Small helper functions (formatting dates, text, etc.)
│   │   ├── styles/          # Tailwind config and global CSS (how things look)
│   │   ├── assets/          # Images, icons, fonts (pictures and logos)
│   │   ├── App.tsx          # App root (wires pages and routes together)
│   │   └── main.tsx         # App entry (mounts App into the browser)
│   ├── index.html           # Minimal HTML shell
│   ├── package.json         # frontend dependencies and scripts (start, build)
│   └── vite.config.ts       # Vite build/dev config
│
├── backend/                 # Optional Node.js / serverless APIs (server logic)
│   ├── routes/              # API route definitions
│   ├── controllers/         # Business logic for each route (what the API does)
│   ├── db/                  # Database helpers or migrations for server code
│   └── package.json         # backend deps and scripts
│
├── supabase/                # Supabase project files: schema, SQL, policies, functions
│   ├── migrations/          # SQL migrations (tables, columns)
│   ├── functions/           # Database functions / edge functions
│   └── seeds/               # Initial data to populate DB
│
├── scripts/                 # Helper scripts (migrate, seed, local dev helpers)
│
├── tests/                   # Unit and integration tests (Jest, React Testing Library)
│
├── docs/                    # Project docs and how-to guides (setup, architecture)
│
├── .env                     # Environment variables (API keys) — keep private, not in git
├── .gitignore               # Files to ignore in Git
├── README.md                # Project overview and how to run it
└── .vscode/                 # Optional editor settings (debug configs)