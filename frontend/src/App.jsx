import { useState, useEffect } from "react";
import { UserProvider, useUser } from "./context/UserContext";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Lobby from "./pages/Lobby";
import Wallet from "./pages/Wallet";
import History from "./pages/History";
import Chat from "./pages/Chat";
import "./index.css";

function AppInner() {
  const { user } = useUser();
  const [page, setPage] = useState("home"); // home | lobby | wallet | history | chat
  const [activeLobbyId, setActiveLobbyId] = useState(null);
  const [chatFriendId, setChatFriendId] = useState(null);

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

  if (page === "chat") {
    return <Chat friendId={chatFriendId} onBack={() => setPage("home")} />;
  }

  return (
    <Home
      onEnterLobby={(id) => { setActiveLobbyId(id); setPage("lobby"); }}
      onWallet={() => setPage("wallet")}
      onHistory={() => setPage("history")}
      onChat={() => { setChatFriendId(null); setPage("chat"); }}
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
