import React, { useEffect, useMemo, useState } from "react";
import {
  transportFeeAddressOptions,
  transportFeeMasterMock,
  transportFeeTruckSizeOptions,
  TruckSize
} from "../data/transportFeeMasterMock";

type Props = {
  open: boolean;
  title?: string;
  initialValue?: string; // e.g. "（7t）25000" or "回送住所:東京都\n（7t）25000"
  onClose: () => void;
  onConfirm: (nextValue: string) => void;
  onOrderDetail?: () => void;
};

const parseInitial = (
  v: string | undefined
): { address: string; truckSize: TruckSize; amount: string } => {
  const value = (v ?? "").trim();
  let address = transportFeeAddressOptions[0] ?? "東京都";
  let truckSize: TruckSize = "7t";
  let amount = "";

  const addrLine = value.split("\n").find((x) => x.trim().startsWith("回送住所:"));
  if (addrLine) address = addrLine.replace("回送住所:", "").trim() || address;

  const feeLine = value.split("\n").find((x) => x.includes("（") && x.includes("）"));
  if (feeLine) {
    const m = feeLine.match(/^（(.+?)）\s*(\d+)?/);
    if (m) {
      const size = m[1] as TruckSize;
      if (transportFeeTruckSizeOptions.includes(size)) truckSize = size;
      if (m[2]) amount = m[2];
    }
  }

  return { address, truckSize, amount };
};

const lookupAmount = (address: string, truckSize: TruckSize): number | undefined => {
  const hit = transportFeeMasterMock.find((x) => x.address === address && x.truckSize === truckSize);
  return hit?.amount;
};

export const TransportFeeEditModal: React.FC<Props> = ({
  open,
  title = "回送費編集（デモ）",
  initialValue,
  onClose,
  onConfirm,
  onOrderDetail
}) => {
  const initial = useMemo(() => parseInitial(initialValue), [initialValue]);

  const [address, setAddress] = useState<string>(initial.address);
  const [truckSize, setTruckSize] = useState<TruckSize>(initial.truckSize);
  const [amount, setAmount] = useState<string>(initial.amount);
  const [auto, setAuto] = useState(true);

  useEffect(() => {
    if (!open) return;
    setAddress(initial.address);
    setTruckSize(initial.truckSize);
    setAmount(initial.amount);
    setAuto(true);
  }, [open, initial.address, initial.amount, initial.truckSize]);

  useEffect(() => {
    if (!open) return;
    if (!auto) return;
    const v = lookupAmount(address, truckSize);
    if (v == null) return;
    setAmount(String(v));
  }, [address, auto, open, truckSize]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const normalizedAmount = amount.replace(/[^\d]/g, "");
  const preview = `回送住所:${address}\n（${truckSize}）${normalizedAmount || ""}`.trim();

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
      <div className="modal" style={{ width: "min(680px, 94vw)" }}>
        <div className="modal-header">
          <h3 style={{ margin: 0 }}>{title}</h3>
          <button className="button ghost" type="button" onClick={onClose}>
            閉じる
          </button>
        </div>
        <div className="modal-body">
          <p style={{ marginTop: 0, marginBottom: 10, color: "#475569", fontSize: 12, lineHeight: 1.35 }}>
            回送住所 / トラックサイズを選択すると回送費がマスタから自動入力されます。必要なら好きな数字に上書きできます（デモ）。
          </p>

          <div className="filter-bar multi" style={{ marginTop: 0 }}>
            <div className="filter-group" style={{ minWidth: 220 }}>
              <label>回送住所</label>
              <select className="filter-input" value={address} onChange={(e) => setAddress(e.target.value)}>
                {transportFeeAddressOptions.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-group" style={{ minWidth: 220 }}>
              <label>回送費トラックサイズ</label>
              <select
                className="filter-input"
                value={truckSize}
                onChange={(e) => setTruckSize(e.target.value as TruckSize)}
              >
                {transportFeeTruckSizeOptions.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-group" style={{ minWidth: 200 }}>
              <label>回送費</label>
              <input
                className="filter-input"
                inputMode="numeric"
                value={amount}
                onChange={(e) => {
                  setAuto(false);
                  setAmount(e.target.value);
                }}
                placeholder="例) 25000"
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
            <button
              className="button"
              type="button"
              onClick={() => {
                setAuto(true);
                const v = lookupAmount(address, truckSize);
                setAmount(v == null ? "" : String(v));
              }}
            >
              マスタ再取得（デモ）
            </button>
            <span style={{ color: "#64748b", fontSize: 12, alignSelf: "center" }}>
              自動入力: {auto ? "ON" : "OFF（手入力上書き中）"}
            </span>
          </div>

          <div style={{ marginTop: 10, fontSize: 13, color: "#334155" }}>
            反映プレビュー: <span style={{ fontWeight: 800, whiteSpace: "pre-line" }}>{preview}</span>
          </div>
        </div>
        <div className="modal-footer">
          <button className="button" type="button" onClick={onClose}>
            キャンセル
          </button>
          <button className="button primary" type="button" onClick={() => onConfirm(preview)}>
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

