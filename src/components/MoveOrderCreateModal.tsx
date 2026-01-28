import React, { useEffect, useMemo, useRef, useState } from "react";

type PlaceDetail = "自社" | "倉庫ID";

export type MoveOrderCreateForm = {
  writer: string;
  dateFrom: string;
  dateTo: string;
  inspectionChecklist: "有" | "無";

  loadingDetail: PlaceDetail;
  loadingWarehouseId: string;
  loadingDisplay: string;

  unloadingDetail: PlaceDetail;
  unloadingWarehouseId: string;
  unloadingDisplay: string;

  customerName: string;
  siteName: string;
  moveReasonDisplay: string;

  contractor: string;
  executionDate: string;
  driver: string;
  notes: string;

  products: Array<{ id: string; name: string }>;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onCreate?: (form: MoveOrderCreateForm) => void;
};

const uid = () => `${Date.now()}_${Math.random().toString(16).slice(2)}`;

const createInitialForm = (): MoveOrderCreateForm => ({
  writer: "",
  dateFrom: "",
  dateTo: "",
  inspectionChecklist: "無",
  loadingDetail: "自社",
  loadingWarehouseId: "",
  loadingDisplay: "",
  unloadingDetail: "自社",
  unloadingWarehouseId: "",
  unloadingDisplay: "",
  customerName: "",
  siteName: "",
  moveReasonDisplay: "",
  contractor: "",
  executionDate: "",
  driver: "",
  notes: "",
  products: [{ id: uid(), name: "" }]
});

