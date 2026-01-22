import { useMemo, useState, useEffect } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { featureCards } from "../data/mockData";
import { featureContent } from "../data/featureContent";
import { DispatchInstructionKey } from "../data/dispatchInstructions";
import { pickupOrderSearchMock, PickupOrderSearchItem } from "../data/orderPickupSearchMock";
import { pickupSearchMachinesMock, PickupSearchMachineItem } from "../data/pickupSearchMachinesMock";
import {
  inboundOrderSearchColumns,
  inboundOrderSearchRawRows,
  inboundOrderSearchColWidths
} from "../data/inboundOrderSearchMock";
import { pickupOrderSearchRawRows } from "../data/pickupOrderSearchPdfMock";
import { InboundPdfTable } from "../components/InboundPdfTable";
import { LocationChangeModal } from "../components/LocationChangeModal";
import { locationMasterMock } from "../data/locationMasterMock";
import { MachineTypeChangeModal } from "../components/MachineTypeChangeModal";
import { MachineNoEditModal } from "../components/MachineNoEditModal";
import { SimpleValueEditModal } from "../components/SimpleValueEditModal";
import { DriverAssignModal, driverAssignParseFromCell } from "../components/DriverAssignModal";
import { SiteEditModal } from "../components/SiteEditModal";
import { TimeRangeEditModal } from "../components/TimeRangeEditModal";
import { FactoryNoteEditModal } from "../components/FactoryNoteEditModal";
import { TransportFeeEditModal } from "../components/TransportFeeEditModal";
import { VehicleSizeEditModal } from "../components/VehicleSizeEditModal";
import {
  categoryIdOptions,
  kindIdOptions,
  machineNoOptions,
  vehicleSizeOptions,
  wreckerOptions
} from "../data/inboundEditMock";
import { siteMasterMock } from "../data/siteMasterMock";
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

type PickupOrderSearchForm = {
  customerName: string; // 得意先名
  salesRep: string; // 営業担当
  siteName: string; // 現場
  kind: string; // 種類
  type: string; // 種別
  constructionName: string; // 工事名
  address: string; // 住所
};

