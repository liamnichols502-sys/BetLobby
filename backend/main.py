from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
import uuid, json, os, stripe
from datetime import datetime
from dotenv import load_dotenv
import sendgrid
from sendgrid.helpers.mail import Mail

from database import engine, get_db, Base
from models import User, Lobby, LobbyMember, Friendship, FriendRequest, StripePayment, DirectMessage
from auth import hash_password, verify_password, create_token, get_current_user

load_dotenv()

stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY", "")
SENDGRID_FROM_EMAIL = os.getenv("SENDGRID_FROM_EMAIL", "noreply@betlobby.app")


def send_welcome_email(to_email: str, username: str):
    if not SENDGRID_API_KEY:
        return
    try:
        sg = sendgrid.SendGridAPIClient(api_key=SENDGRID_API_KEY)
        message = Mail(
            from_email=SENDGRID_FROM_EMAIL,
            to_emails=to_email,
            subject="Welcome to BetLobby! 🎯",
            html_content=f"""
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0a0a0f;color:#f0f0f0;padding:40px;border-radius:16px;">
              <h1 style="color:#c8ff00;font-size:28px;margin-bottom:8px;">Welcome, {username}!</h1>
              <p style="color:#999;margin-bottom:24px;">Your BetLobby account is ready. Settle bets with friends — no Venmo needed.</p>
              <a href="{FRONTEND_URL}" style="display:inline-block;background:#c8ff00;color:#0a0a0f;font-weight:700;padding:12px 24px;border-radius:8px;text-decoration:none;">Start Betting →</a>
              <p style="color:#555;font-size:12px;margin-top:32px;">You're receiving this because you signed up at BetLobby.</p>
            </div>
            """,
        )
        sg.send(message)
    except Exception as e:
        print(f"SendGrid error: {e}")

# Create all DB tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(title="BetLobby API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── WebSocket manager ───────────────────────────────────────────────────────

class ConnectionManager:
    def __init__(self):
        self.connections: dict[str, list[WebSocket]] = {}

    async def connect(self, lobby_id: str, ws: WebSocket):
        await ws.accept()
        self.connections.setdefault(lobby_id, []).append(ws)

    def disconnect(self, lobby_id: str, ws: WebSocket):
        if lobby_id in self.connections:
            try:
                self.connections[lobby_id].remove(ws)
            except ValueError:
                pass

    async def broadcast(self, lobby_id: str, message: dict):
        for ws in self.connections.get(lobby_id, []):
            try:
                await ws.send_text(json.dumps(message))
            except Exception:
                pass

manager = ConnectionManager()


class UserConnectionManager:
    def __init__(self):
        self.connections: dict[str, WebSocket] = {}

    async def connect(self, user_id: str, ws: WebSocket):
        await ws.accept()
        self.connections[user_id] = ws

    def disconnect(self, user_id: str):
        self.connections.pop(user_id, None)

    async def send_to_user(self, user_id: str, message: dict):
        ws = self.connections.get(user_id)
        if ws:
            try:
                await ws.send_text(json.dumps(message))
            except Exception:
                pass

user_manager = UserConnectionManager()


# ─── Serializers ─────────────────────────────────────────────────────────────

def serialize_user(user: User) -> dict:
    return {
        "id": user.id,
        "username": user.username,
        "balance": user.balance,
        "created_at": user.created_at.isoformat(),
    }

def serialize_lobby(lobby: Lobby, db: Session) -> dict:
    members = []
    for m in lobby.members:
        u = db.query(User).filter(User.id == m.user_id).first()
        members.append({
            "user_id": m.user_id,
            "username": u.username if u else "Unknown",
            "joined_at": m.joined_at.isoformat(),
        })

    winner = None
    if lobby.winner_id:
        w = db.query(User).filter(User.id == lobby.winner_id).first()
        if w:
            winner = {"user_id": w.id, "username": w.username}

    return {
        "id": lobby.id,
        "name": lobby.name,
        "bet_description": lobby.bet_description,
        "stake": lobby.stake,
        "status": lobby.status,
        "created_at": lobby.created_at.isoformat(),
        "members": members,
        "pot": lobby.pot,
        "winner": winner,
        "creator_id": lobby.creator_id,
    }


# ─── Request models ───────────────────────────────────────────────────────────

class SignupRequest(BaseModel):
    username: str
    password: str
    email: str = ""

class SendMessageBody(BaseModel):
    content: str

class LoginRequest(BaseModel):
    username: str
    password: str

class CreateLobbyRequest(BaseModel):
    name: str
    bet_description: str
    stake: float

