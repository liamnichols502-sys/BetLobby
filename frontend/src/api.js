const BASE = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:8000`;

function getToken() {
  return localStorage.getItem("betlobby_token") || "";
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };
}

async function handle(res) {
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Request failed");
  return data;
}

export const api = {
  // Auth
  signup: (username, password) =>
    fetch(`${BASE}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    }).then(handle),

  login: (username, password) =>
    fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    }).then(handle),

  getMe: () =>
    fetch(`${BASE}/auth/me`, { headers: authHeaders() }).then(handle),

  // Users
  getUser: (id) =>
    fetch(`${BASE}/users/${id}`, { headers: authHeaders() }).then(handle),

  searchUserByUsername: (username) =>
    fetch(`${BASE}/users/search/by-username?username=${encodeURIComponent(username)}`,
      { headers: authHeaders() }).then(handle),

  // Friends
  sendFriendRequest: (userId, targetId) =>
    fetch(`${BASE}/users/${userId}/friends/request`, {
      method: "POST", headers: authHeaders(),
      body: JSON.stringify({ target_id: targetId }),
    }).then(handle),

  acceptFriendRequest: (userId, fromId) =>
    fetch(`${BASE}/users/${userId}/friends/accept`, {
      method: "POST", headers: authHeaders(),
      body: JSON.stringify({ from_id: fromId }),
    }).then(handle),

  declineFriendRequest: (userId, fromId) =>
    fetch(`${BASE}/users/${userId}/friends/request/${fromId}`, {
      method: "DELETE", headers: authHeaders(),
    }).then(handle),

  getFriends: (userId) =>
    fetch(`${BASE}/users/${userId}/friends`, { headers: authHeaders() }).then(handle),

  // Lobbies
  createLobby: (data) =>
    fetch(`${BASE}/lobbies`, {
      method: "POST", headers: authHeaders(),
      body: JSON.stringify(data),
    }).then(handle),

  getLobby: (id) =>
    fetch(`${BASE}/lobbies/${id}`, { headers: authHeaders() }).then(handle),

  joinLobby: (lobbyId) =>
    fetch(`${BASE}/lobbies/${lobbyId}/join`, {
      method: "POST", headers: authHeaders(),
    }).then(handle),

  resolveLobby: (lobbyId, winnerId) =>
    fetch(`${BASE}/lobbies/${lobbyId}/resolve`, {
      method: "POST", headers: authHeaders(),
      body: JSON.stringify({ winner_id: winnerId }),
    }).then(handle),

  getHistory: (userId) =>
    fetch(`${BASE}/users/${userId}/history`, { headers: authHeaders() }).then(handle),

  // Payments
  createCheckoutSession: (amount) =>
    fetch(`${BASE}/payments/create-checkout-session`, {
      method: "POST", headers: authHeaders(),
      body: JSON.stringify({ amount }),
    }).then(handle),

  getPaymentHistory: () =>
    fetch(`${BASE}/payments/history`, { headers: authHeaders() }).then(handle),
};

export function createLobbySocket(lobbyId, onMessage) {
  const wsBase = (import.meta.env.VITE_API_URL || `http://${window.location.hostname}:8000`).replace("https://", "wss://").replace("http://", "ws://");
  const ws = new WebSocket(`${wsBase}/ws/${lobbyId}`);
  ws.onmessage = (e) => onMessage(JSON.parse(e.data));
  return ws;
}
