import React, { useEffect, useMemo, useState } from "react";

type Props = {
  open: boolean;
  title?: string;
  kindIdOptions: readonly string[];
  categoryIdOptions: readonly string[];
  initialKindId?: string;
  initialCategoryId?: string;
  onClose: () => void;
  onConfirm: (next: { kindId: string; categoryId: string }) => void;
};

export const MachineTypeChangeModal: React.FC<Props> = ({
  open,
  title = "種類ID / 種別ID 変更（デモ）",
  kindIdOptions,
  categoryIdOptions,
  initialKindId,
  initialCategoryId,
  onClose,
  onConfirm
}) => {
  const initial = useMemo(
    () => ({
      kindId: initialKindId ?? kindIdOptions[0] ?? "",
      categoryId: initialCategoryId ?? categoryIdOptions[0] ?? ""
    }),
    [categoryIdOptions, initialCategoryId, initialKindId, kindIdOptions]
  );

  const [kindId, setKindId] = useState(initial.kindId);
  const [categoryId, setCategoryId] = useState(initial.categoryId);

  useEffect(() => {
    if (!open) return;
    setKindId(initial.kindId);
    setCategoryId(initial.categoryId);
  }, [open, initial.categoryId, initial.kindId]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const canConfirm = Boolean(kindId.trim() && categoryId.trim());

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
      <div className="modal" style={{ width: "min(540px, 92vw)" }}>
        <div className="modal-header">
          <h3 style={{ margin: 0 }}>{title}</h3>
          <button className="button ghost" type="button" onClick={onClose}>
            閉じる
          </button>
        </div>
        <div className="modal-body">
          <p style={{ marginTop: 0, marginBottom: 10, color: "#475569", fontSize: 12, lineHeight: 1.35 }}>
            機械名セルのダブルクリックで開くデモモーダルです。確定すると該当セルに種類ID/種別IDの表示を追記します。
          </p>

          <div className="filter-bar multi" style={{ marginTop: 0 }}>
            <div className="filter-group" style={{ minWidth: 220 }}>
              <label>種類ID</label>
              <select className="filter-input" value={kindId} onChange={(e) => setKindId(e.target.value)}>
                {kindIdOptions.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-group" style={{ minWidth: 260 }}>
              <label>種別ID</label>
              <select
                className="filter-input"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                {categoryIdOptions.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
            </div>
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
            onClick={() => onConfirm({ kindId, categoryId })}
          >
            変更
          </button>
        </div>
      </div>
    </div>
  );
};

