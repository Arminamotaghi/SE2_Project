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
const ROLE_KEY = "ticketing_role";

function normalizeRole(role) {
  return String(role || "customer")
    .trim()
    .toLowerCase();
}

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => localStorage.getItem(AUTHENTICATED_KEY) === "true"
  );

  const [username, setUsername] = useState(
    () => localStorage.getItem(USERNAME_KEY) || ""
  );

  const [role, setRole] = useState(
    () => normalizeRole(localStorage.getItem(ROLE_KEY))
  );

  const login = async (submittedUsername, password) => {
    const responseData = await loginUser(
      submittedUsername,
      password
    );

    const returnedRole = normalizeRole(
      responseData?.role ??
      responseData?.user?.role ??
      "customer"
    );

    const returnedUsername =
      responseData?.username ??
      responseData?.user?.username ??
      submittedUsername;

    localStorage.setItem(AUTHENTICATED_KEY, "true");
    localStorage.setItem(USERNAME_KEY, returnedUsername);
    localStorage.setItem(ROLE_KEY, returnedRole);

    setUsername(returnedUsername);
    setRole(returnedRole);
    setIsAuthenticated(true);

    return responseData;
  };

  const logout = async () => {
    try {
      await logoutUser();
    } finally {
      localStorage.removeItem(AUTHENTICATED_KEY);
      localStorage.removeItem(USERNAME_KEY);
      localStorage.removeItem(ROLE_KEY);

      setUsername("");
      setRole("customer");
      setIsAuthenticated(false);
    }
  };

  const isAdmin = role === "admin";

  const value = useMemo(
    () => ({
      isAuthenticated,
      username,
      role,
      isAdmin,
      login,
      logout,
    }),
    [
      isAuthenticated,
      username,
      role,
      isAdmin,
    ]
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
    throw new Error(
      "useAuth must be used inside AuthProvider."
    );
  }

  return context;
}