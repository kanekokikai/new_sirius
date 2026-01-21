import React, { useEffect, useMemo, useState } from "react";
import { SiteMasterItem } from "../data/siteMasterMock";

type Mode = "現場ID検索" | "現場文字列検索" | "現場ID新規作成" | "編集";

type Props = {
  open: boolean;
  title?: string;
  sites: SiteMasterItem[];
  initialSiteId?: string;
  initialSiteName?: string;
  onClose: () => void;
  onConfirm: (next: { siteId: string; siteName: string }) => void;
};

const includes = (haystack: string, needle: string) =>
  !needle.trim() || haystack.toLowerCase().includes(needle.trim().toLowerCase());

export const SiteEditModal: React.FC<Props> = ({
  open,
  title = "現場（デモ）",
  sites,
  initialSiteId,
  initialSiteName,
  onClose,
  onConfirm
}) => {
  const initialMode: Mode = "現場ID検索";
  const [mode, setMode] = useState<Mode>(initialMode);

  const [localSites, setLocalSites] = useState<SiteMasterItem[]>(sites);
  const [selectedId, setSelectedId] = useState<string>(initialSiteId ?? "");
  const [selectedName, setSelectedName] = useState<string>(initialSiteName ?? "");

  const [idQuery, setIdQuery] = useState("");
  const [textQuery, setTextQuery] = useState("");

  const [newId, setNewId] = useState("");
  const [newName, setNewName] = useState("");

  const [editId, setEditId] = useState("");
  const [editName, setEditName] = useState("");

  const initialSelection = useMemo(() => {
    const byId = initialSiteId ? sites.find((x) => x.id === initialSiteId) : undefined;
    if (byId) return byId;
    const byName = initialSiteName ? sites.find((x) => x.name === initialSiteName) : undefined;
    if (byName) return byName;
    return undefined;
  }, [initialSiteId, initialSiteName, sites]);

  useEffect(() => {
    if (!open) return;
    setMode(initialMode);
    setLocalSites(sites);
    setSelectedId(initialSelection?.id ?? initialSiteId ?? "");
    setSelectedName(initialSelection?.name ?? initialSiteName ?? "");
    setIdQuery("");
    setTextQuery("");
    setNewId("");
    setNewName("");
    setEditId(initialSelection?.id ?? "");
    setEditName(initialSelection?.name ?? "");
  }, [open, initialMode, initialSelection?.id, initialSelection?.name, initialSiteId, initialSiteName, sites]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const selectSite = (s: SiteMasterItem) => {
    setSelectedId(s.id);
    setSelectedName(s.name);
    setEditId(s.id);
    setEditName(s.name);
  };

  const idSearchResults = localSites.filter((x) => includes(x.id, idQuery));
  const textSearchResults = localSites.filter((x) => includes(x.name, textQuery));

  const canConfirm = Boolean(selectedId.trim() && selectedName.trim());

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
          <p style={{ marginTop: 0, marginBottom: 10, color: "#475569", fontSize: 12, lineHeight: 1.35 }}>
            「現場ID検索 / 現場文字列検索 / 現場ID新規作成 / 編集」ができるデモモーダルです（保存は未実装）。
          </p>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            {(["現場ID検索", "現場文字列検索", "現場ID新規作成", "編集"] as Mode[]).map((m) => {
              const active = mode === m;
              return (
                <button
                  key={m}
                  type="button"
                  className="button"
                  style={{
                    background: active ? "linear-gradient(135deg, #2563eb, #3b82f6)" : undefined,
                    color: active ? "#fff" : undefined,
                    borderColor: active ? "#2563eb" : undefined
                  }}
                  onClick={() => setMode(m)}
                >
                  {m}
                </button>
              );
            })}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              {mode === "現場ID検索" && (
                <>
                  <div className="filter-bar" style={{ marginTop: 0 }}>
                    <div className="filter-group" style={{ minWidth: 280 }}>
                      <label>現場ID検索</label>
                      <input
                        className="filter-input"
                        value={idQuery}
                        onChange={(e) => setIdQuery(e.target.value)}
                        placeholder="例) S-0001"
                      />
                    </div>
                  </div>
                  <div className="table-container" style={{ marginTop: 10 }}>
                    <table>
                      <thead>
                        <tr>
                          <th>現場ID</th>
                          <th>現場</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {idSearchResults.length === 0 && (
                          <tr>
                            <td colSpan={3} style={{ color: "#64748b" }}>
                              該当なし
                            </td>
                          </tr>
                        )}
                        {idSearchResults.map((s) => (
                          <tr key={s.id}>
                            <td style={{ fontWeight: 800 }}>{s.id}</td>
                            <td>{s.name}</td>
                            <td style={{ textAlign: "right" }}>
                              <button className="button" type="button" onClick={() => selectSite(s)}>
                                選択
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {mode === "現場文字列検索" && (
                <>
                  <div className="filter-bar" style={{ marginTop: 0 }}>
                    <div className="filter-group" style={{ minWidth: 280 }}>
                      <label>現場文字列検索</label>
                      <input
                        className="filter-input"
                        value={textQuery}
                        onChange={(e) => setTextQuery(e.target.value)}
                        placeholder="例) 港北"
                      />
                    </div>
                  </div>
                  <div className="table-container" style={{ marginTop: 10 }}>
                    <table>
                      <thead>
                        <tr>
                          <th>現場ID</th>
                          <th>現場</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {textSearchResults.length === 0 && (
                          <tr>
                            <td colSpan={3} style={{ color: "#64748b" }}>
                              該当なし
                            </td>
                          </tr>
                        )}
                        {textSearchResults.map((s) => (
                          <tr key={s.id}>
                            <td style={{ fontWeight: 800 }}>{s.id}</td>
                            <td>{s.name}</td>
                            <td style={{ textAlign: "right" }}>
                              <button className="button" type="button" onClick={() => selectSite(s)}>
                                選択
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {mode === "現場ID新規作成" && (
                <>
                  <div className="filter-bar multi" style={{ marginTop: 0 }}>
                    <div className="filter-group" style={{ minWidth: 220 }}>
                      <label>現場ID</label>
                      <input
                        className="filter-input"
                        value={newId}
                        onChange={(e) => setNewId(e.target.value)}
                        placeholder="例) S-9999"
                      />
                    </div>
                    <div className="filter-group" style={{ minWidth: 320 }}>
                      <label>現場</label>
                      <input
                        className="filter-input"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="例) 横浜市港北区..."
                      />
                    </div>
                  </div>
                  <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      className="button primary"
                      type="button"
                      disabled={!newId.trim() || !newName.trim()}
                      onClick={() => {
                        const exists = localSites.some((x) => x.id === newId.trim());
                        if (exists) return;
                        const next = { id: newId.trim(), name: newName.trim() };
                        setLocalSites((s) => [next, ...s]);
                        selectSite(next);
                        setNewId("");
                        setNewName("");
                        setMode("編集");
                      }}
                    >
                      新規作成（デモ）
                    </button>
                    <span style={{ color: "#64748b", fontSize: 12, alignSelf: "center" }}>
                      ※同一IDは作成不可（デモ）
                    </span>
                  </div>
                </>
              )}

              {mode === "編集" && (
                <>
                  <div className="filter-bar multi" style={{ marginTop: 0 }}>
                    <div className="filter-group" style={{ minWidth: 220 }}>
                      <label>現場ID</label>
                      <input className="filter-input" value={editId} readOnly />
                    </div>
                    <div className="filter-group" style={{ minWidth: 320 }}>
                      <label>現場</label>
                      <input
                        className="filter-input"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="現場名称を編集"
                      />
                    </div>
                  </div>
                  <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      className="button primary"
                      type="button"
                      disabled={!editId.trim() || !editName.trim()}
                      onClick={() => {
                        setLocalSites((prev) =>
                          prev.map((x) => (x.id === editId.trim() ? { ...x, name: editName.trim() } : x))
                        );
                        setSelectedId(editId.trim());
                        setSelectedName(editName.trim());
                      }}
                    >
                      編集反映（デモ）
                    </button>
                    <span style={{ color: "#64748b", fontSize: 12, alignSelf: "center" }}>
                      ※保存は未実装。モーダル内の見た目更新のみ。
                    </span>
                  </div>
                </>
              )}
            </div>

            <div>
              <div style={{ fontWeight: 800, color: "#334155", marginBottom: 8 }}>選択中</div>
              <div className="filter-bar multi" style={{ marginTop: 0 }}>
                <div className="filter-group" style={{ minWidth: 220 }}>
                  <label>現場ID</label>
                  <input className="filter-input" value={selectedId} readOnly />
                </div>
                <div className="filter-group" style={{ minWidth: 320 }}>
                  <label>現場</label>
                  <input className="filter-input" value={selectedName} readOnly />
                </div>
              </div>

              <div className="table-container" style={{ marginTop: 10 }}>
                <table>
                  <thead>
                    <tr>
                      <th>現場ID</th>
                      <th>現場</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {localSites.slice(0, 8).map((s) => (
                      <tr key={`pick-${s.id}`}>
                        <td style={{ fontWeight: 800 }}>{s.id}</td>
                        <td>{s.name}</td>
                        <td style={{ textAlign: "right" }}>
                          <button className="button" type="button" onClick={() => selectSite(s)}>
                            選択
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
            onClick={() => onConfirm({ siteId: selectedId.trim(), siteName: selectedName.trim() })}
          >
            決定
          </button>
        </div>
      </div>
    </div>
  );
};

