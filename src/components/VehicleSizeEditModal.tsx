import React, { useEffect, useMemo, useState } from "react";

type Props = {
  open: boolean;
  title?: string;
  vehicleSizeOptions: readonly string[];
  initialValue?: string; // e.g. "4t", "指定車:青ナンバー", "指定車（青ナンバー）"
  onClose: () => void;
  onConfirm: (nextValue: string) => void;
  onOrderDetail?: () => void;
};

const parseInitial = (value: string | undefined): { size: string; specifiedText: string } => {
  const v = (value ?? "").trim();
  if (!v) return { size: "", specifiedText: "" };

  // "指定車:xxx"
  const m1 = v.match(/^指定車\s*:\s*(.+)$/);
  if (m1) return { size: "指定車", specifiedText: m1[1].trim() };

  // "指定車（xxx）"
  const m2 = v.match(/^指定車（(.+)）$/);
  if (m2) return { size: "指定車", specifiedText: m2[1].trim() };

  if (v === "指定車") return { size: "指定車", specifiedText: "" };

  return { size: v, specifiedText: "" };
};

export const VehicleSizeEditModal: React.FC<Props> = ({
  open,
  title = "車輛サイズ 変更（デモ）",
  vehicleSizeOptions,
  initialValue,
  onClose,
  onConfirm,
  onOrderDetail
}) => {
  const initial = useMemo(() => parseInitial(initialValue), [initialValue]);
  const [size, setSize] = useState<string>(initial.size || vehicleSizeOptions[0] || "");
  const [specifiedText, setSpecifiedText] = useState<string>(initial.specifiedText);

  useEffect(() => {
    if (!open) return;
    setSize(initial.size || vehicleSizeOptions[0] || "");
    setSpecifiedText(initial.specifiedText);
  }, [open, initial.size, initial.specifiedText, vehicleSizeOptions]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const needsSpecified = size === "指定車";
  const canConfirm = Boolean(size.trim()) && (!needsSpecified || Boolean(specifiedText.trim()));
  const preview = needsSpecified ? `指定車:${specifiedText.trim()}` : size.trim();

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
            車輛サイズを選択してください。「指定車」を選んだ場合は指定内容も入力できます（デモ）。
          </p>

          <div className="filter-bar multi" style={{ marginTop: 0 }}>
            <div className="filter-group" style={{ minWidth: 240 }}>
              <label>車輛サイズ</label>
              <select
                className="filter-input"
                value={size}
                onChange={(e) => {
                  const next = e.target.value;
                  setSize(next);
                  if (next !== "指定車") setSpecifiedText("");
                }}
              >
                {vehicleSizeOptions.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
            </div>

            {needsSpecified && (
              <div className="filter-group" style={{ minWidth: 260 }}>
                <label>指定車内容</label>
                <input
                  className="filter-input"
                  value={specifiedText}
                  onChange={(e) => setSpecifiedText(e.target.value)}
                  placeholder="例) 青ナンバー / ユニック付など"
                />
              </div>
            )}
          </div>

          <div style={{ marginTop: 10, fontSize: 13, color: "#334155" }}>
            反映プレビュー: <span style={{ fontWeight: 800 }}>{preview || "（未入力）"}</span>
          </div>
        </div>
        <div className="modal-footer">
          <button className="button" type="button" onClick={onClose}>
            キャンセル
          </button>
          <button
            className="button primary"
            type="button"
            disabled={!canConfirm}
            onClick={() => onConfirm(preview)}
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

