import { NavLink, useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { featureCards } from "../data/mockData";
import { useAuth } from "../auth/AuthContext";
import { FeatureKey } from "../types";

type NavItem = {
  label: string;
  to: string;
  featureKey?: FeatureKey;
};

const SideMenu = ({ onNavigate }: { onNavigate?: () => void }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const allowed = useMemo(() => {
    const set = new Set<FeatureKey>();
    if (!user) return set;
    Object.values(user.permissions).forEach((keys) => keys.forEach((k) => set.add(k)));
    return set;
  }, [user]);

  const items: NavItem[] = [
    { label: "ホーム", to: "/home" },
    { label: "配車（メニュー）", to: "/feature/dispatch", featureKey: "dispatch" },
    { label: "在庫確認", to: "/feature/inventory", featureKey: "inventory" },
    { label: "機械管理", to: "/feature/machine", featureKey: "machine" },
    { label: "受注管理", to: "/feature/orders", featureKey: "orders" },
    { label: "現場管理", to: "/feature/sites", featureKey: "sites" },
    { label: "出庫登録", to: "/factory/outbound-register", featureKey: "dispatch" }
  ];

  const visibleItems = items.filter((x) => !x.featureKey || allowed.has(x.featureKey));

  return (
    <aside className="sidebar" aria-label="サイドメニュー">
      <div className="sidebar-header">
        <div className="sidebar-title">Sirius</div>
        <div className="sidebar-subtitle">基幹システム（プロトタイプ）</div>
      </div>

      <nav className="sidebar-nav" aria-label="画面遷移">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => ["sidebar-link", isActive ? "active" : ""].join(" ").trim()}
            onClick={() => onNavigate?.()}
            end={item.to === "/home"}
          >
            <div className="sidebar-link-title">{item.label}</div>
            {item.featureKey && (
              <div className="sidebar-link-sub">
                {featureCards.find((c) => c.key === item.featureKey)?.description ?? ""}
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-user-label">ユーザー</div>
          <div className="sidebar-user-value">{user?.userName ?? "未ログイン"}</div>
        </div>
        <button
          className="button sidebar-logout"
          type="button"
          onClick={() => {
            logout();
            onNavigate?.();
            navigate("/");
          }}
        >
          ログアウト
        </button>
      </div>
    </aside>
  );
};

export default SideMenu;

