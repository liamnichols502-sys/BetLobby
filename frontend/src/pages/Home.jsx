import { useState } from "react";
import { useUser } from "../context/UserContext";
import { api } from "../api";
import Friends from "../components/Friends";
import Logo from "../components/Logo";

export default function Home({ onEnterLobby, onWallet, onHistory, onChat }) {
  const { user, logout, refreshUser } = useUser();
  const [tab, setTab] = useState("create");
  const [form, setForm] = useState({ name: "", bet_description: "", stake: "" });
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const handleCreate = async (e) => {
    e.preventDefault();
    setErr(""); setLoading(true);
    try {
      const lobby = await api.createLobby({
        name: form.name,
        bet_description: form.bet_description,
        stake: parseFloat(form.stake),
      });
      await refreshUser();
      onEnterLobby(lobby.id);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    setErr(""); setLoading(true);
    try {
      await api.joinLobby(joinCode.trim().toUpperCase());
      await refreshUser();
      onEnterLobby(joinCode.trim().toUpperCase());
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen">
      <header className="topbar">
        <Logo size={36} showText={true} textSize={18} />
        <div className="user-pill">
          <button className="btn-ghost balance-btn" onClick={onWallet}>
            💰 ${user.balance?.toFixed(2)}
          </button>
          <span className="username">{user.username}</span>
          <button className="btn-ghost" onClick={onHistory} title="Bet history">📊</button>
          <button className="btn-ghost" onClick={onChat} title="Messages">💬</button>
          <button className="btn-ghost" onClick={logout}>Out</button>
        </div>
      </header>

      <main className="home-main">
        <h2 className="home-title">What's the bet?</h2>

        <div className="tabs">
          <button className={`tab ${tab === "create" ? "active" : ""}`}
            onClick={() => { setTab("create"); setErr(""); }}>
            Create lobby
          </button>
          <button className={`tab ${tab === "join" ? "active" : ""}`}
            onClick={() => { setTab("join"); setErr(""); }}>
            Join lobby
          </button>
          <button className={`tab ${tab === "friends" ? "active" : ""}`}
            onClick={() => { setTab("friends"); setErr(""); }}>
            Friends
          </button>
        </div>

        {tab === "create" && (
          <form className="card form" onSubmit={handleCreate}>
            <label className="label">Lobby name</label>
            <input className="input" placeholder="e.g. World Cup final" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />

            <label className="label">Bet description</label>
            <textarea className="input textarea" placeholder="e.g. Argentina wins the final"
              value={form.bet_description}
              onChange={e => setForm(f => ({ ...f, bet_description: e.target.value }))} required />

            <label className="label">Stake per person ($)</label>
            <input className="input" type="number" min="1" max={user.balance} step="0.01"
              placeholder="e.g. 10" value={form.stake}
              onChange={e => setForm(f => ({ ...f, stake: e.target.value }))} required />

            {user.balance < 1 && (
              <p className="err">
                No funds yet.{" "}
                <button type="button" className="btn-ghost"
                  style={{ textDecoration: "underline", padding: 0 }}
                  onClick={onWallet}>
                  Add funds to your wallet →
                </button>
              </p>
            )}

            {err && <p className="err">{err}</p>}
            <button className="btn btn-primary" disabled={loading || user.balance < 1}>
              {loading ? "Creating…" : "Create & lock in →"}
            </button>
          </form>
        )}

        {tab === "join" && (
          <form className="card form" onSubmit={handleJoin}>
            <label className="label">Lobby code</label>
            <input className="input code-input" placeholder="e.g. A3F9B2"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value)}
              maxLength={8} required autoCapitalize="characters" />
            {err && <p className="err">{err}</p>}
            <button className="btn btn-primary" disabled={loading || !joinCode.trim()}>
              {loading ? "Joining…" : "Join lobby →"}
            </button>
          </form>
        )}

        {tab === "friends" && <Friends />}
      </main>
    </div>
  );
}