export const MoveOrderCreateModal: React.FC<Props> = ({ open, onClose, onCreate }) => {
  const initial = useMemo(() => createInitialForm(), []);
  const [form, setForm] = useState<MoveOrderCreateForm>(initial);
  const createRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(createInitialForm());
    createRef.current?.focus();
  }, [open]);

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
      className="modal-overlay move-order-create-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="移動受注作成"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal move-order-create-modal">
        <div className="modal-header">
          <h3 style={{ margin: 0 }}>移動受注作成</h3>
          <button className="button ghost" type="button" onClick={onClose}>
            閉じる
          </button>
        </div>

        <div className="modal-body">
          <div className="move-order-create-root">
            <div className="move-order-create-top">
              <label className="move-order-field">
                <span className="move-order-label">記入者</span>
                <input
                  className="move-order-input"
                  value={form.writer}
                  onChange={(e) => setForm((s) => ({ ...s, writer: e.target.value }))}
                />
              </label>

              <div className="move-order-date-range">
                <label className="move-order-field">
                  <span className="move-order-label">日付①</span>
                  <input
                    className="move-order-input"
                    type="date"
                    value={form.dateFrom}
                    onChange={(e) => setForm((s) => ({ ...s, dateFrom: e.target.value }))}
                  />
                </label>
                <div className="move-order-range-sep">〜</div>
                <label className="move-order-field">
                  <span className="move-order-label">日付②</span>
                  <input
                    className="move-order-input"
                    type="date"
                    value={form.dateTo}
                    onChange={(e) => setForm((s) => ({ ...s, dateTo: e.target.value }))}
                  />
                </label>
              </div>

              <label className="move-order-field move-order-inspection">
                <span className="move-order-label">点検表</span>
                <select
                  className="move-order-input"
                  value={form.inspectionChecklist}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, inspectionChecklist: e.target.value as MoveOrderCreateForm["inspectionChecklist"] }))
                  }
                >
                  <option value="有">有</option>
                  <option value="無">無</option>
                </select>
              </label>
            </div>

            <div className="move-order-places">
              <div className="move-order-place">
                <div className="move-order-place-title">積込み場所/名称</div>
                <div className="move-order-place-grid">
                  <div className="move-order-place-left">
                    <div className="move-order-mini-label">詳細</div>
                    <select
                      className="move-order-input"
                      value={form.loadingDetail}
                      onChange={(e) =>
                        setForm((s) => ({
                          ...s,
                          loadingDetail: e.target.value as PlaceDetail,
                          loadingWarehouseId: e.target.value === "倉庫ID" ? s.loadingWarehouseId : ""
                        }))
                      }
                    >
                      <option value="自社">自社</option>
                      <option value="倉庫ID">倉庫ID</option>
                    </select>
                    <input
                      className="move-order-input"
                      placeholder="倉庫ID"
                      disabled={form.loadingDetail !== "倉庫ID"}
                      value={form.loadingWarehouseId}
                      onChange={(e) => setForm((s) => ({ ...s, loadingWarehouseId: e.target.value }))}
                    />
                  </div>
                  <div className="move-order-place-right">
                    <div className="move-order-mini-label">表示内容</div>
                    <textarea
                      className="move-order-textarea move-order-displaybox"
                      rows={3}
                      value={form.loadingDisplay}
                      onChange={(e) => setForm((s) => ({ ...s, loadingDisplay: e.target.value }))}
                      placeholder="本社から"
                    />
                  </div>
                </div>
              </div>

              <div className="move-order-arrow" aria-hidden="true">
                →
              </div>

              <div className="move-order-place">
                <div className="move-order-place-title">降し場所/名称</div>
                <div className="move-order-place-grid">
                  <div className="move-order-place-left">
                    <div className="move-order-mini-label">詳細</div>
                    <select
                      className="move-order-input"
                      value={form.unloadingDetail}
                      onChange={(e) =>
                        setForm((s) => ({
                          ...s,
                          unloadingDetail: e.target.value as PlaceDetail,
                          unloadingWarehouseId: e.target.value === "倉庫ID" ? s.unloadingWarehouseId : ""
                        }))
                      }
                    >
                      <option value="自社">自社</option>
                      <option value="倉庫ID">倉庫ID</option>
                    </select>
                    <input
                      className="move-order-input"
                      placeholder="倉庫ID"
                      disabled={form.unloadingDetail !== "倉庫ID"}
                      value={form.unloadingWarehouseId}
                      onChange={(e) => setForm((s) => ({ ...s, unloadingWarehouseId: e.target.value }))}
                    />
                  </div>
                  <div className="move-order-place-right">
                    <div className="move-order-mini-label">表示内容</div>
                    <textarea
                      className="move-order-textarea move-order-displaybox"
                      rows={3}
                      value={form.unloadingDisplay}
                      onChange={(e) => setForm((s) => ({ ...s, unloadingDisplay: e.target.value }))}
                      placeholder="茨城へ"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="move-order-middle">
              <div className="move-order-reason">
                <div className="move-order-section-title">移動理由（会社名/現場）</div>
                <div className="move-order-reason-grid">
                  <label className="move-order-field">
                    <span className="move-order-mini-label">得意先</span>
                    <input
                      className="move-order-input"
                      value={form.customerName}
                      onChange={(e) => setForm((s) => ({ ...s, customerName: e.target.value }))}
                      placeholder="例) 調和工業"
                    />
                  </label>
                  <label className="move-order-field">
                    <span className="move-order-mini-label">現場</span>
                    <input
                      className="move-order-input"
                      value={form.siteName}
                      onChange={(e) => setForm((s) => ({ ...s, siteName: e.target.value }))}
                      placeholder="例) 出田町埠頭"
                    />
                  </label>
                  <div className="move-order-field move-order-reason-display">
                    <span className="move-order-mini-label">表示内容</span>
                    <textarea
                      className="move-order-textarea move-order-displaybox"
                      rows={3}
                      value={form.moveReasonDisplay}
                      onChange={(e) => setForm((s) => ({ ...s, moveReasonDisplay: e.target.value }))}
                      placeholder={"調和工業\n出田町埠頭"}
                    />
                  </div>
                </div>
              </div>

              <label className="move-order-field move-order-contractor">
                <span className="move-order-label">請負人</span>
                <input
                  className="move-order-input"
                  value={form.contractor}
                  onChange={(e) => setForm((s) => ({ ...s, contractor: e.target.value }))}
                />
              </label>
            </div>

            <div className="move-order-bottom">
              <label className="move-order-field">
                <span className="move-order-label">実施日</span>
                <input
                  className="move-order-input"
                  type="date"
                  value={form.executionDate}
                  onChange={(e) => setForm((s) => ({ ...s, executionDate: e.target.value }))}
                />
              </label>
              <label className="move-order-field">
                <span className="move-order-label">ドライバー</span>
                <input
                  className="move-order-input"
                  value={form.driver}
                  onChange={(e) => setForm((s) => ({ ...s, driver: e.target.value }))}
                />
              </label>
            </div>

            <div className="move-order-notes">
              <div className="move-order-label">備考</div>
              <textarea
                className="move-order-textarea move-order-notes-textarea"
                value={form.notes}
                onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
                rows={6}
              />
            </div>

            <div className="move-order-products">
              <div className="move-order-products-header">
                <div className="move-order-section-title">品名</div>
                <button
                  className="button primary"
                  type="button"
                  onClick={() => setForm((s) => ({ ...s, products: [...s.products, { id: uid(), name: "" }] }))}
                >
                  商品追加
                </button>
              </div>
              <div className="move-order-products-list">
                {form.products.map((p, idx) => (
                  <div key={p.id} className="move-order-product-row">
                    <input
                      className="move-order-input"
                      placeholder={`品名 ${idx + 1}`}
                      value={p.name}
                      onChange={(e) =>
                        setForm((s) => ({
                          ...s,
                          products: s.products.map((x) => (x.id === p.id ? { ...x, name: e.target.value } : x))
                        }))
                      }
                    />
                    <button
                      className="button"
                      type="button"
                      disabled={form.products.length <= 1}
                      onClick={() =>
                        setForm((s) => ({ ...s, products: s.products.filter((x) => x.id !== p.id) }))
                      }
                      title={form.products.length <= 1 ? "最低1件必要です" : "削除"}
                    >
                      削除
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="button" type="button" onClick={onClose}>
            キャンセル
          </button>
          <button
            ref={createRef}
            className="button primary"
            type="button"
            onClick={() => {
              onCreate?.(form);
              onClose();
            }}
          >
            作成
          </button>
        </div>
      </div>
    </div>
  );
};

