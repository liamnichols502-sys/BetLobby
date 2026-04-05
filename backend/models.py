from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from database import Base


def gen_id(length=8):
    return str(uuid.uuid4()).replace("-", "")[:length]


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=gen_id)
    username = Column(String, unique=True, nullable=False, index=True)
    email = Column(String, nullable=True, unique=True, index=True)
    hashed_password = Column(String, nullable=False)
    balance = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)


class Lobby(Base):
    __tablename__ = "lobbies"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    bet_description = Column(String, nullable=False)
    stake = Column(Float, nullable=False)
    status = Column(String, default="open")   # open | resolved
    pot = Column(Float, default=0.0)
    creator_id = Column(String, ForeignKey("users.id"), nullable=False)
    winner_id = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    members = relationship("LobbyMember", back_populates="lobby")
    creator = relationship("User", foreign_keys=[creator_id])
    winner = relationship("User", foreign_keys=[winner_id])


class LobbyMember(Base):
    __tablename__ = "lobby_members"

    lobby_id = Column(String, ForeignKey("lobbies.id"), primary_key=True)
    user_id = Column(String, ForeignKey("users.id"), primary_key=True)
    joined_at = Column(DateTime, default=datetime.utcnow)

    lobby = relationship("Lobby", back_populates="members")
    user = relationship("User")


class Friendship(Base):
    __tablename__ = "friendships"

    user_id = Column(String, ForeignKey("users.id"), primary_key=True)
    friend_id = Column(String, ForeignKey("users.id"), primary_key=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class FriendRequest(Base):
    __tablename__ = "friend_requests"

    from_id = Column(String, ForeignKey("users.id"), primary_key=True)
    to_id = Column(String, ForeignKey("users.id"), primary_key=True)
    sent_at = Column(DateTime, default=datetime.utcnow)

    sender = relationship("User", foreign_keys=[from_id])


class DirectMessage(Base):
    __tablename__ = "direct_messages"

    id = Column(String, primary_key=True, default=gen_id)
    from_id = Column(String, ForeignKey("users.id"), nullable=False)
    to_id = Column(String, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    sender = relationship("User", foreign_keys=[from_id])


class StripePayment(Base):
    __tablename__ = "stripe_payments"

    id = Column(String, primary_key=True)   # Stripe checkout session ID
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    amount = Column(Float, nullable=False)  # dollars
    status = Column(String, default="pending")  # pending | completed | failed
    created_at = Column(DateTime, default=datetime.utcnow)
