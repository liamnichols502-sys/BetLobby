import { useState, useEffect, useRef } from "react";
import { useUser } from "../context/UserContext";
import { api, createUserSocket } from "../api";
import Logo from "../components/Logo";

export default function Chat({ friendId: initialFriendId, onBack }) {
  const { user } = useUser();

  const [friends, setFriends] = useState([]);
  const [activeFriend, setActiveFriend] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState({});
  const messagesEndRef = useRef(null);
  const wsRef = useRef(null);
  const inputRef = useRef(null);

  // Load friends list
  useEffect(() => {
    if (!user) return;
    api.getFriends(user.id).then(data => {
      const list = data.friends || [];
      setFriends(list);
      // If we came from a specific friend link, auto-select them
      if (initialFriendId) {
        const f = list.find(f => f.id === initialFriendId);
        if (f) setActiveFriend(f);
      }
    });
  }, [user]);

  // Connect user WebSocket for incoming real-time messages
  useEffect(() => {
    if (!user) return;
    const ws = createUserSocket(user.id, (msg) => {
      if (msg.type === "new_message") {
        const m = msg.message;
        setMessages(prev => {
          if (activeFriend && m.from_id === activeFriend.id) {
            return [...prev, m];
          }
          return prev;
        });
        setUnread(prev => ({
          ...prev,
          [m.from_id]: activeFriend?.id === m.from_id ? 0 : (prev[m.from_id] || 0) + 1,
        }));
      }
    });
    wsRef.current = ws;
    return () => ws.close();
  }, [user, activeFriend]);

  // Load messages when active friend changes
  useEffect(() => {
    if (!activeFriend) return;
    setMessages([]);
    setUnread(prev => ({ ...prev, [activeFriend.id]: 0 }));
    api.getMessages(activeFriend.id).then(setMessages);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [activeFriend?.id]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (e) => {
    e.preventDefault();
    if (!input.trim() || !activeFriend || sending) return;
    setSending(true);
    const content = input.trim();
    setInput("");
    try {
      const msg = await api.sendMessage(activeFriend.id, content);
      setMessages(prev => [...prev, msg]);
    } catch {
      setInput(content);
    } finally {
      setSending(false);
    }
  };

  if (!user) return null;

  return (
    <div className="screen" style={{ padding: 0, height: "100vh", overflow: "hidden", flexDirection: "column" }}>
      {/* Top bar */}
      <header className="topbar">
        <Logo size={32} showText textSize={16} />
        <button className="btn-ghost" onClick={onBack}>← Back</button>
      </header>

      {/* Chat layout */}
      <div className="chat-layout">
        {/* Sidebar */}
        <div className="chat-sidebar">
          <div className="chat-sidebar-header">Messages</div>
          {friends.length === 0 ? (
            <p style={{ padding: "16px", color: "var(--muted)", fontSize: "13px" }}>
              Add friends from home to start chatting.
            </p>
          ) : (
            friends.map(f => (
              <button
                key={f.id}
                className={`chat-friend-row ${activeFriend?.id === f.id ? "active" : ""}`}
                onClick={() => setActiveFriend(f)}
              >
                <div className="chat-friend-avatar">{f.username[0].toUpperCase()}</div>
                <span className="chat-friend-name">{f.username}</span>
                {unread[f.id] > 0 && (
                  <span className="chat-unread">{unread[f.id]}</span>
                )}
              </button>
            ))
          )}
        </div>

        {/* Main area */}
        <div className="chat-main">
          {!activeFriend ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: "12px" }}>
              <Logo size={56} />
              <p style={{ color: "var(--muted)", fontSize: "14px" }}>Select a friend to start chatting</p>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="chat-header">
                <div className="chat-friend-avatar" style={{ width: 38, height: 38, fontSize: 16 }}>
                  {activeFriend.username[0].toUpperCase()}
                </div>
                <span>{activeFriend.username}</span>
              </div>

              {/* Messages */}
              <div className="chat-messages">
                {messages.length === 0 && (
                  <p className="chat-empty">Say hi to {activeFriend.username}! 👋</p>
                )}
                {messages.map(m => (
                  <div key={m.id} className={`chat-bubble-wrap ${m.from_id === user.id ? "mine" : "theirs"}`}>
                    <div className={`chat-bubble ${m.from_id === user.id ? "mine" : "theirs"}`}>
                      {m.content}
                    </div>
                    <span className="chat-time">
                      {new Date(m.created_at + "Z").toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input bar */}
              <form className="chat-input-bar" onSubmit={send}>
                <input
                  ref={inputRef}
                  className="input"
                  placeholder={`Message ${activeFriend.username}…`}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                />
                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={!input.trim() || sending}
                >
                  {sending ? "…" : "Send"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
