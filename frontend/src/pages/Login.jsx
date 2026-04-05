import { useState } from "react";
import { useUser } from "../context/UserContext";
import Logo from "../components/Logo";

export default function Login() {
  const { login, signup } = useUser();
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
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
        await signup(username.trim(), password, email.trim());
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
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "4px" }}>
          <Logo size={56} />
        </div>
        <h1 className="logo-text" style={{ marginTop: "12px" }}>BetLobby</h1>
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
          {mode === "signup" && (
            <input
              className="input"
              type="email"
              placeholder="Email (optional — for welcome email)"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          )}
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
