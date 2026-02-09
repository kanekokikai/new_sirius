import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useAuth, getDepartmentPermissions } from "../auth/AuthContext";
import CardGrid from "../components/CardGrid";
import { featureCards } from "../data/mockData";
import { Department, FeatureCard } from "../types";

const HomePage = () => {
  const { user } = useAuth();
  const location = useLocation();

  const allowedDepartments = useMemo<Department[]>(() => {
    return user?.departments ?? [];
  }, [user]);

  const activeDepartment = useMemo<Department>(() => {
    const params = new URLSearchParams(location.search);
    const fromUrl = params.get("dept");
    if (fromUrl && allowedDepartments.includes(fromUrl as Department)) {
      return fromUrl as Department;
    }
    return allowedDepartments[0] ?? "フロント";
  }, [allowedDepartments, location.search]);

  const visibleCards: FeatureCard[] = useMemo(() => {
    const perms = getDepartmentPermissions(user, activeDepartment);
    return featureCards.filter((card) => perms.includes(card.key));
  }, [activeDepartment, user]);

  const buildLink = (feature: FeatureCard) =>
    `/feature/${feature.key}?dept=${encodeURIComponent(activeDepartment)}`;

  return (
    <div className="app-shell">
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

