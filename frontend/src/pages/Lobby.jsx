import { useState, useEffect, useRef } from "react";
import { useUser } from "../context/UserContext";
import { api, createLobbySocket } from "../api";

export default function Lobby({ lobbyId, onBack }) {
  const { user, refreshUser } = useUser();
  const [lobby, setLobby] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [err, setErr] = useState("");
  const [toast, setToast] = useState("");
  const wsRef = useRef(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  useEffect(() => {
    api.getLobby(lobbyId).then(l => { setLobby(l); setLoading(false); });

    wsRef.current = createLobbySocket(lobbyId, (msg) => {
      if (msg.type === "member_joined") {
        setLobby(msg.lobby);
        showToast(`${msg.lobby.members.at(-1).username} joined the lobby!`);
      }
      if (msg.type === "resolved") {
        setLobby(msg.lobby);
        refreshUser();
        showToast(`🏆 ${msg.lobby.winner.username} wins the pot!`);
      }
    });

    return () => wsRef.current?.close();
  }, [lobbyId]);

  const handleResolve = async (winnerId) => {
    setErr(""); setResolving(true);
    try {
      const updated = await api.resolveLobby(lobbyId, winnerId);
      setLobby(updated);
      await refreshUser();
    } catch (e) {
      setErr(e.message);
    } finally {
      setResolving(false);
    }
  };

  const copyInviteLink = () => {
    const link = `${window.location.origin}?join=${lobby.id}`;
    navigator.clipboard.writeText(link).then(() => showToast("Invite link copied!"));
  };

  const copyCode = () => {
    navigator.clipboard.writeText(lobby.id).then(() => showToast("Code copied!"));
  };

  if (loading) return <div className="screen center"><p className="muted">Loading lobby…</p></div>;
  if (!lobby) return <div className="screen center"><p className="muted">Lobby not found.</p></div>;

  const isCreator = lobby.creator_id === user.id;
  const isResolved = lobby.status === "resolved";

  return (
    <div className="screen">
      <header className="topbar">
        <button className="btn-ghost" onClick={onBack}>← Back</button>
        <span className="logo-text small">🎯 BetLobby</span>
        <span className="balance">${user.balance?.toFixed(2)}</span>
      </header>

      {toast && <div className="toast">{toast}</div>}

      <main className="lobby-main">
        <div className="lobby-header">
          <div className="lobby-code-badge">{lobby.id}</div>
          <h2 className="lobby-name">{lobby.name}</h2>
          <p className="bet-desc">"{lobby.bet_description}"</p>
          <div className={`status-pill ${isResolved ? "resolved" : "open"}`}>
            {isResolved ? "Resolved" : "Open"}
          </div>
        </div>

        <div className="pot-display">
          <span className="pot-label">Total pot</span>
          <span className="pot-amount">${lobby.pot.toFixed(2)}</span>
        </div>

        <div className="card">
          <h3 className="section-title">Players ({lobby.members.length})</h3>
          <ul className="member-list">
            {lobby.members.map((m, i) => (
              <li key={m.user_id} className="member-row">
                <span className="member-name">
                  {i === 0 && <span className="crown">👑 </span>}
                  {m.username}
                  {m.user_id === user.id && <span className="you-badge"> you</span>}
                </span>
                <span className="stake-tag">${lobby.stake.toFixed(2)}</span>
                {isCreator && !isResolved && (
                  <button className="btn btn-win"
                    onClick={() => handleResolve(m.user_id)}
                    disabled={resolving}>
                    {resolving ? "…" : m.user_id === user.id ? "🏆 I won" : "🏆 Won"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>

        {isResolved && lobby.winner && (
          <div className="winner-card">
            <div className="winner-trophy">🏆</div>
            <p className="winner-label">Winner</p>
            <p className="winner-name">{lobby.winner.username}</p>
            <p className="winner-amount">+${lobby.pot.toFixed(2)}</p>
          </div>
        )}

        {!isResolved && (
          <div className="share-hint card">
            <p className="label">Invite friends to this lobby</p>
            <div className="big-code">{lobby.id}</div>
            <div className="share-buttons">
              <button className="btn btn-primary" onClick={copyInviteLink}>
                🔗 Copy invite link
              </button>
              <button className="btn btn-secondary" onClick={copyCode}>
                Copy code
              </button>
            </div>
          </div>
        )}

        {err && <p className="err">{err}</p>}
      </main>
    </div>
  );
}
