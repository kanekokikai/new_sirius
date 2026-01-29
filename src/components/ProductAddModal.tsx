import React, { useEffect, useMemo, useRef, useState } from "react";
import { machineCategoryMasterMock, machineKindMasterMock } from "../data/machineTypeMasterMock";

export type ProductAddDraft = {
  kindId: string;
  categoryId: string;
  no: string;
  productName: string;
};

type Props = {
  open: boolean;
  title?: string;
  onClose: () => void;
  onConfirm: (draft: ProductAddDraft) => void;
};

const createInitial = (): ProductAddDraft => ({
  kindId: "",
  categoryId: "",
  no: "",
  productName: ""
});

export const ProductAddModal: React.FC<Props> = ({ open, title = "商品の追加", onClose, onConfirm }) => {
  const initial = useMemo(() => createInitial(), []);
  const [draft, setDraft] = useState<ProductAddDraft>(initial);
  const confirmRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setDraft(createInitial());
    window.setTimeout(() => confirmRef.current?.focus(), 0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const canConfirm = Boolean(draft.productName.trim());

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
      <div className="modal" style={{ width: "min(760px, 94vw)" }}>
        <div className="modal-header">
          <h3 style={{ margin: 0 }}>{title}</h3>
          <button className="button ghost" type="button" onClick={onClose}>
            閉じる
          </button>
        </div>

        <div className="modal-body">
          <div className="filter-bar multi" style={{ marginTop: 0 }}>
            <div className="filter-group" style={{ minWidth: 220 }}>
              <label>種類</label>
              <select
                className="filter-input"
                value={draft.kindId}
                onChange={(e) => setDraft((s) => ({ ...s, kindId: e.target.value }))}
              >
                <option value="">未選択</option>
                {machineKindMasterMock.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group" style={{ minWidth: 220 }}>
              <label>種別</label>
              <select
                className="filter-input"
                value={draft.categoryId}
                onChange={(e) => setDraft((s) => ({ ...s, categoryId: e.target.value }))}
              >
                <option value="">未選択</option>
                {machineCategoryMasterMock.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group" style={{ minWidth: 220 }}>
              <label>No.</label>
              <input
                className="filter-input"
                value={draft.no}
                onChange={(e) => setDraft((s) => ({ ...s, no: e.target.value }))}
                placeholder="例) M-1001"
              />
            </div>
          </div>

          <div className="filter-bar" style={{ marginTop: 10 }}>
            <div className="filter-group" style={{ minWidth: 320, flex: 1 }}>
              <label>品名</label>
              <input
                className="filter-input"
                value={draft.productName}
                onChange={(e) => setDraft((s) => ({ ...s, productName: e.target.value }))}
                placeholder="例) ZX120"
              />
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="button" type="button" onClick={onClose}>
            キャンセル
          </button>
          <button
            ref={confirmRef}
            className="button primary"
            type="button"
            disabled={!canConfirm}
            onClick={() => {
              onConfirm({
                kindId: draft.kindId.trim(),
                categoryId: draft.categoryId.trim(),
                no: draft.no.trim(),
                productName: draft.productName.trim()
              });
              onClose();
            }}
          >
            追加
          </button>
        </div>
      </div>
    </div>
  );
};

