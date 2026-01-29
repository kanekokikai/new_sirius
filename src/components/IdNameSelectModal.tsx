import React, { useEffect, useMemo, useState } from "react";

export type IdNameItem = { id: string; name: string };

type Props = {
  open: boolean;
  title: string;
  description?: string;
  idLabel?: string;
  nameLabel?: string;
  items: readonly IdNameItem[];
  initialId?: string;
  initialName?: string;
  onClose: () => void;
  onConfirm: (next: { id: string; name: string }) => void;
};

const includes = (haystack: string, needle: string) =>
  !needle.trim() || haystack.toLowerCase().includes(needle.trim().toLowerCase());

export const IdNameSelectModal: React.FC<Props> = ({
  open,
  title,
  description,
  idLabel = "ID",
  nameLabel = "名称",
  items,
  initialId,
  initialName,
  onClose,
  onConfirm
}) => {
  const initial = useMemo(() => {
    if (initialId) {
      const hit = items.find((x) => x.id === initialId);
      if (hit) return hit;
    }
    if (initialName) {
      const hit = items.find((x) => x.name === initialName);
      if (hit) return hit;
    }
    return items[0] ?? { id: "", name: "" };
  }, [initialId, initialName, items]);

  const [selectedId, setSelectedId] = useState<string>(initial.id);
  const [selectedName, setSelectedName] = useState<string>(initial.name);

  const [idQuery, setIdQuery] = useState("");
  const [nameQuery, setNameQuery] = useState("");

  useEffect(() => {
    if (!open) return;
    setSelectedId(initial.id);
    setSelectedName(initial.name);
    setIdQuery("");
    setNameQuery("");
  }, [open, initial.id, initial.name]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const filtered = items.filter((x) => includes(x.id, idQuery) && includes(x.name, nameQuery));
  const selected = items.find((x) => x.id === selectedId) ?? items.find((x) => x.name === selectedName);
  const canConfirm = Boolean(selected?.id && selected?.name);

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
      <div className="modal" style={{ width: "min(860px, 94vw)" }}>
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

          <div className="filter-bar multi" style={{ marginTop: 0 }}>
            <div className="filter-group" style={{ minWidth: 240 }}>
              <label>{idLabel}検索</label>
              <input
                className="filter-input"
                value={idQuery}
                onChange={(e) => setIdQuery(e.target.value)}
                placeholder={`例) ${items[0]?.id ?? ""}`}
              />
            </div>
            <div className="filter-group" style={{ minWidth: 320, flex: 1 }}>
              <label>{nameLabel}検索</label>
              <input
                className="filter-input"
                value={nameQuery}
                onChange={(e) => setNameQuery(e.target.value)}
                placeholder={`例) ${items[0]?.name ?? ""}`}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 0.9fr", gap: 12, marginTop: 10 }}>
            <div className="table-container" style={{ marginTop: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>{idLabel}</th>
                    <th>{nameLabel}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={3} style={{ color: "#64748b" }}>
                        該当なし
                      </td>
                    </tr>
                  )}
                  {filtered.slice(0, 30).map((x) => (
                    <tr key={x.id}>
                      <td style={{ fontWeight: 900 }}>{x.id}</td>
                      <td>{x.name}</td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          className="button"
                          type="button"
                          onClick={() => {
                            setSelectedId(x.id);
                            setSelectedName(x.name);
                          }}
                        >
                          選択
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div>
              <div style={{ fontWeight: 800, color: "#334155", marginBottom: 8 }}>選択中</div>
              <div className="filter-bar multi" style={{ marginTop: 0 }}>
                <div className="filter-group" style={{ minWidth: 220 }}>
                  <label>{idLabel}</label>
                  <input className="filter-input" value={selected?.id ?? ""} readOnly />
                </div>
                <div className="filter-group" style={{ minWidth: 320 }}>
                  <label>{nameLabel}</label>
                  <input className="filter-input" value={selected?.name ?? ""} readOnly />
                </div>
              </div>
              <div style={{ marginTop: 8, color: "#64748b", fontSize: 12 }}>
                ※「選択」を押すと右の選択中が更新されます（保存は未実装のデモ）。
              </div>
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
            onClick={() => {
              if (!selected) return;
              onConfirm({ id: selected.id, name: selected.name });
            }}
          >
            決定
          </button>
        </div>
      </div>
    </div>
  );
};