class ResolveRequest(BaseModel):
    winner_id: str

class FriendRequestBody(BaseModel):
    target_id: str

class AcceptFriendBody(BaseModel):
    from_id: str

class CheckoutRequest(BaseModel):
    amount: float  # dollars


# ─── Auth ─────────────────────────────────────────────────────────────────────

@app.post("/auth/signup")
def signup(req: SignupRequest, db: Session = Depends(get_db)):
    if len(req.username.strip()) < 2:
        raise HTTPException(400, "Username must be at least 2 characters")
    if len(req.password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")
    if db.query(User).filter(User.username == req.username.strip()).first():
        raise HTTPException(400, "Username already taken")
    email = req.email.strip().lower() if req.email else None
    if email and db.query(User).filter(User.email == email).first():
        raise HTTPException(400, "Email already in use")

    user = User(username=req.username.strip(), hashed_password=hash_password(req.password), email=email)
    db.add(user)
    db.commit()
    db.refresh(user)
    if email:
        send_welcome_email(email, user.username)
    return {"token": create_token(user.id), "user": serialize_user(user)}


@app.post("/auth/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == req.username.strip()).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(401, "Invalid username or password")
    return {"token": create_token(user.id), "user": serialize_user(user)}


@app.get("/auth/me")
def me(current_user: User = Depends(get_current_user)):
    return serialize_user(current_user)


# ─── Users ────────────────────────────────────────────────────────────────────

@app.get("/users/search/by-username")
def search_user(username: str, db: Session = Depends(get_db),
                _: User = Depends(get_current_user)):
    user = db.query(User).filter(User.username == username.strip()).first()
    if not user:
        raise HTTPException(404, "No user with that username")
    return {"id": user.id, "username": user.username}


@app.get("/users/{user_id}")
def get_user(user_id: str, db: Session = Depends(get_db),
             _: User = Depends(get_current_user)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    return serialize_user(user)


# ─── Friends ─────────────────────────────────────────────────────────────────

@app.post("/users/{user_id}/friends/request")
def send_friend_request(user_id: str, body: FriendRequestBody,
                        db: Session = Depends(get_db),
                        current_user: User = Depends(get_current_user)):
    if current_user.id != user_id:
        raise HTTPException(403, "Forbidden")
    target = db.query(User).filter(User.id == body.target_id).first()
    if not target:
        raise HTTPException(404, "User not found")
    if body.target_id == user_id:
        raise HTTPException(400, "Cannot add yourself")
    if db.query(Friendship).filter_by(user_id=user_id, friend_id=body.target_id).first():
        raise HTTPException(400, "Already friends")
    if db.query(FriendRequest).filter_by(from_id=user_id, to_id=body.target_id).first():
        raise HTTPException(400, "Request already sent")

    db.add(FriendRequest(from_id=user_id, to_id=body.target_id))
    db.commit()
    return {"message": f"Friend request sent to {target.username}"}


@app.post("/users/{user_id}/friends/accept")
def accept_friend(user_id: str, body: AcceptFriendBody,
                  db: Session = Depends(get_db),
                  current_user: User = Depends(get_current_user)):
    if current_user.id != user_id:
        raise HTTPException(403, "Forbidden")
    req = db.query(FriendRequest).filter_by(from_id=body.from_id, to_id=user_id).first()
    if not req:
        raise HTTPException(400, "No pending request from this user")
    requester = db.query(User).filter(User.id == body.from_id).first()
    db.delete(req)
    db.add(Friendship(user_id=user_id, friend_id=body.from_id))
    db.add(Friendship(user_id=body.from_id, friend_id=user_id))
    db.commit()
    return {"message": f"You and {requester.username} are now friends"}


@app.delete("/users/{user_id}/friends/request/{from_id}")
def decline_friend(user_id: str, from_id: str,
                   db: Session = Depends(get_db),
                   current_user: User = Depends(get_current_user)):
    if current_user.id != user_id:
        raise HTTPException(403, "Forbidden")
    req = db.query(FriendRequest).filter_by(from_id=from_id, to_id=user_id).first()
    if req:
        db.delete(req)
        db.commit()
    return {"message": "Request declined"}


@app.get("/users/{user_id}/friends")
def get_friends(user_id: str, db: Session = Depends(get_db),
                current_user: User = Depends(get_current_user)):
    if current_user.id != user_id:
        raise HTTPException(403, "Forbidden")
    friendships = db.query(Friendship).filter(Friendship.user_id == user_id).all()
    friends = []
    for f in friendships:
        u = db.query(User).filter(User.id == f.friend_id).first()
        if u:
            friends.append({"id": u.id, "username": u.username})
    incoming = db.query(FriendRequest).filter(FriendRequest.to_id == user_id).all()
    pending = []
    for r in incoming:
        s = db.query(User).filter(User.id == r.from_id).first()
        if s:
            pending.append({"from_id": r.from_id, "from_username": s.username,
                            "sent_at": r.sent_at.isoformat()})
    return {"friends": friends, "friend_requests": pending}


# ─── Lobbies ──────────────────────────────────────────────────────────────────

@app.post("/lobbies")
def create_lobby(req: CreateLobbyRequest, db: Session = Depends(get_db),
                 current_user: User = Depends(get_current_user)):
    if req.stake <= 0:
        raise HTTPException(400, "Stake must be greater than $0")
    if current_user.balance < req.stake:
        raise HTTPException(400, "Insufficient balance — deposit funds in your wallet first")

    lobby_id = str(uuid.uuid4())[:6].upper()
    current_user.balance -= req.stake
    lobby = Lobby(id=lobby_id, name=req.name, bet_description=req.bet_description,
                  stake=req.stake, pot=req.stake, creator_id=current_user.id)
    db.add(lobby)
    db.add(LobbyMember(lobby_id=lobby_id, user_id=current_user.id))
    db.commit()
    db.refresh(lobby)
    return serialize_lobby(lobby, db)


@app.get("/lobbies/{lobby_id}")
def get_lobby(lobby_id: str, db: Session = Depends(get_db),
              _: User = Depends(get_current_user)):
    lobby = db.query(Lobby).filter(Lobby.id == lobby_id.upper()).first()
    if not lobby:
        raise HTTPException(404, "Lobby not found")
    return serialize_lobby(lobby, db)


@app.post("/lobbies/{lobby_id}/join")
async def join_lobby(lobby_id: str, db: Session = Depends(get_db),
                     current_user: User = Depends(get_current_user)):
    lobby = db.query(Lobby).filter(Lobby.id == lobby_id.upper()).first()
    if not lobby:
        raise HTTPException(404, "Lobby not found")
    if lobby.status != "open":
        raise HTTPException(400, "Lobby is not open")
    if current_user.balance < lobby.stake:
        raise HTTPException(400, "Insufficient balance — deposit funds in your wallet first")
    if db.query(LobbyMember).filter_by(lobby_id=lobby.id, user_id=current_user.id).first():
        raise HTTPException(400, "Already in this lobby")

    current_user.balance -= lobby.stake
    lobby.pot += lobby.stake
    db.add(LobbyMember(lobby_id=lobby.id, user_id=current_user.id))
    db.commit()
    db.refresh(lobby)

    data = serialize_lobby(lobby, db)
    await manager.broadcast(lobby.id, {"type": "member_joined", "lobby": data})
    return data


@app.post("/lobbies/{lobby_id}/resolve")
async def resolve_lobby(lobby_id: str, req: ResolveRequest,
                        db: Session = Depends(get_db),
                        current_user: User = Depends(get_current_user)):
    lobby = db.query(Lobby).filter(Lobby.id == lobby_id.upper()).first()
    if not lobby:
        raise HTTPException(404, "Lobby not found")
    if lobby.status != "open":
        raise HTTPException(400, "Lobby already resolved")
    if lobby.creator_id != current_user.id:
        raise HTTPException(403, "Only the lobby creator can declare a winner")

    winner = db.query(User).filter(User.id == req.winner_id).first()
    if not winner:
        raise HTTPException(404, "Winner not found")
    if not db.query(LobbyMember).filter_by(lobby_id=lobby.id, user_id=req.winner_id).first():
        raise HTTPException(400, "Winner is not in this lobby")

    winner.balance += lobby.pot
    lobby.status = "resolved"
    lobby.winner_id = winner.id
    db.commit()
    db.refresh(lobby)

    data = serialize_lobby(lobby, db)
    await manager.broadcast(lobby.id, {"type": "resolved", "lobby": data})
    return data


@app.get("/users/{user_id}/history")
def get_history(user_id: str, db: Session = Depends(get_db),
                current_user: User = Depends(get_current_user)):
    if current_user.id != user_id:
        raise HTTPException(403, "Forbidden")
    memberships = db.query(LobbyMember).filter(LobbyMember.user_id == user_id).all()
    history = []
    for m in memberships:
        lobby = db.query(Lobby).filter(Lobby.id == m.lobby_id).first()
        if lobby and lobby.status == "resolved":
            won = lobby.winner_id == user_id
            history.append({
                "lobby_id": lobby.id,
                "name": lobby.name,
                "bet_description": lobby.bet_description,
                "stake": lobby.stake,
                "pot": lobby.pot,
                "result": "won" if won else "lost",
                "payout": lobby.pot if won else 0,
                "created_at": lobby.created_at.isoformat(),
            })
    history.sort(key=lambda x: x["created_at"], reverse=True)
    return history


# ─── Stripe ───────────────────────────────────────────────────────────────────

@app.post("/payments/create-checkout-session")
def create_checkout_session(req: CheckoutRequest,
                            current_user: User = Depends(get_current_user),
                            db: Session = Depends(get_db)):
    if not stripe.api_key or "YOUR_KEY" in stripe.api_key:
        raise HTTPException(503, "Stripe is not configured — add your keys to .env")
    if req.amount < 5:
        raise HTTPException(400, "Minimum deposit is $5")

    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": "usd",
                    "product_data": {"name": "BetLobby Wallet Deposit"},
                    "unit_amount": int(req.amount * 100),
                },
                "quantity": 1,
            }],
            mode="payment",
            success_url=f"{FRONTEND_URL}/wallet?payment=success",
            cancel_url=f"{FRONTEND_URL}/wallet?payment=cancel",
            metadata={"user_id": current_user.id, "amount": str(req.amount)},
        )
        db.add(StripePayment(id=session.id, user_id=current_user.id, amount=req.amount))
        db.commit()
        return {"url": session.url}
    except stripe.error.StripeError as e:
        raise HTTPException(400, str(e))


