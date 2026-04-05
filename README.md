# BetLobby 🎯

Place bets with friends. Join a lobby. Winner takes the pot. No Venmo needed.

## Stack
- **Backend**: Python + FastAPI + WebSockets
- **Frontend**: React + Vite

---

## How to Run

### 1. Start the backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```
API runs at **http://localhost:8000** — docs at http://localhost:8000/docs

### 2. Start the frontend (new terminal tab)

```bash
cd frontend
npm install
npm run dev
```
App runs at **http://localhost:5173**

---

## How it works

1. **Sign up** — pick a username, get $100 in credits
2. **Create a lobby** — name it, describe the bet, set the stake per person
3. **Invite friends** — share the 6-char code OR click "Copy invite link" for a one-click URL
4. **Friends join** using the code or invite link — stake is deducted from their balance
5. **Creator declares the winner** — pot is paid out automatically
6. Live updates via WebSocket — everyone sees joins and results instantly

---

## Friends System

- Go to **Friends** tab on the home screen
- Search for any user by username and send a friend request
- Accept incoming requests to add friends
- In a lobby, use **"Copy invite link"** — sends them a URL that auto-joins the lobby when opened

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/users` | Create user (username must be unique) |
| GET | `/users/:id` | Get user + balance |
| GET | `/users/search/by-username?username=` | Find user by username |
| GET | `/users/:id/friends` | Get friends + pending requests |
| POST | `/users/:id/friends/request` | Send friend request |
| POST | `/users/:id/friends/accept` | Accept friend request |
| DELETE | `/users/:id/friends/request/:from_id` | Decline friend request |
| POST | `/lobbies` | Create lobby |
| GET | `/lobbies/:id` | Get lobby |
| POST | `/lobbies/:id/join` | Join lobby |
| POST | `/lobbies/:id/resolve` | Declare winner |
| WS | `/ws/:id` | Live lobby updates |

---

## Next steps

- [ ] Swap in-memory DB for PostgreSQL (SQLAlchemy)
- [ ] Add real payment processing (Stripe)
- [ ] Lobby chat
- [ ] Bet history / stats page
- [ ] Mobile app (React Native)
