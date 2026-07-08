# AI First CRM – Healthcare Professional Module

An AI-powered Customer Relationship Management (CRM) application tailored for pharmaceutical Medical Representatives (MRs). The platform enables representatives to log healthcare professional (HCP) meetings using either structured input forms or natural conversational chat. An integrated LangGraph agent extracts, analyzes, validates, and persists interaction details automatically.

---

## 🏗️ Architecture Overview

The system consists of a Vite-powered single page application fronting a FastAPI REST server. The core intelligence lies in a LangGraph state graph executing on top of Groq's `gemma2-9b-it` model.

```
       +---------------------------------------------+
       |             Medical Representative          |
       +----------------------+----------------------+
                              |
                       (React Web App)
                              v
       +----------------------+----------------------+
       |                React Frontend               |
       |  (Redux State, Framer Motion, Tailwind CSS) |
       +----------------------+----------------------+
                              |
                         (REST APIs)
                              v
       +----------------------+----------------------+
       |               FastAPI Backend Server        |
       +-----------+----------------------+----------+
                   |                      |
             (Read / Write)        (Agent Invoke)
                   v                      v
       +-----------+----------+ +---------+----------+
       |   PostgreSQL/SQLite  | |  LangGraph Agent   |
       |  (SQLAlchemy Models) | |  (State & Nodes)   |
       +----------------------+ +---------+----------+
                                          |
                                    (Groq API Key)
                                          v
                                +---------+----------+
                                |  Groq gemma2-9b-it |
                                +--------------------+
```

---

## 📂 Folder Structure

```
AI-First CRM/
├── docker-compose.yml       # Container orchestration file
├── .env.example             # Environment credentials template
├── README.md                # Documentation guide
│
├── backend/
│   ├── Dockerfile           # Backend container instructions
│   ├── requirements.txt     # Python dependency listings
│   ├── .env.example         # Local backend variables template
│   └── app/
│       ├── main.py          # FastAPI application server entrypoint
│       ├── config.py        # Settings loader with SQLite fallbacks
│       ├── api/
│       │   ├── schemas.py   # Pydantic schema validation wrappers
│       │   └── endpoints.py # CRUD, dashboard widgets & agent endpoints
│       ├── db/
│       │   ├── session.py   # Connection sessions engine
│       │   ├── models.py    # SQLAlchemy tables (User, Doctor, Product...)
│       │   └── seed.py      # Pre-seeding database setup script
│       └── agent/
│           ├── tools.py     # Log, Edit, Search, NBA, and draft tools
│           └── graph.py     # State definition & compiled LangGraph nodes
│
└── frontend/
    ├── Dockerfile           # Frontend container instructions
    ├── package.json         # React 19 dependencies & scripts
    ├── tsconfig.json        # TypeScript configuration settings
    ├── vite.config.ts       # Vite proxy and execution config
    ├── tailwind.config.js   # Custom styling tokens and dark mode config
    ├── postcss.config.js    # PostCSS configs
    ├── index.html           # HTML entry point template
    └── src/
        ├── main.tsx         # DOM Mounting script
        ├── App.tsx          # Root routing and Redux configuration wrapper
        ├── index.css        # Tailwind styling & Glassmorphism classes
        ├── store/
        │   ├── index.ts     # Redux store builder
        │   ├── authSlice.ts
        │   ├── themeSlice.ts
        │   ├── chatSlice.ts
        │   ├── doctorsSlice.ts
        │   ├── interactionsSlice.ts
        │   └── notificationsSlice.ts
        ├── components/
        │   ├── Header.tsx
        │   ├── Sidebar.tsx
        │   ├── Toast.tsx
        │   └── LoadingSkeleton.tsx
        └── pages/
            ├── Dashboard.tsx       # KPI metrics & widgets page
            ├── LogInteraction.tsx  # Dual tab (Form / Conversational AI) page
            └── Doctors.tsx         # Directory & AI 전략 action profile
```

---

## 🤖 LangGraph Workflow

The agent uses a compiled state graph execution workflow matching the specifications:

1. **Intent Detection Node**: Parses natural language to extract doctor name, therapeutic product discussed, notes summary, physician reception sentiment, and requested follow-up timing.
2. **Route Node**: Evaluates the state intent to direct workflow tools.
3. **Execute Tool Node**: Dynamically runs one of the **7 fully working tools**:
   - `Log Interaction`: Commits parsed details and inserts follow-up events in the database.
   - `Edit Interaction`: Modifies notes/sentiments of a past visit.
   - `Search History`: Fetches prior interaction cards for a doctor.
   - `Generate Summary`: Compiles a chronological timeline and sentiment trend profile.
   - `Next Best Action`: Analyzes history to suggest visit intervals, strategic products, and talking points.
   - `Email Draft Generator` *(Bonus)*: Formulates a customized post-meeting follow-up email.
   - `Doctor Summary` *(Bonus)*: Retrieves basic info stats and active followup count.
4. **Validation Node**: Checks parameter presence (like doctor name resolution) against safety standards.
5. **Response Generator Node**: Assembles Markdown conversation statements alongside JSON state payloads.

---

## 🚀 Running the Application

Ensure you have [Docker](https://www.docker.com/) installed on your machine.

### Method 1: Using Docker Compose (Recommended)

1. **Configure Environment Variables**:
   Create a `.env` file in the root directory:
   ```bash
   GROQ_API_KEY=your_actual_groq_api_key_here
   ```

2. **Boot the Containers**:
   Execute compose build and startup:
   ```bash
   docker-compose up --build
   ```

3. **Access Services**:
   - **Frontend**: `http://localhost:3000` (React Web UI)
   - **Backend API**: `http://localhost:8000` (FastAPI)
   - **Interactive API Docs**: `http://localhost:8000/docs` (Swagger UI)

---

### Method 2: Running Locally (Native Terminal)

If running without docker, you can boot services individually:

#### 1. Setup Database and Backend
```bash
cd backend
python -m venv venv
# Windows command:
venv\Scripts\activate

# Install dependencies:
pip install -r requirements.txt

# Create .env:
# Copy .env.example to .env and configure GROQ_API_KEY.
# If no DATABASE_URL is set, it will automatically fallback to a local SQLite file.

# Boot FastAPI:
python app/main.py
```

#### 2. Run Frontend Dev Server
```bash
cd frontend
npm install
npm run dev
# App will boot at http://localhost:3000
```

---

## 💡 Seeding & Resetting Data
Inside the Web Dashboard, a **Reset CRM Data** button triggers `POST /api/db/seed` which resets and repopulates the database tables with high-fidelity Medical Representative activities, enabling immediate demo testing.
