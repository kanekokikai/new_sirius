import React, { useEffect, useMemo, useState } from "react";

export type InventoryMemoInput = {
  writer: string;
  title: string;
  location: string;
  body: string;
  /** 修理用（デモ） */
  repairStartDate?: string; // yyyy-mm-dd
  repairEndPlannedDate?: string; // yyyy-mm-dd
};

export type InventoryMemoMeta = {
  id?: string | null;
  createdAt?: number | null;
  updatedAt?: number | null;
  /** 在庫移動の完了日（デモ） */
  completedAt?: number | null;
};

type Props = {
  open: boolean;
  title: string;
  /** true の場合、「開始日 ～ 終了予定日」を表示（修理モーダル用） */
  showRepairDateRange?: boolean;
  initialValue?: InventoryMemoInput | null;
  meta?: InventoryMemoMeta;
  onCancel: () => void;
  onSave: (memo: InventoryMemoInput) => void;
};

const formatDateTime = (ms: number) => {
  try {
    return new Date(ms).toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return String(ms);
  }
};

const daysSince = (createdAt: number) => {
  const diff = Date.now() - createdAt;
  if (!Number.isFinite(diff) || diff < 0) return 0;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

const toDateInputValue = (ms: number) => {
  try {
    const d = new Date(ms);
    const pad2 = (n: number) => String(n).padStart(2, "0");
    const y = d.getFullYear();
    const m = pad2(d.getMonth() + 1);
    const day = pad2(d.getDate());
    return `${y}-${m}-${day}`;
  } catch {
    return "";
  }
};

export const InventoryMemoModal: React.FC<Props> = ({
  open,
  title,
  showRepairDateRange = false,
  initialValue,
  meta,
  onCancel,
  onSave
}) => {
  const [writer, setWriter] = useState("");
  const [memoTitle, setMemoTitle] = useState("");
  const [location, setLocation] = useState("");
  const [body, setBody] = useState("");
  const [repairStartDate, setRepairStartDate] = useState("");
  const [repairEndPlannedDate, setRepairEndPlannedDate] = useState("");

  const canSave = useMemo(() => {
    return Boolean(writer.trim() && memoTitle.trim() && body.trim());
  }, [body, memoTitle, writer]);

  useEffect(() => {
    if (!open) return;
    setWriter(initialValue?.writer ?? "");
    setMemoTitle(initialValue?.title ?? "");
    setLocation(initialValue?.location ?? "");
    setBody(initialValue?.body ?? "");
  }, [open, initialValue?.body, initialValue?.location, initialValue?.title, initialValue?.writer]);

  useEffect(() => {
    if (!open) return;
    const fallbackStart = meta?.createdAt ? toDateInputValue(meta.createdAt) : "";
    if (showRepairDateRange) {
      setRepairStartDate(initialValue?.repairStartDate ?? fallbackStart);
      setRepairEndPlannedDate(initialValue?.repairEndPlannedDate ?? "");
    } else {
      setRepairStartDate("");
      setRepairEndPlannedDate("");
    }
  }, [
    open,
    initialValue?.repairEndPlannedDate,
    initialValue?.repairStartDate,
    meta?.createdAt,
    showRepairDateRange
  ]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="modal" style={{ width: "min(720px, 92vw)" }}>
        <div className="modal-header">
          <h3 style={{ margin: 0 }}>{title}</h3>
          <button className="button ghost" type="button" onClick={onCancel}>
            閉じる
          </button>
        </div>

        <div className="modal-body">
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", color: "#64748b", fontSize: 12, fontWeight: 800 }}>
            <div>
              管理番号:{" "}
              <span style={{ color: "#0f172a", fontWeight: 900 }}>{meta?.id ? meta.id : "-"}</span>
            </div>
            <div>
              作成日時:{" "}
              <span style={{ color: "#0f172a", fontWeight: 900 }}>
                {meta?.createdAt ? formatDateTime(meta.createdAt) : "-"}
              </span>
            </div>
            <div>
              経過:{" "}
              <span style={{ color: "#0f172a", fontWeight: 900 }}>
                {meta?.createdAt ? `${daysSince(meta.createdAt)}日` : "-"}
              </span>
            </div>
            <div>
              完了日:{" "}
              <span style={{ color: "#0f172a", fontWeight: 900 }}>
                {meta?.completedAt ? formatDateTime(meta.completedAt) : "-"}
              </span>
            </div>
            {meta?.updatedAt ? (
              <div>
                更新日時:{" "}
                <span style={{ color: "#0f172a", fontWeight: 900 }}>{formatDateTime(meta.updatedAt)}</span>
              </div>
            ) : null}
          </div>

          {/* 1行目：タイトル（横長） */}
          <div className="filter-bar" style={{ marginTop: 10 }}>
            <div className="filter-group" style={{ width: "100%" }}>
              <label>タイトル</label>
              <input
                className="filter-input"
                value={memoTitle}
                onChange={(e) => setMemoTitle(e.target.value)}
                placeholder="例) オイル漏れ点検"
              />
            </div>
          </div>

          {/* 2行目：記入者・置場 */}
          <div className="filter-bar multi" style={{ marginTop: 10, gap: 10, flexWrap: "wrap" }}>
            <div className="filter-group" style={{ minWidth: 220 }}>
              <label>記入者</label>
              <input
                className="filter-input"
                value={writer}
                onChange={(e) => setWriter(e.target.value)}
                placeholder="例) 鈴木"
              />
            </div>
            <div className="filter-group" style={{ minWidth: 260, flex: "1 1 260px" }}>
              <label>置場</label>
              <input
                className="filter-input"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="例) 千葉北"
              />
            </div>
          </div>

          {/* 修理用：開始日～終了予定日 */}
          {showRepairDateRange && (
            <div className="filter-bar" style={{ marginTop: 10 }}>
              <div className="filter-group" style={{ width: "100%" }}>
                <label>開始日 ～ 終了予定日</label>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <input
                    className="filter-input"
                    style={{ width: 170 }}
                    type="date"
                    value={repairStartDate}
                    onChange={(e) => setRepairStartDate(e.target.value)}
                  />
                  <div style={{ color: "#64748b", fontWeight: 900 }}>～</div>
                  <input
                    className="filter-input"
                    style={{ width: 170 }}
                    type="date"
                    value={repairEndPlannedDate}
                    onChange={(e) => setRepairEndPlannedDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* 3行目：内容 */}
          <div className="filter-bar" style={{ marginTop: 10 }}>
            <div className="filter-group" style={{ width: "100%" }}>
              <label>内容</label>
              <textarea
                className="filter-input"
                style={{ minHeight: 140, resize: "vertical" }}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="内容を入力してください"
              />
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="button" type="button" onClick={onCancel}>
            キャンセル
          </button>
          <button
            className="button primary"
            type="button"
            disabled={!canSave}
            onClick={() =>
              onSave(
                showRepairDateRange
                  ? {
                      writer: writer.trim(),
                      title: memoTitle.trim(),
                      location: location.trim(),
                      body: body.trim(),
                      repairStartDate: repairStartDate || undefined,
                      repairEndPlannedDate: repairEndPlannedDate || undefined
                    }
                  : {
                      writer: writer.trim(),
                      title: memoTitle.trim(),
                      location: location.trim(),
                      body: body.trim()
                    }
              )
            }
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
};

