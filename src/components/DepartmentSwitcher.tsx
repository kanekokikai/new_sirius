import { Department } from "../types";

interface Props {
  departments: Department[];
  active: Department;
  onChange: (dept: Department) => void;
}

const DepartmentSwitcher = ({ departments, active, onChange }: Props) => (
  <div className="dept-switcher">
    {departments.map((dept) => (
      <button
        key={dept}
        type="button"
        className={`dept-chip ${dept === active ? "active" : ""}`}
        onClick={() => onChange(dept)}
      >
        {dept}
      </button>
    ))}
  </div>
);

export default DepartmentSwitcher;


