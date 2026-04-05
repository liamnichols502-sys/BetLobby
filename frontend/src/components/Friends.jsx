import { useState, useEffect } from "react";
import { api } from "../api";
import { useUser } from "../context/UserContext";

export default function Friends() {
  const { user } = useUser();
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [search, setSearch] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [searchErr, setSearchErr] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const loadFriends = async () => {
    try {
      const data = await api.getFriends(user.id);
      setFriends(data.friends);
      setRequests(data.friend_requests);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadFriends();
    const interval = setInterval(loadFriends, 5000); // poll for new requests
    return () => clearInterval(interval);
  }, []);

  const flash = (m) => {
    setMsg(m);
    setTimeout(() => setMsg(""), 3000);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setSearchErr(""); setSearchResult(null);
    if (!search.trim()) return;
    try {
      const result = await api.searchUserByUsername(search.trim());
      if (result.id === user.id) {
        setSearchErr("That's you!");
      } else if (friends.some(f => f.id === result.id)) {
        setSearchErr(`${result.username} is already your friend.`);
      } else {
        setSearchResult(result);
      }
    } catch {
      setSearchErr("No user found with that username.");
    }
  };

  const handleSendRequest = async (targetId) => {
    setLoading(true);
    try {
      await api.sendFriendRequest(user.id, targetId);
      flash("Friend request sent!");
      setSearchResult(null);
      setSearch("");
    } catch (e) {
      flash(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (fromId) => {
    try {
      await api.acceptFriendRequest(user.id, fromId);
      flash("Friend added!");
      loadFriends();
    } catch (e) {
      flash(e.message);
    }
  };

  const handleDecline = async (fromId) => {
    try {
      await api.declineFriendRequest(user.id, fromId);
      loadFriends();
    } catch {
      // ignore
    }
  };

  return (
    <div className="friends-panel">
      {msg && <div className="toast">{msg}</div>}

      {/* Pending requests */}
      {requests.length > 0 && (
        <div className="card friends-section">
          <h3 className="section-title">
            Friend Requests <span className="badge">{requests.length}</span>
          </h3>
          <ul className="friend-list">
            {requests.map(r => (
              <li key={r.from_id} className="friend-row">
                <span className="friend-name">👤 {r.from_username}</span>
                <div className="friend-actions">
                  <button className="btn btn-win small" onClick={() => handleAccept(r.from_id)}>Accept</button>
                  <button className="btn btn-ghost small" onClick={() => handleDecline(r.from_id)}>Decline</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Add friend search */}
      <div className="card friends-section">
        <h3 className="section-title">Add a Friend</h3>
        <form className="friend-search-form" onSubmit={handleSearch}>
          <input
            className="input"
            placeholder="Search by username"
            value={search}
            onChange={e => { setSearch(e.target.value); setSearchResult(null); setSearchErr(""); }}
          />
          <button className="btn btn-secondary" type="submit">Search</button>
        </form>

        {searchErr && <p className="err">{searchErr}</p>}

        {searchResult && (
          <div className="search-result-row">
            <span className="friend-name">👤 {searchResult.username}</span>
            <button
              className="btn btn-primary small"
              disabled={loading}
              onClick={() => handleSendRequest(searchResult.id)}
            >
              {loading ? "Sending…" : "Add Friend"}
            </button>
          </div>
        )}
      </div>

      {/* Friends list */}
      <div className="card friends-section">
        <h3 className="section-title">Friends {friends.length > 0 && `(${friends.length})`}</h3>
        {friends.length === 0 ? (
          <p className="muted">No friends yet. Search for someone above!</p>
        ) : (
          <ul className="friend-list">
            {friends.map(f => (
              <li key={f.id} className="friend-row">
                <span className="friend-name">👤 {f.username}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
