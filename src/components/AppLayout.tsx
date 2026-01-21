import { ReactNode, useEffect, useState } from "react";
import SideMenu from "./SideMenu";

const AppLayout = ({ children }: { children: ReactNode }) => {
  const [open, setOpen] = useState(false);

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

      <main className="layout-main">{children}</main>
    </div>
  );
};

export default AppLayout;