const initialPickupOrderSearchForm: PickupOrderSearchForm = {
  customerName: "",
  salesRep: "",
  siteName: "",
  kind: "",
  type: "",
  constructionName: "",
  address: ""
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
  const [showOrdersResults, setShowOrdersResults] = useState(false);
  const [orderCreateType, setOrderCreateType] = useState<OrderCreateType | null>(null);
  const [showPickupSearchModal, setShowPickupSearchModal] = useState(false);
  const [pickupSearchForm, setPickupSearchForm] = useState<PickupOrderSearchForm>(
    initialPickupOrderSearchForm
  );
  const [pickupSearchShowResults, setPickupSearchShowResults] = useState(false);
  const [pickupMachineSelectedIds, setPickupMachineSelectedIds] = useState<string[]>([]);
  const [pendingPickupCreate, setPendingPickupCreate] = useState<{
    orderDemoPatch: Partial<OrderDemoForm>;
    orderLines: OrderLine[];
  } | null>(null);

  // 搬入の受注検索結果（PDF再現テーブル）: デモ用に行データをstateで持ち、場所変更を反映できるようにする
  const [inboundRows, setInboundRows] = useState<string[][]>(() => inboundOrderSearchRawRows.map((r) => [...r]));
  // 引取の受注検索結果（PDF再現テーブル）: デモ用に行データをstateで持ち、編集を反映できるようにする
  const [pickupRows, setPickupRows] = useState<string[][]>(() => pickupOrderSearchRawRows.map((r) => [...r]));
  const [ordersPdfEditingKind, setOrdersPdfEditingKind] = useState<"搬入" | "引取">("搬入");
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [locationModalTargetRow, setLocationModalTargetRow] = useState<number | null>(null);
  const [locationModalInitial, setLocationModalInitial] = useState<{ id?: string; name?: string }>({});

  const parseLocationCell = (value: string): { id?: string; name?: string } => {
    const v = value.trim();
    // 例: "本社（001）"
    const m = v.match(/^(.+?)（(\d+)）$/);
    if (m) return { name: m[1], id: m[2] };
    return { name: v || undefined };
  };

  const [machineTypeModalOpen, setMachineTypeModalOpen] = useState(false);
  const [machineTypeTargetRow, setMachineTypeTargetRow] = useState<number | null>(null);
  const [machineTypeInitial, setMachineTypeInitial] = useState<{ kindId?: string; categoryId?: string }>({});

  const [machineNoModalOpen, setMachineNoModalOpen] = useState(false);
  const [machineNoTargetRow, setMachineNoTargetRow] = useState<number | null>(null);
  const [machineNoInitial, setMachineNoInitial] = useState<string>("");

  const [quantityModalOpen, setQuantityModalOpen] = useState(false);
  const [quantityTargetRow, setQuantityTargetRow] = useState<number | null>(null);
  const [quantityInitial, setQuantityInitial] = useState<string>("");

  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [vehicleTargetRow, setVehicleTargetRow] = useState<number | null>(null);
  const [vehicleInitial, setVehicleInitial] = useState<string>("");

  const [wreckerModalOpen, setWreckerModalOpen] = useState(false);
  const [wreckerTargetRow, setWreckerTargetRow] = useState<number | null>(null);
  const [wreckerInitial, setWreckerInitial] = useState<string>("");

  const [driverModalOpen, setDriverModalOpen] = useState(false);
  const [driverTargetRow, setDriverTargetRow] = useState<number | null>(null);
  const [driverInitial, setDriverInitial] = useState<{ kind?: "選択無し" | "自社" | "外注" | "先方"; driverId?: string; outsourceId?: string }>({});

  const [siteModalOpen, setSiteModalOpen] = useState(false);
  const [siteTargetRow, setSiteTargetRow] = useState<number | null>(null);
  const [siteInitial, setSiteInitial] = useState<{ siteId?: string; siteName?: string }>({});

  const [timeModalOpen, setTimeModalOpen] = useState(false);
  const [timeTargetRow, setTimeTargetRow] = useState<number | null>(null);
  const [timeInitial, setTimeInitial] = useState<string>("");

  const [factoryNoteModalOpen, setFactoryNoteModalOpen] = useState(false);
  const [factoryNoteTargetRow, setFactoryNoteTargetRow] = useState<number | null>(null);
  const [factoryNoteInitial, setFactoryNoteInitial] = useState<string>("");

  const [transportFeeModalOpen, setTransportFeeModalOpen] = useState(false);
  const [transportFeeTargetRow, setTransportFeeTargetRow] = useState<number | null>(null);
  const [transportFeeInitial, setTransportFeeInitial] = useState<string>("");

  const setInboundCell = (rowIndex: number, colIndex: number, nextValue: string) => {
    setInboundRows((prev) =>
      prev.map((row, idx) =>
        idx === rowIndex ? row.map((cell, cidx) => (cidx === colIndex ? nextValue : cell)) : row
      )
    );
  };

  const setPickupCell = (rowIndex: number, colIndex: number, nextValue: string) => {
    setPickupRows((prev) =>
      prev.map((row, idx) =>
        idx === rowIndex ? row.map((cell, cidx) => (cidx === colIndex ? nextValue : cell)) : row
      )
    );
  };

  const setOrdersPdfCell = (rowIndex: number, colIndex: number, nextValue: string) => {
    if (ordersPdfEditingKind === "引取") {
      setPickupCell(rowIndex, colIndex, nextValue);
      return;
    }
    setInboundCell(rowIndex, colIndex, nextValue);
  };

  const parseStartTimeMinutes = (value: string): number => {
    const v = (value ?? "").trim();
    // examples: "9:00", "09:00～12:00", "10:00～10:30"
    const m = v.match(/(\d{1,2})\s*:\s*(\d{2})/);
    if (!m) return Number.POSITIVE_INFINITY;
    const hh = Number(m[1]);
    const mm = Number(m[2]);
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return Number.POSITIVE_INFINITY;
    return hh * 60 + mm;
  };

  const isPdfGroupStartRow = (row: string[]) => (row[0] ?? "").trim().length > 0 || (row[1] ?? "").trim().length > 0;

  type OrdersPdfRowRef = { kind: "搬入" | "引取"; sourceRowIndex: number };
  type OrdersPdfGroup = { kind: "搬入" | "引取"; startRowIndex: number; endRowIndex: number; startMinutes: number };

  const buildGroups = (rows: string[][], kind: "搬入" | "引取"): OrdersPdfGroup[] => {
    const groups: OrdersPdfGroup[] = [];
    let i = 0;
    while (i < rows.length) {
      // seek group start
      while (i < rows.length && !isPdfGroupStartRow(rows[i] ?? [])) i += 1;
      if (i >= rows.length) break;
      const start = i;
      i += 1;
      while (i < rows.length && !isPdfGroupStartRow(rows[i] ?? [])) i += 1;
      const end = i; // exclusive

      const timeCell =
        rows
          .slice(start, end)
          .map((r) => (r?.[10] ?? "").trim())
          .find((x) => x.length > 0) ?? "";

      groups.push({
        kind,
        startRowIndex: start,
        endRowIndex: end,
        startMinutes: parseStartTimeMinutes(timeCell)
      });
    }
    return groups;
  };

  const parseMachineTypeFromCell = (value: string): { baseName: string; kindId?: string; categoryId?: string } => {
    const lines = (value ?? "").split("\n");
    const baseName = (lines[0] ?? "").trim();
    const kindLine = lines.find((x) => x.trim().startsWith("種類ID:"));
    const categoryLine = lines.find((x) => x.trim().startsWith("種別ID:"));
    const kindId = kindLine ? kindLine.replace("種類ID:", "").trim() : undefined;
    const categoryId = categoryLine ? categoryLine.replace("種別ID:", "").trim() : undefined;
    return { baseName, kindId, categoryId };
  };

  const parseSiteFromCell = (value: string): { siteId?: string; siteName?: string } => {
    const v = (value ?? "").trim();
    // 例: "港北区東神奈川（S-0004）"
    const m = v.match(/^(.+?)（(.+?)）$/);
    if (m) return { siteName: m[1], siteId: m[2] };
    return { siteName: v || undefined };
  };

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

  type OrderLine = {
    lineId: string;
    meisai: "販売" | "レンタル";
    shosai: "自社" | "他社";
    supplierId: string;
    warehouseId: string;
    productNo: string;
    productName1: string;
    productName2: string;
    productName3: string;
    dispatchNote: string;
    note1: string;
    note2: string;
    quantity: string;
    startDate: string;
    endDate: string;
    contract: string;
    dailyUnitPrice: string;
    monthlyUnitPrice: string;
    split: string;
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

  const createInitialOrderLine = (): OrderLine => ({
    lineId: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    meisai: "レンタル",
    shosai: "自社",
    supplierId: "",
    warehouseId: "",
    productNo: "",
    productName1: "",
    productName2: "",
    productName3: "",
    dispatchNote: "",
    note1: "",
    note2: "",
    quantity: "",
    startDate: "",
    endDate: "",
    contract: "",
    dailyUnitPrice: "",
    monthlyUnitPrice: "",
    split: ""
  });

  const [orderDemo, setOrderDemo] = useState<OrderDemoForm>(createInitialOrderDemoForm);
  const [orderLines, setOrderLines] = useState<OrderLine[]>([]);

  useEffect(() => {
    if (!orderCreateType) return;
    if (pendingPickupCreate) {
      setOrderDemo((s) => ({ ...createInitialOrderDemoForm(), ...pendingPickupCreate.orderDemoPatch, ...s }));
      setOrderLines(pendingPickupCreate.orderLines);
      setPendingPickupCreate(null);
      return;
    }
    setOrderDemo(createInitialOrderDemoForm());
    setOrderLines([]);
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

  const filteredPickupCandidates = useMemo<PickupOrderSearchItem[]>(() => {
    const toLower = (v: string) => v.trim().toLowerCase();
    const includes = (haystack: string, needle: string) =>
      !needle.trim() || toLower(haystack).includes(toLower(needle));

    const { customerName, salesRep, siteName, kind, type, constructionName, address } = pickupSearchForm;

    return pickupOrderSearchMock.filter((x) => {
      return (
        includes(x.customerName, customerName) &&
        includes(x.salesRep, salesRep) &&
        includes(x.siteName, siteName) &&
        includes(x.kind, kind) &&
        includes(x.type, type) &&
        includes(x.constructionName, constructionName) &&
        includes(x.address, address)
      );
    });
  }, [pickupSearchForm]);

  const filteredPickupMachines = useMemo<PickupSearchMachineItem[]>(() => {
    const toLower = (v: string) => v.trim().toLowerCase();
    const includes = (haystack: string, needle: string) =>
      !needle.trim() || toLower(haystack).includes(toLower(needle));

    const { customerName, siteName, kind, type, constructionName, address } = pickupSearchForm;

    return pickupSearchMachinesMock.filter((x) => {
      return (
        includes(x.customerName, customerName) &&
        includes(x.siteName, siteName) &&
        includes(x.kind, kind) &&
        includes(x.type, type) &&
        includes(x.constructionName, constructionName) &&
        includes(x.address, address)
      );
    });
  }, [pickupSearchForm]);

  const pickupOutboundMachines = useMemo(
    () => filteredPickupMachines.filter((x) => x.status === "出庫中"),
    [filteredPickupMachines]
  );
  const pickupOrderedMachines = useMemo(
    () => filteredPickupMachines.filter((x) => x.status === "受注中"),
    [filteredPickupMachines]
  );

  const togglePickupMachine = (id: string) => {
    setPickupMachineSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const buildOrderLinesFromSelectedMachines = (machines: PickupSearchMachineItem[]): OrderLine[] => {
    return machines.map((m) => ({
      ...createInitialOrderLine(),
      productName1: m.machineName,
      dispatchNote: `現場: ${m.siteName}`,
      note1: `出庫開始日: ${m.outboundStartDate}`,
      quantity: "1"
    }));
  };

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

  const shouldShowInboundOrdersPdfResult =
    feature.key === "orders" && ordersFilter.kinds.length === 1 && ordersFilter.kinds[0] === "搬入";
  const shouldShowPickupOrdersPdfResult =
    feature.key === "orders" && ordersFilter.kinds.length === 1 && ordersFilter.kinds[0] === "引取";
  const shouldShowOrdersPdfResult = shouldShowInboundOrdersPdfResult || shouldShowPickupOrdersPdfResult;
  const ordersPdfKindLabel: "搬入" | "引取" = shouldShowInboundOrdersPdfResult ? "搬入" : "引取";

  const hasInboundPdf = feature.key === "orders" && ordersFilter.kinds.includes("搬入");
  const hasPickupPdf = feature.key === "orders" && ordersFilter.kinds.includes("引取");
  const onlyInboundPickupKinds =
    feature.key === "orders" &&
    ordersFilter.kinds.length > 0 &&
    ordersFilter.kinds.every((k) => k === "搬入" || k === "引取");
  const shouldShowMixedOrdersPdfResult = feature.key === "orders" && onlyInboundPickupKinds && hasInboundPdf && hasPickupPdf;

  const shouldShowAnyOrdersPdfResult = shouldShowOrdersPdfResult || shouldShowMixedOrdersPdfResult;

  const ordersPdfTitleLabel = shouldShowMixedOrdersPdfResult ? "搬入＋引取" : ordersPdfKindLabel;

  const ordersPdfDisplay = useMemo((): { rows: string[][]; rowRefs: OrdersPdfRowRef[] } => {
    if (!feature || feature.key !== "orders") return { rows: [], rowRefs: [] };

    if (shouldShowMixedOrdersPdfResult) {
      const inboundGroups = buildGroups(inboundRows, "搬入");
      const pickupGroups = buildGroups(pickupRows, "引取");
      const merged = [...inboundGroups, ...pickupGroups].sort((a, b) => {
        if (a.startMinutes !== b.startMinutes) return a.startMinutes - b.startMinutes;
        if (a.kind !== b.kind) return a.kind === "搬入" ? -1 : 1;
        return a.startRowIndex - b.startRowIndex;
      });

      const nextRows: string[][] = [];
      const nextRefs: OrdersPdfRowRef[] = [];
      for (const g of merged) {
        const src = g.kind === "搬入" ? inboundRows : pickupRows;
        for (let r = g.startRowIndex; r < g.endRowIndex; r += 1) {
          nextRows.push(src[r] ?? []);
          nextRefs.push({ kind: g.kind, sourceRowIndex: r });
        }
      }
      return { rows: nextRows, rowRefs: nextRefs };
    }

    if (shouldShowInboundOrdersPdfResult) {
      return { rows: inboundRows, rowRefs: inboundRows.map((_, idx) => ({ kind: "搬入", sourceRowIndex: idx })) };
    }
    if (shouldShowPickupOrdersPdfResult) {
      return { rows: pickupRows, rowRefs: pickupRows.map((_, idx) => ({ kind: "引取", sourceRowIndex: idx })) };
    }
    return { rows: [], rowRefs: [] };
  }, [
    buildGroups,
    feature,
    inboundRows,
    pickupRows,
    shouldShowInboundOrdersPdfResult,
    shouldShowMixedOrdersPdfResult,
    shouldShowPickupOrdersPdfResult
  ]);

  const setOrdersPdfCellByDisplayRow = (displayRowIndex: number, colIndex: number, nextValue: string) => {
    const ref = ordersPdfDisplay.rowRefs[displayRowIndex];
    if (!ref) return;
    if (ref.kind === "引取") {
      setPickupCell(ref.sourceRowIndex, colIndex, nextValue);
      return;
    }
    setInboundCell(ref.sourceRowIndex, colIndex, nextValue);
  };

  const ordersSearchResultBody = shouldShowAnyOrdersPdfResult ? (
    <div className="page" style={{ marginTop: 0 }}>
      <p style={{ marginTop: 0, color: "#475569", fontSize: 12 }}>
        検索条件「{ordersPdfTitleLabel}」選択時のデモ表示（PDF/画像の表を再現）※場所セルをダブルクリックで場所変更モーダル
      </p>
      <InboundPdfTable
        ariaLabel={`${ordersPdfTitleLabel} 受注検索結果（PDF再現）`}
        columns={inboundOrderSearchColumns}
        rows={shouldShowMixedOrdersPdfResult ? ordersPdfDisplay.rows : (shouldShowInboundOrdersPdfResult ? inboundRows : pickupRows)}
        tableClassName={shouldShowPickupOrdersPdfResult ? "inbound-pdf-table--pickup" : undefined}
        getRowClassName={
          shouldShowMixedOrdersPdfResult
            ? ({ rowIndex }) => (ordersPdfDisplay.rowRefs[rowIndex]?.kind === "引取" ? "orders-pdf-row--pickup" : undefined)
            : undefined
        }
        colWidths={inboundOrderSearchColWidths}
        mergeColumnIndices={[0, 1, 5, 6, 7, 8, 9, 10, 11, 12, 13]}
        mergeBlankCellsWithinGroup
        groupStartColumnIndices={[0, 1]}
        onCellDoubleClick={({ rowIndex, colIndex, value }) => {
          if (shouldShowMixedOrdersPdfResult) {
            const ref = ordersPdfDisplay.rowRefs[rowIndex];
            setOrdersPdfEditingKind(ref?.kind ?? "搬入");
          } else {
            setOrdersPdfEditingKind(ordersPdfKindLabel);
          }
          // 列ごとにデモ編集モーダルを出し分け
          // [0]場所 [2]機械名 [3]No. [4]数量 [5]車輛
          if (colIndex === 0) {
            if (!value.trim()) return;
            setLocationModalTargetRow(rowIndex);
            setLocationModalInitial(parseLocationCell(value));
            setLocationModalOpen(true);
            return;
          }
          if (colIndex === 2) {
            const parsed = parseMachineTypeFromCell(value);
            setMachineTypeTargetRow(rowIndex);
            setMachineTypeInitial({ kindId: parsed.kindId, categoryId: parsed.categoryId });
            setMachineTypeModalOpen(true);
            return;
          }
          if (colIndex === 3) {
            setMachineNoTargetRow(rowIndex);
            setMachineNoInitial(value ?? "");
            setMachineNoModalOpen(true);
            return;
          }
          if (colIndex === 4) {
            setQuantityTargetRow(rowIndex);
            setQuantityInitial(value ?? "");
            setQuantityModalOpen(true);
            return;
          }
          if (colIndex === 5) {
            setVehicleTargetRow(rowIndex);
            setVehicleInitial(value ?? "");
            setVehicleModalOpen(true);
            return;
          }
          if (colIndex === 6) {
            // ﾚｯｶｰ
            setWreckerTargetRow(rowIndex);
            setWreckerInitial(value ?? "");
            setWreckerModalOpen(true);
            return;
          }
          if (colIndex === 7) {
            // 運転手
            const parsed = driverAssignParseFromCell(value ?? "");
            setDriverTargetRow(rowIndex);
            setDriverInitial(parsed);
            setDriverModalOpen(true);
            return;
          }
          if (colIndex === 9) {
            // 現場
            const parsed = parseSiteFromCell(value ?? "");
            setSiteTargetRow(rowIndex);
            setSiteInitial(parsed);
            setSiteModalOpen(true);
            return;
          }
          if (colIndex === 10) {
            // 時間
            setTimeTargetRow(rowIndex);
            setTimeInitial(value ?? "");
            setTimeModalOpen(true);
            return;
          }
          if (colIndex === 11) {
            // 備考（工場備考）
            setFactoryNoteTargetRow(rowIndex);
            setFactoryNoteInitial(value ?? "");
            setFactoryNoteModalOpen(true);
            return;
          }
          if (colIndex === 13) {
            // 回送費
            setTransportFeeTargetRow(rowIndex);
            setTransportFeeInitial(value ?? "");
            setTransportFeeModalOpen(true);
            return;
          }
        }}
      />
    </div>
  ) : (
    sectionsContent
  );

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
                  setShowOrdersResults(false);
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
                  setShowOrdersResults(false);
                  setOrderCreateType(null);
                  setShowPickupSearchModal(true);
                  setPickupSearchShowResults(false);
                  setPickupMachineSelectedIds([]);
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
                  setShowOrdersResults(false);
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
                onClick={() => setShowOrdersResults(true)}
              >
                検索
              </button>
              <button
                className="button"
                type="button"
                onClick={() => {
                  setOrdersFilter({ ...initialOrdersFilter });
                  setShowOrdersResults(false);
                }}
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
        {feature.key === "orders" && !showOrdersResults && (
          <p style={{ marginTop: 18, color: "#475569" }}>
            検索条件を入力し「検索」を押すと、この下に検索結果が表示されます。
          </p>
        )}
        {feature.key !== "orders" && sectionsContent}
        {feature.key === "orders" && showOrdersResults && (
          <div className="page orders-results-fullbleed" style={{ marginTop: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <h3 style={{ marginTop: 0, marginBottom: 0 }}>受注検索結果</h3>
              <button className="button" type="button" onClick={() => setShowOrdersResults(false)}>
                閉じる
              </button>
            </div>
            {ordersSearchResultBody}
          </div>
        )}
        {feature.key === "orders" && showOrdersResults && shouldShowAnyOrdersPdfResult && (
          <LocationChangeModal
            open={locationModalOpen}
            locations={locationMasterMock}
            initialLocationId={locationModalInitial.id}
            initialLocationName={locationModalInitial.name}
            onClose={() => {
              setLocationModalOpen(false);
              setLocationModalTargetRow(null);
              setLocationModalInitial({});
            }}
            onConfirm={(next) => {
              if (locationModalTargetRow == null) return;
              setOrdersPdfCellByDisplayRow(locationModalTargetRow, 0, `${next.name}（${next.id}）`);
              setLocationModalOpen(false);
              setLocationModalTargetRow(null);
              setLocationModalInitial({});
            }}
          />
        )}
        {feature.key === "orders" && showOrdersResults && shouldShowAnyOrdersPdfResult && (
          <MachineTypeChangeModal
            open={machineTypeModalOpen}
            kindIdOptions={kindIdOptions}
            categoryIdOptions={categoryIdOptions}
            initialKindId={machineTypeInitial.kindId}
            initialCategoryId={machineTypeInitial.categoryId}
            onClose={() => {
              setMachineTypeModalOpen(false);
              setMachineTypeTargetRow(null);
              setMachineTypeInitial({});
            }}
            onConfirm={(next) => {
              if (machineTypeTargetRow == null) return;
              const ref = ordersPdfDisplay.rowRefs[machineTypeTargetRow];
              const current =
                ref?.kind === "引取"
                  ? pickupRows[ref.sourceRowIndex]?.[2] ?? ""
                  : inboundRows[ref?.sourceRowIndex ?? machineTypeTargetRow]?.[2] ?? "";
              const parsed = parseMachineTypeFromCell(current);
              const base = parsed.baseName || current || "（未入力）";
              setOrdersPdfCellByDisplayRow(machineTypeTargetRow, 2, `${base}\n種類ID:${next.kindId}\n種別ID:${next.categoryId}`);
              setMachineTypeModalOpen(false);
              setMachineTypeTargetRow(null);
              setMachineTypeInitial({});
            }}
          />
        )}
        {feature.key === "orders" && showOrdersResults && shouldShowAnyOrdersPdfResult && (
          <MachineNoEditModal
            open={machineNoModalOpen}
            machineNoOptions={machineNoOptions}
            initialValue={machineNoInitial}
            onClose={() => {
              setMachineNoModalOpen(false);
              setMachineNoTargetRow(null);
              setMachineNoInitial("");
            }}
            onConfirm={(nextValue) => {
              if (machineNoTargetRow == null) return;
              setOrdersPdfCellByDisplayRow(machineNoTargetRow, 3, nextValue);
              setMachineNoModalOpen(false);
              setMachineNoTargetRow(null);
              setMachineNoInitial("");
            }}
          />
        )}
        {feature.key === "orders" && showOrdersResults && shouldShowAnyOrdersPdfResult && (
          <SimpleValueEditModal
            open={quantityModalOpen}
            title="数量 変更（デモ）"
            description="数量セルのダブルクリックで開くデモモーダルです。"
            mode="number"
            initialValue={quantityInitial}
            placeholder="例) 1"
            onClose={() => {
              setQuantityModalOpen(false);
              setQuantityTargetRow(null);
              setQuantityInitial("");
            }}
            onConfirm={(nextValue) => {
              if (quantityTargetRow == null) return;
              setOrdersPdfCellByDisplayRow(quantityTargetRow, 4, nextValue);
              setQuantityModalOpen(false);
              setQuantityTargetRow(null);
              setQuantityInitial("");
            }}
          />
        )}
        {feature.key === "orders" && showOrdersResults && shouldShowAnyOrdersPdfResult && (
          <VehicleSizeEditModal
            open={vehicleModalOpen}
            vehicleSizeOptions={vehicleSizeOptions}
            initialValue={vehicleInitial}
            onClose={() => {
              setVehicleModalOpen(false);
              setVehicleTargetRow(null);
              setVehicleInitial("");
            }}
            onConfirm={(nextValue) => {
              if (vehicleTargetRow == null) return;
              setOrdersPdfCellByDisplayRow(vehicleTargetRow, 5, nextValue);
              setVehicleModalOpen(false);
              setVehicleTargetRow(null);
              setVehicleInitial("");
            }}
          />
        )}
        {feature.key === "orders" && showOrdersResults && shouldShowAnyOrdersPdfResult && (
          <SimpleValueEditModal
            open={wreckerModalOpen}
            title="ﾚｯｶｰ 変更（デモ）"
            description="ﾚｯｶｰセルのダブルクリックで開くデモモーダルです。"
            mode="select"
            options={wreckerOptions}
            initialValue={wreckerInitial.trim() ? wreckerInitial : wreckerOptions[0]}
            onClose={() => {
              setWreckerModalOpen(false);
              setWreckerTargetRow(null);
              setWreckerInitial("");
            }}
            onConfirm={(nextValue) => {
              if (wreckerTargetRow == null) return;
              // 「選択無し」は空欄にする
              setOrdersPdfCellByDisplayRow(wreckerTargetRow, 6, nextValue === "選択無し" ? "" : nextValue);
              setWreckerModalOpen(false);
              setWreckerTargetRow(null);
              setWreckerInitial("");
            }}
          />
        )}
        {feature.key === "orders" && showOrdersResults && shouldShowAnyOrdersPdfResult && (
          <DriverAssignModal
            open={driverModalOpen}
            initialKind={driverInitial.kind}
            initialDriverId={driverInitial.driverId}
            initialOutsourceId={driverInitial.outsourceId}
            onClose={() => {
              setDriverModalOpen(false);
              setDriverTargetRow(null);
              setDriverInitial({});
            }}
            onConfirm={(next) => {
              if (driverTargetRow == null) return;
              const lines: string[] = [];
              if (next.kind === "選択無し") {
                setOrdersPdfCellByDisplayRow(driverTargetRow, 7, "");
              } else if (next.kind === "先方") {
                setOrdersPdfCellByDisplayRow(driverTargetRow, 7, "先方");
              } else {
                lines.push(next.kind);
                if (next.driverId) lines.push(`運転手ID:${next.driverId}`);
                if (next.outsourceId) lines.push(`外注ID:${next.outsourceId}`);
                setOrdersPdfCellByDisplayRow(driverTargetRow, 7, lines.join("\n"));
              }
              setDriverModalOpen(false);
              setDriverTargetRow(null);
              setDriverInitial({});
            }}
          />
        )}
        {feature.key === "orders" && showOrdersResults && shouldShowAnyOrdersPdfResult && (
          <SiteEditModal
            open={siteModalOpen}
            title="現場（デモ）"
            sites={siteMasterMock}
            initialSiteId={siteInitial.siteId}
            initialSiteName={siteInitial.siteName}
            onClose={() => {
              setSiteModalOpen(false);
              setSiteTargetRow(null);
              setSiteInitial({});
            }}
            onConfirm={(next) => {
              if (siteTargetRow == null) return;
              setOrdersPdfCellByDisplayRow(siteTargetRow, 9, `${next.siteName}（${next.siteId}）`);
              setSiteModalOpen(false);
              setSiteTargetRow(null);
              setSiteInitial({});
            }}
          />
        )}
        {feature.key === "orders" && showOrdersResults && shouldShowAnyOrdersPdfResult && (
          <TimeRangeEditModal
            open={timeModalOpen}
            initialValue={timeInitial}
            onClose={() => {
              setTimeModalOpen(false);
              setTimeTargetRow(null);
              setTimeInitial("");
            }}
            onConfirm={(nextValue) => {
              if (timeTargetRow == null) return;
              setOrdersPdfCellByDisplayRow(timeTargetRow, 10, nextValue);
              setTimeModalOpen(false);
              setTimeTargetRow(null);
              setTimeInitial("");
            }}
          />
        )}
        {feature.key === "orders" && showOrdersResults && shouldShowAnyOrdersPdfResult && (
          <FactoryNoteEditModal
            open={factoryNoteModalOpen}
            initialValue={factoryNoteInitial}
            onClose={() => {
              setFactoryNoteModalOpen(false);
              setFactoryNoteTargetRow(null);
              setFactoryNoteInitial("");
            }}
            onConfirm={(nextValue) => {
              if (factoryNoteTargetRow == null) return;
              setOrdersPdfCellByDisplayRow(factoryNoteTargetRow, 11, nextValue);
              setFactoryNoteModalOpen(false);
              setFactoryNoteTargetRow(null);
              setFactoryNoteInitial("");
            }}
          />
        )}
        {feature.key === "orders" && showOrdersResults && shouldShowAnyOrdersPdfResult && (
          <TransportFeeEditModal
            open={transportFeeModalOpen}
            initialValue={transportFeeInitial}
            onClose={() => {
              setTransportFeeModalOpen(false);
              setTransportFeeTargetRow(null);
              setTransportFeeInitial("");
            }}
            onConfirm={(nextValue) => {
              if (transportFeeTargetRow == null) return;
              setOrdersPdfCellByDisplayRow(transportFeeTargetRow, 13, nextValue);
              setTransportFeeModalOpen(false);
              setTransportFeeTargetRow(null);
              setTransportFeeInitial("");
            }}
          />
        )}
        {feature.key === "orders" && orderCreateType && (
          <div className="modal-overlay order-create-overlay" role="dialog" aria-modal="true">
            <div className="modal order-create-modal">
              <div className="modal-header">
                <h3 style={{ margin: 0 }}>{orderCreateType}受注作成（デモ）</h3>
                <button className="button ghost" type="button" onClick={() => setOrderCreateType(null)}>
                  閉じる
                </button>
              </div>
              <div className="modal-body">
                <p style={{ marginTop: 0, marginBottom: 8, color: "#475569", fontSize: 12, lineHeight: 1.35 }}>
                  入力内容は保存されません。画面イメージのみのダミーモーダルです。
                </p>

                <div className="order-lines">
                  <div className="order-lines-header">
                    <div style={{ fontWeight: 800, color: "#334155" }}>商品明細</div>
                    <button
                      className="button"
                      type="button"
                      onClick={() => setOrderLines((s) => [...s, createInitialOrderLine()])}
                    >
                      商品追加
                    </button>
                  </div>

                  {orderLines.length > 0 && (
                    <div className="order-lines-table-wrap" aria-label="商品明細入力">
                      <table className="order-lines-table">
                        <thead>
                          <tr>
                            <th>
                              <div className="order-lines-th-2rows">
                                <div>明細</div>
                                <div>詳細</div>
                              </div>
                            </th>
                            <th>
                              <div className="order-lines-th-2rows">
                                <div>仕入先ID</div>
                                <div>保管（倉庫ID）</div>
                              </div>
                            </th>
                            <th>商品No.</th>
                            <th>
                              <div className="order-lines-th-2rows">
                                <div>品名①</div>
                                <div>品名②</div>
                              </div>
                            </th>
                            <th>品名③</th>
                            <th>配車備考</th>
                            <th>備考①</th>
                            <th>備考②</th>
                            <th>数量</th>
                            <th>開始日</th>
                            <th>終了日</th>
                            <th>契約</th>
                            <th>日極単価</th>
                            <th>月極単価</th>
                            <th>分割</th>
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {orderLines.map((line) => (
                            <tr key={line.lineId}>
                              <td>
                                <div className="order-lines-2rows">
                                  <select
                                    className="order-lines-input"
                                    value={line.meisai}
                                    onChange={(e) =>
                                      setOrderLines((s) =>
                                        s.map((x) =>
                                          x.lineId === line.lineId
                                            ? { ...x, meisai: e.target.value as OrderLine["meisai"] }
                                            : x
                                        )
                                      )
                                    }
                                  >
                                    <option value="販売">販売</option>
                                    <option value="レンタル">レンタル</option>
                                  </select>
                                  <select
                                    className="order-lines-input"
                                    value={line.shosai}
                                    onChange={(e) =>
                                      setOrderLines((s) =>
                                        s.map((x) =>
                                          x.lineId === line.lineId
                                            ? { ...x, shosai: e.target.value as OrderLine["shosai"] }
                                            : x
                                        )
                                      )
                                    }
                                  >
                                    <option value="自社">自社</option>
                                    <option value="他社">他社</option>
                                  </select>
                                </div>
                              </td>
                              <td>
                                <div className="order-lines-2rows">
                                  <input
                                    className="order-lines-input"
                                    value={line.supplierId}
                                    onChange={(e) =>
                                      setOrderLines((s) =>
                                        s.map((x) =>
                                          x.lineId === line.lineId ? { ...x, supplierId: e.target.value } : x
                                        )
                                      )
                                    }
                                  />
                                  <input
                                    className="order-lines-input"
                                    value={line.warehouseId}
                                    onChange={(e) =>
                                      setOrderLines((s) =>
                                        s.map((x) =>
                                          x.lineId === line.lineId ? { ...x, warehouseId: e.target.value } : x
                                        )
                                      )
                                    }
                                  />
                                </div>
                              </td>
                              <td>
                                <input
                                  className="order-lines-input"
                                  value={line.productNo}
                                  onChange={(e) =>
                                    setOrderLines((s) =>
                                      s.map((x) =>
                                        x.lineId === line.lineId ? { ...x, productNo: e.target.value } : x
                                      )
                                    )
                                  }
                                />
                              </td>
                              <td>
                                <div className="order-lines-2rows">
                                  <input
                                    className="order-lines-input"
                                    value={line.productName1}
                                    onChange={(e) =>
                                      setOrderLines((s) =>
                                        s.map((x) =>
                                          x.lineId === line.lineId ? { ...x, productName1: e.target.value } : x
                                        )
                                      )
                                    }
                                  />
                                  <input
                                    className="order-lines-input"
                                    value={line.productName2}
                                    onChange={(e) =>
                                      setOrderLines((s) =>
                                        s.map((x) =>
                                          x.lineId === line.lineId ? { ...x, productName2: e.target.value } : x
                                        )
                                      )
                                    }
                                  />
                                </div>
                              </td>
                              <td>
                                <input
                                  className="order-lines-input"
                                  value={line.productName3}
                                  onChange={(e) =>
                                    setOrderLines((s) =>
                                      s.map((x) =>
                                        x.lineId === line.lineId ? { ...x, productName3: e.target.value } : x
                                      )
                                    )
                                  }
                                />
                              </td>
                              <td>
                                <input
                                  className="order-lines-input"
                                  value={line.dispatchNote}
                                  onChange={(e) =>
                                    setOrderLines((s) =>
                                      s.map((x) =>
                                        x.lineId === line.lineId ? { ...x, dispatchNote: e.target.value } : x
                                      )
                                    )
                                  }
                                />
                              </td>
                              <td>
                                <input
                                  className="order-lines-input"
                                  value={line.note1}
                                  onChange={(e) =>
                                    setOrderLines((s) =>
                                      s.map((x) => (x.lineId === line.lineId ? { ...x, note1: e.target.value } : x))
                                    )
                                  }
                                />
                              </td>
                              <td>
                                <input
                                  className="order-lines-input"
                                  value={line.note2}
                                  onChange={(e) =>
                                    setOrderLines((s) =>
                                      s.map((x) => (x.lineId === line.lineId ? { ...x, note2: e.target.value } : x))
                                    )
                                  }
                                />
                              </td>
                              <td>
                                <input
                                  className="order-lines-input"
                                  inputMode="numeric"
                                  value={line.quantity}
                                  onChange={(e) =>
                                    setOrderLines((s) =>
                                      s.map((x) =>
                                        x.lineId === line.lineId ? { ...x, quantity: e.target.value } : x
                                      )
                                    )
                                  }
                                />
                              </td>
                              <td>
                                <input
                                  className="order-lines-input"
                                  type="date"
                                  value={line.startDate}
                                  onChange={(e) =>
                                    setOrderLines((s) =>
                                      s.map((x) =>
                                        x.lineId === line.lineId ? { ...x, startDate: e.target.value } : x
                                      )
                                    )
                                  }
                                />
                              </td>
                              <td>
                                <input
                                  className="order-lines-input"
                                  type="date"
                                  value={line.endDate}
                                  onChange={(e) =>
                                    setOrderLines((s) =>
                                      s.map((x) =>
                                        x.lineId === line.lineId ? { ...x, endDate: e.target.value } : x
                                      )
                                    )
                                  }
                                />
                              </td>
                              <td>
                                <input
                                  className="order-lines-input"
                                  value={line.contract}
                                  onChange={(e) =>
                                    setOrderLines((s) =>
                                      s.map((x) =>
                                        x.lineId === line.lineId ? { ...x, contract: e.target.value } : x
                                      )
                                    )
                                  }
                                />
                              </td>
                              <td>
                                <input
                                  className="order-lines-input"
                                  inputMode="numeric"
                                  value={line.dailyUnitPrice}
                                  onChange={(e) =>
                                    setOrderLines((s) =>
                                      s.map((x) =>
                                        x.lineId === line.lineId ? { ...x, dailyUnitPrice: e.target.value } : x
                                      )
                                    )
                                  }
                                />
                              </td>
                              <td>
                                <input
                                  className="order-lines-input"
                                  inputMode="numeric"
                                  value={line.monthlyUnitPrice}
                                  onChange={(e) =>
                                    setOrderLines((s) =>
                                      s.map((x) =>
                                        x.lineId === line.lineId ? { ...x, monthlyUnitPrice: e.target.value } : x
                                      )
                                    )
                                  }
                                />
                              </td>
                              <td>
                                <input
                                  className="order-lines-input"
                                  inputMode="numeric"
                                  value={line.split}
                                  onChange={(e) =>
                                    setOrderLines((s) =>
                                      s.map((x) =>
                                        x.lineId === line.lineId ? { ...x, split: e.target.value } : x
                                      )
                                    )
                                  }
                                />
                              </td>
                              <td>
                                <button
                                  className="button ghost"
                                  type="button"
                                  aria-label="行を削除"
                                  onClick={() => setOrderLines((s) => s.filter((x) => x.lineId !== line.lineId))}
                                  style={{ padding: "4px 8px", borderRadius: 8 }}
                                >
                                  ×
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="order-demo-form" style={{ marginTop: 8 }}>
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
                        <button
                          className="button"
                          type="button"
                          onClick={() => setOrderLines((s) => [...s, createInitialOrderLine()])}
                        >
                          商品追加
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
        {feature.key === "orders" && showPickupSearchModal && (
          <div className="modal-overlay" role="dialog" aria-modal="true">
            <div className="modal">
              <div className="modal-header">
                <h3 style={{ margin: 0 }}>
                  引取受注作成：{pickupSearchShowResults ? "検索結果" : "検索条件"}（デモ）
                </h3>
                <button
                  className="button ghost"
                  type="button"
                  onClick={() => {
                    setShowPickupSearchModal(false);
                    setPickupSearchShowResults(false);
                    setPickupMachineSelectedIds([]);
                  }}
                >
                  閉じる
                </button>
              </div>
              <div className="modal-body">
                {!pickupSearchShowResults && (
                  <>
                    <p style={{ marginTop: 0, marginBottom: 8, color: "#475569", fontSize: 12, lineHeight: 1.35 }}>
                      検索条件を入力し「検索」を押すと、検索結果画面（左右分割）が表示されます（実データ連携は未実装）。
                    </p>
                    <div className="filter-bar multi" style={{ marginTop: 0 }}>
                      <div className="filter-group">
                        <label>得意先名</label>
                        <input
                          className="filter-input"
                          placeholder="例) ABC建設"
                          value={pickupSearchForm.customerName}
                          onChange={(e) => setPickupSearchForm((s) => ({ ...s, customerName: e.target.value }))}
                        />
                      </div>
                      <div className="filter-group">
                        <label>現場</label>
                        <input
                          className="filter-input"
                          placeholder="例) 高速道路改修A"
                          value={pickupSearchForm.siteName}
                          onChange={(e) => setPickupSearchForm((s) => ({ ...s, siteName: e.target.value }))}
                        />
                      </div>
                      <div className="filter-group">
                        <label>種類</label>
                        <input
                          className="filter-input"
                          placeholder="例) 建機"
                          value={pickupSearchForm.kind}
                          onChange={(e) => setPickupSearchForm((s) => ({ ...s, kind: e.target.value }))}
                        />
                      </div>
                      <div className="filter-group">
                        <label>種別</label>
                        <input
                          className="filter-input"
                          placeholder="例) 油圧ショベル"
                          value={pickupSearchForm.type}
                          onChange={(e) => setPickupSearchForm((s) => ({ ...s, type: e.target.value }))}
                        />
                      </div>
                      <div className="filter-group">
                        <label>工事名</label>
                        <input
                          className="filter-input"
                          placeholder="例) ○○工事"
                          value={pickupSearchForm.constructionName}
                          onChange={(e) => setPickupSearchForm((s) => ({ ...s, constructionName: e.target.value }))}
                        />
                      </div>
                      <div className="filter-group">
                        <label>住所</label>
                        <input
                          className="filter-input"
                          placeholder="例) 東京都○○"
                          value={pickupSearchForm.address}
                          onChange={(e) => setPickupSearchForm((s) => ({ ...s, address: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                      <button
                        className="button primary"
                        type="button"
                        onClick={() => {
                          setPickupSearchShowResults(true);
                          setPickupMachineSelectedIds([]);
                        }}
                      >
                        検索
                      </button>
                      <button
                        className="button"
                        type="button"
                        onClick={() => {
                          setPickupSearchForm({ ...initialPickupOrderSearchForm });
                          setPickupSearchShowResults(false);
                          setPickupMachineSelectedIds([]);
                        }}
                      >
                        クリア
                      </button>
                    </div>
                  </>
                )}

                {pickupSearchShowResults && (
                  <div className="pickup-results-root" style={{ marginTop: 4 }}>
                    <div className="pickup-results-toolbar">
                      <div style={{ color: "#64748b", fontSize: 12 }}>
                        対象 {filteredPickupMachines.length}件 / 選択 {pickupMachineSelectedIds.length}件
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button className="button" type="button" onClick={() => setPickupSearchShowResults(false)}>
                          条件に戻る
                        </button>
                        <button
                          className="button primary"
                          type="button"
                          disabled={pickupMachineSelectedIds.length === 0}
                          onClick={() => {
                            const selected = filteredPickupMachines.filter((x) =>
                              pickupMachineSelectedIds.includes(x.id)
                            );
                            const first = selected[0];
                            setPendingPickupCreate({
                              orderDemoPatch: {
                                orderTaker: first?.salesRep ?? "",
                                customer: first?.customerName ?? "",
                                siteName: first?.siteName ?? "",
                                siteAddress: first?.address ?? "",
                                constructionName: first?.constructionName ?? ""
                              },
                              orderLines: buildOrderLinesFromSelectedMachines(selected)
                            });
                            setShowPickupSearchModal(false);
                            setPickupSearchShowResults(false);
                            setPickupMachineSelectedIds([]);
                            setOrderCreateType("引取");
                          }}
                        >
                          引取受注作成
                        </button>
                      </div>
                    </div>

                    <div className="pickup-results-split" aria-label="検索結果（左右分割）">
                      <div className="pickup-results-panel">
                        <div className="pickup-results-title">出庫中の機械</div>
                        <div className="table-container">
                          <table>
                            <thead>
                              <tr>
                                <th>機械</th>
                                <th>現場</th>
                                <th>出庫開始日</th>
                              </tr>
                            </thead>
                            <tbody>
                              {pickupOutboundMachines.length === 0 && (
                                <tr>
                                  <td colSpan={3} style={{ color: "#64748b" }}>
                                    該当なし
                                  </td>
                                </tr>
                              )}
                              {pickupOutboundMachines.map((m) => {
                                const checked = pickupMachineSelectedIds.includes(m.id);
                                return (
                                  <tr key={m.id}>
                                    <td>
                                      <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                                        <input
                                          type="checkbox"
                                          checked={checked}
                                          onChange={() => togglePickupMachine(m.id)}
                                        />
                                        <span style={{ fontWeight: 700 }}>{m.machineName}</span>
                                      </label>
                                    </td>
                                    <td>{m.siteName}</td>
                                    <td>{m.outboundStartDate}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="pickup-results-panel">
                        <div className="pickup-results-title">受注中の機械</div>
                        <div className="table-container">
                          <table>
                            <thead>
                              <tr>
                                <th>機械</th>
                                <th>現場</th>
                                <th>出庫開始日</th>
                              </tr>
                            </thead>
                            <tbody>
                              {pickupOrderedMachines.length === 0 && (
                                <tr>
                                  <td colSpan={3} style={{ color: "#64748b" }}>
                                    該当なし
                                  </td>
                                </tr>
                              )}
                              {pickupOrderedMachines.map((m) => {
                                const checked = pickupMachineSelectedIds.includes(m.id);
                                return (
                                  <tr key={m.id}>
                                    <td>
                                      <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                                        <input
                                          type="checkbox"
                                          checked={checked}
                                          onChange={() => togglePickupMachine(m.id)}
                                        />
                                        <span style={{ fontWeight: 700 }}>{m.machineName}</span>
                                      </label>
                                    </td>
                                    <td>{m.siteName}</td>
                                    <td>{m.outboundStartDate}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  className="button"
                  type="button"
                  onClick={() => {
                    setShowPickupSearchModal(false);
                    setPickupSearchShowResults(false);
                    setPickupMachineSelectedIds([]);
                  }}
                >
                  閉じる
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

