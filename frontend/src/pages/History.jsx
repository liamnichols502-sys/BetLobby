import { useState, useEffect } from "react";
import { useUser } from "../context/UserContext";
import { api } from "../api";

export default function History({ onBack }) {
  const { user } = useUser();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getHistory(user.id)
      .then(setHistory)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalWon = history.filter(h => h.result === "won").reduce((s, h) => s + h.payout, 0);
  const totalLost = history.filter(h => h.result === "lost").reduce((s, h) => s + h.stake, 0);
  const wins = history.filter(h => h.result === "won").length;

  return (
    <div className="screen">
      <header className="topbar">
        <button className="btn-ghost" onClick={onBack}>← Back</button>
        <span className="logo-text small">🎯 BetLobby</span>
        <span className="balance">${user.balance?.toFixed(2)}</span>
      </header>

      <main className="lobby-main">
        <h2 className="home-title">Bet History</h2>

        {history.length > 0 && (
          <div className="stats-row">
            <div className="stat-card">
              <span className="stat-value">{history.length}</span>
              <span className="stat-label">Bets</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{wins}</span>
              <span className="stat-label">Wins</span>
            </div>
            <div className="stat-card win">
              <span className="stat-value">+${totalWon.toFixed(2)}</span>
              <span className="stat-label">Won</span>
            </div>
            <div className="stat-card loss">
              <span className="stat-value">-${totalLost.toFixed(2)}</span>
              <span className="stat-label">Lost</span>
            </div>
          </div>
        )}

        {loading && <p className="muted" style={{ textAlign: "center" }}>Loading…</p>}

        {!loading && history.length === 0 && (
          <div className="card" style={{ textAlign: "center", padding: "32px" }}>
            <p style={{ fontSize: "32px" }}>🎯</p>
            <p className="muted">No completed bets yet.</p>
            <p className="muted">Create or join a lobby to get started.</p>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {history.map((h) => (
            <div key={h.lobby_id} className={`card history-card ${h.result}`}>
              <div className="history-top">
                <span className="history-name">{h.name}</span>
                <span className={`history-badge ${h.result}`}>
                  {h.result === "won" ? "🏆 Won" : "💸 Lost"}
                </span>
              </div>
              <p className="bet-desc" style={{ margin: "4px 0 8px" }}>"{h.bet_description}"</p>
              <div className="history-bottom">
                <span className="muted">Stake: ${h.stake.toFixed(2)}</span>
                <span className="muted">Pot: ${h.pot.toFixed(2)}</span>
                {h.result === "won" && (
                  <span style={{ color: "var(--success)", fontWeight: 600 }}>
                    +${h.payout.toFixed(2)}
                  </span>
                )}
                <span className="muted">{new Date(h.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
