import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ProductAddModal } from "../components/ProductAddModal";

type MoveOrderCreateForm = {
  writer: string;
  date1: string;
  date2: string;
  inspectionChecklist: string;
  productName: string;
  loadingLocation: string;
  loadingLocationDetail: "自社" | "他社";
  loadingLocationId: string;
  moveReason: string;
  customerId: string;
  siteId: string;
  unloadingLocation: string;
  unloadingLocationDetail: "自社" | "他社";
  unloadingLocationId: string;
  contractor: string;
  contractorEmployeeId: string;
  notes: string;
  notesScheduleKind: "" | "搬入" | "引取";
  notesScheduleDate: string;
  executionDate: string;
  driver: string;
  driverEmployeeId: string;
};

const createInitialForm = (): MoveOrderCreateForm => ({
  writer: "",
  date1: "",
  date2: "",
  inspectionChecklist: "",
  productName: "",
  loadingLocation: "",
  loadingLocationDetail: "自社",
  loadingLocationId: "",
  moveReason: "",
  customerId: "",
  siteId: "",
  unloadingLocation: "",
  unloadingLocationDetail: "自社",
  unloadingLocationId: "",
  contractor: "",
  contractorEmployeeId: "",
  notes: "",
  notesScheduleKind: "",
  notesScheduleDate: "",
  executionDate: "",
  driver: "",
  driverEmployeeId: ""
});

const warehouseNameById: Record<string, string> = {
  "1": "本社",
  "2": "千葉",
  "3": "茨城"
};

const supplierNameById: Record<string, string> = {
  "0000": "カナモト浦安",
  "1111": "谷口重機",
  "2222": "NISSHO川崎"
};

const resolveLocationName = (detail: "自社" | "他社", id: string) => {
  const key = String(id ?? "").trim();
  if (!key) return "";
  return detail === "自社" ? warehouseNameById[key] ?? "" : supplierNameById[key] ?? "";
};

const employeeNameById: Record<string, string> = {
  "1111": "高橋",
  "2222": "森岡",
  "3333": "大和田",
  "4444": "小出",
  "5555": "五十嵐"
};

const resolveEmployeeName = (id: string) => {
  const key = String(id ?? "").trim();
  if (!key) return "";
  return employeeNameById[key] ?? "";
};

const customerNameById: Record<string, string> = {
  "1111": "調和工業",
  "2222": "ケンテック",
  "3333": "SEA"
};

const siteNameById: Record<string, string> = {
  "111": "渋谷区",
  "222": "さいたま市",
  "333": "戸塚区"
};

const resolveCustomerName = (id: string) => {
  const key = String(id ?? "").trim();
  if (!key) return "";
  return customerNameById[key] ?? "";
};

const resolveSiteName = (id: string) => {
  const key = String(id ?? "").trim();
  if (!key) return "";
  return siteNameById[key] ?? "";
};

const formatAutoLocationText = (kind: "loading" | "unloading", baseName: string) => {
  const name = String(baseName ?? "").trim();
  if (!name) return "";
  return kind === "loading" ? `${name}から` : `${name}へ`;
};

const formatMoveReasonText = (customerName: string, siteName: string) => {
  const c = String(customerName ?? "").trim();
  const s = String(siteName ?? "").trim();
  if (c && s) return `${c}　${s}`;
  if (c) return c;
  if (s) return s;
  return "";
};

const formatNotesScheduleText = (kind: MoveOrderCreateForm["notesScheduleKind"], date: string) => {
  const k = String(kind ?? "").trim();
  const d = String(date ?? "").trim();
  if (!k || !d) return "";
  return `${d}${k}予定`;
};

const autosize = (el: HTMLTextAreaElement | null) => {
  if (!el) return;
  // reset -> measure -> set
  el.style.height = "0px";
  el.style.height = `${el.scrollHeight}px`;
};

const AutoGrowCellTextarea = React.forwardRef<
  HTMLTextAreaElement,
  {
    value: string;
    placeholder?: string;
    onChange: (next: string) => void;
  }
>(({ value, placeholder, onChange }, forwardedRef) => {
  const localRef = useRef<HTMLTextAreaElement | null>(null);

  useLayoutEffect(() => {
    autosize(localRef.current);
  }, [value]);

  return (
    <textarea
      ref={(el) => {
        localRef.current = el;
        if (typeof forwardedRef === "function") forwardedRef(el);
        else if (forwardedRef) forwardedRef.current = el;
      }}
      className="move-order-cell-input"
      rows={2}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onInput={(e) => autosize(e.currentTarget)}
    />
  );
});
AutoGrowCellTextarea.displayName = "AutoGrowCellTextarea";

const MoveOrderCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const initial = useMemo(() => createInitialForm(), []);
  const [form, setForm] = useState<MoveOrderCreateForm>(initial);
  const createRef = useRef<HTMLButtonElement | null>(null);
  const productNameRef = useRef<HTMLTextAreaElement | null>(null);
  const [productAddOpen, setProductAddOpen] = useState(false);

  // ID入力（または 自社/他社 切替）で名称が確定したら、上段の「積込み場所/名称」「降し場所/名称」へ自動転記
  // - 常に上書き（ID変更時はテキストボックスも追従）
  useEffect(() => {
    const baseName = resolveLocationName(form.loadingLocationDetail, form.loadingLocationId);
    const nextName = formatAutoLocationText("loading", baseName);
    setForm((prev) => ({ ...prev, loadingLocation: nextName }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.loadingLocationDetail, form.loadingLocationId]);

  useEffect(() => {
    const baseName = resolveLocationName(form.unloadingLocationDetail, form.unloadingLocationId);
    const nextName = formatAutoLocationText("unloading", baseName);
    setForm((prev) => ({ ...prev, unloadingLocation: nextName }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.unloadingLocationDetail, form.unloadingLocationId]);

  useEffect(() => {
    const nextName = resolveEmployeeName(form.contractorEmployeeId);
    setForm((prev) => ({ ...prev, contractor: nextName }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.contractorEmployeeId]);

  useEffect(() => {
    const nextName = resolveEmployeeName(form.driverEmployeeId);
    setForm((prev) => ({ ...prev, driver: nextName }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.driverEmployeeId]);

  useEffect(() => {
    const customerName = resolveCustomerName(form.customerId);
    const siteName = resolveSiteName(form.siteId);
    const next = formatMoveReasonText(customerName, siteName);
    setForm((prev) => ({ ...prev, moveReason: next }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.customerId, form.siteId]);

  useEffect(() => {
    const next = formatNotesScheduleText(form.notesScheduleKind, form.notesScheduleDate);
    setForm((prev) => ({ ...prev, notes: next }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.notesScheduleKind, form.notesScheduleDate]);

  useEffect(() => {
    const name = String(user?.userName ?? "").trim();
    if (!name) return;
    setForm((prev) => (prev.writer.trim() ? prev : { ...prev, writer: name }));
  }, [user?.userName]);

  return (
    <div className="page" style={{ marginTop: 0 }}>
      <ProductAddModal
        open={productAddOpen}
        onClose={() => setProductAddOpen(false)}
        onConfirm={(draft) => {
          // 要件: モーダルの「品名」入力を、上段の「品名」テキストボックスへ転記
          setForm((s) => {
            const markAdded = (raw: string) =>
              raw
                .split("\n")
                .map((x) => x.trim())
                .filter(Boolean)
                .map((x) => (x.startsWith("★") ? x : `★${x}`))
                .join("\n");

            const name = markAdded(draft.productName);
            const base = s.productName ?? "";
            const next = base.trim() ? (base.endsWith("\n") ? `${base}${name}` : `${base}\n${name}`) : name;
            return { ...s, productName: next };
          });
          requestAnimationFrame(() => {
            productNameRef.current?.focus();
          });
        }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <h3 style={{ marginTop: 0, marginBottom: 0 }}>移動受注作成</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="button" type="button" onClick={() => navigate(-1)}>
            戻る
          </button>
        </div>
      </div>

      <p style={{ marginTop: 10, color: "#475569", fontSize: 12 }}>
        検索結果と同じ表形式で、1行目が入力用テキストボックスです（保存は未実装のデモ）。
      </p>

      <div className="move-orders-results-table-wrap move-order-create-wrap" aria-label="移動受注 作成（入力）">
        <table className="move-orders-results-table move-order-create-table">
          <thead>
            <tr>
              <th>記入者</th>
              <th>日付①</th>
              <th>日付②</th>
              <th>点検表（有無）</th>
              <th>品名</th>
              <th>積込み場所/名称</th>
              <th>移動理由（会社名/現場）</th>
              <th>降し場所/名称</th>
              <th>請負人</th>
              <th>備考</th>
              <th>実施日</th>
              <th>ﾄﾞﾗｲﾊﾞｰ</th>
            </tr>
          </thead>
          <tbody>
            <tr className="move-order-input-row">
              <td>
                <AutoGrowCellTextarea value={form.writer} onChange={(v) => setForm((s) => ({ ...s, writer: v }))} />
              </td>
              <td>
                <AutoGrowCellTextarea
                  value={form.date1}
                  placeholder="YYYY-MM-DD"
                  onChange={(v) => setForm((s) => ({ ...s, date1: v }))}
                />
              </td>
              <td>
                <AutoGrowCellTextarea
                  value={form.date2}
                  placeholder="YYYY-MM-DD"
                  onChange={(v) => setForm((s) => ({ ...s, date2: v }))}
                />
              </td>
              <td>
                <AutoGrowCellTextarea
                  value={form.inspectionChecklist}
                  placeholder="有 / 無"
                  onChange={(v) => setForm((s) => ({ ...s, inspectionChecklist: v }))}
                />
              </td>
              <td>
                <AutoGrowCellTextarea
                  ref={productNameRef}
                  value={form.productName}
                  onChange={(v) => setForm((s) => ({ ...s, productName: v }))}
                />
              </td>
              <td>
                <AutoGrowCellTextarea
                  value={form.loadingLocation}
                  onChange={(v) => setForm((s) => ({ ...s, loadingLocation: v }))}
                />
              </td>
              <td>
                <AutoGrowCellTextarea value={form.moveReason} onChange={(v) => setForm((s) => ({ ...s, moveReason: v }))} />
              </td>
              <td>
                <AutoGrowCellTextarea
                  value={form.unloadingLocation}
                  onChange={(v) => setForm((s) => ({ ...s, unloadingLocation: v }))}
                />
              </td>
              <td>
                <AutoGrowCellTextarea value={form.contractor} onChange={(v) => setForm((s) => ({ ...s, contractor: v }))} />
              </td>
              <td>
                <AutoGrowCellTextarea value={form.notes} onChange={(v) => setForm((s) => ({ ...s, notes: v }))} />
              </td>
              <td>
                <AutoGrowCellTextarea
                  value={form.executionDate}
                  placeholder="YYYY-MM-DD"
                  onChange={(v) => setForm((s) => ({ ...s, executionDate: v }))}
                />
              </td>
              <td>
                <AutoGrowCellTextarea value={form.driver} onChange={(v) => setForm((s) => ({ ...s, driver: v }))} />
              </td>
            </tr>
            <tr className="move-order-actions-row">
              {/* 1: 記入者 */}{" "}
              <td>
                <div style={{ fontSize: 11, color: "#475569" }}>
                  ログインユーザー自動入力
                  {!!user?.userName && (
                    <>
                      <br />
                      <span style={{ fontWeight: 900, color: "#0f172a" }}>{user.userName}</span>
                    </>
                  )}
                </div>
              </td>
              {/* 2: 日付① */}{" "}
              <td>
                <div className="move-order-actions-stack">
                  <div style={{ display: "grid", gap: 4 }}>
                    <div style={{ fontSize: 11, fontWeight: 900, color: "#0f172a" }}>日付ピッカー</div>
                    <input
                      className="filter-input"
                      type="date"
                      value={form.date1}
                      onChange={(e) => setForm((s) => ({ ...s, date1: e.target.value }))}
                    />
                  </div>
                </div>
              </td>
              {/* 3: 日付② */}{" "}
              <td>
                <div className="move-order-actions-stack">
                  <div style={{ display: "grid", gap: 4 }}>
                    <div style={{ fontSize: 11, fontWeight: 900, color: "#0f172a" }}>日付ピッカー</div>
                    <input
                      className="filter-input"
                      type="date"
                      value={form.date2}
                      onChange={(e) => setForm((s) => ({ ...s, date2: e.target.value }))}
                    />
                  </div>
                </div>
              </td>
              {/* 4: 点検表 */}{" "}
              <td>
                <div className="move-order-actions-stack">
                  <div style={{ display: "grid", gap: 4 }}>
                    <div style={{ fontSize: 11, fontWeight: 900, color: "#0f172a" }}>点検表</div>
                    <select
                      className="filter-input"
                      value={form.inspectionChecklist}
                      onChange={(e) => setForm((s) => ({ ...s, inspectionChecklist: e.target.value }))}
                    >
                      <option value="">未選択</option>
                      <option value="あり">あり</option>
                      <option value="なし">なし</option>
                    </select>
                  </div>
                </div>
              </td>
              {/* 5: 品名 */}{" "}
              <td>
                <div className="move-order-actions-stack">
                  <div style={{ display: "grid", gap: 4 }}>
                    <div style={{ fontSize: 11, fontWeight: 900, color: "#0f172a" }}>商品の追加</div>
                    <button
                      className="button move-order-cell-action"
                      type="button"
                      title="商品の追加"
                      onClick={() => {
                        setProductAddOpen(true);
                      }}
                    >
                      商品追加
                    </button>
                  </div>
                </div>
              </td>
              {/* 6: 積込み場所/名称 */}{" "}
              <td>
                <div className="move-order-actions-stack">
                  <div style={{ display: "grid", gap: 4 }}>
                    <div style={{ fontSize: 11, fontWeight: 900, color: "#0f172a" }}>詳細</div>
                    <select
                      className="filter-input"
                      value={form.loadingLocationDetail}
                      onChange={(e) => {
                        const next = e.target.value as MoveOrderCreateForm["loadingLocationDetail"];
                        setForm((s) => ({
                          ...s,
                          loadingLocationDetail: next,
                          loadingLocationId: ""
                        }));
                      }}
                    >
                      <option value="自社">自社</option>
                      <option value="他社">他社</option>
                    </select>
                  </div>
                  <div style={{ display: "grid", gap: 4 }}>
                    <div style={{ fontSize: 11, fontWeight: 900, color: "#0f172a" }}>
                      {form.loadingLocationDetail === "自社" ? "倉庫ID" : "仕入先ID"}
                    </div>
                    <input
                      className="filter-input"
                      value={form.loadingLocationId}
                      onChange={(e) => setForm((s) => ({ ...s, loadingLocationId: e.target.value }))}
                      placeholder={form.loadingLocationDetail === "自社" ? "倉庫IDを入力" : "仕入先IDを入力"}
                    />
                    {(() => {
                      const name = resolveLocationName(form.loadingLocationDetail, form.loadingLocationId);
                      if (!name) return null;
                      return (
                        <div style={{ fontSize: 11, color: "#475569" }}>
                          名称: <span style={{ fontWeight: 900, color: "#0f172a" }}>{name}</span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </td>
              {/* 7: 移動理由 */}{" "}
              <td>
                <div className="move-order-actions-stack">
                  <div style={{ display: "grid", gap: 4 }}>
                    <div style={{ fontSize: 11, fontWeight: 900, color: "#0f172a" }}>取引先ID</div>
                    <input
                      className="filter-input"
                      value={form.customerId}
                      onChange={(e) => setForm((s) => ({ ...s, customerId: e.target.value }))}
                      placeholder="取引先IDを入力"
                    />
                    {(() => {
                      const name = resolveCustomerName(form.customerId);
                      if (!name) return null;
                      return (
                        <div style={{ fontSize: 11, color: "#475569" }}>
                          名称: <span style={{ fontWeight: 900, color: "#0f172a" }}>{name}</span>
                        </div>
                      );
                    })()}
                  </div>
                  <div style={{ display: "grid", gap: 4 }}>
                    <div style={{ fontSize: 11, fontWeight: 900, color: "#0f172a" }}>現場ID</div>
                    <input
                      className="filter-input"
                      value={form.siteId}
                      onChange={(e) => setForm((s) => ({ ...s, siteId: e.target.value }))}
                      placeholder="現場IDを入力"
                    />
                    {(() => {
                      const name = resolveSiteName(form.siteId);
                      if (!name) return null;
                      return (
                        <div style={{ fontSize: 11, color: "#475569" }}>
                          名称: <span style={{ fontWeight: 900, color: "#0f172a" }}>{name}</span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </td>
              {/* 8: 降し場所/名称 */}{" "}
              <td>
                <div className="move-order-actions-stack">
                  <div style={{ display: "grid", gap: 4 }}>
                    <div style={{ fontSize: 11, fontWeight: 900, color: "#0f172a" }}>詳細</div>
                    <select
                      className="filter-input"
                      value={form.unloadingLocationDetail}
                      onChange={(e) => {
                        const next = e.target.value as MoveOrderCreateForm["unloadingLocationDetail"];
                        setForm((s) => ({
                          ...s,
                          unloadingLocationDetail: next,
                          unloadingLocationId: ""
                        }));
                      }}
                    >
                      <option value="自社">自社</option>
                      <option value="他社">他社</option>
                    </select>
                  </div>
                  <div style={{ display: "grid", gap: 4 }}>
                    <div style={{ fontSize: 11, fontWeight: 900, color: "#0f172a" }}>
                      {form.unloadingLocationDetail === "自社" ? "倉庫ID" : "仕入先ID"}
                    </div>
                    <input
                      className="filter-input"
                      value={form.unloadingLocationId}
                      onChange={(e) => setForm((s) => ({ ...s, unloadingLocationId: e.target.value }))}
                      placeholder={form.unloadingLocationDetail === "自社" ? "倉庫IDを入力" : "仕入先IDを入力"}
                    />
                    {(() => {
                      const name = resolveLocationName(form.unloadingLocationDetail, form.unloadingLocationId);
                      if (!name) return null;
                      return (
                        <div style={{ fontSize: 11, color: "#475569" }}>
                          名称: <span style={{ fontWeight: 900, color: "#0f172a" }}>{name}</span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </td>
              {/* 9: 請負人 */}{" "}
              <td>
                <div className="move-order-actions-stack">
                  <div style={{ display: "grid", gap: 4 }}>
                    <div style={{ fontSize: 11, fontWeight: 900, color: "#0f172a" }}>社員ID</div>
                    <input
                      className="filter-input"
                      value={form.contractorEmployeeId}
                      onChange={(e) => setForm((s) => ({ ...s, contractorEmployeeId: e.target.value }))}
                      placeholder="社員IDを入力"
                    />
                    {(() => {
                      const name = resolveEmployeeName(form.contractorEmployeeId);
                      if (!name) return null;
                      return (
                        <div style={{ fontSize: 11, color: "#475569" }}>
                          氏名: <span style={{ fontWeight: 900, color: "#0f172a" }}>{name}</span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </td>
              {/* 10: 備考 */}{" "}
              <td>
                <div className="move-order-actions-stack">
                  <div style={{ display: "grid", gap: 4 }}>
                    <div style={{ fontSize: 11, fontWeight: 900, color: "#0f172a" }}>搬入/引取</div>
                    <select
                      className="filter-input"
                      value={form.notesScheduleKind}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, notesScheduleKind: e.target.value as MoveOrderCreateForm["notesScheduleKind"] }))
                      }
                    >
                      <option value="">未選択</option>
                      <option value="搬入">搬入</option>
                      <option value="引取">引取</option>
                    </select>
                  </div>
                  <div style={{ display: "grid", gap: 4 }}>
                    <div style={{ fontSize: 11, fontWeight: 900, color: "#0f172a" }}>日付</div>
                    <input
                      className="filter-input"
                      type="date"
                      value={form.notesScheduleDate}
                      onChange={(e) => setForm((s) => ({ ...s, notesScheduleDate: e.target.value }))}
                    />
                    {(() => {
                      const preview = formatNotesScheduleText(form.notesScheduleKind, form.notesScheduleDate);
                      if (!preview) return null;
                      return (
                        <div style={{ fontSize: 11, color: "#475569" }}>
                          表示: <span style={{ fontWeight: 900, color: "#0f172a" }}>{preview}</span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </td>
              {/* 11: 実施日 */}{" "}
              <td>
                <div className="move-order-actions-stack">
                  <div style={{ display: "grid", gap: 4 }}>
                    <div style={{ fontSize: 11, fontWeight: 900, color: "#0f172a" }}>日付ピッカー</div>
                    <input
                      className="filter-input"
                      type="date"
                      value={form.executionDate}
                      onChange={(e) => setForm((s) => ({ ...s, executionDate: e.target.value }))}
                    />
                  </div>
                </div>
              </td>
              {/* 12: ドライバー */}{" "}
              <td>
                <div className="move-order-actions-stack">
                  <div style={{ display: "grid", gap: 4 }}>
                    <div style={{ fontSize: 11, fontWeight: 900, color: "#0f172a" }}>社員ID</div>
                    <input
                      className="filter-input"
                      value={form.driverEmployeeId}
                      onChange={(e) => setForm((s) => ({ ...s, driverEmployeeId: e.target.value }))}
                      placeholder="社員IDを入力"
                    />
                    {(() => {
                      const name = resolveEmployeeName(form.driverEmployeeId);
                      if (!name) return null;
                      return (
                        <div style={{ fontSize: 11, color: "#475569" }}>
                          氏名: <span style={{ fontWeight: 900, color: "#0f172a" }}>{name}</span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
        <button className="button" type="button" onClick={() => setForm(createInitialForm())}>
          クリア
        </button>
        <button
          ref={createRef}
          className="button primary"
          type="button"
          onClick={() => {
            // デモ: 保存処理は未実装（必要ならAPI接続/一覧追加を実装）
            console.log("Move order create (demo)", form);
            navigate(-1);
          }}
        >
          作成
        </button>
      </div>
    </div>
  );
};

export default MoveOrderCreatePage;

