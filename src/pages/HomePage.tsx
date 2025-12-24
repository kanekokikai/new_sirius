import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, getDepartmentPermissions } from "../auth/AuthContext";
import CardGrid from "../components/CardGrid";
import Header from "../components/Header";
import { departments as allDepartments, featureCards } from "../data/mockData";
import { Department, FeatureCard } from "../types";

const HomePage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const allowedDepartments = useMemo<Department[]>(() => {
    return user?.departments ?? [];
  }, [user]);

  const [activeDepartment, setActiveDepartment] = useState<Department>(
    allowedDepartments[0] ?? "フロント"
  );

  const visibleCards: FeatureCard[] = useMemo(() => {
    const perms = getDepartmentPermissions(user, activeDepartment);
    return featureCards.filter((card) => perms.includes(card.key));
  }, [activeDepartment, user]);

  const buildLink = (feature: FeatureCard) =>
    `/feature/${feature.key}?dept=${encodeURIComponent(activeDepartment)}`;

  return (
    <div className="app-shell">
      <Header
        currentDepartment={activeDepartment}
        departments={allowedDepartments.length ? allowedDepartments : allDepartments}
        userName={user?.userName ?? "ゲスト"}
        onDepartmentChange={setActiveDepartment}
        onLogout={() => {
          logout();
          navigate("/");
        }}
      />
      <div className="page">
        <h2>ホーム</h2>
        <p>
          部署に応じた機能カードを表示しています。カードをクリックすると各機能のプレースホルダー画面へ遷移します。
        </p>
        <CardGrid features={visibleCards} getLink={buildLink} />
      </div>
    </div>
  );
};

export default HomePage;

