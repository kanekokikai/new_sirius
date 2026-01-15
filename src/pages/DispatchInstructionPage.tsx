import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth, getDepartmentPermissions } from "../auth/AuthContext";
import {
  dispatchInstructionContent,
  dispatchInstructionDescriptions,
  dispatchInstructionLabels,
  DispatchInstructionKey
} from "../data/dispatchInstructions";
import { TableSection } from "../data/featureContent";
import { Department } from "../types";

const isValidInstructionKey = (key: string): key is DispatchInstructionKey =>
  Object.prototype.hasOwnProperty.call(dispatchInstructionLabels, key);

const parseLooseDate = (value: string) => {
  const normalized = value.trim().replace(/\//g, "-");
  if (!normalized) return null;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
};

const extractDateFromTimeCell = (value: string) => {
  const s = value.trim();
  if (!s) return "";
  const m = s.match(/^(\d{4}[-/]\d{2}[-/]\d{2})(?:\s+|T|$)/);
  return m ? m[1] : "";
};

const DispatchInstructionPage = () => {
  const { instructionKey } = useParams<{ instructionKey: DispatchInstructionKey }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const numberClickTimerRef = useRef<number | null>(null);
  const numberLongPressFiredRef = useRef(false);
  const numberLongPressMs = 520;
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [customer, setCustomer] = useState("");
  const [editingRow, setEditingRow] = useState<(string | number)[] | null>(null);
  const [inboundDraftSections, setInboundDraftSections] = useState<TableSection[]>(
    () => dispatchInstructionContent.inbound
  );
  const [numberEdit, setNumberEdit] = useState<{
    sectionTitle: string;
    rowRef: (string | number)[];
    value: string;
  } | null>(null);

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
  const sections = resolvedKey === "inbound" ? inboundDraftSections : dispatchInstructionContent[resolvedKey];
  const label = dispatchInstructionLabels[resolvedKey];
  const description = dispatchInstructionDescriptions[resolvedKey];
  const dispatchMenuLink = `/feature/dispatch?dept=${encodeURIComponent(activeDepartment)}`;

  useEffect(() => {
    if (resolvedKey !== "inbound") return;
    setInboundDraftSections(dispatchInstructionContent.inbound);
    setNumberEdit(null);
  }, [resolvedKey]);

  useEffect(() => {
    return () => {
      if (numberClickTimerRef.current != null) {
        window.clearTimeout(numberClickTimerRef.current);
        numberClickTimerRef.current = null;
      }
    };
  }, []);

  const filteredSections = useMemo(() => {
    if (resolvedKey !== "inbound") return sections;

    const from = parseLooseDate(dateFrom);
    const to = parseLooseDate(dateTo);
    const normalizedCustomer = customer.trim().toLowerCase();

    return sections.map((section) => {
      const filteredRows = section.rows.filter((row) => {
        const timeColIndex = section.columns.findIndex((col) => col.includes("時間"));
        const customerColIndex = section.columns.findIndex(
          (col) => col.includes("会社名") || col.includes("得意先")
        );

        const timeCell = String(row[timeColIndex] ?? "");
        const dateStr = extractDateFromTimeCell(timeCell);
        const cust = String(row[customerColIndex] ?? "").toLowerCase();
        const dateObj = dateStr ? parseLooseDate(dateStr) : null;

        if (from && (!dateObj || dateObj < from)) return false;
        if (to && (!dateObj || dateObj > to)) return false;
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
              <label>会社名</label>
              <input
                className="filter-input"
                placeholder="例) S・E・A / ライト工業"
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
          const allowOutboundJump = resolvedKey === "inbound" && activeDepartment === "工場";
          const machineColIndex = section.columns.findIndex((col) => col.includes("機械名"));
          const numberColIndex = section.columns.findIndex((col) => col.includes("番号"));
          const quantityColIndex = section.columns.findIndex((col) => col.includes("数量"));
          const vehicleColIndex = section.columns.findIndex((col) => col.includes("車") || col.includes("車輛"));
          const wreckerColIndex = section.columns.findIndex((col) => col.includes("ﾚｯｶ") || col.includes("レッカー"));
          const driverColIndex = section.columns.findIndex((col) => col.includes("運転手"));
          const companyColIndex = section.columns.findIndex(
            (col) => col.includes("会社名") || col.includes("得意先")
          );
          const siteColIndex = section.columns.findIndex((col) => col.includes("現場"));
          const timeColIndex = section.columns.findIndex((col) => col.includes("時間"));
          const noteColIndex = section.columns.findIndex((col) => col.includes("備考"));
          const hourMeterColIndex = section.columns.findIndex(
            (col) => col.includes("アワ") || col.includes("アワメ")
          );
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
                        {row.map((cell, cidx) => {
                          const isMachineCell = machineColIndex >= 0 && cidx === machineColIndex;
                          const isNumberCell = numberColIndex >= 0 && cidx === numberColIndex;
                          if (isNumberCell) {
                            const value = String(cell ?? "");
                            return (
                              <td key={`${section.title}-${idx}-${cidx}`}>
                                <button
                                  type="button"
                                  onPointerDown={(e) => {
                                    // long press: jump to OutboundRegister (工場のみ)
                                    numberLongPressFiredRef.current = false;
                                    if (numberClickTimerRef.current != null) {
                                      window.clearTimeout(numberClickTimerRef.current);
                                      numberClickTimerRef.current = null;
                                    }

                                    if (!allowOutboundJump) return;

                                    // keep receiving pointer events even if finger/mouse moves slightly
                                    try {
                                      e.currentTarget.setPointerCapture(e.pointerId);
                                    } catch {
                                      // ignore
                                    }

                                    numberClickTimerRef.current = window.setTimeout(() => {
                                      numberLongPressFiredRef.current = true;

                                      const instructionId = String(row[numberColIndex] ?? "");
                                      const rawTime = String(row[timeColIndex] ?? "");
                                      const timeMatch = rawTime
                                        .trim()
                                        .match(/^(\d{4}[-/]\d{2}[-/]\d{2})\s+(.+)$/);
                                      const plannedDate = timeMatch ? timeMatch[1] : extractDateFromTimeCell(rawTime);
                                      const plannedTime = timeMatch ? timeMatch[2] : rawTime;

                                      const machineName = String(row[machineColIndex] ?? "");
                                      const quantity = String(row[quantityColIndex] ?? "").trim();
                                      const machine = quantity ? `${machineName}（${quantity}台）` : machineName;
                                      const vehicle = String(row[vehicleColIndex] ?? "");
                                      const customerName = String(row[companyColIndex] ?? "");
                                      const site = String(row[siteColIndex] ?? "");
                                      const note = String(row[noteColIndex] ?? "");
                                      const hourMeter = String(row[hourMeterColIndex] ?? "");
                                      const wrecker = String(row[wreckerColIndex] ?? "");
                                      const driver = String(row[driverColIndex] ?? "");

                                      navigate("/factory/outbound-register", {
                                        state: {
                                          department: activeDepartment,
                                          instructionKey: resolvedKey,
                                          instructionId,
                                          plannedDate,
                                          plannedTime,
                                          machine,
                                          vehicle,
                                          wrecker,
                                          driver,
                                          customer: customerName,
                                          site,
                                          note,
                                          hourMeter
                                        }
                                      });

                                      numberClickTimerRef.current = null;
                                    }, numberLongPressMs);
                                  }}
                                  onPointerUp={() => {
                                    if (numberClickTimerRef.current != null) {
                                      window.clearTimeout(numberClickTimerRef.current);
                                      numberClickTimerRef.current = null;
                                    }
                                  }}
                                  onPointerCancel={() => {
                                    if (numberClickTimerRef.current != null) {
                                      window.clearTimeout(numberClickTimerRef.current);
                                      numberClickTimerRef.current = null;
                                    }
                                  }}
                                  onPointerLeave={() => {
                                    if (numberClickTimerRef.current != null) {
                                      window.clearTimeout(numberClickTimerRef.current);
                                      numberClickTimerRef.current = null;
                                    }
                                  }}
                                  onClick={() => {
                                    // click: open edit modal (skip if long-press already navigated)
                                    if (numberLongPressFiredRef.current) {
                                      numberLongPressFiredRef.current = false;
                                      return;
                                    }
                                    setNumberEdit({
                                      sectionTitle: section.title,
                                      rowRef: row,
                                      value
                                    });
                                  }}
                                  style={{
                                    padding: 0,
                                    border: "none",
                                    background: "transparent",
                                    cursor: "pointer",
                                    color: "#2563eb",
                                    fontWeight: 700,
                                    textDecoration: "underline",
                                    touchAction: "manipulation"
                                  }}
                                  aria-label={`番号を編集: ${value}`}
                                  title={allowOutboundJump ? "クリック: 番号編集 / 長押し: 出庫登録へ" : "クリック: 番号編集"}
                                >
                                  {cell}
                                </button>
                              </td>
                            );
                          }
                          // 機械名セルはクリックで遷移させない（通常表示）
                          if (isMachineCell) {
                            return <td key={`${section.title}-${idx}-${cidx}`}>{cell}</td>;
                          }

                          return <td key={`${section.title}-${idx}-${cidx}`}>{cell}</td>;
                        })}
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
        {numberEdit && (
          <div className="modal-overlay" role="dialog" aria-modal="true">
            <div className="modal" style={{ width: "min(560px, 92vw)" }}>
              <div className="modal-header">
                <h3 style={{ margin: 0 }}>番号 編集（デモ）</h3>
                <button className="button ghost" type="button" onClick={() => setNumberEdit(null)}>
                  閉じる
                </button>
              </div>
              <div className="modal-body">
                <p style={{ marginTop: 0, color: "#475569" }}>
                  入力内容はこのページ内だけ反映されます（保存は未実装）。
                </p>
                <div className="filter-bar multi" style={{ marginTop: 12 }}>
                  <div className="filter-group">
                    <label>番号</label>
                    <input
                      className="filter-input"
                      value={numberEdit.value}
                      onChange={(e) => setNumberEdit((s) => (s ? { ...s, value: e.target.value } : s))}
                      placeholder="例) DIN-201"
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="button" type="button" onClick={() => setNumberEdit(null)}>
                  キャンセル
                </button>
                <button
                  className="button primary"
                  type="button"
                  onClick={() => {
                    if (!numberEdit) return;
                    setInboundDraftSections((prev) => {
                      const next = prev.map((s) => ({
                        ...s,
                        rows: s.rows.map((r) => [...r])
                      }));
                      const sectionIndex = next.findIndex((s) => s.title === numberEdit.sectionTitle);
                      if (sectionIndex < 0) return prev;
                      const columns = next[sectionIndex].columns;
                      const numberIndex = columns.findIndex((col) => col.includes("番号"));
                      if (numberIndex < 0) return prev;
                      const rowIndex = next[sectionIndex].rows.findIndex((r) => r === numberEdit.rowRef);
                      if (rowIndex < 0) return prev;
                      next[sectionIndex].rows[rowIndex][numberIndex] = numberEdit.value;
                      return next;
                    });
                    setNumberEdit(null);
                  }}
                >
                  反映（未保存）
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


