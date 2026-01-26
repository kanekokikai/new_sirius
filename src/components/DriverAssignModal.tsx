import React, { useEffect, useMemo, useState } from "react";

export type DriverAssignKind = "選択無し" | "自社" | "外注" | "先方";

type Props = {
  open: boolean;
  title?: string;
  initialKind?: DriverAssignKind;
  initialDriverName?: string;
  initialId?: string;
  onClose: () => void;
  onConfirm: (next: { kind: DriverAssignKind; id: string; driverName: string }) => void;
  onOrderDetail?: () => void;
};

const parseFromCell = (
  cellValue: string
): { kind?: DriverAssignKind; driverName?: string; id?: string } => {
  const raw = String(cellValue ?? "").trim();
  if (!raw) return {};

  // Backward compat: old multiline formats.
  if (raw.includes("\n")) {
    const lines = raw
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);
    const kind = (lines[0] as DriverAssignKind | undefined) ?? undefined;
    const nameLine = lines.find((x) => x.startsWith("運転手名:"));
    const driverLine = lines.find((x) => x.startsWith("運転手ID:"));
    const supplierLine = lines.find((x) => x.startsWith("仕入先ID:") || x.startsWith("外注ID:"));
    const driverName = nameLine ? nameLine.replace("運転手名:", "").trim() : undefined;
    const id = driverLine
      ? driverLine.replace("運転手ID:", "").trim()
      : supplierLine
        ? supplierLine.replace(/^仕入先ID:|^外注ID:/, "").trim()
        : undefined;
    return { kind, driverName, id };
  }

  // New format: only the driver name is stored in the table cell.
  return { driverName: raw };
};

export const DriverAssignModal: React.FC<Props> = ({
  open,
  title = "運転手 変更（デモ）",
  initialKind,
  initialDriverName,
  initialId,
  onClose,
  onConfirm,
  onOrderDetail
}) => {
  const initial = useMemo(
    () => ({
      kind: initialKind ?? "選択無し",
      driverName: (initialDriverName ?? "").trim(),
      id: (initialId ?? "").trim()
    }),
    [initialDriverName, initialId, initialKind]
  );

  const [kind, setKind] = useState<DriverAssignKind>(initial.kind);
  const [driverName, setDriverName] = useState<string>(initial.driverName);
  const [id, setId] = useState<string>(initial.id);

  useEffect(() => {
    if (!open) return;
    // kind changes should reset ID + auto-fill state (demo behavior)
    setId("");
    if (kind === "先方") setDriverName("先方");
  }, [kind, open]);

  useEffect(() => {
    if (!open) return;
    setKind(initial.kind);
    setDriverName(initial.driverName);
    setId(initial.id);
  }, [open, initial.driverName, initial.id, initial.kind]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const needsId = kind === "自社" || kind === "外注";
  // 運転手名（自由入力）は区分/IDが未入力でも使える仕様
  const canInputName = true;
  const idLabel = kind === "外注" ? "仕入先ID" : "運転手ID";

  const demoMasters = {
    自社: [
      { id: "147", name: "小出達也" },
      { id: "158", name: "山田太陽" },
      { id: "201", name: "佐藤 健" },
      { id: "305", name: "鈴木 花子" },
      { id: "412", name: "高橋 仁" }
    ],
    外注: [
      { id: "7105", name: "株式会社マルシンレンタカー＆リース" },
      { id: "5116", name: "ナカハラ株式会社" },
      { id: "6420", name: "有限会社オオサカレンタル" },
      { id: "8888", name: "テスト商事" },
      { id: "9001", name: "株式会社サンプル運送" }
    ]
  } as const;

  const match = needsId
    ? (kind === "自社" ? demoMasters.自社 : demoMasters.外注).find((x) => x.id === id.trim())
    : undefined;

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal" style={{ width: "min(560px, 92vw)" }}>
        <div className="modal-header">
          <h3 style={{ margin: 0 }}>{title}</h3>
          <button className="button ghost" type="button" onClick={onClose}>
            閉じる
          </button>
        </div>
        <div className="modal-body">
          <p style={{ marginTop: 0, marginBottom: 10, color: "#475569", fontSize: 12, lineHeight: 1.35 }}>
            運転手セルのダブルクリックで開くデモモーダルです。ID入力で名称が自動入力され、その後自由に変更できます（保存は未実装のデモ）。
          </p>

          <div className="filter-bar multi" style={{ marginTop: 0 }}>
            <div className="filter-group" style={{ minWidth: 220 }}>
              <label>区分</label>
              <select
                className="filter-input"
                value={kind}
                onChange={(e) => setKind(e.target.value as DriverAssignKind)}
              >
                <option value="選択無し">選択無し</option>
                <option value="自社">自社</option>
                <option value="外注">外注</option>
                <option value="先方">先方</option>
              </select>
            </div>
          </div>

          {needsId && (
            <div className="filter-bar multi" style={{ marginTop: 10 }}>
              <div className="filter-group" style={{ minWidth: 220 }}>
                <label>{idLabel}</label>
                <input
                  className="filter-input"
                  value={id}
                  onChange={(e) => {
                    const nextId = e.target.value;
                    setId(nextId);

                    const m = (kind === "自社" ? demoMasters.自社 : demoMasters.外注).find((x) => x.id === nextId.trim());
                    if (!m) return;
                  // ID入力に応じて名称を自動入力（その後、自由入力で上書き可能）
                    setDriverName(m.name);
                  }}
                  placeholder="例) 147"
                  list={kind === "自社" ? "driver-id-self" : "driver-id-outsourcing"}
                />
                {kind === "自社" ? (
                  <datalist id="driver-id-self">
                    {demoMasters.自社.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name}
                      </option>
                    ))}
                  </datalist>
                ) : (
                  <datalist id="driver-id-outsourcing">
                    {demoMasters.外注.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name}
                      </option>
                    ))}
                  </datalist>
                )}
                {match && (
                  <div style={{ marginTop: 6, color: "#475569", fontSize: 12 }}>
                    名称候補: <span style={{ fontWeight: 900, color: "#0f172a" }}>{match.name}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="filter-bar multi" style={{ marginTop: 10 }}>
            <div className="filter-group" style={{ minWidth: 220, flex: 1 }}>
              <label>運転手名（自由入力）</label>
              <input
                className="filter-input"
                value={driverName}
                onChange={(e) => {
                  setDriverName(e.target.value);
                }}
                placeholder="例) 山田 太郎"
                disabled={!canInputName}
              />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button
            className="button"
            type="button"
            onClick={() => {
              setKind("選択無し");
              setId("");
              setDriverName("");
            }}
          >
            クリア
          </button>
          <button className="button" type="button" onClick={onClose}>
            キャンセル
          </button>
          <button
            className="button primary"
            type="button"
            onClick={() =>
              onConfirm({
                kind,
                id: id.trim(),
                driverName: driverName.trim()
              })
            }
          >
            変更
          </button>
          {onOrderDetail && (
            <button className="button" type="button" onClick={onOrderDetail}>
              受注詳細
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export const driverAssignParseFromCell = parseFromCell;

