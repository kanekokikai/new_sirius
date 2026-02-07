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
import { inboundOrderSearchColumns, inboundOrderSearchRawRows } from "../data/inboundOrderSearchMock";
import { loadInboundDraft, loadInboundRows } from "../data/ordersLocalDb";
import { getTruckPlanRowsByDate, TruckPlanAction, TruckPlanRow } from "../data/truckPlanMock";
import { TruckPlanEndReportModal } from "../components/TruckPlanEndReportModal";
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

const extractTimeFromTimeCell = (value: string) => {
  const s = value.trim();
  if (!s) return "";
  const m = s.match(/^\d{4}[-/]\d{2}[-/]\d{2}\s+(.+)$/);
  return m ? m[1].trim() : s;
};

const toIsoDateLocal = (d: Date) => {
  // Avoid timezone issues with toISOString() by shifting to local time.
  const offsetMs = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - offsetMs).toISOString().slice(0, 10);
};

const TRUCK_PLAN_DRAFT_KEY_PREFIX = "truckPlanDraft|";

const loadTruckPlanDraft = (date: string): TruckPlanRow[] | null => {
  try {
    const raw = sessionStorage.getItem(`${TRUCK_PLAN_DRAFT_KEY_PREFIX}${date}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    // If an empty array was saved by an older/buggy build, treat it as "no draft"
    // so the demo roster can still render on first view (especially in production).
    if (parsed.length === 0) return null;
    // very light validation
    return parsed.filter(Boolean) as TruckPlanRow[];
  } catch {
    return null;
  }
};

const saveTruckPlanDraft = (date: string, rows: TruckPlanRow[]) => {
  try {
    sessionStorage.setItem(`${TRUCK_PLAN_DRAFT_KEY_PREFIX}${date}`, JSON.stringify(rows));
  } catch {
    // ignore
  }
};

/**
 * Ensure base demo roster rows are always present, even if a draft is missing or corrupted.
 * - Keeps user-added rows (not in base roster)
 * - Preserves draft rows when present (actions/edits)
 */
const seedTruckPlanRoster = (date: string, draftRows: TruckPlanRow[] | null): TruckPlanRow[] => {
  const base = getTruckPlanRowsByDate(date);
  if (!draftRows || draftRows.length === 0) return base;

  const byName = new Map<string, TruckPlanRow>();
  for (const r of draftRows) {
    if (!r || !String((r as TruckPlanRow).name ?? "").trim()) continue;
    byName.set((r as TruckPlanRow).name, r as TruckPlanRow);
  }

  const seeded: TruckPlanRow[] = base.map((r) => byName.get(r.name) ?? r);
  for (const r of draftRows) {
    if (!r || !String(r.name ?? "").trim()) continue;
    if (!base.some((b) => b.name === r.name)) seeded.push(r);
  }
  return seeded;
};

const composeTruckPlanTopLeft = (kind: string, size?: string) => [kind, size].filter(Boolean).join("　");

const parseTruckPlanTopLeft = (input: string): { kind: string; size?: string } => {
  const normalized = input.trim();
  if (!normalized) return { kind: "", size: undefined };
  const parts = normalized.split(/[ \u3000]+/).filter(Boolean);
  const kind = parts[0] ?? "";
  const size = parts.slice(1).join(" ");
  return { kind, size: size ? size : undefined };
};

const isTruckPlanActionEmpty = (a?: Partial<TruckPlanAction> | null) => {
  if (!a) return true;
  return !(
    String(a.kind ?? "").trim() ||
    String(a.size ?? "").trim() ||
    String(a.place ?? "").trim() ||
    String(a.freeText ?? "").trim() ||
    String(a.time ?? "").trim()
  );
};

const normalizePersonName = (s: string) => s.replace(/[ \u3000]/g, "").trim();

const actionSig = (a: Pick<TruckPlanAction, "kind" | "size" | "place" | "time">) =>
  `${String(a.kind ?? "").trim()}|${String(a.size ?? "").trim()}|${String(a.place ?? "").trim()}|${String(a.time ?? "").trim()}`;

const mergeInboundIntoTruckPlanRows = (date: string, base: TruckPlanRow[]): TruckPlanRow[] => {
  // 受注検索結果（搬入）のデモ表と連携する
  // - 運転手セルに書いた名前が、トラック予定指示書の氏名と一致したら反映
  // - 日付は「受注側の搬入日（draft）」が設定されている場合のみ一致チェック（未設定なら常に反映）
  const inboundDraft = loadInboundDraft();
  if (inboundDraft?.inboundDate) {
    const parsed = parseLooseDate(inboundDraft.inboundDate);
    const normalized = parsed ? toIsoDateLocal(parsed) : inboundDraft.inboundDate.trim().replace(/\//g, "-");
    if (normalized && normalized !== date) return base;
  }

  const colDriver = inboundOrderSearchColumns.findIndex((c) => c.includes("運転手"));
  const colVehicle = inboundOrderSearchColumns.findIndex((c) => c.includes("車"));
  const colSite = inboundOrderSearchColumns.findIndex((c) => c.includes("現場"));
  const colTime = inboundOrderSearchColumns.findIndex((c) => c.includes("時間"));
  if ([colDriver, colVehicle, colSite, colTime].some((x) => x < 0)) return base;

  const rows = loadInboundRows(inboundOrderSearchRawRows);

  // Search results are "merged cell style": subsequent rows may be blank.
  // We only want to create one assignment per visible group-anchor row.
  const assignments: { driverName: string; action: TruckPlanAction }[] = [];
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    const driverName = String(row[colDriver] ?? "").trim();
    const vehicle = String(row[colVehicle] ?? "").trim();
    const site = String(row[colSite] ?? "").trim();
    const timeCell = String(row[colTime] ?? "").trim();
    // Only anchor rows have all 4 cells filled. Skip non-anchor rows.
    if (!driverName || !vehicle || !site || !timeCell) continue;
    assignments.push({
      driverName,
      action: {
        kind: "搬入",
        size: vehicle,
        place: site,
        freeText: "",
        time: timeCell,
        source: "inbound",
        inboundRowIndex: rowIndex
      }
    });
  }

  // If no inbound assignments currently, remove previously auto-inserted inbound blocks.
  // (Do not touch manual blocks.)
  const desiredByDriver = new Map<string, Set<string>>();
  for (const { driverName, action } of assignments) {
    const k = normalizePersonName(driverName);
    const set = desiredByDriver.get(k) ?? new Set<string>();
    set.add(actionSig(action));
    desiredByDriver.set(k, set);
  }

  // Clone rows/actions deeply enough to mutate safely
  const next = base.map((r) => ({
    ...r,
    actions: (r.actions ?? []).map((a) => (a ? { ...a } : a))
  }));

  // 1) Remove stale inbound blocks (name removed/changed => desired set absent => clear)
  for (const r of next) {
    const k = normalizePersonName(r.name);
    const desired = desiredByDriver.get(k) ?? new Set<string>();
    for (let i = 0; i < 6; i++) {
      const a = r.actions[i];
      if (!a) continue;
      const sig = actionSig(a);
      const isInbound =
        a.source === "inbound" ||
        // backward-compat: previously inserted blocks had no source; treat as inbound only if memo is empty
        (a.source == null && !String(a.freeText ?? "").trim() && desired.has(sig));

      if (!isInbound) continue;
      if (!desired.has(sig)) {
        r.actions[i] = undefined!;
      } else if (a.source == null) {
        a.source = "inbound";
      }
    }
  }

  // 2) Add missing inbound blocks into first empty slot (no duplicates)
  for (const { driverName, action } of assignments) {
    const driverKey = normalizePersonName(driverName);
    let row = next.find((r) => normalizePersonName(r.name) === driverKey);
    if (!row) {
      row = { category: "（搬入）", name: driverName, actions: [] };
      next.push(row);
    }

    const sig = actionSig(action);
    const alreadyExists = row.actions.some((a) => a && actionSig(a) === sig);
    if (alreadyExists) continue;

    for (let i = 0; i < 6; i++) {
      const current = row.actions[i];
      if (isTruckPlanActionEmpty(current)) {
        row.actions[i] = { ...action, source: "inbound" };
        break;
      }
    }
  }

  return next;
};

const TruckPlanTable = ({
  rows,
  slotCount,
  date,
  onEditSlot
}: {
  rows: TruckPlanRow[];
  slotCount: number;
  date: string;
  onEditSlot: (name: string, slotIndex: number, patch: Partial<TruckPlanAction>) => void;
}) => {
  const [dragging, setDragging] = useState<{ name: string; fromIndex: number } | null>(null);
  const [dragOver, setDragOver] = useState<{ name: string; toIndex: number } | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    name: string;
    slotIndex: number;
    isEnded: boolean;
    summary: { topLeft: string; bottomLeft: string; bottomRight: string; memo: string };
  } | null>(null);
  const [endReportTarget, setEndReportTarget] = useState<{
    name: string;
    slotIndex: number;
    mode: "end" | "unend";
    summary: { topLeft: string; bottomLeft: string; bottomRight: string; memo: string };
  } | null>(null);

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("mousedown", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [contextMenu]);

  const columns = useMemo(() => {
    const cols: string[] = ["区分", "氏名"];
    for (let i = 0; i < slotCount; i++) cols.push(String(i + 1));
    return cols;
  }, [slotCount]);

  return (
    <div className="table-container">
      <table className="truck-plan-table" aria-label="トラック行動予定表">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.category}-${r.name}`}>
              <td className="truck-plan-category">{r.category}</td>
              <td className="truck-plan-name">{r.name}</td>
              {Array.from({ length: slotCount }).map((_, i) => {
                const a = r.actions[i];
                const topLeft = composeTruckPlanTopLeft(a?.kind ?? "", a?.size);
                const bottomLeft = a?.place ?? "";
                const bottomRight = a?.time ?? "";
                const memoValue = a?.freeText ?? "";
                const isDropAllowed = dragging?.name === r.name && dragging.fromIndex !== i;
                const isDragOver = dragOver?.name === r.name && dragOver.toIndex === i;
                const isEnded = Boolean(a?.ended);
                const endedTimeValue = String(a?.endedTime ?? "").trim();
                const topRightValue = isEnded
                  ? [memoValue.trim(), endedTimeValue].filter(Boolean).join(" ")
                  : memoValue;
                const hasContent = Boolean(
                  (a?.kind ?? "").trim() ||
                    (a?.size ?? "").trim() ||
                    (a?.place ?? "").trim() ||
                    (a?.freeText ?? "").trim() ||
                    (a?.time ?? "").trim()
                );

                return (
                  <td
                    key={`${r.name}-${i}-block`}
                    className={[
                      "truck-plan-block-cell",
                      isDropAllowed ? "truck-plan-block-cell--drop-ok" : "",
                      isDragOver ? "truck-plan-block-cell--drag-over" : ""
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onDragOver={(e) => {
                      if (!isDropAllowed) return;
                      e.preventDefault();
                      setDragOver({ name: r.name, toIndex: i });
                    }}
                    onDragLeave={() => {
                      setDragOver((prev) =>
                        prev && prev.name === r.name && prev.toIndex === i ? null : prev
                      );
                    }}
                    onDrop={(e) => {
                      if (!dragging) return;
                      e.preventDefault();
                      setDragOver(null);
                      // block cross-driver drop
                      if (dragging.name !== r.name) return;
                      if (dragging.fromIndex === i) return;
                      // move request is handled by parent via custom event (may require confirm)
                      const ev = new CustomEvent("truckplan:moveRequest", {
                        detail: {
                          fromName: dragging.name,
                          toName: r.name,
                          fromIndex: dragging.fromIndex,
                          toIndex: i
                        }
                      });
                      window.dispatchEvent(ev);
                      setDragging(null);
                    }}
                  >
                    <div
                      className={["truck-plan-block", isEnded ? "truck-plan-block--ended" : ""].filter(Boolean).join(" ")}
                      aria-label={`仕事ブロック ${i + 1}`}
                      onContextMenu={(e) => {
                        if (!hasContent) return;
                        e.preventDefault();
                        e.stopPropagation();
                        setContextMenu({
                          x: e.clientX,
                          y: e.clientY,
                          name: r.name,
                          slotIndex: i,
                          isEnded,
                          summary: { topLeft, bottomLeft, bottomRight, memo: memoValue }
                        });
                      }}
                    >
                      <div
                        className="truck-plan-block__cell truck-plan-block__tl"
                        title={hasContent ? "ドラッグして同じ行内で移動できます" : ""}
                      >
                        <span
                          className="truck-plan-drag-handle"
                          draggable={hasContent}
                          onDragStart={(e) => {
                            if (!hasContent) return;
                            try {
                              e.dataTransfer.effectAllowed = "move";
                              e.dataTransfer.setData(
                                "application/json",
                                JSON.stringify({ name: r.name, fromIndex: i })
                              );
                            } catch {
                              // ignore
                            }
                            setDragging({ name: r.name, fromIndex: i });
                          }}
                          onDragEnd={() => {
                            setDragging(null);
                            setDragOver(null);
                          }}
                          aria-label="ドラッグハンドル"
                        >
                          ⋮⋮
                        </span>
                        <input
                          className="truck-plan-block-input"
                          value={topLeft}
                          placeholder=""
                          onChange={(e) => {
                            const parsed = parseTruckPlanTopLeft(e.target.value);
                            onEditSlot(r.name, i, { kind: parsed.kind, size: parsed.size });
                          }}
                          aria-label="種別とサイズ"
                        />
                      </div>
                      <div className="truck-plan-block__cell truck-plan-block__tr">
                        <input
                          className="truck-plan-memo-input"
                          value={topRightValue}
                          placeholder=""
                          onChange={(e) => {
                            if (isEnded) return;
                            onEditSlot(r.name, i, { freeText: e.target.value });
                          }}
                          readOnly={isEnded}
                          aria-label={isEnded ? "終了時間（終了報告）" : "自由入力"}
                        />
                      </div>
                      <div className="truck-plan-block__cell truck-plan-block__bl">
                        <input
                          className="truck-plan-block-input"
                          value={bottomLeft}
                          placeholder=""
                          onChange={(e) => onEditSlot(r.name, i, { place: e.target.value })}
                          aria-label="行く場所"
                        />
                      </div>
                      <div className="truck-plan-block__cell truck-plan-block__br">
                        <input
                          className="truck-plan-block-input"
                          value={bottomRight}
                          placeholder=""
                          onChange={(e) => onEditSlot(r.name, i, { time: e.target.value })}
                          aria-label="時間"
                        />
                      </div>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {contextMenu && (
        <div
          className="truck-plan-context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          role="menu"
          aria-label="仕事ブロック操作メニュー"
          onMouseDown={(e) => {
            // keep clicks inside menu from triggering window mousedown close before handlers run
            e.stopPropagation();
          }}
        >
          <button
            className="truck-plan-context-menu__item"
            type="button"
            disabled={contextMenu.isEnded}
            onClick={() => {
              setEndReportTarget({
                name: contextMenu.name,
                slotIndex: contextMenu.slotIndex,
                mode: "end",
                summary: contextMenu.summary
              });
              setContextMenu(null);
            }}
          >
            {contextMenu.isEnded ? "終了報告（済）" : "終了報告"}
          </button>

          <button
            className="truck-plan-context-menu__item"
            type="button"
            disabled={!contextMenu.isEnded}
            onClick={() => {
              setEndReportTarget({
                name: contextMenu.name,
                slotIndex: contextMenu.slotIndex,
                mode: "unend",
                summary: contextMenu.summary
              });
              setContextMenu(null);
            }}
          >
            終了報告解除
          </button>
        </div>
      )}

      <TruckPlanEndReportModal
        open={Boolean(endReportTarget)}
        mode={endReportTarget?.mode ?? "end"}
        driverName={endReportTarget?.name ?? ""}
        date={date}
        slotIndex={endReportTarget?.slotIndex ?? 0}
        summary={endReportTarget?.summary ?? { topLeft: "", bottomLeft: "", bottomRight: "", memo: "" }}
        onCancel={() => setEndReportTarget(null)}
        onConfirm={({ endTime }) => {
          if (!endReportTarget) return;
          if (endReportTarget.mode === "unend") {
            onEditSlot(endReportTarget.name, endReportTarget.slotIndex, {
              ended: false,
              endedReportedAt: undefined,
              endedTime: undefined
            });
          } else {
            onEditSlot(endReportTarget.name, endReportTarget.slotIndex, {
              ended: true,
              endedReportedAt: new Date().toISOString(),
              endedTime: endTime
            });
          }
          setEndReportTarget(null);
        }}
      />
    </div>
  );
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
  const [truckPlanDate, setTruckPlanDate] = useState(() => toIsoDateLocal(new Date()));
  const [truckPlanDraftRows, setTruckPlanDraftRows] = useState<TruckPlanRow[]>([]);
  const [truckPlanDriverQuery, setTruckPlanDriverQuery] = useState("");
  const [truckPlanSort, setTruckPlanSort] = useState<"default" | "nameAsc" | "nameDesc">("default");
  const [showTruckAddModal, setShowTruckAddModal] = useState(false);
  const [truckAddCategory, setTruckAddCategory] = useState("");
  const [truckAddName, setTruckAddName] = useState("");
  const [truckAddError, setTruckAddError] = useState("");
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
  const dateFromUrl = params.get("date");
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
    if (resolvedKey !== "truckPlan") return;
    if (dateFromUrl && dateFromUrl !== truckPlanDate) setTruckPlanDate(dateFromUrl);
  }, [dateFromUrl, resolvedKey, truckPlanDate]);

  useEffect(() => {
    if (resolvedKey !== "truckPlan") return;
    // no-op: free text is stored in draft rows (sessionStorage draft)
  }, [resolvedKey, truckPlanDate]);

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

  const truckPlanSlots = 6;

  useEffect(() => {
    if (resolvedKey !== "truckPlan") return;
    const saved = loadTruckPlanDraft(truckPlanDate);
    const base = seedTruckPlanRoster(truckPlanDate, saved);
    const merged = mergeInboundIntoTruckPlanRows(truckPlanDate, base);
    setTruckPlanDraftRows(merged);
    // Persist merged result so subsequent edits build on it.
    saveTruckPlanDraft(truckPlanDate, merged);
  }, [resolvedKey, truckPlanDate]);

  const refreshTruckPlanFromInbound = () => {
    setTruckPlanDraftRows((prev) => {
      const base = seedTruckPlanRoster(truckPlanDate, loadTruckPlanDraft(truckPlanDate) ?? prev);
      const merged = mergeInboundIntoTruckPlanRows(truckPlanDate, base);
      saveTruckPlanDraft(truckPlanDate, merged);
      return merged;
    });
  };

  useEffect(() => {
    if (resolvedKey !== "truckPlan") return;
    const remerge = () => {
      refreshTruckPlanFromInbound();
    };
    window.addEventListener("demo:inboundRowsUpdated", remerge as EventListener);
    window.addEventListener("demo:inboundDraftUpdated", remerge as EventListener);
    // also remerge when returning focus (same-tab localStorage doesn't fire events)
    window.addEventListener("focus", remerge);
    return () => {
      window.removeEventListener("demo:inboundRowsUpdated", remerge as EventListener);
      window.removeEventListener("demo:inboundDraftUpdated", remerge as EventListener);
      window.removeEventListener("focus", remerge);
    };
  }, [resolvedKey, truckPlanDate]);

  const visibleTruckPlanRows = useMemo(() => {
    const q = truckPlanDriverQuery.trim().toLowerCase();
    const filtered = q
      ? truckPlanDraftRows.filter((r) => r.name.toLowerCase().includes(q))
      : truckPlanDraftRows;

    if (truckPlanSort === "default") return filtered;

    const dir = truckPlanSort === "nameAsc" ? 1 : -1;
    return [...filtered].sort((a, b) => dir * a.name.localeCompare(b.name, "ja"));
  }, [truckPlanDriverQuery, truckPlanDraftRows, truckPlanSort]);

  useEffect(() => {
    if (resolvedKey !== "truckPlan") return;
    const onMoveRequest = (ev: Event) => {
      const e = ev as CustomEvent<{ fromName: string; toName: string; fromIndex: number; toIndex: number }>;
      const { fromName, toName, fromIndex, toIndex } = e.detail ?? ({} as any);
      if (!fromName || !toName) return;
      if (typeof fromIndex !== "number" || typeof toIndex !== "number") return;
      // Only allow moves within the same driver row.
      if (fromName !== toName) return;
      applyTruckPlanMove({ fromName, toName, fromIndex, toIndex });
    };

    window.addEventListener("truckplan:moveRequest", onMoveRequest as EventListener);
    return () => window.removeEventListener("truckplan:moveRequest", onMoveRequest as EventListener);
  }, [resolvedKey, truckPlanDate]);

  const updateTruckPlanSlot = (name: string, slotIndex: number, patch: Partial<TruckPlanAction>) => {
    setTruckPlanDraftRows((prev) => {
      const next = prev.map((r) => ({ ...r, actions: [...r.actions] }));
      const rowIndex = next.findIndex((r) => r.name === name);
      if (rowIndex < 0) return prev;
      const row = next[rowIndex];
      const base: TruckPlanAction = row.actions[slotIndex] ?? { kind: "", source: "manual" };
      const nextSource: TruckPlanAction["source"] =
        base.source === "inbound" ? "manual" : (base.source ?? "manual");
      const nextAction: TruckPlanAction = { ...base, ...patch, source: nextSource };
      if (nextSource === "manual") delete nextAction.inboundRowIndex;
      row.actions[slotIndex] = nextAction;
      saveTruckPlanDraft(truckPlanDate, next);
      return next;
    });
  };

  const applyTruckPlanMove = (detail: { fromName: string; toName: string; fromIndex: number; toIndex: number }) => {
    const { fromName, toName, fromIndex, toIndex } = detail;
    setTruckPlanDraftRows((prev) => {
      const next = prev.map((r) => ({ ...r, actions: [...r.actions] }));
      const fromRowIndex = next.findIndex((r) => r.name === fromName);
      const toRowIndex = next.findIndex((r) => r.name === toName);
      if (fromRowIndex < 0 || toRowIndex < 0) return prev;
      const fromRow = next[fromRowIndex];
      const toRow = next[toRowIndex];

      const aFrom = fromRow.actions[fromIndex];
      const aTo = toRow.actions[toIndex];

      // swap if target occupied, otherwise move (clear source)
      if (aTo) {
        fromRow.actions[fromIndex] = aTo;
      } else {
        fromRow.actions[fromIndex] = undefined!;
      }
      toRow.actions[toIndex] = aFrom;

      saveTruckPlanDraft(truckPlanDate, next);
      return next;
    });
  };

  return (
    <div className={resolvedKey === "truckPlan" ? "app-shell app-shell--wide" : "app-shell"}>
      <div className="page">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <h2 style={{ margin: 0 }}>
            {label}（{activeDepartment}）
          </h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {resolvedKey === "truckPlan" && (
              <button
                className="button"
                type="button"
                onClick={() => {
                  setTruckAddCategory("");
                  setTruckAddName("");
                  setTruckAddError("");
                  setShowTruckAddModal(true);
                }}
              >
                トラック追加
              </button>
            )}
            <Link className="button primary" to={dispatchMenuLink}>
              配車メニューへ
            </Link>
          </div>
        </div>
        <p>{description}</p>
        {resolvedKey === "truckPlan" && (
          <div className="filter-bar multi" style={{ marginBottom: 12 }}>
            <div className="filter-group">
              <label>日付</label>
              <input
                className="filter-input"
                type="date"
                value={truckPlanDate}
                onChange={(e) => {
                  const next = e.target.value;
                  setTruckPlanDate(next);
                  const nextParams = new URLSearchParams(location.search);
                  nextParams.set("date", next);
                  if (activeDepartment) nextParams.set("dept", activeDepartment);
                  navigate(`${location.pathname}?${nextParams.toString()}`, { replace: true });
                }}
              />
            </div>
            <div className="filter-group">
              <label>ドライバー名（検索）</label>
              <input
                className="filter-input"
                value={truckPlanDriverQuery}
                placeholder="例) 小出 / 山田"
                onChange={(e) => setTruckPlanDriverQuery(e.target.value)}
              />
            </div>
            <div className="filter-group">
              <label>並び順</label>
              <select
                className="filter-input"
                value={truckPlanSort}
                onChange={(e) => setTruckPlanSort(e.target.value as "default" | "nameAsc" | "nameDesc")}
              >
                <option value="default">既定</option>
                <option value="nameAsc">氏名（昇順）</option>
                <option value="nameDesc">氏名（降順）</option>
              </select>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <button
                className="button"
                type="button"
                onClick={() => {
                  const today = toIsoDateLocal(new Date());
                  setTruckPlanDate(today);
                  const nextParams = new URLSearchParams(location.search);
                  nextParams.set("date", today);
                  if (activeDepartment) nextParams.set("dept", activeDepartment);
                  navigate(`${location.pathname}?${nextParams.toString()}`, { replace: true });
                }}
              >
                今日
              </button>
              <button
                className="button"
                type="button"
                onClick={() => {
                  setTruckPlanDriverQuery("");
                  setTruckPlanSort("default");
                }}
              >
                検索クリア
              </button>
            </div>
          </div>
        )}
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
        {resolvedKey === "truckPlan" ? (
          <div style={{ marginTop: 8 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
              <h3 style={{ marginTop: 0, marginBottom: 0 }}>行動予定表（{truckPlanDate}）</h3>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="button primary" type="button" onClick={refreshTruckPlanFromInbound}>
                  予定表 更新
                </button>
              </div>
            </div>
            <p style={{ marginTop: 0, color: "#475569" }}>
              配車メニューから日付を指定すると、スクリーンショットのような表形式で表示します（デモのためデータはモックです）。
            </p>
            <TruckPlanTable
              rows={visibleTruckPlanRows}
              slotCount={truckPlanSlots}
              date={truckPlanDate}
              onEditSlot={updateTruckPlanSlot}
            />
          </div>
        ) : (
          filteredSections.map((section) => {
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
        })
        )}
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
        {resolvedKey === "truckPlan" && showTruckAddModal && (
          <div className="modal-overlay" role="dialog" aria-modal="true">
            <div className="modal" style={{ width: "min(560px, 92vw)" }}>
              <div className="modal-header">
                <h3 style={{ margin: 0 }}>トラック追加</h3>
                <button className="button ghost" type="button" onClick={() => setShowTruckAddModal(false)}>
                  閉じる
                </button>
              </div>
              <div className="modal-body">
                <p style={{ marginTop: 0, color: "#475569" }}>
                  区分と氏名を入力して、予定表に行を追加します（デモのため保存先は sessionStorage です）。
                </p>
                <div className="filter-bar multi" style={{ marginTop: 12 }}>
                  <div className="filter-group">
                    <label>区分</label>
                    <input
                      className="filter-input"
                      value={truckAddCategory}
                      placeholder="例) 特大セル / 10t エッセル"
                      onChange={(e) => setTruckAddCategory(e.target.value)}
                    />
                  </div>
                  <div className="filter-group">
                    <label>氏名</label>
                    <input
                      className="filter-input"
                      value={truckAddName}
                      placeholder="例) 山田 太郎"
                      onChange={(e) => setTruckAddName(e.target.value)}
                    />
                  </div>
                </div>
                {truckAddError && (
                  <div style={{ marginTop: 10, color: "#b91c1c", fontWeight: 700 }}>{truckAddError}</div>
                )}
              </div>
              <div className="modal-footer">
                <button className="button" type="button" onClick={() => setShowTruckAddModal(false)}>
                  キャンセル
                </button>
                <button
                  className="button primary"
                  type="button"
                  onClick={() => {
                    const category = truckAddCategory.trim();
                    const name = truckAddName.trim();
                    if (!category || !name) {
                      setTruckAddError("区分と氏名を入力してください。");
                      return;
                    }
                    const exists = truckPlanDraftRows.some((r) => r.name === name);
                    if (exists) {
                      setTruckAddError("同じ氏名の行がすでに存在します（氏名は一意にしてください）。");
                      return;
                    }
                    const nextRows: TruckPlanRow[] = [
                      ...truckPlanDraftRows,
                      { category, name, actions: [] }
                    ];
                    setTruckPlanDraftRows(nextRows);
                    saveTruckPlanDraft(truckPlanDate, nextRows);
                    setShowTruckAddModal(false);
                  }}
                >
                  追加
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


