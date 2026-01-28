import React, { useEffect, useMemo, useState } from "react";

export type InventoryMemoInput = {
  writer: string;
  title: string;
  body: string;
};

export type InventoryMemoMeta = {
  id?: string | null;
  createdAt?: number | null;
  updatedAt?: number | null;
};

type Props = {
  open: boolean;
  title: string;
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

export const InventoryMemoModal: React.FC<Props> = ({ open, title, initialValue, meta, onCancel, onSave }) => {
  const [writer, setWriter] = useState("");
  const [memoTitle, setMemoTitle] = useState("");
  const [body, setBody] = useState("");

  const canSave = useMemo(() => {
    return Boolean(writer.trim() && memoTitle.trim() && body.trim());
  }, [body, memoTitle, writer]);

  useEffect(() => {
    if (!open) return;
    setWriter(initialValue?.writer ?? "");
    setMemoTitle(initialValue?.title ?? "");
    setBody(initialValue?.body ?? "");
  }, [open, initialValue?.body, initialValue?.title, initialValue?.writer]);

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
            {meta?.updatedAt ? (
              <div>
                更新日時:{" "}
                <span style={{ color: "#0f172a", fontWeight: 900 }}>{formatDateTime(meta.updatedAt)}</span>
              </div>
            ) : null}
          </div>

          <div className="filter-bar multi" style={{ marginTop: 0, gap: 10, flexWrap: "wrap" }}>
            <div className="filter-group" style={{ minWidth: 220 }}>
              <label>記入者</label>
              <input
                className="filter-input"
                value={writer}
                onChange={(e) => setWriter(e.target.value)}
                placeholder="例) 鈴木"
              />
            </div>
            <div className="filter-group" style={{ minWidth: 340, flex: "1 1 340px" }}>
              <label>タイトル</label>
              <input
                className="filter-input"
                value={memoTitle}
                onChange={(e) => setMemoTitle(e.target.value)}
                placeholder="例) オイル漏れ点検"
              />
            </div>
          </div>

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
            onClick={() => onSave({ writer: writer.trim(), title: memoTitle.trim(), body: body.trim() })}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
};

