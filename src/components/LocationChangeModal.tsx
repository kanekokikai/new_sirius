import React, { useEffect, useMemo, useState } from "react";
import { LocationMasterItem } from "../data/locationMasterMock";

type Props = {
  open: boolean;
  title?: string;
  initialLocationId?: string;
  initialLocationName?: string;
  locations: LocationMasterItem[];
  onClose: () => void;
  onConfirm: (next: { id: string; name: string }) => void;
  onOrderDetail?: () => void;
};

const findById = (locations: LocationMasterItem[], id: string) => locations.find((x) => x.id === id);
const findByName = (locations: LocationMasterItem[], name: string) =>
  locations.find((x) => x.name === name);

export const LocationChangeModal: React.FC<Props> = ({
  open,
  title = "場所変更（デモ）",
  initialLocationId,
  initialLocationName,
  locations,
  onClose,
  onConfirm,
  onOrderDetail
}) => {
  const initial = useMemo(() => {
    if (initialLocationId) {
      const hit = findById(locations, initialLocationId);
      if (hit) return hit;
    }
    if (initialLocationName) {
      const hit = findByName(locations, initialLocationName);
      if (hit) return hit;
    }
    return locations[0] ?? { id: "", name: "" };
  }, [initialLocationId, initialLocationName, locations]);

  const [selectedId, setSelectedId] = useState<string>(initial.id);
  const [selectedName, setSelectedName] = useState<string>(initial.name);

  useEffect(() => {
    if (!open) return;
    setSelectedId(initial.id);
    setSelectedName(initial.name);
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

  const selected = findById(locations, selectedId);
  const canConfirm = Boolean(selected?.id && selected?.name);

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(e) => {
        // overlay click to close (but ignore clicks inside modal)
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal" style={{ width: "min(520px, 92vw)" }}>
        <div className="modal-header">
          <h3 style={{ margin: 0 }}>{title}</h3>
          <button className="button ghost" type="button" onClick={onClose}>
            閉じる
          </button>
        </div>
        <div className="modal-body">
          <p style={{ marginTop: 0, marginBottom: 10, color: "#475569", fontSize: 12, lineHeight: 1.35 }}>
            置場ID / 置場名称を選択して「変更」を押すと、一覧の場所表示だけ更新されるデモです（保存は未実装）。
          </p>

          <div className="filter-bar multi" style={{ marginTop: 0 }}>
            <div className="filter-group" style={{ minWidth: 200 }}>
              <label>置場ID</label>
              <select
                className="filter-input"
                value={selectedId}
                onChange={(e) => {
                  const nextId = e.target.value;
                  const hit = findById(locations, nextId);
                  setSelectedId(nextId);
                  if (hit) setSelectedName(hit.name);
                }}
              >
                {locations.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.id}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group" style={{ minWidth: 240 }}>
              <label>置場名称</label>
              <select
                className="filter-input"
                value={selectedName}
                onChange={(e) => {
                  const nextName = e.target.value;
                  const hit = findByName(locations, nextName);
                  setSelectedName(nextName);
                  if (hit) setSelectedId(hit.id);
                }}
              >
                {locations.map((x) => (
                  <option key={x.id} value={x.name}>
                    {x.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginTop: 10, fontSize: 13, color: "#334155" }}>
            変更後プレビュー:{" "}
            <span style={{ fontWeight: 800 }}>{selected ? `${selected.name}（${selected.id}）` : "-"}</span>
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

