import React, { useCallback, useEffect, useMemo, useState } from "react";

/** 種別 preset options */
const SHUBETSU_OPTIONS = ["K　軽油", "N　尿素", "G　ガソリン"] as const;

/** 1件分の燃料エントリ */
type FuelEntry = {
  shubetsuMode: "select" | "input";
  shubetsuSelect: string;
  shubetsuInput: string;
  liters: string;
};

const createDefaultEntry = (): FuelEntry => ({
  shubetsuMode: "select",
  shubetsuSelect: SHUBETSU_OPTIONS[0],
  shubetsuInput: "",
  liters: ""
});

/** "K　軽油 30L" のような文字列を FuelEntry にパース */
const parseEntry = (raw: string): FuelEntry => {
  const trimmed = raw.trim();
  if (!trimmed) return createDefaultEntry();

  const literMatch = trimmed.match(/^(.+?)\s+(\d+(?:\.\d+)?)L$/);
  const basePart = literMatch ? literMatch[1] : trimmed;
  const literPart = literMatch ? literMatch[2] : "";

  const matched = SHUBETSU_OPTIONS.find((opt) => opt === basePart);
  if (matched) {
    return { shubetsuMode: "select", shubetsuSelect: matched, shubetsuInput: "", liters: literPart };
  }
  if (basePart) {
    return { shubetsuMode: "input", shubetsuSelect: SHUBETSU_OPTIONS[0], shubetsuInput: basePart, liters: literPart };
  }
  return { ...createDefaultEntry(), liters: literPart };
};

/** FuelEntry を表示用文字列に変換 */
const serializeEntry = (e: FuelEntry): string => {
  const shubetsu = e.shubetsuMode === "select" ? e.shubetsuSelect : e.shubetsuInput.trim();
  if (!shubetsu) return "";
  const ltr = e.liters.trim();
  return ltr ? `${shubetsu} ${ltr}L` : shubetsu;
};

type Props = {
  open: boolean;
  title?: string;
  description?: string;
  initialValue?: string;
  onClose: () => void;
  onConfirm: (nextValue: string) => void;
};

/**
 * 不足燃料 入力モーダル
 *
 * 表示項目:
 *   明細：プルダウン（固定値「販売」）
 *   種類：テキスト（固定値「GS　燃料」）
 *   種別：プルダウン（K　軽油 / N　尿素 / G　ガソリン / 入力）
 *   リッター数：テキスト
 *
 * 2件目の燃料を追加可能
 * 保存形式: "K　軽油 30L / N　尿素 10L"
 */
