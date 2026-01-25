import React, { useEffect, useMemo, useState } from "react";
import { PickupOrdersMachineSelectItem } from "../data/pickupOrdersMachineSelectMock";

type Props = {
  open: boolean;
  title?: string;
  customerId?: string;
  siteId?: string;
  customerName?: string;
  siteName?: string;
  allItems: readonly PickupOrdersMachineSelectItem[]; // フィルタ前（デモ全体）
  outboundItems: readonly PickupOrdersMachineSelectItem[];
  orderedItems: readonly PickupOrdersMachineSelectItem[];
  inTableMachineNames: readonly string[]; // 表に載っている機械（同グループ）
  selectedFallbackMachineNames?: readonly string[]; // 表の選択機械（デモマスタに無い場合も表示したい）
  pinnedMachineId?: string; // ダブルクリックした「その行」の機械（チェック外しても表示を維持したい）
  pinnedMachineName?: string; // pinnedMachineId が無い場合のフォールバック表示名
  initialSelectedIds: readonly string[];
  initialInstructionNote?: string;
  onClose: () => void;
  onConfirm: (selectedIds: string[], instructionNote: string) => void;
  onOrderDetail?: () => void;
};

export const PickupOrdersMachineSelectModal: React.FC<Props> = ({
  open,
  title = "商品 選択（引取受注・デモ）",
  customerId,
  siteId,
  customerName,
  siteName,
  allItems,
  outboundItems,
  orderedItems,
  inTableMachineNames,
  selectedFallbackMachineNames,
  pinnedMachineId,
  pinnedMachineName,
  initialSelectedIds,
  initialInstructionNote,
  onClose,
  onConfirm,
  onOrderDetail
}) => {
  const initial = useMemo(() => Array.from(new Set(initialSelectedIds)), [initialSelectedIds]);
  const [selectedIds, setSelectedIds] = useState<string[]>(initial);
  const [instructionNote, setInstructionNote] = useState<string>((initialInstructionNote ?? "").trim());

  useEffect(() => {
    if (!open) return;
    setSelectedIds(initial);
    setInstructionNote((initialInstructionNote ?? "").trim());
  }, [open, initial, initialInstructionNote]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const inTableSet = useMemo(
    () => new Set(inTableMachineNames.map((x) => x.trim()).filter(Boolean)),
    [inTableMachineNames]
  );

  if (!open) return null;

  const toggle = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const pinnedFromAll = pinnedMachineId ? allItems.find((x) => x.id === pinnedMachineId) : undefined;

  const renderList = (items: readonly PickupOrdersMachineSelectItem[], expectedStatus: "出庫中" | "受注中") => {
    // 「出庫中一覧/受注一覧」のデータが空でも、選択されてる機械は表示する
    const selectedFromAll = selectedIds
      .map((id) => allItems.find((x) => x.id === id))
      .filter((x): x is NonNullable<typeof x> => Boolean(x));
    const selectedFromAllSameStatus = selectedFromAll.filter((x) => x.status === expectedStatus);
    const pinnedSameStatus = pinnedFromAll && pinnedFromAll.status === expectedStatus ? [pinnedFromAll] : [];
    const mergedById = new Map<string, PickupOrdersMachineSelectItem>();
    [...items, ...selectedFromAllSameStatus, ...pinnedSameStatus].forEach((x) => {
      if (!mergedById.has(x.id)) mergedById.set(x.id, x);
    });
    const mergedItems = Array.from(mergedById.values());

    const visibleItems = mergedItems.filter((x) => {
      // 表に載っている機械は「チェック中のものだけ」表示する。
      // 表に載っていない機械は常に表示する。
      const isInTable = inTableSet.has(x.machineName);
      const isPinned = pinnedMachineId ? x.id === pinnedMachineId : false;
      return !isInTable || selectedIds.includes(x.id) || isPinned;
    });

    if (visibleItems.length === 0) {
      // フォールバック名は「受注一覧」にだけ出す（出庫＝引取側のデモは全て受注中として扱うため）
      const fallbackNames = expectedStatus === "受注中"
        ? [
            ...(selectedFallbackMachineNames ?? []),
            ...(pinnedFromAll ? [] : (pinnedMachineName ? [pinnedMachineName] : []))
          ]
            .map((x) => x.trim())
            .filter(Boolean)
        : [];
      return (
        <div style={{ color: "#64748b", fontSize: 12, padding: 10, border: "1px dashed #cbd5e1", borderRadius: 10 }}>
          {fallbackNames.length > 0 ? (
            <div style={{ display: "grid", gap: 8 }}>
              {fallbackNames.map((name) => (
                <label
                  key={`fallback-${name}`}
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                    padding: "10px 10px",
                    border: "1px solid #e2e8f0",
                    borderRadius: 12,
                    background: "#f8fafc"
                  }}
                >
                  <input type="checkbox" checked disabled />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 800, color: "#0f172a", lineHeight: 1.2, wordBreak: "break-word" }}>
                      {name}
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                      （表で選択中 / デモ一覧データなし）
                    </div>
                  </div>
                </label>
              ))}
            </div>
          ) : (
            "対象データがありません（表に載っていない機械がない、または条件が未設定/デモ未登録です）"
          )}
        </div>
      );
    }
    return (
      <div style={{ display: "grid", gap: 8 }}>
        {visibleItems.map((x) => {
          const checked = selectedIds.includes(x.id);
          return (
            <label
              key={x.id}
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                padding: "10px 10px",
                border: "1px solid #e2e8f0",
                borderRadius: 12,
                background: checked ? "#eff6ff" : "#ffffff",
                cursor: "pointer"
              }}
            >
              <input type="checkbox" checked={checked} onChange={() => toggle(x.id)} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 800, color: "#0f172a", lineHeight: 1.2, wordBreak: "break-word" }}>
                  {x.machineName}
                </div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                  {x.customerName} / {x.siteName}
                </div>
              </div>
            </label>
          );
        })}
      </div>
    );
  };

  const canConfirm = selectedIds.length > 0;
  const canEditInstructionNote = selectedIds.length === 1 && (!pinnedMachineId || selectedIds.includes(pinnedMachineId));

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
      <div className="modal" style={{ width: "min(980px, 96vw)" }}>
        <div className="modal-header">
          <h3 style={{ margin: 0 }}>{title}</h3>
          <button className="button ghost" type="button" onClick={onClose}>
            閉じる
          </button>
        </div>
        <div className="modal-body">
          <p style={{ marginTop: 0, marginBottom: 10, color: "#475569", fontSize: 12, lineHeight: 1.35 }}>
            機械名セルのダブルクリックで開くデモモーダルです。左「出庫中一覧」、右「受注一覧」からチェックで選択できます。
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            {!!customerId?.trim() && (
              <span className="pill" style={{ background: "#f1f5f9", color: "#0f172a" }}>
                得意先ID: {customerId}
              </span>
            )}
            {!!siteId?.trim() && (
              <span className="pill" style={{ background: "#f1f5f9", color: "#0f172a" }}>
                現場ID: {siteId}
              </span>
            )}
            {!!customerName?.trim() && (
              <span className="pill" style={{ background: "#ecfeff", color: "#155e75" }}>
                得意先: {customerName}
              </span>
            )}
            {!!siteName?.trim() && (
              <span className="pill" style={{ background: "#ecfeff", color: "#155e75" }}>
                現場: {siteName}
              </span>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 900, color: "#0f172a", marginBottom: 8 }}>出庫中一覧</div>
              <div style={{ maxHeight: "54vh", overflow: "auto", paddingRight: 2 }}>{renderList(outboundItems, "出庫中")}</div>
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 900, color: "#0f172a", marginBottom: 8 }}>受注一覧</div>
              <div style={{ maxHeight: "54vh", overflow: "auto", paddingRight: 2 }}>{renderList(orderedItems, "受注中")}</div>
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <div style={{ fontWeight: 900, color: "#0f172a", marginBottom: 8 }}>指示備考（デモ）</div>
            <textarea
              className="filter-input"
              style={{ width: "100%", minHeight: 92, resize: "vertical" }}
              placeholder={canEditInstructionNote ? "指示備考を入力（先頭に※は自動付与）" : "商品が1つだけ選択されている場合に編集できます"}
              disabled={!canEditInstructionNote}
              value={instructionNote}
              onChange={(e) => setInstructionNote(e.target.value)}
            />
            {!canEditInstructionNote && (
              <div style={{ marginTop: 6, fontSize: 12, color: "#64748b" }}>
                商品が1つだけ選択されている場合のみ有効です（2つ以上選択中は編集不可）。
              </div>
            )}
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
            onClick={() => onConfirm(selectedIds, canEditInstructionNote ? instructionNote.trim() : "")}
          >
            反映（デモ）
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

