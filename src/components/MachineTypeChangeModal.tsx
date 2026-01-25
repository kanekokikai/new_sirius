import React, { useEffect, useMemo, useState } from "react";

type MasterItem = { id: string; name: string };

type Props = {
  open: boolean;
  title?: string;
  kindOptions: readonly MasterItem[];
  categoryOptions: readonly MasterItem[];
  initialKindId?: string;
  initialCategoryId?: string;
  initialInstructionNote?: string;
  initialQuantity?: string;
  /** when true, disables "商品追加" (e.g. when the current row has no machine yet) */
  disableAddProduct?: boolean;
  onClose: () => void;
  onConfirm: (next: {
    kindId: string;
    kindName: string;
    categoryId: string;
    categoryName: string;
    instructionNote: string;
    quantity: string;
  }) => void;
  onAddProduct: (next: {
    kindId: string;
    kindName: string;
    categoryId: string;
    categoryName: string;
    instructionNote: string;
    quantity: string;
  }) => void;
  onOrderDetail?: () => void;
};

export const MachineTypeChangeModal: React.FC<Props> = ({
  open,
  title = "種類ID / 種別ID 変更（デモ）",
  kindOptions,
  categoryOptions,
  initialKindId,
  initialCategoryId,
  initialInstructionNote,
  initialQuantity,
  disableAddProduct = false,
  onClose,
  onConfirm,
  onAddProduct,
  onOrderDetail
}) => {
  const initial = useMemo(
    () => ({
      kindId: initialKindId ?? kindOptions[0]?.id ?? "",
      categoryId: initialCategoryId ?? categoryOptions[0]?.id ?? "",
      instructionNote: initialInstructionNote ?? "",
      quantity: initialQuantity ?? ""
    }),
    [categoryOptions, initialCategoryId, initialInstructionNote, initialKindId, initialQuantity, kindOptions]
  );

  const [kindId, setKindId] = useState(initial.kindId);
  const [categoryId, setCategoryId] = useState(initial.categoryId);
  const [instructionNote, setInstructionNote] = useState(initial.instructionNote);
  const [quantity, setQuantity] = useState(initial.quantity);
  const [quantityError, setQuantityError] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    setKindId(initial.kindId);
    setCategoryId(initial.categoryId);
    setInstructionNote(initial.instructionNote);
    setQuantity(initial.quantity);
    setQuantityError("");
  }, [open, initial.categoryId, initial.instructionNote, initial.kindId, initial.quantity]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const kindName = kindOptions.find((x) => x.id === kindId)?.name ?? "";
  const categoryName = categoryOptions.find((x) => x.id === categoryId)?.name ?? "";

  const canConfirm = Boolean(kindId.trim() && categoryId.trim());
  const nextPayload = { kindId, kindName, categoryId, categoryName, instructionNote, quantity };

  const validateQuantity = () => {
    if (String(quantity ?? "").trim()) {
      setQuantityError("");
      return true;
    }
    setQuantityError("数量を入力してください。");
    return false;
  };

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
            機械名セルのダブルクリックで開くデモモーダルです。変更/追加はデモ用に画面内テーブルに反映します。
          </p>

          <div className="filter-bar multi" style={{ marginTop: 0 }}>
            <div className="filter-group" style={{ minWidth: 220 }}>
              <label>種類ID</label>
              <select
                className="filter-input"
                value={kindId}
                onChange={(e) => {
                  setKindId(e.target.value);
                  // 要件: 種類/種別が変わった場合は、過去の指示備考を引き継がない（商品追加で関係ない指示備考が混入するため）
                  setInstructionNote("");
                }}
              >
                {kindOptions.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.id}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-group" style={{ minWidth: 260 }}>
              <label>種類名</label>
              <input className="filter-input" value={kindName} readOnly />
            </div>
            <div className="filter-group" style={{ minWidth: 260 }}>
              <label>種別ID</label>
              <select
                className="filter-input"
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  // 要件: 種類/種別が変わった場合は、過去の指示備考を引き継がない（商品追加で関係ない指示備考が混入するため）
                  setInstructionNote("");
                }}
              >
                {categoryOptions.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.id}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-group" style={{ minWidth: 260 }}>
              <label>種別名</label>
              <input className="filter-input" value={categoryName} readOnly />
            </div>
          </div>

          <div className="filter-group" style={{ marginTop: 10, width: "100%" }}>
            <label>指示備考（商品ではない行として追加）</label>
            <textarea
              className="filter-input"
              style={{ height: 90, resize: "vertical", whiteSpace: "pre-wrap" }}
              value={instructionNote}
              placeholder="例) ※都筑移動、コベルコ希望"
              onChange={(e) => setInstructionNote(e.target.value)}
            />
          </div>

          <div className="filter-group" style={{ marginTop: 10, width: "100%" }}>
            <label>数量（必須）</label>
            <input
              className="filter-input"
              inputMode="numeric"
              placeholder="例) 1"
              value={quantity}
              onChange={(e) => {
                setQuantity(e.target.value);
                if (quantityError) setQuantityError("");
              }}
              onBlur={validateQuantity}
            />
            {quantityError && <div style={{ color: "#b91c1c", fontSize: 12, fontWeight: 800 }}>{quantityError}</div>}
          </div>
        </div>
        <div className="modal-footer">
          <button className="button" type="button" onClick={onClose}>
            キャンセル
          </button>
          <button
            className="button"
            type="button"
            disabled={!canConfirm || disableAddProduct}
            onClick={() => {
              if (!validateQuantity()) return;
              onAddProduct(nextPayload);
            }}
          >
            商品追加
          </button>
          <button
            className="button primary"
            type="button"
            disabled={!canConfirm}
            onClick={() => {
              if (!validateQuantity()) return;
              onConfirm(nextPayload);
            }}
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

