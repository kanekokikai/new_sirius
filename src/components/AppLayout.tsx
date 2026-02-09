import { ReactNode, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import SideMenu from "./SideMenu";
import Header from "./Header";
import { useAuth } from "../auth/AuthContext";
import { Department } from "../types";
import { departments as allDepartments } from "../data/mockData";

const AppLayout = ({ children }: { children: ReactNode }) => {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const allowedDepartments = useMemo<Department[]>(() => user?.departments ?? [], [user]);
  const headerDepartments = allowedDepartments.length ? allowedDepartments : allDepartments;

  const deptStorageKey = useMemo(() => {
    const userKey = user?.userId ?? "guest";
    return `demo.activeDepartment.${userKey}`;
  }, [user?.userId]);

  const activeDepartment = useMemo<Department>(() => {
    const params = new URLSearchParams(location.search);
    const deptFromUrl = params.get("dept");
    const isValid = (value: string | null): value is Department =>
      Boolean(value) && headerDepartments.includes(value as Department);

    if (isValid(deptFromUrl)) return deptFromUrl;

    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem(deptStorageKey);
      if (isValid(stored)) return stored;
    }
    return headerDepartments[0] ?? "フロント";
  }, [deptStorageKey, headerDepartments, location.search]);

  // Keep dept in URL (so every page can read it consistently)
  useLayoutEffect(() => {
    const params = new URLSearchParams(location.search);
    const current = params.get("dept");
    if (current === activeDepartment) return;
    params.set("dept", activeDepartment);
    const nextSearch = params.toString();
    navigate(
      { pathname: location.pathname, search: nextSearch ? `?${nextSearch}` : "" },
      { replace: true }
    );
  }, [activeDepartment, location.pathname, location.search, navigate]);

  // Persist the latest selection (so navigation without ?dept keeps the same department)
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(deptStorageKey, activeDepartment);
  }, [activeDepartment, deptStorageKey]);

  // Close drawer on escape
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="layout-root">
      <button
        type="button"
        className="sidebar-toggle button ghost"
        aria-label="メニューを開く"
        onClick={() => setOpen(true)}
      >
        ☰
      </button>

      <div className={["layout-sidebar", open ? "open" : ""].join(" ").trim()}>
        <SideMenu onNavigate={() => setOpen(false)} />
      </div>

      {open && (
        <button
          className="sidebar-overlay"
          type="button"
          aria-label="メニューを閉じる"
          onClick={() => setOpen(false)}
        />
      )}

      <main className="layout-main">
        <div className="layout-header-shell">
          <Header
            currentDepartment={activeDepartment}
            departments={headerDepartments}
            userName={user?.userName ?? "ゲスト"}
            onDepartmentChange={(dept) => {
              if (typeof window !== "undefined") {
                window.localStorage.setItem(deptStorageKey, dept);
              }
              const params = new URLSearchParams(location.search);
              params.set("dept", dept);
              const nextSearch = params.toString();
              navigate(
                { pathname: location.pathname, search: nextSearch ? `?${nextSearch}` : "" },
                { replace: true }
              );
            }}
            onLogout={() => {
              logout();
              navigate("/");
            }}
          />
        </div>

        {children}
      </main>
    </div>
  );
};

export default AppLayout;

