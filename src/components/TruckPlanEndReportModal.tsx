import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  open: boolean;
  mode: "end" | "unend";
  title?: string;
  driverName: string;
  date: string;
  slotIndex: number; // 0-based
  summary: { topLeft: string; bottomLeft: string; bottomRight: string; memo: string };
  initialEndTime?: string;
  onCancel: () => void;
  onConfirm: (payload: { endTime?: string }) => void;
};

const toHHMM = (d: Date) => {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
};

export const TruckPlanEndReportModal = ({
  open,
  mode,
  title,
  driverName,
  date,
  slotIndex,
  summary,
  initialEndTime,
  onCancel,
  onConfirm
}: Props) => {
  const isEnd = mode === "end";
  const resolvedTitle = title ?? (isEnd ? "終了お知らせ" : "終了報告解除");
  const okLabel = isEnd ? "終了報告する" : "解除する";
  const okRef = useRef<HTMLButtonElement | null>(null);

  const defaultTime = useMemo(() => initialEndTime ?? toHHMM(new Date()), [initialEndTime]);
  const [endTime, setEndTime] = useState(defaultTime);

  useEffect(() => {
    if (!open) return;
    // open時に初期値へ戻す（前回入力が残らないように）
    setEndTime(defaultTime);
  }, [open, defaultTime]);

  useEffect(() => {
    if (!open) return;
    okRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter") {
        // IMEやフォーカス状況で誤爆しないよう、明示的にボタンに寄せる
        e.preventDefault();
        onConfirm({ endTime: isEnd ? endTime : undefined });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [endTime, isEnd, onCancel, onConfirm, open]);

  if (!open) return null;

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={resolvedTitle}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="modal" style={{ width: "min(560px, 92vw)" }}>
        <div className="modal-header">
          <h3 style={{ margin: 0 }}>{resolvedTitle}</h3>
          <button className="button ghost" type="button" onClick={onCancel}>
            閉じる
          </button>
        </div>

        <div className="modal-body">
          <p style={{ marginTop: 0, marginBottom: 10, color: "#0f172a", fontWeight: 900 }}>
            {isEnd ? "この仕事ブロックを「終了報告」しますか？" : "この仕事ブロックの「終了報告」を解除しますか？"}
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 10 }}>
            <div style={{ color: "#64748b", fontWeight: 800 }}>ドライバー</div>
            <div style={{ color: "#0f172a", fontWeight: 900 }}>{driverName}</div>

            <div style={{ color: "#64748b", fontWeight: 800 }}>日付</div>
            <div style={{ color: "#0f172a", fontWeight: 900 }}>{date}</div>

            <div style={{ color: "#64748b", fontWeight: 800 }}>枠</div>
            <div style={{ color: "#0f172a", fontWeight: 900 }}>{slotIndex + 1}</div>

            {isEnd && (
              <>
                <div style={{ color: "#64748b", fontWeight: 800 }}>終了時間</div>
                <div>
                  <input
                    className="filter-input"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    aria-label="終了時間"
                  />
                </div>
              </>
            )}

            <div style={{ color: "#64748b", fontWeight: 800 }}>内容</div>
            <div style={{ color: "#0f172a", fontWeight: 800 }}>
              {(summary.topLeft || "-") + " / " + (summary.bottomLeft || "-") + " / " + (summary.bottomRight || "-")}
            </div>

            <div style={{ color: "#64748b", fontWeight: 800 }}>メモ</div>
            <div style={{ color: "#0f172a", fontWeight: 800 }}>{summary.memo || "-"}</div>
          </div>

          <p style={{ marginTop: 12, marginBottom: 0, color: "#64748b", fontSize: 12 }}>
            Enterで確定、Escでキャンセルできます。
          </p>
        </div>

        <div className="modal-footer">
          <button className="button" type="button" onClick={onCancel}>
            キャンセル
          </button>
          <button
            ref={okRef}
            className="button primary"
            type="button"
            onClick={() => onConfirm({ endTime: isEnd ? endTime : undefined })}
          >
            {okLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

