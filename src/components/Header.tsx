import DepartmentSwitcher from "./DepartmentSwitcher";
import { Department } from "../types";

interface Props {
  currentDepartment: Department;
  departments: Department[];
  userName: string;
  onDepartmentChange: (dept: Department) => void;
  onLogout: () => void;
}

const Header = ({
  currentDepartment,
  departments,
  userName,
  onDepartmentChange,
  onLogout
}: Props) => (
  <header className="header">
    <div className="header-left">
      <div className="badge">部署切替</div>
      <DepartmentSwitcher
        departments={departments}
        active={currentDepartment}
        onChange={onDepartmentChange}
      />
    </div>
    <div className="header-actions">
      <span className="pill">ユーザー: {userName}</span>
      <button className="button" type="button" onClick={onLogout}>
        ログアウト
      </button>
    </div>
  </header>
);

export default Header;

