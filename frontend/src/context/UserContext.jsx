import { createContext, useContext, useState } from "react";
import { api } from "../api";

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("betlobby_user");
    return saved ? JSON.parse(saved) : null;
  });

  const saveUser = (u) => {
    localStorage.setItem("betlobby_user", JSON.stringify(u));
    setUser(u);
  };

  const signup = async (username, password, email = "") => {
    const { token, user: u } = await api.signup(username, password, email);
    localStorage.setItem("betlobby_token", token);
    saveUser(u);
    return u;
  };

  const login = async (username, password) => {
    const { token, user: u } = await api.login(username, password);
    localStorage.setItem("betlobby_token", token);
    saveUser(u);
    return u;
  };

  const refreshUser = async () => {
    if (!user) return;
    const updated = await api.getMe();
    saveUser(updated);
  };

  const logout = () => {
    localStorage.removeItem("betlobby_user");
    localStorage.removeItem("betlobby_token");
    setUser(null);
  };

  return (
    <UserContext.Provider value={{ user, signup, login, logout, refreshUser }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);
