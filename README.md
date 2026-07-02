# ⚡ CodeForge OJ

> Competitive programming platform — React · Node.js · MongoDB · JWT · OpenRouter AI

[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/YOUR_USERNAME/codeforge-oj)

---

## Quick start (Gitpod / Codespaces)

Click the button above. Gitpod will:
1. Spin up MongoDB + Redis via Docker Compose
2. Install backend and frontend dependencies
3. Start the Express dev server (`localhost:3000`)
4. Start the Vite dev server and open a preview (`localhost:5173`)

---

## Quick start (local)

### Prerequisites
- Node.js ≥ 20
- Docker + Docker Compose
- `openssl` (for JWT key generation)

### Setup

```bash
# 1. Clone and install
git clone https://github.com/YOUR_USERNAME/codeforge-oj
cd codeforge-oj
npm run install:all

# 2. Start infrastructure
docker-compose up -d

# 3. Generate JWT keypair
bash scripts/gen-keys.sh

# 4. Configure environment
cp .env.example .env
# Edit .env and paste the generated JWT keys

# 5. Start everything
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Project structure

```
codeforge-oj/
├── backend/
│   └── src/
│       ├── config/         database.js, redis.js
│       ├── controllers/    (Stage 2+)
│       ├── middleware/     errorHandler.js, notFound.js, auth.js (Stage 2)
│       ├── models/         (Stage 2+)
│       ├── routes/         health.js, auth.js (Stage 2), problems.js (Stage 4)
│       ├── services/       (Stage 2+)
│       ├── utils/          logger.js
│       ├── app.js
│       └── server.js
├── frontend/
│   └── src/
│       ├── api/            client.js (Axios + interceptors)
│       ├── components/     layout/, ui/, editor/, auth/ (Stage 3)
│       ├── hooks/          (Stage 3+)
│       ├── pages/          HomePage, NotFoundPage, auth/ (Stage 3)
│       ├── store/          index.js, slices/authSlice.js
│       ├── styles/         globals.css
│       ├── App.jsx
│       └── main.jsx
├── scripts/
│   ├── gen-keys.sh         Generate RS256 keypair for JWT
│   └── mongo-init.js       MongoDB init (collections + indexes)
├── .env.example
├── .gitignore
├── .gitpod.yml
├── docker-compose.yml
└── package.json            Monorepo root
```

---

## Build stages

| Stage | What gets built |
|-------|----------------|
| **1** | ✅ Project scaffold, monorepo, Docker Compose, Gitpod config |
| **2** | 🔐 Auth service — JWT RS256, refresh tokens, bcrypt |
| **3** | ⚛️ Frontend auth — Redux, login/register pages, Axios interceptor |
| **4** | 📚 Problem service — CRUD API, MongoDB models, admin routes |
| **5** | 💻 Monaco editor + submission flow — Bull queue, WebSocket |
| **6** | 🐳 Docker judge worker — sandbox execution, verdict engine |
| **7** | 🤖 OpenRouter AI proxy — hints, streaming, cost cap |

---

## Useful URLs (dev)

| URL | Description |
|-----|-------------|
| `http://localhost:5173` | React frontend |
| `http://localhost:3000/api/health` | Backend health check |
| `http://localhost:8081` | Mongo Express (DB GUI) |
| `http://localhost:8082` | Redis Commander |

---

## Environment variables

See `.env.example` for all required variables with inline documentation.

⚠️ Never commit `.env` or `keys/` to git — both are in `.gitignore`.
