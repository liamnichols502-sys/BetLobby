import { useState, useEffect } from "react";
import { useUser } from "../context/UserContext";
import { api } from "../api";

const AMOUNTS = [10, 25, 50, 100];

export default function Wallet({ onBack }) {
  const { user, refreshUser } = useUser();
  const [amount, setAmount] = useState(25);
  const [custom, setCustom] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [toast, setToast] = useState("");
  const [deposits, setDeposits] = useState([]);

  useEffect(() => {
    // Handle Stripe redirect back
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success") {
      window.history.replaceState({}, "", window.location.pathname);
      setToast("Payment successful! Your balance will update shortly.");
      setTimeout(() => refreshUser(), 2000);
    } else if (params.get("payment") === "cancel") {
      window.history.replaceState({}, "", window.location.pathname);
      setToast("Payment cancelled.");
    }

    api.getPaymentHistory().then(setDeposits).catch(() => {});
  }, []);

  const handleDeposit = async () => {
    const finalAmount = custom ? parseFloat(custom) : amount;
    if (!finalAmount || finalAmount < 5) {
      setErr("Minimum deposit is $5");
      return;
    }
    setErr(""); setLoading(true);
    try {
      const { url } = await api.createCheckoutSession(finalAmount);
      window.location.href = url;
    } catch (e) {
      setErr(e.message);
      setLoading(false);
    }
  };

  return (
    <div className="screen">
      <header className="topbar">
        <button className="btn-ghost" onClick={onBack}>← Back</button>
        <span className="logo-text small">🎯 BetLobby</span>
        <span className="balance">${user.balance?.toFixed(2)}</span>
      </header>

      {toast && <div className="toast">{toast}</div>}

      <main className="lobby-main">
        <div className="pot-display">
          <span className="pot-label">Your balance</span>
          <span className="pot-amount">${user.balance?.toFixed(2)}</span>
        </div>

        <div className="card form">
          <h3 className="section-title">Add funds</h3>

          <div className="amount-grid">
            {AMOUNTS.map(a => (
              <button
                key={a}
                className={`btn ${amount === a && !custom ? "btn-primary" : "btn-secondary"}`}
                onClick={() => { setAmount(a); setCustom(""); }}
              >
                ${a}
              </button>
            ))}
          </div>

          <label className="label" style={{ marginTop: "12px" }}>Or enter amount</label>
          <input
            className="input"
            type="number"
            min="5"
            step="1"
            placeholder="Custom amount ($5 minimum)"
            value={custom}
            onChange={e => setCustom(e.target.value)}
          />

          {err && <p className="err">{err}</p>}

          <button className="btn btn-primary" onClick={handleDeposit} disabled={loading}
            style={{ marginTop: "12px" }}>
            {loading ? "Redirecting to Stripe…" : `Deposit $${custom || amount} →`}
          </button>
          <p className="muted" style={{ marginTop: "8px", fontSize: "12px", textAlign: "center" }}>
            Secured by Stripe. Test card: 4242 4242 4242 4242
          </p>
        </div>

        {deposits.length > 0 && (
          <div className="card">
            <h3 className="section-title">Deposit history</h3>
            <ul className="member-list">
              {deposits.map((d, i) => (
                <li key={i} className="member-row">
                  <span className="member-name">💳 Deposit</span>
                  <span className="stake-tag">+${d.amount.toFixed(2)}</span>
                  <span className="muted" style={{ fontSize: "12px" }}>
                    {new Date(d.created_at).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
