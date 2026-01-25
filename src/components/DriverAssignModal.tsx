import React, { useEffect, useMemo, useState } from "react";

export type DriverAssignKind = "選択無し" | "自社" | "外注" | "先方";

type Props = {
  open: boolean;
  title?: string;
  initialKind?: DriverAssignKind;
  initialDriverId?: string;
  initialOutsourceId?: string;
  onClose: () => void;
  onConfirm: (next: { kind: DriverAssignKind; driverId: string; outsourceId: string }) => void;
  onOrderDetail?: () => void;
};

const parseFromCell = (
  cellValue: string
): { kind?: DriverAssignKind; driverId?: string; outsourceId?: string } => {
  const lines = (cellValue ?? "").split("\n").map((x) => x.trim()).filter(Boolean);
  const kind = (lines[0] as DriverAssignKind | undefined) ?? undefined;
  const driverLine = lines.find((x) => x.startsWith("運転手ID:"));
  const outsourceLine = lines.find((x) => x.startsWith("外注ID:"));
  const driverId = driverLine ? driverLine.replace("運転手ID:", "").trim() : undefined;
  const outsourceId = outsourceLine ? outsourceLine.replace("外注ID:", "").trim() : undefined;
  return { kind, driverId, outsourceId };
};

export const DriverAssignModal: React.FC<Props> = ({
  open,
  title = "運転手 変更（デモ）",
  initialKind,
  initialDriverId,
  initialOutsourceId,
  onClose,
  onConfirm,
  onOrderDetail
}) => {
  const initial = useMemo(
    () => ({
      kind: initialKind ?? "選択無し",
      driverId: (initialDriverId ?? "").trim(),
      outsourceId: (initialOutsourceId ?? "").trim()
    }),
    [initialDriverId, initialKind, initialOutsourceId]
  );

  const [kind, setKind] = useState<DriverAssignKind>(initial.kind);
  const [driverId, setDriverId] = useState<string>(initial.driverId);
  const [outsourceId, setOutsourceId] = useState<string>(initial.outsourceId);

  useEffect(() => {
    if (!open) return;
    setKind(initial.kind);
    setDriverId(initial.driverId);
    setOutsourceId(initial.outsourceId);
  }, [open, initial.driverId, initial.kind, initial.outsourceId]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const needsIds = kind === "自社" || kind === "外注";

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
            運転手セルのダブルクリックで開くデモモーダルです。「自社」「外注」を選択した場合は運転手ID/外注IDを入力できます。
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

          {needsIds && (
            <div className="filter-bar multi" style={{ marginTop: 10 }}>
              <div className="filter-group" style={{ minWidth: 220 }}>
                <label>運転手ID</label>
                <input
                  className="filter-input"
                  value={driverId}
                  onChange={(e) => setDriverId(e.target.value)}
                  placeholder="例) D-001"
                />
              </div>
              <div className="filter-group" style={{ minWidth: 220 }}>
                <label>外注ID</label>
                <input
                  className="filter-input"
                  value={outsourceId}
                  onChange={(e) => setOutsourceId(e.target.value)}
                  placeholder="例) O-001"
                />
              </div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="button" type="button" onClick={onClose}>
            キャンセル
          </button>
          <button
            className="button primary"
            type="button"
            onClick={() => onConfirm({ kind, driverId: driverId.trim(), outsourceId: outsourceId.trim() })}
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

