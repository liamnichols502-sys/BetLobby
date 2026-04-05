import { useState } from "react";
import { useUser } from "../context/UserContext";

export default function Login() {
  const { login, signup } = useUser();
  const [mode, setMode] = useState("login"); // login | signup
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const handle = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setLoading(true);
    setErr("");
    try {
      if (mode === "signup") {
        await signup(username.trim(), password);
      } else {
        await login(username.trim(), password);
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen center">
      <div className="login-card">
        <div className="logo-mark">🎯</div>
        <h1 className="logo-text">BetLobby</h1>
        <p className="tagline">Settle it. No Venmo needed.</p>

        <div className="tabs" style={{ marginBottom: "16px" }}>
          <button className={`tab ${mode === "login" ? "active" : ""}`}
            onClick={() => { setMode("login"); setErr(""); }}>
            Log in
          </button>
          <button className={`tab ${mode === "signup" ? "active" : ""}`}
            onClick={() => { setMode("signup"); setErr(""); }}>
            Sign up
          </button>
        </div>

        <form onSubmit={handle} className="login-form">
          <input
            className="input"
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            maxLength={20}
            autoFocus
          />
          <input
            className="input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          {err && <p className="err">{err}</p>}
          <button className="btn btn-primary"
            disabled={loading || !username.trim() || !password}>
            {loading ? "…" : mode === "signup" ? "Create account →" : "Log in →"}
          </button>
        </form>

        {mode === "signup" && (
          <p className="fine-print">Deposit funds after signing up to start betting.</p>
        )}
      </div>
    </div>
  );
}
