import {
  createContext,
  useContext,
  useMemo,
  useState,
} from "react";

import {
  loginUser,
  logoutUser,
} from "../api/authApi";

const AuthContext = createContext(null);

const AUTHENTICATED_KEY = "ticketing_authenticated";
const USERNAME_KEY = "ticketing_username";

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => localStorage.getItem(AUTHENTICATED_KEY) === "true"
  );

  const [username, setUsername] = useState(
    () => localStorage.getItem(USERNAME_KEY) || ""
  );

  const login = async (submittedUsername, password) => {
    await loginUser(submittedUsername, password);

    localStorage.setItem(AUTHENTICATED_KEY, "true");
    localStorage.setItem(USERNAME_KEY, submittedUsername);

    setUsername(submittedUsername);
    setIsAuthenticated(true);
  };

  const logout = async () => {
    try {
      await logoutUser();
    } finally {
      localStorage.removeItem(AUTHENTICATED_KEY);
      localStorage.removeItem(USERNAME_KEY);

      setUsername("");
      setIsAuthenticated(false);
    }
  };

  const value = useMemo(
    () => ({
      isAuthenticated,
      username,
      login,
      logout,
    }),
    [isAuthenticated, username]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}