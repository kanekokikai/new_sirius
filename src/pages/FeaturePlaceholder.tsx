import { useMemo, useState, useEffect } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { featureCards } from "../data/mockData";
import { featureContent } from "../data/featureContent";
import { DispatchInstructionKey } from "../data/dispatchInstructions";
import { Department } from "../types";
import { useAuth, getDepartmentPermissions } from "../auth/AuthContext";
import {
  filterBySearch,
  filterInventorySections,
  filterMachineSections,
  filterOrdersSections,
  filterSiteSections,
  InventoryFilter,
  MachineFilter,
  OrdersFilter,
  SitesFilter,
  OrderCreateType
} from "./featureFilters";

const initialInventoryFilter: InventoryFilter = {
  kind: "",
  category: "",
  machineNo: "",
  status: ""
};

const initialMachineFilter: MachineFilter = {
  kindId: "",
  categoryId: "",
  productNo: "",
  purchaseFrom: "",
  purchaseTo: "",
  division: ""
};

const initialOrdersFilter: OrdersFilter = {
  dateFrom: "",
  dateTo: "",
  kinds: [],
  type: "",
  customer: "",
  site: ""
};

const initialSitesFilter: SitesFilter = {
  periodFrom: "",
  periodTo: "",
  customer: "",
  site: "",
  lastDeliveryFrom: "",
  lastDeliveryTo: "",
  lastOrderFrom: "",
  lastOrderTo: ""
};

