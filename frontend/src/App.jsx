import { useState, useEffect } from "react";
import { UserProvider, useUser } from "./context/UserContext";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Lobby from "./pages/Lobby";
import Wallet from "./pages/Wallet";
import History from "./pages/History";
import "./index.css";

function AppInner() {
  const { user } = useUser();
  const [page, setPage] = useState("home"); // home | lobby | wallet | history
  const [activeLobbyId, setActiveLobbyId] = useState(null);

  // Handle ?join=LOBBYCODE invite links
  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get("join");
    if (joinCode) {
      window.history.replaceState({}, "", window.location.pathname);
      setActiveLobbyId(joinCode.toUpperCase());
      setPage("lobby");
    }
  }, [user]);

  if (!user) return <Login />;

  if (page === "lobby" && activeLobbyId) {
    return (
      <Lobby
        lobbyId={activeLobbyId}
        onBack={() => { setPage("home"); setActiveLobbyId(null); }}
      />
    );
  }

  if (page === "wallet") {
    return <Wallet onBack={() => setPage("home")} />;
  }

  if (page === "history") {
    return <History onBack={() => setPage("home")} />;
  }

  return (
    <Home
      onEnterLobby={(id) => { setActiveLobbyId(id); setPage("lobby"); }}
      onWallet={() => setPage("wallet")}
      onHistory={() => setPage("history")}
    />
  );
}

export default function App() {
  return (
    <UserProvider>
      <AppInner />
    </UserProvider>
  );
}
