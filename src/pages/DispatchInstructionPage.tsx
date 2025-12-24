import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth, getDepartmentPermissions } from "../auth/AuthContext";
import {
  dispatchInstructionContent,
  dispatchInstructionDescriptions,
  dispatchInstructionLabels,
  DispatchInstructionKey
} from "../data/dispatchInstructions";
import { Department } from "../types";

const isValidInstructionKey = (key: string): key is DispatchInstructionKey =>
  Object.prototype.hasOwnProperty.call(dispatchInstructionLabels, key);

const DispatchInstructionPage = () => {
  const { instructionKey } = useParams<{ instructionKey: DispatchInstructionKey }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [customer, setCustomer] = useState("");
  const [editingRow, setEditingRow] = useState<(string | number)[] | null>(null);

  const params = new URLSearchParams(location.search);
  const departmentFromUrl = params.get("dept") as Department | null;
  const activeDepartment = departmentFromUrl ?? (user?.departments[0] ?? "フロント");

  const hasDispatchPermission = useMemo(() => {
    const allowed = getDepartmentPermissions(user, activeDepartment);
    return allowed.includes("dispatch");
  }, [activeDepartment, user]);

  if (!instructionKey || !isValidInstructionKey(instructionKey)) {
    return (
      <div className="app-shell">
        <div className="page">
          <h2>指示書が見つかりません</h2>
          <Link to="/home" className="button">
            ホームへ戻る
          </Link>
        </div>
      </div>
    );
  }

  if (!hasDispatchPermission) {
    return (
      <div className="app-shell">
        <div className="page">
          <h2>権限がありません</h2>
          <p>選択された部署では配車機能にアクセスできません。</p>
          <Link to="/home" className="button">
            ホームへ戻る
          </Link>
        </div>
      </div>
    );
  }

  const resolvedKey = instructionKey;
  const sections = dispatchInstructionContent[resolvedKey];
  const label = dispatchInstructionLabels[resolvedKey];
  const description = dispatchInstructionDescriptions[resolvedKey];
  const dispatchMenuLink = `/feature/dispatch?dept=${encodeURIComponent(activeDepartment)}`;

  const filteredSections = useMemo(() => {
    if (resolvedKey !== "inbound") return sections;

    const parseDate = (value: string) => (value ? new Date(value) : null);
    const from = parseDate(dateFrom);
    const to = parseDate(dateTo);
    const normalizedCustomer = customer.trim().toLowerCase();

    return sections.map((section) => {
      const filteredRows = section.rows.filter((row) => {
        const dateStr = String(row[0]); // 搬入日
        const cust = String(row[6]).toLowerCase(); // 得意先
        const dateObj = parseDate(dateStr);

        if (from && dateObj && dateObj < from) return false;
        if (to && dateObj && dateObj > to) return false;
        if (normalizedCustomer && !cust.includes(normalizedCustomer)) return false;
        return true;
      });

      return { ...section, rows: filteredRows };
    });
  }, [customer, dateFrom, dateTo, resolvedKey, sections]);

  return (
    <div className="app-shell">
      <div className="page">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <h2 style={{ margin: 0 }}>
            {label}（{activeDepartment}）
          </h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link className="button primary" to={dispatchMenuLink}>
              配車メニューへ
            </Link>
          </div>
        </div>
        <p>{description}</p>
        {resolvedKey === "inbound" && (
          <div className="filter-bar multi" style={{ marginBottom: 12 }}>
            <div className="filter-group">
              <label>期間（開始）</label>
              <input
                className="filter-input"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="filter-group">
              <label>期間（終了）</label>
              <input
                className="filter-input"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="filter-group">
              <label>得意先</label>
              <input
                className="filter-input"
                placeholder="例) S・E・A"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
              />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="button primary" type="button">
                検索
              </button>
              <button
                className="button"
                type="button"
                onClick={() => {
                  setDateFrom("");
                  setDateTo("");
                  setCustomer("");
                }}
              >
                クリア
              </button>
            </div>
          </div>
        )}
        {filteredSections.map((section) => {
          const showActions = resolvedKey === "inbound";
          return (
            <div key={section.title} style={{ marginTop: 18 }}>
              <h3 style={{ marginTop: 0 }}>{section.title}</h3>
              <p style={{ marginTop: 0 }}>{section.description}</p>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      {section.columns.map((col) => (
                        <th key={col}>{col}</th>
                      ))}
                      {showActions && <th style={{ minWidth: 80 }}>操作</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {section.rows.map((row, idx) => (
                      <tr key={`${section.title}-${idx}`}>
                        {row.map((cell, cidx) => (
                          <td key={`${section.title}-${idx}-${cidx}`}>{cell}</td>
                        ))}
                        {showActions && (
                          <td>
                            <button className="button" type="button" onClick={() => setEditingRow(row)}>
                              編集
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
        {editingRow && (
          <div className="modal-overlay" role="dialog" aria-modal="true">
            <div className="modal">
              <div className="modal-header">
                <h3 style={{ margin: 0 }}>搬入指示書 編集（デモ）</h3>
                <button className="button ghost" type="button" onClick={() => setEditingRow(null)}>
                  閉じる
                </button>
              </div>
              <div className="modal-body">
                <p style={{ marginTop: 0, color: "#475569" }}>
                  入力内容の保存はまだ実装していません。編集イメージを確認するモーダルです。
                </p>
                <div className="table-container" style={{ marginTop: 8 }}>
                  <table>
                    <tbody>
                      {(() => {
                        const columns = filteredSections[0]?.columns ?? [];
                        return columns.map((col, idx) => (
                          <tr key={col}>
                            <th style={{ width: 160 }}>{col}</th>
                            <td>{editingRow[idx] ?? ""}</td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="modal-footer">
                <button className="button" type="button" onClick={() => setEditingRow(null)}>
                  閉じる
                </button>
                <button className="button primary" type="button" disabled>
                  保存（未実装）
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DispatchInstructionPage;