const FeaturePlaceholder = () => {
  const { featureKey } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const params = new URLSearchParams(location.search);
  const departmentFromUrl = params.get("dept") as Department | null;
  const activeDepartment = departmentFromUrl ?? (user?.departments[0] ?? "フロント");

  const dispatchButtons: { key: DispatchInstructionKey; label: string }[] = [
    { key: "inbound", label: "搬入指示書" },
    { key: "pickup", label: "引取指示書" },
    { key: "transfer", label: "移動指示書" },
    { key: "truckPlan", label: "トラック予定指示書" }
  ];

  const feature = useMemo(
    () => featureCards.find((card) => card.key === featureKey),
    [featureKey]
  );

  const permitted = useMemo(() => {
    if (!feature) return false;
    const allowed = getDepartmentPermissions(user, activeDepartment);
    return allowed.includes(feature.key);
  }, [activeDepartment, feature, user]);

  const [search, setSearch] = useState("");
  const [inventoryFilter, setInventoryFilter] = useState<InventoryFilter>(initialInventoryFilter);
  const [machineFilter, setMachineFilter] = useState<MachineFilter>(initialMachineFilter);
  const [ordersFilter, setOrdersFilter] = useState<OrdersFilter>(initialOrdersFilter);
  const [sitesFilter, setSitesFilter] = useState<SitesFilter>(initialSitesFilter);
  const [showOrdersModal, setShowOrdersModal] = useState(false);
  const [orderCreateType, setOrderCreateType] = useState<OrderCreateType | null>(null);

  type OrderDemoForm = {
    inboundDate: string;
    inboundTimeFrom: string;
    inboundTimeTo: string;
    orderTaker: string;
    transportDivision: "回送" | "自社" | "外注" | "";
    transportBase: "本社" | "支店" | "ヤード" | "";
    customer: string;
    siteName: string;
    siteAddress: string;
    constructionName: string;
    vehicles: string[];
    wrecker: "無" | "有" | "ユニック";
    pickupPlannedDate: string;
    useDays: string;
    orderer: string;
    siteContact: string;
    transportFeeVehicleSize: string;
    transportFeeAddress: string;
    transportFeeAmount: string;
    noteFront: string;
    noteFactory: string;
    noteDriver: string;
  };

  const vehicleOptions = useMemo(
    () => ["ダンプ", "2t", "3t", "4t", "7t", "ショート", "10t", "大型", "指定車"],
    []
  );

  const createInitialOrderDemoForm = (): OrderDemoForm => ({
    inboundDate: "",
    inboundTimeFrom: "",
    inboundTimeTo: "",
    orderTaker: "",
    transportDivision: "回送",
    transportBase: "本社",
    customer: "",
    siteName: "",
    siteAddress: "",
    constructionName: "",
    vehicles: [],
    wrecker: "無",
    pickupPlannedDate: "",
    useDays: "",
    orderer: "",
    siteContact: "",
    transportFeeVehicleSize: "",
    transportFeeAddress: "",
    transportFeeAmount: "",
    noteFront: "",
    noteFactory: "",
    noteDriver: ""
  });

  const [orderDemo, setOrderDemo] = useState<OrderDemoForm>(createInitialOrderDemoForm);

  useEffect(() => {
    if (!orderCreateType) return;
    setOrderDemo(createInitialOrderDemoForm());
  }, [orderCreateType]);

  const contentSections = useMemo(
    () => (feature ? featureContent[feature.key] ?? [] : []),
    [feature]
  );

  const buildDispatchLink = (instructionKey: DispatchInstructionKey) =>
    `/feature/dispatch/${instructionKey}?dept=${encodeURIComponent(activeDepartment)}`;

  const filteredSections = useMemo(() => {
    if (!feature) return [];

    switch (feature.key) {
      case "inventory":
        return filterInventorySections(contentSections, search, inventoryFilter);
      case "machine":
        return filterMachineSections(contentSections, search, machineFilter);
      case "orders":
        return filterOrdersSections(contentSections, search, ordersFilter);
      case "sites":
        return filterSiteSections(contentSections, search, sitesFilter);
      default:
        return filterBySearch(contentSections, search);
    }
  }, [contentSections, feature, search, inventoryFilter, machineFilter, ordersFilter, sitesFilter]);

  if (!feature) {
    return (
      <div className="app-shell">
        <div className="page">
          <h2>機能が見つかりません</h2>
          <Link to="/home" className="button">
            ホームへ戻る
          </Link>
        </div>
      </div>
    );
  }

  if (!permitted) {
    return (
      <div className="app-shell">
        <div className="page">
          <h2>権限がありません</h2>
          <p>選択された部署ではこの機能にアクセスできません。</p>
          <Link to="/home" className="button">
            ホームへ戻る
          </Link>
        </div>
      </div>
    );
  }

  const sectionsContent = filteredSections.map((section) => (
    <div key={section.title} className="page" style={{ marginTop: 18 }}>
      <h3 style={{ marginTop: 0 }}>{section.title}</h3>
      <p style={{ marginTop: 0 }}>{section.description}</p>
      <div
        className={
          feature.key === "machine" ? "table-container machine-table-container" : "table-container"
        }
      >
        <table
          className={
            feature.key === "inventory"
              ? "gantt-table"
              : feature.key === "machine"
              ? "machine-table"
              : undefined
          }
        >
          <thead>
            <tr>
              {section.columns.map((col) => (
                <th key={col}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {section.rows.map((row, idx) => (
              <tr key={`${section.title}-${idx}`}>
                {row.map((cell, cidx) => {
                  const isInventory = feature.key === "inventory";
                  const isDateCell = isInventory && cidx >= 2;
                  const value = String(cell);
                  const statusClass = isDateCell
                    ? (() => {
                        const normalized = value.trim();
                        if (normalized === "出庫中") return "gantt-status-out";
                        if (normalized === "修理中") return "gantt-status-repair";
                        if (normalized === "予約") return "gantt-status-reserve";
                        return "";
                      })()
                    : "";
                  const className = [isDateCell ? "gantt-cell" : "", statusClass]
                    .filter(Boolean)
                    .join(" ") || undefined;
                  const displayValue = isDateCell ? "" : value;

                  return (
                    <td key={`${section.title}-${idx}-${cidx}`} className={className}>
                      {displayValue}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  ));

  return (
    <div className="app-shell">
      <div className="page">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2>
            {feature.name}（{activeDepartment}）
          </h2>
          <button className="button" type="button" onClick={() => navigate(-1)}>
            戻る
          </button>
        </div>
        <p>{feature.description}</p>
        {feature.key === "dispatch" && (
          <div
            className="filter-bar"
            style={{ marginTop: 12, gap: 12, flexWrap: "wrap", justifyContent: "flex-start" }}
          >
            {dispatchButtons.map((button) => (
              <Link
                key={button.key}
                to={buildDispatchLink(button.key)}
                className="button primary"
                style={{
                  minWidth: 180,
                  height: 80,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                  textAlign: "center"
                }}
              >
                {button.label}
              </Link>
            ))}
          </div>
        )}
        {feature.key === "inventory" && (
          <div className="filter-bar multi">
            <div className="filter-group">
              <label>種類</label>
              <input
                className="filter-input"
                placeholder="例) 建機"
                value={inventoryFilter.kind}
                onChange={(e) => setInventoryFilter((s) => ({ ...s, kind: e.target.value }))}
              />
            </div>
            <div className="filter-group">
              <label>種別</label>
              <input
                className="filter-input"
                placeholder="例) 油圧ショベル"
                value={inventoryFilter.category}
                onChange={(e) => setInventoryFilter((s) => ({ ...s, category: e.target.value }))}
              />
            </div>
            <div className="filter-group">
              <label>機械No.</label>
              <input
                className="filter-input"
                placeholder="例) M-1001"
                value={inventoryFilter.machineNo}
                onChange={(e) => setInventoryFilter((s) => ({ ...s, machineNo: e.target.value }))}
              />
            </div>
            <div className="filter-group">
              <label>状況（出庫中 / 修理中 / 予約）</label>
              <input
                className="filter-input"
                placeholder="例) 出庫中"
                value={inventoryFilter.status}
                onChange={(e) => setInventoryFilter((s) => ({ ...s, status: e.target.value }))}
              />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="button"
                type="button"
                onClick={() => setInventoryFilter({ ...initialInventoryFilter })}
              >
                クリア
              </button>
            </div>
          </div>
        )}
        {feature.key === "machine" && (
          <div className="filter-bar multi">
            <div className="filter-group">
              <label>種類ID</label>
              <input
                className="filter-input"
                placeholder="例) 建機"
                value={machineFilter.kindId}
                onChange={(e) => setMachineFilter((s) => ({ ...s, kindId: e.target.value }))}
              />
            </div>
            <div className="filter-group">
              <label>種別ID</label>
              <input
                className="filter-input"
                placeholder="例) 油圧ショベル"
                value={machineFilter.categoryId}
                onChange={(e) => setMachineFilter((s) => ({ ...s, categoryId: e.target.value }))}
              />
            </div>
            <div className="filter-group">
              <label>商品No.</label>
              <input
                className="filter-input"
                placeholder="例) M-1001"
                value={machineFilter.productNo}
                onChange={(e) => setMachineFilter((s) => ({ ...s, productNo: e.target.value }))}
              />
            </div>
            <div className="filter-group">
              <label>購入日</label>
              <input
                className="filter-input"
                placeholder="例) 2024 / 2024-04 / 2024-04-01"
                value={machineFilter.purchaseFrom}
                onChange={(e) =>
                  setMachineFilter((s) => ({ ...s, purchaseFrom: e.target.value }))
                }
              />
            </div>
            <div className="filter-group">
              <label>売却日</label>
              <input
                className="filter-input"
                placeholder="例) 2024 / 2024-12 / 2024-12-31"
                value={machineFilter.purchaseTo}
                onChange={(e) => setMachineFilter((s) => ({ ...s, purchaseTo: e.target.value }))}
              />
            </div>
            <div className="filter-group">
              <label>区分</label>
              <input
                className="filter-input"
                placeholder="例) 自社 / リース / 売却"
                value={machineFilter.division}
                onChange={(e) => setMachineFilter((s) => ({ ...s, division: e.target.value }))}
              />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="button"
                type="button"
                onClick={() => setMachineFilter({ ...initialMachineFilter })}
              >
                クリア
              </button>
            </div>
          </div>
        )}
        {feature.key === "sites" && (
          <div className="filter-bar multi">
            <div className="filter-group">
              <label>期間（開始）</label>
              <input
                className="filter-input"
                type="date"
                value={sitesFilter.periodFrom}
                onChange={(e) => setSitesFilter((s) => ({ ...s, periodFrom: e.target.value }))}
              />
            </div>
            <div className="filter-group">
              <label>期間（終了）</label>
              <input
                className="filter-input"
                type="date"
                value={sitesFilter.periodTo}
                onChange={(e) => setSitesFilter((s) => ({ ...s, periodTo: e.target.value }))}
              />
            </div>
            <div className="filter-group">
              <label>得意先</label>
              <input
                className="filter-input"
                placeholder="例) ABC建設"
                value={sitesFilter.customer}
                onChange={(e) => setSitesFilter((s) => ({ ...s, customer: e.target.value }))}
              />
            </div>
            <div className="filter-group">
              <label>現場</label>
              <input
                className="filter-input"
                placeholder="例) 高速道路改修A"
                value={sitesFilter.site}
                onChange={(e) => setSitesFilter((s) => ({ ...s, site: e.target.value }))}
              />
            </div>
            <div className="filter-group">
              <label>最終搬入日（開始）</label>
              <input
                className="filter-input"
                type="date"
                value={sitesFilter.lastDeliveryFrom}
                onChange={(e) => setSitesFilter((s) => ({ ...s, lastDeliveryFrom: e.target.value }))}
              />
            </div>
            <div className="filter-group">
              <label>最終搬入日（終了）</label>
              <input
                className="filter-input"
                type="date"
                value={sitesFilter.lastDeliveryTo}
                onChange={(e) => setSitesFilter((s) => ({ ...s, lastDeliveryTo: e.target.value }))}
              />
            </div>
            <div className="filter-group">
              <label>最終受注日（開始）</label>
              <input
                className="filter-input"
                type="date"
                value={sitesFilter.lastOrderFrom}
                onChange={(e) => setSitesFilter((s) => ({ ...s, lastOrderFrom: e.target.value }))}
              />
            </div>
            <div className="filter-group">
              <label>最終受注日（終了）</label>
              <input
                className="filter-input"
                type="date"
                value={sitesFilter.lastOrderTo}
                onChange={(e) => setSitesFilter((s) => ({ ...s, lastOrderTo: e.target.value }))}
              />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="button"
                type="button"
                onClick={() => setSitesFilter({ ...initialSitesFilter })}
              >
                クリア
              </button>
            </div>
          </div>
        )}
        {feature.key === "orders" && (
          <div
            className="filter-bar"
            style={{ marginTop: 12, justifyContent: "space-between", alignItems: "center" }}
          >
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                className="button primary"
                type="button"
                style={{
                  width: 120,
                  height: 120,
                  lineHeight: 1.3,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  whiteSpace: "pre-line",
                  fontSize: 16
                }}
                onClick={() => {
                  setShowOrdersModal(false);
                  setOrderCreateType("搬入");
                }}
              >
                {"搬入\n受注作成"}
              </button>
              <button
                className="button primary"
                type="button"
                style={{
                  width: 120,
                  height: 120,
                  lineHeight: 1.3,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  whiteSpace: "pre-line",
                  fontSize: 16
                }}
                onClick={() => {
                  setShowOrdersModal(false);
                  setOrderCreateType("引取");
                }}
              >
                {"引取\n受注作成"}
              </button>
              <button
                className="button primary"
                type="button"
                style={{
                  width: 120,
                  height: 120,
                  lineHeight: 1.3,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  whiteSpace: "pre-line",
                  fontSize: 16
                }}
                onClick={() => {
                  setShowOrdersModal(false);
                  setOrderCreateType("移動");
                }}
              >
                {"移動\n受注作成"}
              </button>
            </div>
            <span style={{ color: "#94a3b8", fontSize: 13 }}>
              ボタン押下でダミー作成モーダルを表示します（保存は未実装）
            </span>
          </div>
        )}
        {feature.key === "orders" && <div className="filter-divider" />}
        {feature.key === "orders" && (
          <div className="filter-bar" style={{ marginTop: 12, alignItems: "center" }}>
            <span style={{ fontWeight: 600, color: "#334155", minWidth: 120 }}>種類（複数選択可）</span>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(["搬入", "引取", "移動"] as OrderCreateType[]).map((kind) => {
                const active = ordersFilter.kinds.includes(kind);
                return (
                  <button
                    key={kind}
                    type="button"
                    className="button"
                    style={{
                      background: active ? "linear-gradient(135deg, #2563eb, #3b82f6)" : undefined,
                      color: active ? "#fff" : undefined,
                      borderColor: active ? "#2563eb" : undefined,
                      minWidth: 90
                    }}
                    onClick={() =>
                      setOrdersFilter((s) => {
                        const exists = s.kinds.includes(kind);
                        const nextKinds = exists ? s.kinds.filter((k) => k !== kind) : [...s.kinds, kind];
                        return { ...s, kinds: nextKinds };
                      })
                    }
                  >
                    {kind}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {feature.key === "orders" && (
          <div className="filter-bar multi">
            <div className="filter-group">
              <label>期間（開始）</label>
              <input
                className="filter-input"
                type="date"
                value={ordersFilter.dateFrom}
                onChange={(e) => setOrdersFilter((s) => ({ ...s, dateFrom: e.target.value }))}
              />
            </div>
            <div className="filter-group">
              <label>期間（終了）</label>
              <input
                className="filter-input"
                type="date"
                value={ordersFilter.dateTo}
                onChange={(e) => setOrdersFilter((s) => ({ ...s, dateTo: e.target.value }))}
              />
            </div>
            <div className="filter-group">
              <label>種別</label>
              <input
                className="filter-input"
                placeholder="例) 油圧ショベル / ホイールローダー"
                value={ordersFilter.type}
                onChange={(e) => setOrdersFilter((s) => ({ ...s, type: e.target.value }))}
              />
            </div>
            <div className="filter-group">
              <label>得意先名</label>
              <input
                className="filter-input"
                placeholder="例) ABC建設"
                value={ordersFilter.customer}
                onChange={(e) => setOrdersFilter((s) => ({ ...s, customer: e.target.value }))}
              />
            </div>
            <div className="filter-group">
              <label>現場</label>
              <input
                className="filter-input"
                placeholder="例) 高速道路改修A"
                value={ordersFilter.site}
                onChange={(e) => setOrdersFilter((s) => ({ ...s, site: e.target.value }))}
              />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="button primary"
                type="button"
                onClick={() => setShowOrdersModal(true)}
              >
                検索
              </button>
              <button
                className="button"
                type="button"
                onClick={() => setOrdersFilter({ ...initialOrdersFilter })}
              >
                クリア
              </button>
            </div>
          </div>
        )}
        {contentSections.length === 0 && (
          <p style={{ marginTop: 18, color: "#475569" }}>
            本フェーズでは画面遷移と権限制御のみを実装しています。ここに一覧 / 検索 / 新規登録 /
            編集などの画面を追加してください。
          </p>
        )}
        {feature.key === "orders" && !showOrdersModal && (
          <p style={{ marginTop: 18, color: "#475569" }}>
            検索条件を入力し「検索」を押すと一覧モーダルが表示されます。
          </p>
        )}
        {feature.key !== "orders" && sectionsContent}
        {feature.key === "orders" && showOrdersModal && (
          <div className="modal-overlay" role="dialog" aria-modal="true">
            <div className="modal">
              <div className="modal-header">
                <h3 style={{ margin: 0 }}>受注検索結果</h3>
                <button className="button ghost" type="button" onClick={() => setShowOrdersModal(false)}>
                  閉じる
                </button>
              </div>
              <div className="modal-body">{sectionsContent}</div>
              <div className="modal-footer">
                <button className="button" type="button" onClick={() => setShowOrdersModal(false)}>
                  閉じる
                </button>
              </div>
            </div>
          </div>
        )}
        {feature.key === "orders" && orderCreateType && (
          <div className="modal-overlay" role="dialog" aria-modal="true">
            <div className="modal">
              <div className="modal-header">
                <h3 style={{ margin: 0 }}>{orderCreateType}受注作成（デモ）</h3>
                <button className="button ghost" type="button" onClick={() => setOrderCreateType(null)}>
                  閉じる
                </button>
              </div>
              <div className="modal-body">
                <p style={{ marginTop: 0, color: "#475569" }}>
                  入力内容は保存されません。画面イメージのみのダミーモーダルです。
                </p>
                <div className="order-demo-form" style={{ marginTop: 12 }}>
                  <div className="order-demo-row cols-4">
                    <div className="order-demo-cell">
                      <div className="order-demo-label">搬入日</div>
                      <input
                        className="order-demo-input"
                        type="date"
                        value={orderDemo.inboundDate}
                        onChange={(e) => setOrderDemo((s) => ({ ...s, inboundDate: e.target.value }))}
                      />
                    </div>
                    <div className="order-demo-cell">
                      <div className="order-demo-label">搬入時間</div>
                      <div className="order-demo-inline">
                        <input
                          className="order-demo-input"
                          type="time"
                          value={orderDemo.inboundTimeFrom}
                          onChange={(e) => setOrderDemo((s) => ({ ...s, inboundTimeFrom: e.target.value }))}
                        />
                        <span className="order-demo-sep">〜</span>
                        <input
                          className="order-demo-input"
                          type="time"
                          value={orderDemo.inboundTimeTo}
                          onChange={(e) => setOrderDemo((s) => ({ ...s, inboundTimeTo: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="order-demo-cell">
                      <div className="order-demo-label">受注者</div>
                      <input
                        className="order-demo-input"
                        value={orderDemo.orderTaker}
                        onChange={(e) => setOrderDemo((s) => ({ ...s, orderTaker: e.target.value }))}
                        placeholder="例) 田中"
                      />
                    </div>
                    <div className="order-demo-cell">
                      <div className="order-demo-label">回送区分</div>
                      <div className="order-demo-inline">
                        <select
                          className="order-demo-input"
                          value={orderDemo.transportDivision}
                          onChange={(e) =>
                            setOrderDemo((s) => ({
                              ...s,
                              transportDivision: e.target.value as OrderDemoForm["transportDivision"]
                            }))
                          }
                        >
                          <option value="回送">回送</option>
                          <option value="自社">自社</option>
                          <option value="外注">外注</option>
                          <option value="">未選択</option>
                        </select>
                        <select
                          className="order-demo-input"
                          value={orderDemo.transportBase}
                          onChange={(e) =>
                            setOrderDemo((s) => ({
                              ...s,
                              transportBase: e.target.value as OrderDemoForm["transportBase"]
                            }))
                          }
                        >
                          <option value="本社">本社</option>
                          <option value="支店">支店</option>
                          <option value="ヤード">ヤード</option>
                          <option value="">未選択</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="order-demo-row cols-3">
                    <div className="order-demo-cell span-2">
                      <div className="order-demo-label">得意先</div>
                      <input
                        className="order-demo-input"
                        value={orderDemo.customer}
                        onChange={(e) => setOrderDemo((s) => ({ ...s, customer: e.target.value }))}
                        placeholder="例) ABC建設"
                      />
                    </div>
                    <div className="order-demo-cell">
                      <div className="order-demo-label">受注種類</div>
                      <input className="order-demo-input" value={orderCreateType} readOnly />
                      <button className="button" type="button" disabled style={{ marginTop: 8 }}>
                        地図フォルダー（ダミー）
                      </button>
                    </div>
                  </div>

                  <div className="order-demo-row cols-3">
                    <div className="order-demo-cell">
                      <div className="order-demo-label">現場</div>
                      <input
                        className="order-demo-input"
                        value={orderDemo.siteName}
                        onChange={(e) => setOrderDemo((s) => ({ ...s, siteName: e.target.value }))}
                        placeholder="例) 現場A"
                      />
                    </div>
                    <div className="order-demo-cell">
                      <div className="order-demo-label">住所</div>
                      <input
                        className="order-demo-input"
                        value={orderDemo.siteAddress}
                        onChange={(e) => setOrderDemo((s) => ({ ...s, siteAddress: e.target.value }))}
                        placeholder="例) 東京都○○"
                      />
                    </div>
                    <div className="order-demo-cell">
                      <div className="order-demo-label">工事名</div>
                      <input
                        className="order-demo-input"
                        value={orderDemo.constructionName}
                        onChange={(e) => setOrderDemo((s) => ({ ...s, constructionName: e.target.value }))}
                        placeholder="例) ○○工事"
                      />
                    </div>
                  </div>

                  <div className="order-demo-row cols-4">
                    <div className="order-demo-cell span-2">
                      <div className="order-demo-label">車輛（複数選択可）</div>
                      <div className="order-demo-checkboxes">
                        {vehicleOptions.map((v) => {
                          const checked = orderDemo.vehicles.includes(v);
                          return (
                            <label key={v} className="order-demo-check">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() =>
                                  setOrderDemo((s) => {
                                    const next = checked ? s.vehicles.filter((x) => x !== v) : [...s.vehicles, v];
                                    return { ...s, vehicles: next };
                                  })
                                }
                              />
                              <span>{v}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                    <div className="order-demo-cell">
                      <div className="order-demo-label">レッカー</div>
                      <select
                        className="order-demo-input"
                        value={orderDemo.wrecker}
                        onChange={(e) =>
                          setOrderDemo((s) => ({ ...s, wrecker: e.target.value as OrderDemoForm["wrecker"] }))
                        }
                      >
                        <option value="無">無</option>
                        <option value="有">有</option>
                        <option value="ユニック">ユニック</option>
                      </select>
                    </div>
                    <div className="order-demo-cell">
                      <div className="order-demo-label">引取予定日 / 使用日数</div>
                      <div className="order-demo-inline">
                        <input
                          className="order-demo-input"
                          type="date"
                          value={orderDemo.pickupPlannedDate}
                          onChange={(e) => setOrderDemo((s) => ({ ...s, pickupPlannedDate: e.target.value }))}
                        />
                        <input
                          className="order-demo-input"
                          inputMode="numeric"
                          value={orderDemo.useDays}
                          onChange={(e) => setOrderDemo((s) => ({ ...s, useDays: e.target.value }))}
                          placeholder="日数"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="order-demo-row cols-3">
                    <div className="order-demo-cell">
                      <div className="order-demo-label">発注者</div>
                      <input
                        className="order-demo-input"
                        value={orderDemo.orderer}
                        onChange={(e) => setOrderDemo((s) => ({ ...s, orderer: e.target.value }))}
                        placeholder="例) ○○様"
                      />
                    </div>
                    <div className="order-demo-cell span-2">
                      <div className="order-demo-label">現場連絡先</div>
                      <div className="order-demo-inline">
                        <input
                          className="order-demo-input"
                          value={orderDemo.siteContact}
                          onChange={(e) => setOrderDemo((s) => ({ ...s, siteContact: e.target.value }))}
                          placeholder="例) 090-xxxx-xxxx / 担当: △△"
                        />
                        <button className="button" type="button" disabled>
                          商品追加（ダミー）
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="order-demo-row cols-3">
                    <div className="order-demo-cell">
                      <div className="order-demo-label">回送費：車輛サイズ</div>
                      <select
                        className="order-demo-input"
                        value={orderDemo.transportFeeVehicleSize}
                        onChange={(e) => setOrderDemo((s) => ({ ...s, transportFeeVehicleSize: e.target.value }))}
                      >
                        <option value="">未選択</option>
                        {vehicleOptions.map((v) => (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="order-demo-cell">
                      <div className="order-demo-label">回送費：住所</div>
                      <input
                        className="order-demo-input"
                        value={orderDemo.transportFeeAddress}
                        onChange={(e) => setOrderDemo((s) => ({ ...s, transportFeeAddress: e.target.value }))}
                        placeholder="例) ○○県○○市..."
                      />
                    </div>
                    <div className="order-demo-cell">
                      <div className="order-demo-label">回送費：金額</div>
                      <input
                        className="order-demo-input"
                        inputMode="numeric"
                        value={orderDemo.transportFeeAmount}
                        onChange={(e) => setOrderDemo((s) => ({ ...s, transportFeeAmount: e.target.value }))}
                        placeholder="例) 30000"
                      />
                    </div>
                  </div>

                  <div className="order-demo-row cols-3 notes">
                    <div className="order-demo-cell">
                      <div className="order-demo-label">フロント備考</div>
                      <textarea
                        className="order-demo-textarea"
                        value={orderDemo.noteFront}
                        onChange={(e) => setOrderDemo((s) => ({ ...s, noteFront: e.target.value }))}
                        placeholder="フロント向けメモ"
                      />
                    </div>
                    <div className="order-demo-cell">
                      <div className="order-demo-label">工場備考</div>
                      <textarea
                        className="order-demo-textarea"
                        value={orderDemo.noteFactory}
                        onChange={(e) => setOrderDemo((s) => ({ ...s, noteFactory: e.target.value }))}
                        placeholder="工場向けメモ"
                      />
                    </div>
                    <div className="order-demo-cell">
                      <div className="order-demo-label">ドライバー備考</div>
                      <textarea
                        className="order-demo-textarea"
                        value={orderDemo.noteDriver}
                        onChange={(e) => setOrderDemo((s) => ({ ...s, noteDriver: e.target.value }))}
                        placeholder="ドライバー向けメモ"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="button ghost" type="button" onClick={() => setOrderCreateType(null)}>
                  閉じる
                </button>
                <button className="button primary" type="button" disabled>
                  保存（ダミー）
                </button>
              </div>
            </div>
          </div>
        )}
        <Link to="/home" className="button primary" style={{ marginTop: 16, display: "inline-flex" }}>
          ホームへ戻る
        </Link>
      </div>
    </div>
  );
};

export default FeaturePlaceholder;