export const InsufficientFuelModal: React.FC<Props> = ({
  open,
  title = "不足燃料 入力（デモ）",
  description = "不足燃料列をクリックして入力するデモモーダルです。",
  initialValue,
  onClose,
  onConfirm
}) => {
  const initial = useMemo(() => (initialValue ?? "").trim(), [initialValue]);

  const [entries, setEntries] = useState<FuelEntry[]>([createDefaultEntry()]);

  // Parse initial value when modal opens
  // 保存形式: "種別 ○○L / 種別 ○○L"
  useEffect(() => {
    if (!open) return;
    if (!initial) {
      setEntries([createDefaultEntry()]);
      return;
    }
    const parts = initial.split("/").map((s) => s.trim()).filter(Boolean);
    const parsed = parts.map(parseEntry);
    setEntries(parsed.length > 0 ? parsed : [createDefaultEntry()]);
  }, [open, initial]);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const updateEntry = useCallback((index: number, patch: Partial<FuelEntry>) => {
    setEntries((prev) => prev.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  }, []);

  const removeEntry = useCallback((index: number) => {
    setEntries((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length > 0 ? next : [createDefaultEntry()];
    });
  }, []);

  const addEntry = useCallback(() => {
    setEntries((prev) => [...prev, createDefaultEntry()]);
  }, []);

  if (!open) return null;

  const canAddMore = entries.length < 2;
  const validEntries = entries.filter((e) => {
    const shubetsu = e.shubetsuMode === "select" ? e.shubetsuSelect : e.shubetsuInput.trim();
    return Boolean(shubetsu);
  });
  const canConfirm = validEntries.length > 0;

  const handleConfirm = () => {
    if (!canConfirm) return;
    const result = validEntries.map(serializeEntry).filter(Boolean).join(" / ");
    onConfirm(result);
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
      <div className="modal" style={{ width: "min(560px, 92vw)" }}>
        <div className="modal-header">
          <h3 style={{ margin: 0 }}>{title}</h3>
          <button className="button ghost" type="button" onClick={onClose}>
            閉じる
          </button>
        </div>
        <div className="modal-body">
          {description && (
            <p style={{ marginTop: 0, marginBottom: 10, color: "#475569", fontSize: 12, lineHeight: 1.35 }}>
              {description}
            </p>
          )}

          {entries.map((entry, idx) => (
            <FuelEntryRow
              key={idx}
              index={idx}
              entry={entry}
              showRemove={entries.length > 1}
              onChange={updateEntry}
              onRemove={removeEntry}
            />
          ))}

          {/* 燃料追加ボタン */}
          {canAddMore && (
            <div style={{ marginTop: 12 }}>
              <button
                className="button"
                type="button"
                onClick={addEntry}
                style={{ fontSize: 13 }}
              >
                ＋ 2種類めの燃料を追加
              </button>
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
            disabled={!canConfirm}
            onClick={handleConfirm}
          >
            変更
          </button>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* 1件分の燃料入力行                                                   */
/* ------------------------------------------------------------------ */

const FuelEntryRow: React.FC<{
  index: number;
  entry: FuelEntry;
  showRemove: boolean;
  onChange: (index: number, patch: Partial<FuelEntry>) => void;
  onRemove: (index: number) => void;
}> = ({ index, entry, showRemove, onChange, onRemove }) => {
  const label = index === 0 ? "燃料 1" : "燃料 2";

  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: 6,
        padding: "10px 12px",
        marginTop: index === 0 ? 0 : 12,
        background: index === 0 ? undefined : "#f8fafc"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontWeight: 700, fontSize: 13, color: "#334155" }}>{label}</span>
        {showRemove && (
          <button
            className="button ghost"
            type="button"
            onClick={() => onRemove(index)}
            style={{ fontSize: 12, padding: "2px 8px", color: "#b91c1c" }}
          >
            削除
          </button>
        )}
      </div>

      {/* 明細：プルダウン（固定値） */}
      <div className="filter-bar" style={{ marginTop: 0 }}>
        <div className="filter-group" style={{ minWidth: 280 }}>
          <label>明細</label>
          <select className="filter-input" value="販売" disabled>
            <option value="販売">販売</option>
          </select>
        </div>
      </div>

      {/* 種類：テキスト（固定値） */}
      <div className="filter-bar" style={{ marginTop: 8 }}>
        <div className="filter-group" style={{ minWidth: 280 }}>
          <label>種類</label>
          <input
            className="filter-input"
            value="GS　燃料"
            readOnly
            style={{ backgroundColor: "#f1f5f9", color: "#475569" }}
          />
        </div>
      </div>

      {/* 種別：プルダウン + 入力切替 */}
      <div className="filter-bar" style={{ marginTop: 8 }}>
        <div className="filter-group" style={{ minWidth: 280 }}>
          <label>種別</label>
          <select
            className="filter-input"
            value={entry.shubetsuMode === "input" ? "__input__" : entry.shubetsuSelect}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "__input__") {
                onChange(index, { shubetsuMode: "input" });
              } else {
                onChange(index, { shubetsuMode: "select", shubetsuSelect: v, shubetsuInput: "" });
              }
            }}
          >
            {SHUBETSU_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
            <option value="__input__">入力</option>
          </select>
        </div>
      </div>

      {/* 入力モード選択時のテキスト入力欄 */}
      {entry.shubetsuMode === "input" && (
        <div className="filter-bar" style={{ marginTop: 8 }}>
          <div className="filter-group" style={{ minWidth: 280 }}>
            <label>種別（入力）</label>
            <input
              className="filter-input"
              value={entry.shubetsuInput}
              onChange={(e) => onChange(index, { shubetsuInput: e.target.value })}
              placeholder="種別を入力してください"
              autoFocus
            />
          </div>
        </div>
      )}

      {/* リッター数 */}
      <div className="filter-bar" style={{ marginTop: 8 }}>
        <div className="filter-group" style={{ minWidth: 280 }}>
          <label>リッター数</label>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <input
              className="filter-input"
              inputMode="decimal"
              value={entry.liters}
              onChange={(e) => onChange(index, { liters: e.target.value.replace(/[^\d.]/g, "") })}
              placeholder="例) 30"
              style={{ flex: 1 }}
            />
            <span style={{ fontWeight: 700, fontSize: 14 }}>L</span>
          </div>
        </div>
      </div>
    </div>
  );
};
