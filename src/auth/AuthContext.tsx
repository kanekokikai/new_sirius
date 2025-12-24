import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { Department, FeatureKey, User } from "../types";
import { mockUsers, departments, departmentAccess } from "../data/mockData";

interface AuthState {
  user: Omit<User, "password"> | null;
  login: (userId: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);
const STORAGE_KEY = "authUser";

const guestUser: Omit<User, "password"> = {
  userId: "guest",
  userName: "ゲストログイン",
  departments,
  permissions: departmentAccess
};

const loadStoredUser = (): Omit<User, "password"> | null => {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Omit<User, "password">;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<Omit<User, "password"> | null>(loadStoredUser);

  const login = (userId: string, password: string) => {
    if (!userId && !password) {
      setUser(guestUser);
      return true;
    }

    const found = mockUsers.find(
      (candidate) => candidate.userId === userId && candidate.password === password
    );
    if (!found) {
      return false;
    }
    const { password: _pwd, ...rest } = found;
    setUser(rest);
    return true;
  };

  const logout = () => setUser(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (user) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, [user]);

  const value = useMemo(() => ({ user, login, logout }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
};

export const getDepartmentPermissions = (
  user: Omit<User, "password"> | null,
  department: Department
): FeatureKey[] => {
  if (!user) return [];
  return user.permissions[department] ?? [];
};