@app.post("/payments/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")
    try:
        event = stripe.Webhook.construct_event(payload, sig, STRIPE_WEBHOOK_SECRET)
    except Exception:
        raise HTTPException(400, "Invalid webhook")

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        user_id = session["metadata"].get("user_id")
        amount = float(session["metadata"].get("amount", 0))
        user = db.query(User).filter(User.id == user_id).first()
        payment = db.query(StripePayment).filter(StripePayment.id == session["id"]).first()
        if user and payment and payment.status == "pending":
            user.balance += amount
            payment.status = "completed"
            db.commit()

    return {"received": True}


@app.get("/payments/history")
def payment_history(current_user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    payments = db.query(StripePayment).filter(
        StripePayment.user_id == current_user.id,
        StripePayment.status == "completed",
    ).order_by(StripePayment.created_at.desc()).all()
    return [{"amount": p.amount, "created_at": p.created_at.isoformat()} for p in payments]


# ─── Chat ─────────────────────────────────────────────────────────────────────

@app.get("/chat/{friend_id}")
def get_chat(friend_id: str, db: Session = Depends(get_db),
             current_user: User = Depends(get_current_user)):
    messages = db.query(DirectMessage).filter(
        or_(
            and_(DirectMessage.from_id == current_user.id, DirectMessage.to_id == friend_id),
            and_(DirectMessage.from_id == friend_id, DirectMessage.to_id == current_user.id),
        )
    ).order_by(DirectMessage.created_at.asc()).all()
    return [
        {"id": m.id, "from_id": m.from_id, "content": m.content,
         "created_at": m.created_at.isoformat()}
        for m in messages
    ]


@app.post("/chat/{friend_id}")
async def send_message(friend_id: str, body: SendMessageBody,
                       db: Session = Depends(get_db),
                       current_user: User = Depends(get_current_user)):
    if not body.content.strip():
        raise HTTPException(400, "Message cannot be empty")
    friend = db.query(User).filter(User.id == friend_id).first()
    if not friend:
        raise HTTPException(404, "User not found")
    msg = DirectMessage(from_id=current_user.id, to_id=friend_id,
                        content=body.content.strip())
    db.add(msg)
    db.commit()
    db.refresh(msg)
    serialized = {"id": msg.id, "from_id": msg.from_id, "content": msg.content,
                  "created_at": msg.created_at.isoformat()}
    await user_manager.send_to_user(
        friend_id,
        {"type": "new_message", "message": serialized, "from_username": current_user.username},
    )
    return serialized


# ─── WebSocket ────────────────────────────────────────────────────────────────

@app.websocket("/ws/{lobby_id}")
async def websocket_endpoint(websocket: WebSocket, lobby_id: str):
    await manager.connect(lobby_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(lobby_id, websocket)


@app.websocket("/ws/user/{user_id}")
async def user_websocket(websocket: WebSocket, user_id: str):
    await user_manager.connect(user_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        user_manager.disconnect(user_id)
