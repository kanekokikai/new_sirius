import React, { useEffect } from "react";

type Props = {
  open: boolean;
  title?: string;
  customer: string;
  orderTaker: string;
  site: string;
  siteContact: string;
  startDate: string;
  returnDueDate: string;
  onClose: () => void;
};

export const OutboundInProgressModal: React.FC<Props> = ({
  open,
  title = "出庫中データ（デモ）",
  customer,
  orderTaker,
  site,
  siteContact,
  startDate,
  returnDueDate,
  onClose
}) => {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

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
          <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 10 }}>
            <div style={{ color: "#64748b", fontWeight: 800 }}>得意先</div>
            <div style={{ color: "#0f172a", fontWeight: 800 }}>{customer || "-"}</div>

            <div style={{ color: "#64748b", fontWeight: 800 }}>現場</div>
            <div style={{ color: "#0f172a", fontWeight: 800 }}>{site || "-"}</div>

            <div style={{ color: "#64748b", fontWeight: 800 }}>受注者</div>
            <div style={{ color: "#0f172a", fontWeight: 800 }}>{orderTaker || "-"}</div>

            <div style={{ color: "#64748b", fontWeight: 800 }}>現場連絡先</div>
            <div style={{ color: "#0f172a", fontWeight: 800 }}>{siteContact || "-"}</div>

            <div style={{ color: "#64748b", fontWeight: 800 }}>開始日</div>
            <div style={{ color: "#0f172a", fontWeight: 800 }}>{startDate || "-"}</div>

            <div style={{ color: "#64748b", fontWeight: 800 }}>返却予定日</div>
            <div style={{ color: "#0f172a", fontWeight: 800 }}>{returnDueDate || "-"}</div>
          </div>
          <p style={{ marginTop: 12, marginBottom: 0, color: "#475569", fontSize: 12 }}>
            ※ デモ：在庫一覧の「貸出中」行をダブルクリックすると表示します（編集/保存は未実装）。
          </p>
        </div>
        <div className="modal-footer">
          <button className="button primary" type="button" onClick={onClose}>
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};

