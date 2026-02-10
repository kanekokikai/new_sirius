import { useMemo, useState, useEffect, useRef } from "react";
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
import {
  loadInboundDraft,
  loadInboundRows,
  loadPickupDraft,
  loadPickupRows,
  clearInboundPersisted,
  saveInboundDraft,
  saveInboundRows,
  savePickupDraft,
  savePickupRows,
  InboundDraft,
  PickupDraft
} from "../data/ordersLocalDb";
import { InboundPdfTable } from "../components/InboundPdfTable";
import { LocationChangeModal } from "../components/LocationChangeModal";
import { locationMasterMock } from "../data/locationMasterMock";
import { MachineTypeChangeModal } from "../components/MachineTypeChangeModal";
import { PickupOrdersMachineSelectModal } from "../components/PickupOrdersMachineSelectModal";
import { MachineNoEditModal } from "../components/MachineNoEditModal";
import { SimpleValueEditModal } from "../components/SimpleValueEditModal";
import { InstructionNoteEditModal } from "../components/InstructionNoteEditModal";
import { DriverAssignModal, driverAssignParseFromCell } from "../components/DriverAssignModal";
import { SiteEditModal } from "../components/SiteEditModal";
import { TimeRangeEditModal } from "../components/TimeRangeEditModal";
import { FactoryNoteEditModal } from "../components/FactoryNoteEditModal";
import { TransportFeeEditModal } from "../components/TransportFeeEditModal";
import { VehicleSizeEditModal } from "../components/VehicleSizeEditModal";
import { MoveOrdersResultsTable } from "../components/MoveOrdersResultsTable";
import {
  machineNoOptions,
  vehicleSizeOptions,
  wreckerOptions
} from "../data/inboundEditMock";
import { siteMasterMock } from "../data/siteMasterMock";
import {
  machineCategoryMasterMock,
  machineKindMasterMock,
  machineTypeByMachineNameMock
} from "../data/machineTypeMasterMock";
import { pickupOrdersMachineSelectMock } from "../data/pickupOrdersMachineSelectMock";
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
  customerId: "",
  customerName: "",
  siteId: "",
  siteName: "",
  kinds: [],
  kindId: "",
  typeId: "",
  machineNo: "",
  arrangement: "all",
  arrangementPartnerId: "",
  transport: "all",
  transportAssigneeCode: ""
};

type OrdersSearchPersistedState = {
  v: 1;
  filter: OrdersFilter;
  showResults: boolean;
  savedAt: number;
};

const ORDERS_SEARCH_STORAGE_PREFIX = "demo.orders.searchState.";

const normalizeOrdersFilter = (input: unknown): OrdersFilter => {
  const obj = (input ?? {}) as Partial<OrdersFilter>;
  return {
    ...initialOrdersFilter,
    ...obj,
    kinds: Array.isArray(obj.kinds) ? obj.kinds.filter((x) => typeof x === "string") : []
  };
};

const loadOrdersSearchState = (dept: string): OrdersSearchPersistedState | null => {
  try {
    const raw = sessionStorage.getItem(`${ORDERS_SEARCH_STORAGE_PREFIX}${dept}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<OrdersSearchPersistedState>;
    if (parsed.v !== 1) return null;
    return {
      v: 1,
      filter: normalizeOrdersFilter(parsed.filter),
      showResults: Boolean(parsed.showResults),
      savedAt: typeof parsed.savedAt === "number" ? parsed.savedAt : Date.now()
    };
  } catch {
    return null;
  }
};

const saveOrdersSearchState = (dept: string, next: OrdersSearchPersistedState) => {
  try {
    sessionStorage.setItem(`${ORDERS_SEARCH_STORAGE_PREFIX}${dept}`, JSON.stringify(next));
  } catch {
    // ignore
  }
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
  const [pickupSearchMode, setPickupSearchMode] = useState<"create" | "append">("create");
  const [pickupSearchForm, setPickupSearchForm] = useState<PickupOrderSearchForm>(
    initialPickupOrderSearchForm
  );
  const [pickupSearchShowResults, setPickupSearchShowResults] = useState(false);
  const [pickupMachineSelectedIds, setPickupMachineSelectedIds] = useState<string[]>([]);
  const [pendingPickupCreate, setPendingPickupCreate] = useState<{
    orderDemoPatch: Partial<OrderDemoForm>;
    orderLines: OrderLine[];
  } | null>(null);
  const [pendingOrderDetailOpen, setPendingOrderDetailOpen] = useState<{
    orderCreateType: OrderCreateType;
    orderDemoPatch: Partial<OrderDemoForm>;
    orderLines: OrderLine[];
  } | null>(null);
  const [orderTakerModalOpen, setOrderTakerModalOpen] = useState(false);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [constructionModalOpen, setConstructionModalOpen] = useState(false);
  const [orderHeaderSiteModalOpen, setOrderHeaderSiteModalOpen] = useState(false);

  // 搬入の受注検索結果（PDF再現テーブル）: デモ用に行データをstateで持ち、場所変更を反映できるようにする
  const [inboundRows, setInboundRows] = useState<string[][]>(() => loadInboundRows(inboundOrderSearchRawRows));
  // 引取の受注検索結果（PDF再現テーブル）: デモ用に行データをstateで持ち、編集を反映できるようにする
  const [pickupRows, setPickupRows] = useState<string[][]>(() => loadPickupRows(pickupOrderSearchRawRows));
  const [ordersPdfEditingKind, setOrdersPdfEditingKind] = useState<"搬入" | "引取">("搬入");
  const [ordersPdfEditingScope, setOrdersPdfEditingScope] = useState<"results" | "draft">("results");
  const [ordersPdfSort, setOrdersPdfSort] = useState<{ colIndex: number; direction: "asc" | "desc" } | null>(null);

  // 新規登録エリア（搬入のデモ用バッファ）: ここに入力→ドラッグ&ドロップで検索結果へ反映
  const [inboundDraft, setInboundDraft] = useState<InboundDraft | null>(() => loadInboundDraft());
  // 新規登録エリア（引取のデモ用バッファ）
  const [pickupDraft, setPickupDraft] = useState<PickupDraft | null>(() => loadPickupDraft());
  // ドラッグ中の新規登録エリア種別（表へドロップで追加）
  const [draggingDraftKind, setDraggingDraftKind] = useState<"搬入" | "引取" | null>(null);
  const [isDragOverOrdersTable, setIsDragOverOrdersTable] = useState(false);

  // トースト（簡易）
  const [ordersToast, setOrdersToast] = useState<{ message: string; variant: "success" | "warn" } | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  // 追加アニメ/ハイライト対象（sourceRowIndex のレンジ）
  const [inboundInsertAnimRange, setInboundInsertAnimRange] = useState<{ start: number; end: number } | null>(null);
  const [inboundHighlightRange, setInboundHighlightRange] = useState<{ start: number; end: number } | null>(null);
  const [pickupInsertAnimRange, setPickupInsertAnimRange] = useState<{ start: number; end: number } | null>(null);
  const [pickupHighlightRange, setPickupHighlightRange] = useState<{ start: number; end: number } | null>(null);

  // 「+ 新規受注登録」モーダル
  const [newInboundModalOpen, setNewInboundModalOpen] = useState(false);
  const [newInboundDate, setNewInboundDate] = useState("");
  const [newInboundCompanyName, setNewInboundCompanyName] = useState("");
  const [newInboundErrors, setNewInboundErrors] = useState<{ inboundDate?: string; companyName?: string }>({});

  const [newPickupModalOpen, setNewPickupModalOpen] = useState(false);
  const [newPickupDate, setNewPickupDate] = useState("");
  const [newPickupCompanyName, setNewPickupCompanyName] = useState("");
  const [newPickupErrors, setNewPickupErrors] = useState<{ pickupDate?: string; companyName?: string }>({});

  // 「払出」確認モーダル
  const [issueSlipConfirmOpen, setIssueSlipConfirmOpen] = useState(false);
  const [issueSlipTargetRow, setIssueSlipTargetRow] = useState<number | null>(null);
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

  const ordersSearchRestoreKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (feature?.key !== "orders") return;
    const restoreKey = `${activeDepartment}`;
    if (ordersSearchRestoreKeyRef.current === restoreKey) return;
    ordersSearchRestoreKeyRef.current = restoreKey;

    // Prefer URL state if present (supports refresh/back).
    const qs = new URLSearchParams(location.search);
    const rawFilter = qs.get("ordersFilter");
    const rawShow = qs.get("ordersResults");
    if (rawFilter || rawShow) {
      if (rawFilter) {
        try {
          setOrdersFilter(normalizeOrdersFilter(JSON.parse(rawFilter)));
        } catch {
          setOrdersFilter(initialOrdersFilter);
        }
      }
      if (rawShow != null) setShowOrdersResults(rawShow === "1");
      return;
    }

    // Fallback to persisted state (supports navigating away and coming back via a clean link).
    const persisted = loadOrdersSearchState(activeDepartment);
    if (!persisted) return;
    setOrdersFilter(persisted.filter);
    setShowOrdersResults(persisted.showResults);
  }, [activeDepartment, feature?.key, location.search]);

  useEffect(() => {
    if (feature?.key !== "orders") return;
    saveOrdersSearchState(activeDepartment, {
      v: 1,
      filter: ordersFilter,
      showResults: showOrdersResults,
      savedAt: Date.now()
    });

    // Mirror to URL (replace) so back/refresh restores without relying on storage.
    const qs = new URLSearchParams(location.search);
    const isDefaultFilter = JSON.stringify(ordersFilter) === JSON.stringify(initialOrdersFilter);
    if (!isDefaultFilter) qs.set("ordersFilter", JSON.stringify(ordersFilter));
    else qs.delete("ordersFilter");
    if (showOrdersResults) qs.set("ordersResults", "1");
    else qs.delete("ordersResults");

    const nextSearch = qs.toString();
    const next = nextSearch ? `?${nextSearch}` : "";
    if (next !== location.search) {
      navigate({ pathname: location.pathname, search: next }, { replace: true });
    }
  }, [activeDepartment, feature?.key, location.pathname, location.search, navigate, ordersFilter, showOrdersResults]);

  useEffect(() => {
    saveInboundRows(inboundRows);
    // Notify other pages (e.g. truck plan) to re-merge inbound assignments immediately.
    window.dispatchEvent(new CustomEvent("demo:inboundRowsUpdated"));
  }, [inboundRows]);

  useEffect(() => {
    savePickupRows(pickupRows);
    // Notify other pages (e.g. dispatch instruction) to refresh immediately.
    window.dispatchEvent(new CustomEvent("demo:pickupRowsUpdated"));
  }, [pickupRows]);

  // Hotfix: 過去のバグで「機械名」列に "1" が入ってしまった不正行を自動で削除する
  // - 典型パターン: 機械名="1", 数量が空（古い列ズレ実装による）
  useEffect(() => {
    setPickupRows((prev) => {
      const cleaned = prev.filter((r) => {
        const machine = String(r?.[COL.machine] ?? "").trim();
        const qty = String(r?.[COL.quantity] ?? "").trim();
        if (machine === "1" && !qty) return false;
        return true;
      });
      return cleaned.length === prev.length ? prev : cleaned;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    saveInboundDraft(inboundDraft);
    // Used for date gating of the merge (truck plan only merges when dates match).
    window.dispatchEvent(new CustomEvent("demo:inboundDraftUpdated"));
  }, [inboundDraft]);

  useEffect(() => {
    savePickupDraft(pickupDraft);
  }, [pickupDraft]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current != null) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  const showToast = (message: string, variant: "success" | "warn", durationMs: number) => {
    setOrdersToast({ message, variant });
    if (toastTimerRef.current != null) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setOrdersToast(null), durationMs);
  };

  const closeOrdersDetailRelatedModals = () => {
    // 払出確認
    setIssueSlipConfirmOpen(false);
    setIssueSlipTargetRow(null);

    // テーブル編集系モーダル
    setLocationModalOpen(false);
    setLocationModalTargetRow(null);
    setLocationModalInitial({});

    setMachineTypeModalOpen(false);
    setMachineTypeTargetRow(null);
    setMachineTypeInitial({});
    setMachineTypeDisableAddProduct(false);
    setMachineTypeInitialQuantity("");

    setPickupOrdersMachineModalOpen(false);
    setPickupOrdersMachineTargetRow(null);
    setPickupOrdersMachineInitialSelectedIds([]);
    setPickupOrdersMachineInitialInstructionNote("");
    setPickupOrdersMachineInTableNames([]);
    setPickupOrdersMachineSelectedFallbackNames([]);
    setPickupOrdersMachinePinnedId("");
    setPickupOrdersMachinePinnedName("");
    setPickupOrdersMachineContext({});

    setInstructionNoteModalOpen(false);
    setInstructionNoteTargetRow(null);
    setInstructionNoteInitial("");

    setMachineNoModalOpen(false);
    setMachineNoTargetRow(null);
    setMachineNoInitial("");

    setOrderStatusModalOpen(false);
    setOrderStatusTargetRow(null);
    setOrderStatusInitial("予約");

    setQuantityModalOpen(false);
    setQuantityTargetRow(null);
    setQuantityInitial("");

    setVehicleModalOpen(false);
    setVehicleTargetRow(null);
    setVehicleInitial("");

    setWreckerModalOpen(false);
    setWreckerTargetRow(null);
    setWreckerInitial("");

    setDriverModalOpen(false);
    setDriverTargetRow(null);
    setDriverInitial({});

    setSiteModalOpen(false);
    setSiteTargetRow(null);
    setSiteInitial({});

    setTimeModalOpen(false);
    setTimeTargetRow(null);
    setTimeInitial("");

    setFactoryNoteModalOpen(false);
    setFactoryNoteTargetRow(null);
    setFactoryNoteInitial("");

    setTransportFeeModalOpen(false);
    setTransportFeeTargetRow(null);
    setTransportFeeInitial("");
  };

  const [machineTypeModalOpen, setMachineTypeModalOpen] = useState(false);
  const [machineTypeTargetRow, setMachineTypeTargetRow] = useState<number | null>(null);
  const [machineTypeInitial, setMachineTypeInitial] = useState<{ kindId?: string; categoryId?: string }>({});
  const [machineTypeDisableAddProduct, setMachineTypeDisableAddProduct] = useState(false);
  const [machineTypeInitialQuantity, setMachineTypeInitialQuantity] = useState("");

  // 引取受注: 機械名ダブルクリック時の「出庫中一覧 / 受注一覧」モーダル（デモ）
  const [pickupOrdersMachineModalOpen, setPickupOrdersMachineModalOpen] = useState(false);
  const [pickupOrdersMachineTargetRow, setPickupOrdersMachineTargetRow] = useState<number | null>(null);
  const [pickupOrdersMachineInitialSelectedIds, setPickupOrdersMachineInitialSelectedIds] = useState<string[]>([]);
  const [pickupOrdersMachineInitialInstructionNote, setPickupOrdersMachineInitialInstructionNote] = useState<string>("");
  const [pickupOrdersMachineInTableNames, setPickupOrdersMachineInTableNames] = useState<string[]>([]);
  const [pickupOrdersMachineSelectedFallbackNames, setPickupOrdersMachineSelectedFallbackNames] = useState<string[]>([]);
  const [pickupOrdersMachinePinnedId, setPickupOrdersMachinePinnedId] = useState<string>("");
  const [pickupOrdersMachinePinnedName, setPickupOrdersMachinePinnedName] = useState<string>("");
  const [pickupOrdersMachineContext, setPickupOrdersMachineContext] = useState<{
    customerName?: string;
    siteName?: string;
  }>({});

  const [instructionNoteModalOpen, setInstructionNoteModalOpen] = useState(false);
  const [instructionNoteTargetRow, setInstructionNoteTargetRow] = useState<number | null>(null);
  const [instructionNoteInitial, setInstructionNoteInitial] = useState<string>("");

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

  const [orderStatusModalOpen, setOrderStatusModalOpen] = useState(false);
  const [orderStatusTargetRow, setOrderStatusTargetRow] = useState<number | null>(null);
  const [orderStatusInitial, setOrderStatusInitial] = useState<OrderStatusSelectable>("予約");

  const [driverModalOpen, setDriverModalOpen] = useState(false);
  const [driverTargetRow, setDriverTargetRow] = useState<number | null>(null);
  const [driverInitial, setDriverInitial] = useState<{
    kind?: "選択無し" | "自社" | "外注" | "先方";
    driverName?: string;
    id?: string;
  }>({});

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

  const parseYmdToUtcMs = (raw: string): number | null => {
    const v = (raw ?? "").trim();
    const m = v.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (!m) return null;
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
    return Date.UTC(y, mo - 1, d);
  };

  const formatUsagePeriodCell = (valueRaw: string): string => {
    const value = String(valueRaw ?? "").trim();
    if (!value) return "";
    if (value.includes("日間")) return value;

    // expected: "YYYY-MM-DD～YYYY-MM-DD" (also accept 〜/~ or /)
    const normalized = value.replace(/[〜～]/g, "~");
    const [startRaw, endRaw] = normalized.split("~").map((x) => x?.trim() ?? "");
    const startMs = parseYmdToUtcMs(startRaw);
    const endMs = parseYmdToUtcMs(endRaw || startRaw);
    if (startMs == null || endMs == null) return value;
    const diffDays = Math.floor((endMs - startMs) / (24 * 60 * 60 * 1000));
    const days = Math.max(1, diffDays + 1); // inclusive
    return `${days}日間`;
  };

  const COL = {
    issue: 0, // 払出（ボタン）
    status: 1, // 状態（予約/確定/払出済/キャンセル/破棄）
    groupNo: 2, // 件数（グループ番号: UIで採番）
    usagePeriod: 3, // 使用期間
    location: 4, // 場所
    machine: 5, // 機械名
    machineNo: 6, // No.
    quantity: 7, // 数量
    vehicle: 8, // 車輛
    wrecker: 9, // ﾚｯｶｰ
    driver: 10, // 運転手
    customer: 11, // 会社名
    site: 12, // 現場
    time: 13, // 時間
    note: 14, // 備考
    hour: 15, // アワー
    transportFee: 16 // 回送費
  } as const;

  type OrderStatus = "予約" | "確定" | "払出済" | "キャンセル" | "破棄";
  type OrderStatusSelectable = Exclude<OrderStatus, "払出済">;
  const orderStatusOptions: readonly OrderStatusSelectable[] = ["予約", "確定", "キャンセル", "破棄"] as const;

  const statusToSymbolAndColor = (statusRaw: string): { symbol: string; color: string } => {
    const status = (statusRaw ?? "").trim() as OrderStatus;
    if (status === "予約") return { symbol: "▲", color: "#f59e0b" }; // yellow
    if (status === "確定") return { symbol: "●", color: "#2563eb" }; // blue
    if (status === "払出済") return { symbol: "■", color: "#16a34a" }; // green
    if (status === "キャンセル") return { symbol: "×", color: "#7f1d1d" }; // blood red
    if (status === "破棄") return { symbol: "×", color: "#0f172a" }; // black-ish
    return { symbol: "", color: "#475569" };
  };

  const isPdfGroupStartRow = (row?: string[]) => {
    if (!row) return false;
    // NOTE: 受注検索結果（PDF再現）は「場所」列をグループ開始の基準にする
    // （番号/連番は表示順にUI側で自動採番するため、ここでは参照しない）
    return (row[COL.location] ?? "").trim().length > 0;
  };

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
          .map((r) => (r?.[COL.time] ?? "").trim())
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

  const formatProductNameForDisplay = (value: string): string => {
    const raw = String(value ?? "");
    const trimmed = raw.trim();
    if (!trimmed) return "";
    // 指示備考行（※...）は全文表示
    if (trimmed.startsWith("※")) return raw;
    // 「商品名\n種類ID:...\n種別ID:...」のような形式は先頭行（商品名）だけ表示
    const firstLine = raw.split("\n")[0] ?? "";
    return firstLine.trim();
  };

  const insertOrdersPdfRowsAfterDisplayRow = (displayRowIndex: number, newRows: string[][]) => {
    const ref = ordersPdfDisplaySorted.rowRefs[displayRowIndex];
    if (!ref) return;
    if (ref.kind === "引取") {
      setPickupRows((prev) => {
        const next = [...prev];
        next.splice(ref.sourceRowIndex + 1, 0, ...newRows);
        return next;
      });
      return;
    }
    setInboundRows((prev) => {
      const next = [...prev];
      next.splice(ref.sourceRowIndex + 1, 0, ...newRows);
      return next;
    });
  };

  const normalizeInstructionNoteForCell = (v: string): string => {
    const trimmed = (v ?? "").trim();
    if (!trimmed) return "";
    return trimmed.startsWith("※") ? trimmed : `※${trimmed}`;
  };

  const isInstructionNoteRow = (row: string[] | undefined): boolean => {
    if (!row) return false;
    return (
      (row[COL.groupNo] ?? "").trim() === "" &&
      (row[COL.location] ?? "").trim() === "" &&
      (row[COL.machine] ?? "").trim().startsWith("※")
    );
  };

  const parseSiteFromCell = (value: string): { siteId?: string; siteName?: string } => {
    const v = (value ?? "").trim();
    // 例: "港北区東神奈川（S-0004）"
    const m = v.match(/^(.+?)（(.+?)）$/);
    if (m) return { siteName: m[1], siteId: m[2] };
    return { siteName: v || undefined };
  };

  const normalizeCustomerNameFromCell = (value: string) => {
    const v = String(value ?? "").trim();
    if (!v) return "";
    // 例: "正栄工業\n20箱" のようなケースは先頭行だけを得意先名として扱う（デモ）
    const firstLine = v.split("\n")[0]?.trim() ?? "";
    // 例: "ジャパンバイル 東京" / "正栄工業 20箱" のようなケースは先頭トークンだけを得意先名として扱う（デモ）
    return firstLine.split(/\s+/)[0]?.trim() ?? "";
  };

  const parseMachineNamesFromCell = (value: string) => {
    const v = String(value ?? "");
    return v
      .split("\n")
      .map((x) => x.trim())
      .filter((x) => Boolean(x) && !x.startsWith("※"));
  };

  const getOrdersPdfGroupStartDisplayRow = (shownRows: string[][], displayRowIndex: number) => {
    let i = Math.max(0, Math.min(displayRowIndex, shownRows.length - 1));
    while (i > 0 && !isPdfGroupStartRow(shownRows[i])) i -= 1;
    return i;
  };

  const getOrdersPdfMergedValueInGroup = (shownRows: string[][], groupStartDisplayRow: number, colIndex: number) => {
    // groupStart row の値が空の場合もあるため、グループ内で「空でない最初の値」を探す（デモ）
    for (let i = groupStartDisplayRow; i < shownRows.length; i += 1) {
      if (i !== groupStartDisplayRow && isPdfGroupStartRow(shownRows[i])) break;
      const v = String(shownRows[i]?.[colIndex] ?? "").trim();
      if (v) return v;
    }
    return "";
  };

  const navigateToInboundOrderDetail = (args: { scope: "results" | "draft"; kind: "搬入" | "引取"; rowIndex: number }) => {
    closeOrdersDetailRelatedModals();
    const { scope, kind, rowIndex } = args;
    const shownRows =
      scope === "draft"
        ? kind === "引取"
          ? (pickupDraft?.rows ?? [])
          : (inboundDraft?.rows ?? [])
        : ordersPdfShownRows;
    if (!shownRows[rowIndex]) return;

    const groupStart = getOrdersPdfGroupStartDisplayRow(shownRows, rowIndex);
    let groupEnd = groupStart + 1;
    while (groupEnd < shownRows.length && !isPdfGroupStartRow(shownRows[groupEnd])) groupEnd += 1;

    const groupNo = String(shownRows[groupStart]?.[COL.groupNo] ?? "").trim();
    const locationCell = getOrdersPdfMergedValueInGroup(shownRows, groupStart, COL.location);
    const customerCell = getOrdersPdfMergedValueInGroup(shownRows, groupStart, COL.customer);
    const siteCell = getOrdersPdfMergedValueInGroup(shownRows, groupStart, COL.site);
    const timeCell = getOrdersPdfMergedValueInGroup(shownRows, groupStart, COL.time);
    const driverCell = getOrdersPdfMergedValueInGroup(shownRows, groupStart, COL.driver);

    const items: Array<{ machineName: string; machineNo: string; quantity: string }> = [];
    for (let i = groupStart; i < groupEnd; i += 1) {
      const r = shownRows[i] ?? [];
      if (isInstructionNoteRow(r)) continue;
      const machineName = String(r[COL.machine] ?? "").trim();
      if (!machineName) continue;
      if (machineName.startsWith("※")) continue;
      items.push({
        machineName,
        machineNo: String(r[COL.machineNo] ?? "").trim(),
        quantity: String(r[COL.quantity] ?? "").trim()
      });
    }

    openOrderCreatePrefilledInNewTab({
      kind,
      groupNo,
      location: String(locationCell ?? "").trim(),
      customer: String(customerCell ?? "").trim(),
      site: String(siteCell ?? "").trim(),
      time: String(timeCell ?? "").trim(),
      driver: String(driverCell ?? "").trim(),
      items
    });
  };

  type OrderDemoForm = {
    status: "受付" | "手配中" | "完了" | "キャンセル";
    orderNo: string; // 自動入力（デモ）
    inboundDate: string; // 引取日（デモ内では搬入/移動も共通で利用）
    endDate: string;
    inboundTimeFrom: string; // 引取時間 開始
    inboundTimeTo: string; // 引取時間 終了

    orderTaker: string; // 受注者（選択/検索）
    inputer: string; // 入力者（自動入力）

    transportDivision: "回送" | "自社" | "外注" | "";
    transportBase: "本社" | "支店" | "ヤード" | "";

    customerCode: string; // 取引先コード（選択/検索）
    customerName: string; // 取引先（選択/検索）

    referenceLink: string; // 参考資料リンク

    siteCode: string; // 現場コード（選択/検索）
    siteName: string; // 現場（選択/検索）
    constructionName: string; // 工事名（選択/検索）
    siteAddress: string; // 住所（自動入力）

    hasVehicle: boolean; // 車両（チェックボックス）
    vehicleInfo: string; // 車両指定車情報

    wrecker: string; // レッカー（プルダウン）

    pickupPlannedDate: string; // 引取予定日
    pickupConfirmed: boolean; // 引取確定

    useDays: string;
    orderer: string;

    siteContactName: string; // 現地連絡先（名前）
    siteContactTel: string; // 現地連絡先（電話番号）自動入力（デモ）

    transportFeeVehicleSize: string;
    transportFeeAddress: string;
    transportFeeAmount: string;

    noteFront: string;
    noteFactory: string;
    noteDriver: string;

    createdAt: string; // 自動入力（デモ）
    updatedAt: string; // 自動入力（デモ）
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

  const formatNow = () => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(
      d.getMinutes()
    )}`;
  };

  const createDemoOrderNo = () => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const ymd = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
    const hm = `${pad(d.getHours())}${pad(d.getMinutes())}`;
    return `D-${ymd}-${hm}`;
  };

  const createInitialOrderDemoForm = (): OrderDemoForm => {
    const now = formatNow();
    return {
      status: "受付",
      orderNo: createDemoOrderNo(),
      inboundDate: "",
      endDate: "",
      inboundTimeFrom: "",
      inboundTimeTo: "",
      orderTaker: "",
      inputer: user?.userName ?? "",
      transportDivision: "回送",
      transportBase: "本社",
      customerCode: "",
      customerName: "",
      referenceLink: "",
      siteCode: "",
      siteName: "",
      constructionName: "",
      siteAddress: "",
      hasVehicle: false,
      vehicleInfo: "",
      wrecker: "",
      pickupPlannedDate: "",
      pickupConfirmed: false,
      useDays: "",
      orderer: "",
      siteContactName: "",
      siteContactTel: "",
      transportFeeVehicleSize: "",
      transportFeeAddress: "",
      transportFeeAmount: "",
      noteFront: "",
      noteFactory: "",
      noteDriver: "",
      createdAt: now,
      updatedAt: now
    };
  };

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
  const patchOrderDemo = (patch: Partial<OrderDemoForm>) =>
    setOrderDemo((s) => ({ ...s, ...patch, updatedAt: formatNow() }));

  const orderTakerOptions = useMemo(() => {
    const uniq = new Set<string>();
    pickupOrderSearchMock.forEach((x) => {
      if (x.salesRep?.trim()) uniq.add(x.salesRep.trim());
    });
    if (user?.userName?.trim()) uniq.add(user.userName.trim());
    return Array.from(uniq);
  }, [user?.userName]);

  const customerNameOptions = useMemo(() => {
    const uniq = new Set<string>();
    pickupOrderSearchMock.forEach((x) => {
      if (x.customerName?.trim()) uniq.add(x.customerName.trim());
    });
    return Array.from(uniq);
  }, []);

  const constructionNameOptions = useMemo(() => {
    const uniq = new Set<string>();
    pickupOrderSearchMock.forEach((x) => {
      if (x.constructionName?.trim()) uniq.add(x.constructionName.trim());
    });
    return Array.from(uniq);
  }, []);

  const createCustomerCode = (customerName: string) => {
    const normalized = customerName.trim();
    if (!normalized) return "";
    // デモ用に安定したコードを作る（マスター連携は未実装）
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) hash = (hash * 31 + normalized.charCodeAt(i)) >>> 0;
    const n = String(hash % 9000).padStart(4, "0");
    return `C-${n}`;
  };

  type OrderDetailPrefillPayload = {
    kind: "搬入" | "引取";
    groupNo: string;
    location: string;
    customer: string;
    site: string;
    time: string;
    driver: string;
    items: Array<{ machineName: string; machineNo: string; quantity: string }>;
  };

  const ORDER_DETAIL_PREFILL_PREFIX = "demo.orders.orderDetailPrefill.";

  const parseTimeRangeFromCell = (value: string): { from: string; to: string } => {
    const v = (value ?? "").trim();
    if (!v) return { from: "", to: "" };
    const matches = Array.from(v.matchAll(/(\d{1,2})\s*:\s*(\d{2})/g)).map((m) => {
      const hh = String(m[1]).padStart(2, "0");
      const mm = String(m[2]).padStart(2, "0");
      return `${hh}:${mm}`;
    });
    if (matches.length >= 2) return { from: matches[0] ?? "", to: matches[1] ?? "" };
    if (matches.length === 1) return { from: matches[0] ?? "", to: "" };
    return { from: "", to: "" };
  };

  const openOrderCreatePrefilledInNewTab = (payload: OrderDetailPrefillPayload) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    try {
      localStorage.setItem(`${ORDER_DETAIL_PREFILL_PREFIX}${id}`, JSON.stringify(payload));
    } catch {
      // ignore
    }
    const base = import.meta.env.BASE_URL === "/" ? "" : String(import.meta.env.BASE_URL ?? "").replace(/\/$/, "");
    const url = `${base}/feature/orders?dept=${encodeURIComponent(activeDepartment)}&orderDetailPrefill=${encodeURIComponent(id)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  useEffect(() => {
    if (feature?.key !== "orders") return;
    const qs = new URLSearchParams(location.search);
    const id = qs.get("orderDetailPrefill");
    if (!id) return;

    const raw = localStorage.getItem(`${ORDER_DETAIL_PREFILL_PREFIX}${id}`);
    if (!raw) return;
    let parsed: OrderDetailPrefillPayload | null = null;
    try {
      parsed = JSON.parse(raw) as OrderDetailPrefillPayload;
    } catch {
      parsed = null;
    }
    if (!parsed) return;
    try {
      localStorage.removeItem(`${ORDER_DETAIL_PREFILL_PREFIX}${id}`);
    } catch {
      // ignore
    }

    setShowOrdersResults(false);
    const siteParsed = parseSiteFromCell(parsed.site);
    const timeParsed = parseTimeRangeFromCell(parsed.time);
    const orderLinesPrefill: OrderLine[] = (parsed.items ?? []).map((it) => ({
      ...createInitialOrderLine(),
      productNo: String(it.machineNo ?? "").trim(),
      productName1: String(it.machineName ?? "").trim(),
      quantity: String(it.quantity ?? "").trim()
    }));

    setPendingOrderDetailOpen({
      orderCreateType: parsed.kind,
      orderDemoPatch: {
        customerName: String(parsed.customer ?? "").trim(),
        customerCode: createCustomerCode(String(parsed.customer ?? "").trim()),
        siteName: String(siteParsed.siteName ?? "").trim() || String(parsed.site ?? "").trim(),
        siteCode: String(siteParsed.siteId ?? "").trim(),
        inboundTimeFrom: timeParsed.from,
        inboundTimeTo: timeParsed.to,
        noteDriver: String(parsed.driver ?? "").trim()
      },
      orderLines: orderLinesPrefill
    });
    setOrderCreateType(parsed.kind);
  }, [feature?.key, location.search]);

  useEffect(() => {
    if (!orderCreateType) return;
    if (pendingPickupCreate) {
      setOrderDemo({ ...createInitialOrderDemoForm(), ...pendingPickupCreate.orderDemoPatch });
      setOrderLines(pendingPickupCreate.orderLines);
      setPendingPickupCreate(null);
      return;
    }
    if (pendingOrderDetailOpen) {
      setOrderDemo({ ...createInitialOrderDemoForm(), ...pendingOrderDetailOpen.orderDemoPatch });
      setOrderLines(pendingOrderDetailOpen.orderLines);
      setPendingOrderDetailOpen(null);
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
  const shouldShowMoveOrdersResult =
    feature.key === "orders" && ordersFilter.kinds.length === 1 && ordersFilter.kinds[0] === "移動";

  const hasInboundPdf = feature.key === "orders" && ordersFilter.kinds.includes("搬入");
  const hasPickupPdf = feature.key === "orders" && ordersFilter.kinds.includes("引取");
  const onlyInboundPickupKinds =
    feature.key === "orders" &&
    ordersFilter.kinds.length > 0 &&
    ordersFilter.kinds.every((k) => k === "搬入" || k === "引取");
  const shouldShowMixedOrdersPdfResult = feature.key === "orders" && onlyInboundPickupKinds && hasInboundPdf && hasPickupPdf;

  const shouldShowAnyOrdersPdfResult = shouldShowOrdersPdfResult || shouldShowMixedOrdersPdfResult;

  const ordersPdfTitleLabel = shouldShowMixedOrdersPdfResult ? "搬入＋引取" : ordersPdfKindLabel;

  // 引取だけ検索のときだけ「不足燃料」列を追加（回送費の右）
  const pickupOnlyOrdersPdfColumns = [...inboundOrderSearchColumns, "不足燃料"];
  const pickupOnlyOrdersPdfColWidths = [...inboundOrderSearchColWidths, "72px"];
  const ordersPdfColumns = shouldShowPickupOrdersPdfResult ? pickupOnlyOrdersPdfColumns : inboundOrderSearchColumns;
  const ordersPdfColWidths = shouldShowPickupOrdersPdfResult ? pickupOnlyOrdersPdfColWidths : inboundOrderSearchColWidths;

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
      const customerName = ordersFilter.customerName.trim();
      const customerId = ordersFilter.customerId.trim();
      const siteName = ordersFilter.siteName.trim();
      const siteId = ordersFilter.siteId.trim();
      const hasFilter = Boolean(customerName || customerId || siteName || siteId);
      if (!hasFilter) {
        return { rows: inboundRows, rowRefs: inboundRows.map((_, idx) => ({ kind: "搬入", sourceRowIndex: idx })) };
      }

      const nextRows: string[][] = [];
      const nextRefs: OrdersPdfRowRef[] = [];
      const groups = buildGroups(inboundRows, "搬入");

      const getFirstNonEmptyInGroup = (start: number, end: number, colIndex: number) => {
        for (let i = start; i < end; i += 1) {
          const v = String(inboundRows[i]?.[colIndex] ?? "").trim();
          if (v) return v;
        }
        return "";
      };

      for (const g of groups) {
        const customerCell = getFirstNonEmptyInGroup(g.startRowIndex, g.endRowIndex, COL.customer);
        const siteCell = getFirstNonEmptyInGroup(g.startRowIndex, g.endRowIndex, COL.site);
        const normalizedCustomer = normalizeCustomerNameFromCell(customerCell);
        const normalizedSite = parseSiteFromCell(siteCell).siteName ?? String(siteCell ?? "").trim();

        const customerOk = customerName
          ? customerCell.includes(customerName) ||
            normalizedCustomer.includes(customerName) ||
            customerName.includes(normalizedCustomer)
          : true;
        const customerIdOk = customerId ? customerCell.includes(customerId) : true;
        const siteOk = siteName
          ? siteCell.includes(siteName) || normalizedSite.includes(siteName) || siteName.includes(normalizedSite)
          : true;
        const siteIdOk = siteId ? siteCell.includes(siteId) : true;

        if (!customerOk || !customerIdOk || !siteOk || !siteIdOk) continue;

        for (let r = g.startRowIndex; r < g.endRowIndex; r += 1) {
          nextRows.push(inboundRows[r] ?? []);
          nextRefs.push({ kind: "搬入", sourceRowIndex: r });
        }
      }
      return { rows: nextRows, rowRefs: nextRefs };
    }
    if (shouldShowPickupOrdersPdfResult) {
      return { rows: pickupRows, rowRefs: pickupRows.map((_, idx) => ({ kind: "引取", sourceRowIndex: idx })) };
    }
    return { rows: [], rowRefs: [] };
  }, [
    buildGroups,
    feature,
    inboundRows,
    ordersFilter.customerId,
    ordersFilter.customerName,
    ordersFilter.siteId,
    ordersFilter.siteName,
    pickupRows,
    shouldShowInboundOrdersPdfResult,
    shouldShowMixedOrdersPdfResult,
    shouldShowPickupOrdersPdfResult
  ]);

  const ordersPdfDisplaySorted = useMemo((): { rows: string[][]; rowRefs: OrdersPdfRowRef[] } => {
    const baseRows = ordersPdfDisplay.rows;
    const baseRefs = ordersPdfDisplay.rowRefs;
    if (!ordersPdfSort) return ordersPdfDisplay;

    const getFirstNonEmptyInRange = (start: number, end: number, colIndex: number) => {
      for (let i = start; i < end; i += 1) {
        const v = String(baseRows[i]?.[colIndex] ?? "").trim();
        if (v) return v;
      }
      return "";
    };

    const statusRank = (statusRaw: string): number => {
      const s = (statusRaw ?? "").trim() as OrderStatus;
      if (s === "予約") return 0;
      if (s === "確定") return 1;
      if (s === "払出済") return 2;
      if (s === "キャンセル") return 3;
      if (s === "破棄") return 4;
      return 99;
    };

    const parseMaybeNumber = (v: string): number => {
      const n = Number(String(v ?? "").trim());
      return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
    };

    const compareText = (a: string, b: string) =>
      String(a ?? "").localeCompare(String(b ?? ""), "ja", { numeric: true, sensitivity: "base" });

    const groups: Array<{
      start: number;
      end: number;
      kind: "搬入" | "引取";
      startMinutes: number;
      originalIndex: number;
    }> = [];

    let i = 0;
    while (i < baseRows.length) {
      while (i < baseRows.length && !isPdfGroupStartRow(baseRows[i] ?? [])) i += 1;
      if (i >= baseRows.length) break;
      const start = i;
      i += 1;
      while (i < baseRows.length && !isPdfGroupStartRow(baseRows[i] ?? [])) i += 1;
      const end = i;
      const timeCell = getFirstNonEmptyInRange(start, end, COL.time);
      const kind = baseRefs[start]?.kind ?? "搬入";
      groups.push({
        start,
        end,
        kind,
        startMinutes: parseStartTimeMinutes(timeCell),
        originalIndex: groups.length
      });
    }

    const dir = ordersPdfSort.direction === "asc" ? 1 : -1;
    const colIndex = ordersPdfSort.colIndex;

    const compareGroups = (a: (typeof groups)[number], b: (typeof groups)[number]) => {
      if (colIndex === COL.status) {
        const av = getFirstNonEmptyInRange(a.start, a.end, COL.status) || "予約";
        const bv = getFirstNonEmptyInRange(b.start, b.end, COL.status) || "予約";
        const ar = statusRank(av);
        const br = statusRank(bv);
        if (ar !== br) return (ar - br) * dir;
        // tie-breaker: time, kind, original order
        if (a.startMinutes !== b.startMinutes) return (a.startMinutes - b.startMinutes) * dir;
        if (a.kind !== b.kind) return (a.kind === "搬入" ? -1 : 1) * dir;
        return (a.originalIndex - b.originalIndex) * dir;
      }

      if (colIndex === COL.time) {
        if (a.startMinutes !== b.startMinutes) return (a.startMinutes - b.startMinutes) * dir;
        const at = getFirstNonEmptyInRange(a.start, a.end, COL.time);
        const bt = getFirstNonEmptyInRange(b.start, b.end, COL.time);
        const t2 = compareText(at, bt);
        if (t2) return t2 * dir;
        if (a.kind !== b.kind) return (a.kind === "搬入" ? -1 : 1) * dir;
        return (a.originalIndex - b.originalIndex) * dir;
      }

      if (colIndex === COL.vehicle) {
        const av = getFirstNonEmptyInRange(a.start, a.end, COL.vehicle);
        const bv = getFirstNonEmptyInRange(b.start, b.end, COL.vehicle);
        const ae = !String(av).trim();
        const be = !String(bv).trim();
        if (ae !== be) return (ae ? 1 : -1) * dir; // 空は最後
        const c = compareText(av, bv);
        if (c) return c * dir;
        return (a.originalIndex - b.originalIndex) * dir;
      }

      if (colIndex === COL.wrecker) {
        const av = getFirstNonEmptyInRange(a.start, a.end, COL.wrecker);
        const bv = getFirstNonEmptyInRange(b.start, b.end, COL.wrecker);
        const ae = !String(av).trim();
        const be = !String(bv).trim();
        if (ae !== be) return (ae ? 1 : -1) * dir; // 空は最後
        const c = compareText(av, bv);
        if (c) return c * dir;
        return (a.originalIndex - b.originalIndex) * dir;
      }

      // フォールバック（数値→文字）
      const avNum = parseMaybeNumber(getFirstNonEmptyInRange(a.start, a.end, colIndex));
      const bvNum = parseMaybeNumber(getFirstNonEmptyInRange(b.start, b.end, colIndex));
      if (avNum !== bvNum) return (avNum - bvNum) * dir;
      const av = getFirstNonEmptyInRange(a.start, a.end, colIndex);
      const bv = getFirstNonEmptyInRange(b.start, b.end, colIndex);
      const c = compareText(av, bv);
      if (c) return c * dir;
      return (a.originalIndex - b.originalIndex) * dir;
    };

    const sortedGroups = [...groups].sort(compareGroups);
    const nextRows: string[][] = [];
    const nextRefs: OrdersPdfRowRef[] = [];
    for (const g of sortedGroups) {
      for (let r = g.start; r < g.end; r += 1) {
        nextRows.push(baseRows[r] ?? []);
        nextRefs.push(baseRefs[r] ?? { kind: g.kind, sourceRowIndex: 0 });
      }
    }
    return { rows: nextRows, rowRefs: nextRefs };
  }, [isPdfGroupStartRow, ordersPdfDisplay, ordersPdfSort, parseStartTimeMinutes]);

  const handleOrdersPdfRequestSort = (colIndex: number) => {
    setOrdersPdfSort((prev) => {
      if (!prev || prev.colIndex !== colIndex) return { colIndex, direction: "asc" };
      return { colIndex, direction: prev.direction === "asc" ? "desc" : "asc" };
    });
  };

  const ordersPdfShownRows = useMemo(() => {
    const base = ordersPdfDisplaySorted.rows;

    // 受注検索結果の「場所の左隣の番号」は、表の上から 1,2,3... と順番に振るだけ（デモ）
    let groupNo = 0;
    return base.map((r) => {
      const row = [...(r ?? [])];
      const isStart = (row[COL.location] ?? "").trim().length > 0;
      if (isStart) {
        groupNo += 1;
        // 払出列は「件数(=グループ)につき1つ」にしたいので、rowSpan のアンカーとして値を入れる
        row[COL.issue] = "払出";
        row[COL.groupNo] = String(groupNo); // 件数列
        if (!String(row[COL.status] ?? "").trim()) row[COL.status] = "予約";
      } else {
        row[COL.issue] = "";
        row[COL.status] = "";
        row[COL.groupNo] = "";
      }
      return row;
    });
  }, [
    ordersPdfDisplaySorted.rows
  ]);

  const inboundDraftShownRows = useMemo(() => {
    const base = inboundDraft?.rows ?? [];
    let groupNo = 0;
    return base.map((r) => {
      const row = [...(r ?? [])];
      const isStart = (row[COL.location] ?? "").trim().length > 0;
      if (isStart) {
        groupNo += 1;
        row[COL.groupNo] = String(groupNo);
        if (!String(row[COL.status] ?? "").trim()) row[COL.status] = "予約";
      } else {
        row[COL.groupNo] = "";
      }
      return row;
    });
  }, [inboundDraft?.rows]);

  const pickupDraftShownRows = useMemo(() => {
    const base = pickupDraft?.rows ?? [];
    let groupNo = 0;
    return base.map((r) => {
      const row = [...(r ?? [])];
      const isStart = (row[COL.location] ?? "").trim().length > 0;
      if (isStart) {
        groupNo += 1;
        row[COL.groupNo] = String(groupNo);
        if (!String(row[COL.status] ?? "").trim()) row[COL.status] = "予約";
      } else {
        row[COL.groupNo] = "";
      }
      return row;
    });
  }, [pickupDraft?.rows]);

  const handleInboundDraftCellDoubleClick = (args: { rowIndex: number; colIndex: number; value: string }) => {
    if (!inboundDraft) return;
    const { rowIndex, colIndex, value } = args;
    setOrdersPdfEditingScope("draft");
    setOrdersPdfEditingKind("搬入");

    if (colIndex === COL.status) {
      const shownRows = inboundDraftShownRows;
      const groupStart = getOrdersPdfGroupStartDisplayRow(shownRows, rowIndex);
      const current = String(shownRows[groupStart]?.[COL.status] ?? "").trim() || "予約";
      if (current === "払出済") {
        showToast("払出済は伝票発行で自動設定されます", "warn", 2500);
        return;
      }
      setOrderStatusTargetRow(groupStart);
      setOrderStatusInitial(
        (orderStatusOptions.includes(current as OrderStatusSelectable) ? (current as OrderStatusSelectable) : "予約") as OrderStatusSelectable
      );
      setOrderStatusModalOpen(true);
      return;
    }

    if (colIndex === COL.location) {
      setLocationModalTargetRow(rowIndex);
      setLocationModalInitial(parseLocationCell(value ?? ""));
      setLocationModalOpen(true);
      return;
    }
    if (colIndex === COL.machine) {
      if ((value ?? "").trim().startsWith("※")) {
        setInstructionNoteTargetRow(rowIndex);
        setInstructionNoteInitial(value ?? "");
        setInstructionNoteModalOpen(true);
        return;
      }

      const shownRows = inboundDraft.rows;
      const nextRow = shownRows[rowIndex + 1];
      const nextRowInstructionNote =
        nextRow &&
        (nextRow[COL.groupNo] ?? "").trim() === "" &&
        (nextRow[COL.location] ?? "").trim() === "" &&
        (nextRow[COL.machine] ?? "").trim().startsWith("※")
          ? (nextRow[COL.machine] ?? "")
          : "";
      const parsed = parseMachineTypeFromCell(value);
      const linked = machineTypeByMachineNameMock[parsed.baseName];
      const inferredCategoryId = machineCategoryMasterMock.find((x) => x.name === parsed.baseName)?.id;
      setMachineTypeDisableAddProduct(!String(value ?? "").trim());
      setMachineTypeInitialQuantity(String(shownRows[rowIndex]?.[COL.quantity] ?? "").trim());
      setMachineTypeTargetRow(rowIndex);
      setMachineTypeInitial({
        kindId: parsed.kindId ?? linked?.kindId,
        categoryId: parsed.categoryId ?? linked?.categoryId ?? inferredCategoryId
      });
      setInstructionNoteInitial(nextRowInstructionNote);
      setMachineTypeModalOpen(true);
      return;
    }
    if (colIndex === COL.machineNo) {
      setMachineNoTargetRow(rowIndex);
      setMachineNoInitial(value ?? "");
      setMachineNoModalOpen(true);
      return;
    }
    if (colIndex === COL.quantity) {
      setQuantityTargetRow(rowIndex);
      setQuantityInitial(value ?? "");
      setQuantityModalOpen(true);
      return;
    }
    if (colIndex === COL.vehicle) {
      setVehicleTargetRow(rowIndex);
      setVehicleInitial(value ?? "");
      setVehicleModalOpen(true);
      return;
    }
    if (colIndex === COL.wrecker) {
      setWreckerTargetRow(rowIndex);
      setWreckerInitial(value ?? "");
      setWreckerModalOpen(true);
      return;
    }
    if (colIndex === COL.driver) {
      const parsed = driverAssignParseFromCell(value ?? "");
      setDriverTargetRow(rowIndex);
      setDriverInitial({
        kind: parsed.kind ?? "選択無し",
        driverName: String(parsed.driverName ?? "").trim(),
        id: String(parsed.id ?? "").trim()
      });
      setDriverModalOpen(true);
      return;
    }
    if (colIndex === COL.site) {
      const parsed = parseSiteFromCell(value ?? "");
      setSiteTargetRow(rowIndex);
      setSiteInitial(parsed);
      setSiteModalOpen(true);
      return;
    }
    if (colIndex === COL.time) {
      setTimeTargetRow(rowIndex);
      setTimeInitial(value ?? "");
      setTimeModalOpen(true);
      return;
    }
    if (colIndex === COL.note) {
      setFactoryNoteTargetRow(rowIndex);
      setFactoryNoteInitial(value ?? "");
      setFactoryNoteModalOpen(true);
      return;
    }
    if (colIndex === COL.transportFee) {
      setTransportFeeTargetRow(rowIndex);
      setTransportFeeInitial(value ?? "");
      setTransportFeeModalOpen(true);
      return;
    }
  };

  const handlePickupDraftCellDoubleClick = (args: { rowIndex: number; colIndex: number; value: string }) => {
    if (!pickupDraft) return;
    const { rowIndex, colIndex, value } = args;
    setOrdersPdfEditingScope("draft");
    setOrdersPdfEditingKind("引取");

    if (colIndex === COL.status) {
      const shownRows = pickupDraftShownRows;
      const groupStart = getOrdersPdfGroupStartDisplayRow(shownRows, rowIndex);
      const current = String(shownRows[groupStart]?.[COL.status] ?? "").trim() || "予約";
      if (current === "払出済") {
        showToast("払出済は伝票発行で自動設定されます", "warn", 2500);
        return;
      }
      setOrderStatusTargetRow(groupStart);
      setOrderStatusInitial(
        (orderStatusOptions.includes(current as OrderStatusSelectable) ? (current as OrderStatusSelectable) : "予約") as OrderStatusSelectable
      );
      setOrderStatusModalOpen(true);
      return;
    }

    if (colIndex === COL.location) {
      setLocationModalTargetRow(rowIndex);
      setLocationModalInitial(parseLocationCell(value ?? ""));
      setLocationModalOpen(true);
      return;
    }
    if (colIndex === COL.machine) {
      if ((value ?? "").trim().startsWith("※")) {
        setInstructionNoteTargetRow(rowIndex);
        setInstructionNoteInitial(value ?? "");
        setInstructionNoteModalOpen(true);
        return;
      }

      const shownRows = pickupDraft.rows;
      const nextRow = shownRows[rowIndex + 1];
      const nextRowInstructionNote =
        nextRow &&
        (nextRow[COL.groupNo] ?? "").trim() === "" &&
        (nextRow[COL.location] ?? "").trim() === "" &&
        (nextRow[COL.machine] ?? "").trim().startsWith("※")
          ? (nextRow[COL.machine] ?? "")
          : "";
      const parsed = parseMachineTypeFromCell(value);
      const linked = machineTypeByMachineNameMock[parsed.baseName];
      const inferredCategoryId = machineCategoryMasterMock.find((x) => x.name === parsed.baseName)?.id;
      setMachineTypeDisableAddProduct(!String(value ?? "").trim());
      setMachineTypeInitialQuantity(String(shownRows[rowIndex]?.[COL.quantity] ?? "").trim());
      setMachineTypeTargetRow(rowIndex);
      setMachineTypeInitial({
        kindId: parsed.kindId ?? linked?.kindId,
        categoryId: parsed.categoryId ?? linked?.categoryId ?? inferredCategoryId
      });
      setInstructionNoteInitial(nextRowInstructionNote);
      setMachineTypeModalOpen(true);
      return;
    }
    if (colIndex === COL.machineNo) {
      setMachineNoTargetRow(rowIndex);
      setMachineNoInitial(value ?? "");
      setMachineNoModalOpen(true);
      return;
    }
    if (colIndex === COL.quantity) {
      setQuantityTargetRow(rowIndex);
      setQuantityInitial(value ?? "");
      setQuantityModalOpen(true);
      return;
    }
    if (colIndex === COL.vehicle) {
      setVehicleTargetRow(rowIndex);
      setVehicleInitial(value ?? "");
      setVehicleModalOpen(true);
      return;
    }
    if (colIndex === COL.wrecker) {
      setWreckerTargetRow(rowIndex);
      setWreckerInitial(value ?? "");
      setWreckerModalOpen(true);
      return;
    }
    if (colIndex === COL.driver) {
      const parsed = driverAssignParseFromCell(value ?? "");
      setDriverTargetRow(rowIndex);
      setDriverInitial({
        kind: parsed.kind ?? "選択無し",
        driverName: String(parsed.driverName ?? "").trim(),
        id: String(parsed.id ?? "").trim()
      });
      setDriverModalOpen(true);
      return;
    }
    if (colIndex === COL.site) {
      const parsed = parseSiteFromCell(value ?? "");
      setSiteTargetRow(rowIndex);
      setSiteInitial(parsed);
      setSiteModalOpen(true);
      return;
    }
    if (colIndex === COL.time) {
      setTimeTargetRow(rowIndex);
      setTimeInitial(value ?? "");
      setTimeModalOpen(true);
      return;
    }
    if (colIndex === COL.note) {
      setFactoryNoteTargetRow(rowIndex);
      setFactoryNoteInitial(value ?? "");
      setFactoryNoteModalOpen(true);
      return;
    }
    if (colIndex === COL.transportFee) {
      setTransportFeeTargetRow(rowIndex);
      setTransportFeeInitial(value ?? "");
      setTransportFeeModalOpen(true);
      return;
    }
  };

  const setOrdersPdfCellByDisplayRow = (displayRowIndex: number, colIndex: number, nextValue: string) => {
    const ref = ordersPdfDisplaySorted.rowRefs[displayRowIndex];
    if (!ref) return;
    if (ref.kind === "引取") {
      setPickupCell(ref.sourceRowIndex, colIndex, nextValue);
      return;
    }
    setInboundCell(ref.sourceRowIndex, colIndex, nextValue);
  };

  const setOrdersPdfCellByScope = (rowIndex: number, colIndex: number, nextValue: string) => {
    if (ordersPdfEditingScope === "draft") {
      if (ordersPdfEditingKind === "引取") {
        setPickupDraft((prev) => {
          if (!prev) return prev;
          const nextRows = prev.rows.map((r) => [...r]);
          const target = nextRows[rowIndex];
          if (!target) return prev;
          nextRows[rowIndex] = target.map((cell, cidx) => (cidx === colIndex ? nextValue : cell));
          return { ...prev, rows: nextRows };
        });
      } else {
        setInboundDraft((prev) => {
          if (!prev) return prev;
          const nextRows = prev.rows.map((r) => [...r]);
          const target = nextRows[rowIndex];
          if (!target) return prev;
          nextRows[rowIndex] = target.map((cell, cidx) => (cidx === colIndex ? nextValue : cell));
          return { ...prev, rows: nextRows };
        });
      }
      return;
    }
    setOrdersPdfCellByDisplayRow(rowIndex, colIndex, nextValue);
  };

  const insertOrdersPdfRowsAfterDisplayRowByScope = (rowIndex: number, newRows: string[][]) => {
    if (ordersPdfEditingScope === "draft") {
      if (ordersPdfEditingKind === "引取") {
        setPickupDraft((prev) => {
          if (!prev) return prev;
          const nextRows = prev.rows.map((r) => [...r]);
          nextRows.splice(rowIndex + 1, 0, ...newRows.map((r) => [...r]));
          return { ...prev, rows: nextRows };
        });
      } else {
        setInboundDraft((prev) => {
          if (!prev) return prev;
          const nextRows = prev.rows.map((r) => [...r]);
          nextRows.splice(rowIndex + 1, 0, ...newRows.map((r) => [...r]));
          return { ...prev, rows: nextRows };
        });
      }
      return;
    }
    insertOrdersPdfRowsAfterDisplayRow(rowIndex, newRows);
  };

  const clearInboundDraft = () => setInboundDraft(null);
  const clearPickupDraft = () => setPickupDraft(null);

  const createInboundDraftRow = (companyName: string): string[] => {
    const row = Array.from({ length: inboundOrderSearchColumns.length }).map(() => "");
    row[COL.location] = "（未設定）";
    row[COL.customer] = companyName.trim();
    row[COL.status] = "予約";
    return row;
  };

  const handleCreateInboundDraft = () => {
    const inboundDate = newInboundDate.trim();
    const companyName = newInboundCompanyName.trim();
    const errors: { inboundDate?: string; companyName?: string } = {};
    if (!inboundDate) errors.inboundDate = "搬入日は必須です";
    if (!companyName) errors.companyName = "会社名は必須です";
    setNewInboundErrors(errors);
    if (errors.inboundDate || errors.companyName) return;

    setInboundDraft({ inboundDate, rows: [createInboundDraftRow(companyName)] });
    setNewInboundModalOpen(false);
    setNewInboundDate("");
    setNewInboundCompanyName("");
    setNewInboundErrors({});
  };

  const createPickupDraftRow = (companyName: string): string[] => {
    const row = Array.from({ length: inboundOrderSearchColumns.length }).map(() => "");
    row[COL.location] = "（未設定）";
    row[COL.customer] = companyName.trim();
    row[COL.status] = "予約";
    return row;
  };

  const handleCreatePickupDraft = () => {
    const pickupDate = newPickupDate.trim();
    const companyName = newPickupCompanyName.trim();
    const errors: { pickupDate?: string; companyName?: string } = {};
    if (!pickupDate) errors.pickupDate = "引取日は必須です";
    if (!companyName) errors.companyName = "会社名は必須です";
    setNewPickupErrors(errors);
    if (errors.pickupDate || errors.companyName) return;

    setPickupDraft({ pickupDate, rows: [createPickupDraftRow(companyName)] });
    setNewPickupModalOpen(false);
    setNewPickupDate("");
    setNewPickupCompanyName("");
    setNewPickupErrors({});
  };

  const parseFirstTimeCellMinutes = (rows: string[][]) => {
    const cell = rows.map((r) => String(r?.[COL.time] ?? "").trim()).find((x) => x.length > 0) ?? "";
    return parseStartTimeMinutes(cell);
  };

  const doesDraftMatchCurrentSearchFilter = (draftRows: string[][]) => {
    const customerName = ordersFilter.customerName.trim();
    const customerId = ordersFilter.customerId.trim();
    const siteName = ordersFilter.siteName.trim();
    const siteId = ordersFilter.siteId.trim();
    if (!customerName && !customerId && !siteName && !siteId) return true;

    const customerCell = draftRows.map((r) => String(r?.[COL.customer] ?? "").trim()).find((x) => x.length > 0) ?? "";
    const siteCell = draftRows.map((r) => String(r?.[COL.site] ?? "").trim()).find((x) => x.length > 0) ?? "";
    const normalizedCustomer = normalizeCustomerNameFromCell(customerCell);
    const normalizedSite = parseSiteFromCell(siteCell).siteName ?? String(siteCell ?? "").trim();

    const customerOk = customerName
      ? customerCell.includes(customerName) ||
        normalizedCustomer.includes(customerName) ||
        customerName.includes(normalizedCustomer)
      : true;
    const customerIdOk = customerId ? customerCell.includes(customerId) : true;
    const siteOk = siteName ? siteCell.includes(siteName) || normalizedSite.includes(siteName) || siteName.includes(normalizedSite) : true;
    const siteIdOk = siteId ? siteCell.includes(siteId) : true;
    return customerOk && customerIdOk && siteOk && siteIdOk;
  };

  const DRAG_TYPE_INBOUND_DRAFT = "application/x-demo-inbound-draft";
  const DRAG_TYPE_PICKUP_DRAFT = "application/x-demo-pickup-draft";

  const handleAddInboundDraftToTable = () => {
    const draft = inboundDraft;
    if (!draft || draft.rows.length === 0) return;

    // 1. 新規登録エリアのデータを取得
    const draftRows = draft.rows.map((r) => [...r]);
    const matches = doesDraftMatchCurrentSearchFilter(draftRows);

    // 2. DB更新（デモ: inboundRows を更新）
    const insertMinutes = parseFirstTimeCellMinutes(draftRows);
    const groups = buildGroups(inboundRows, "搬入");
    let insertAt = inboundRows.length;
    for (const g of groups) {
      if (g.startMinutes > insertMinutes) {
        insertAt = g.startRowIndex;
        break;
      }
    }

    setInboundRows((prev) => {
      const next = [...prev];
      next.splice(insertAt, 0, ...draftRows);
      return next;
    });

    // 3. 検索条件との整合性チェック
    if (matches) {
      const range = { start: insertAt, end: insertAt + draftRows.length - 1 };
      setInboundInsertAnimRange(range);
      window.setTimeout(() => setInboundInsertAnimRange(null), 350);
      setInboundHighlightRange(range);
      window.setTimeout(() => setInboundHighlightRange(null), 2000);
      showToast("✓ 受注を追加しました", "success", 2000);
    } else {
      showToast("⚠️ 検索条件に合わないため表示されません", "warn", 3000);
    }

    // 8 / 5-B: 新規登録エリアをクリア
    clearInboundDraft();
  };

  const handleAddPickupDraftToTable = () => {
    const draft = pickupDraft;
    if (!draft || draft.rows.length === 0) return;

    const draftRows = draft.rows.map((r) => [...r]);
    const matches = doesDraftMatchCurrentSearchFilter(draftRows);

    const insertMinutes = parseFirstTimeCellMinutes(draftRows);
    const groups = buildGroups(pickupRows, "引取");
    let insertAt = pickupRows.length;
    for (const g of groups) {
      if (g.startMinutes > insertMinutes) {
        insertAt = g.startRowIndex;
        break;
      }
    }

    setPickupRows((prev) => {
      const next = [...prev];
      next.splice(insertAt, 0, ...draftRows);
      return next;
    });

    if (matches) {
      const range = { start: insertAt, end: insertAt + draftRows.length - 1 };
      setPickupInsertAnimRange(range);
      window.setTimeout(() => setPickupInsertAnimRange(null), 350);
      setPickupHighlightRange(range);
      window.setTimeout(() => setPickupHighlightRange(null), 2000);
      showToast("✓ 受注を追加しました", "success", 2000);
    } else {
      showToast("⚠️ 検索条件に合わないため表示されません", "warn", 3000);
    }

    clearPickupDraft();
  };

  const handleStartDragInboundDraft = (e: React.DragEvent) => {
    if (!inboundDraft) return;
    setDraggingDraftKind("搬入");
    try {
      e.dataTransfer.setData(DRAG_TYPE_INBOUND_DRAFT, "1");
    } catch {
      // ignore
    }
    e.dataTransfer.effectAllowed = "move";
  };

  const handleStartDragPickupDraft = (e: React.DragEvent) => {
    if (!pickupDraft) return;
    setDraggingDraftKind("引取");
    try {
      e.dataTransfer.setData(DRAG_TYPE_PICKUP_DRAFT, "1");
    } catch {
      // ignore
    }
    e.dataTransfer.effectAllowed = "move";
  };

  const handleEndDragDraft = () => {
    setDraggingDraftKind(null);
    setIsDragOverOrdersTable(false);
  };

  const handleOrdersTableDragOver = (e: React.DragEvent) => {
    if (!draggingDraftKind) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsDragOverOrdersTable(true);
  };

  const handleOrdersTableDragLeave = () => {
    setIsDragOverOrdersTable(false);
  };

  const handleOrdersTableDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverOrdersTable(false);
    setDraggingDraftKind(null);

    const hasType = (t: string) => {
      try {
        return Boolean(e.dataTransfer.types?.includes(t));
      } catch {
        return false;
      }
    };

    if (hasType(DRAG_TYPE_INBOUND_DRAFT)) {
      handleAddInboundDraftToTable();
      return;
    }
    if (hasType(DRAG_TYPE_PICKUP_DRAFT)) {
      handleAddPickupDraftToTable();
      return;
    }
  };

  const ordersSearchResultBody = shouldShowMoveOrdersResult ? (
    <div className="page" style={{ marginTop: 0 }}>
      <p style={{ marginTop: 0, color: "#475569", fontSize: 12 }}>
        検索条件「移動」選択時のデモ表示（表の見た目のみ再現）
      </p>
      <MoveOrdersResultsTable />
    </div>
  ) : shouldShowAnyOrdersPdfResult ? (
    <div className="page" style={{ marginTop: 0 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
        <p style={{ marginTop: 0, marginBottom: 0, color: "#475569", fontSize: 12 }}>
          検索条件「{ordersPdfTitleLabel}」選択時のデモ表示（PDF/画像の表を再現）※場所セルをダブルクリックで場所変更モーダル
        </p>
        {ordersPdfKindLabel === "搬入" && (
          <button
            className="button"
            type="button"
            onClick={() => {
              clearInboundPersisted();
              setInboundDraft(null);
              setInboundRows(loadInboundRows(inboundOrderSearchRawRows));
            }}
            title="サーバ更新された最新のデモ行を読み直す（ローカル保存分は破棄）"
          >
            デモ再読込
          </button>
        )}
      </div>
      <div
        className={draggingDraftKind ? "orders-drop-target" : undefined}
        data-active={isDragOverOrdersTable ? "1" : "0"}
        onDragOver={handleOrdersTableDragOver}
        onDragLeave={handleOrdersTableDragLeave}
        onDrop={handleOrdersTableDrop}
        style={{
          borderRadius: 12,
          outline: isDragOverOrdersTable ? "2px dashed rgba(34, 197, 94, 0.75)" : undefined,
          outlineOffset: 6
        }}
      >
        <InboundPdfTable
          ariaLabel={`${ordersPdfTitleLabel} 受注検索結果（PDF再現）`}
          columns={ordersPdfColumns}
          rows={ordersPdfShownRows}
          tableClassName={shouldShowPickupOrdersPdfResult ? "inbound-pdf-table--pickup" : undefined}
          sortableColumnIndices={[COL.status, COL.vehicle, COL.wrecker, COL.time]}
          sortState={ordersPdfSort}
          onRequestSort={handleOrdersPdfRequestSort}
          renderCell={({ rowIndex, colIndex, row, value }) => {
            if (colIndex === COL.status) {
              const { symbol, color } = statusToSymbolAndColor(String(value ?? ""));
              return (
                <span
                  title={String(value ?? "").trim()}
                  style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "100%", color, fontWeight: 900 }}
                >
                  {symbol}
                </span>
              );
            }
            if (colIndex === COL.usagePeriod) {
              return formatUsagePeriodCell(String(value ?? ""));
            }
            if (colIndex === COL.machine) {
              return formatProductNameForDisplay(String(value ?? ""));
            }
            if (colIndex !== COL.issue) return row[colIndex];
            // rowSpan のアンカー（ordersPdfShownRows で "払出" を入れている）
            if (!String(value ?? "").trim()) return "";

            // 件数=1件を「1受注」として、払出可否を判定
            const shownRows = ordersPdfShownRows;
            const groupStart = getOrdersPdfGroupStartDisplayRow(shownRows, rowIndex);
            let groupEnd = groupStart + 1;
            while (groupEnd < shownRows.length && !isPdfGroupStartRow(shownRows[groupEnd])) groupEnd += 1;

            const driverCell = getOrdersPdfMergedValueInGroup(shownRows, groupStart, COL.driver);
            const hasDriver = String(driverCell ?? "").trim().length > 0;

            const allProductsHaveNo = (() => {
              for (let i = groupStart; i < groupEnd; i += 1) {
                const r = shownRows[i] ?? [];
                if (isInstructionNoteRow(r)) continue;
                const machine = String(r[COL.machine] ?? "").trim();
                if (!machine) continue;
                if (machine.startsWith("※")) continue;
                const no = String(r[COL.machineNo] ?? "").trim();
                if (!no) return false;
              }
              return true;
            })();

            const canIssueSlip = hasDriver && allProductsHaveNo;
            const disabledReason = !hasDriver
              ? "運転手が未設定です"
              : !allProductsHaveNo
                ? "No.が未入力の商品があります"
                : "";

            return (
              <button
                className="button"
                type="button"
                disabled={!canIssueSlip}
                title={!canIssueSlip ? disabledReason : "伝票発行（デモ）"}
                style={{ padding: "6px 10px", fontWeight: 800 }}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  if (!canIssueSlip) return;
                  setOrdersPdfEditingScope("results");
                  if (shouldShowMixedOrdersPdfResult) {
                    const ref = ordersPdfDisplaySorted.rowRefs[rowIndex];
                    setOrdersPdfEditingKind(ref?.kind ?? "搬入");
                  } else {
                    setOrdersPdfEditingKind(ordersPdfKindLabel);
                  }
                  setIssueSlipTargetRow(rowIndex);
                  setIssueSlipConfirmOpen(true);
                }}
              >
                払出
              </button>
            );
          }}
          getRowClassName={({ rowIndex }) => {
            const ref = ordersPdfDisplaySorted.rowRefs[rowIndex];
            const classes: string[] = [];
            if (shouldShowMixedOrdersPdfResult && ref?.kind === "引取") classes.push("orders-pdf-row--pickup");
            if (ref?.kind === "搬入") {
              if (
                inboundInsertAnimRange &&
                ref.sourceRowIndex >= inboundInsertAnimRange.start &&
                ref.sourceRowIndex <= inboundInsertAnimRange.end
              ) {
                classes.push("orders-row-insert");
              }
              if (
                inboundHighlightRange &&
                ref.sourceRowIndex >= inboundHighlightRange.start &&
                ref.sourceRowIndex <= inboundHighlightRange.end
              ) {
                classes.push("orders-row-highlight");
              }
            }
            if (ref?.kind === "引取") {
              if (
                pickupInsertAnimRange &&
                ref.sourceRowIndex >= pickupInsertAnimRange.start &&
                ref.sourceRowIndex <= pickupInsertAnimRange.end
              ) {
                classes.push("orders-row-insert");
              }
              if (
                pickupHighlightRange &&
                ref.sourceRowIndex >= pickupHighlightRange.start &&
                ref.sourceRowIndex <= pickupHighlightRange.end
              ) {
                classes.push("orders-row-highlight");
              }
            }
            return classes.join(" ") || undefined;
          }}
          colWidths={ordersPdfColWidths}
          // 払出/件数/場所 + 右側の情報列はグループ内で縦結合
          mergeColumnIndices={[
            COL.issue,
            COL.status,
            COL.groupNo,
            COL.usagePeriod,
            COL.location,
            COL.vehicle,
            COL.wrecker,
            COL.driver,
            COL.customer,
            COL.site,
            COL.time,
            COL.note,
            COL.transportFee
          ]}
          mergeBlankCellsWithinGroup
          groupStartColumnIndices={[COL.location]}
          onCellDoubleClick={({ rowIndex, colIndex, value }) => {
            setOrdersPdfEditingScope("results");
            if (shouldShowMixedOrdersPdfResult) {
              const ref = ordersPdfDisplaySorted.rowRefs[rowIndex];
              setOrdersPdfEditingKind(ref?.kind ?? "搬入");
            } else {
              setOrdersPdfEditingKind(ordersPdfKindLabel);
            }
            // 列ごとにデモ編集モーダルを出し分け
            // [0]払出 [1]状態 [2]件数 [3]場所 [4]機械名 [5]No. [6]数量 [7]車輛
            if (colIndex === COL.status) {
              const shownRows = ordersPdfShownRows;
              const groupStart = getOrdersPdfGroupStartDisplayRow(shownRows, rowIndex);
              const current = String(shownRows[groupStart]?.[COL.status] ?? "").trim() || "予約";
              if (current === "払出済") {
                showToast("払出済は伝票発行で自動設定されます", "warn", 2500);
                return;
              }
              setOrderStatusTargetRow(groupStart);
              setOrderStatusInitial(
                (orderStatusOptions.includes(current as OrderStatusSelectable) ? (current as OrderStatusSelectable) : "予約") as OrderStatusSelectable
              );
              setOrderStatusModalOpen(true);
              return;
            }
            if (colIndex === COL.location) {
              if (!value.trim()) return;
              setLocationModalTargetRow(rowIndex);
              setLocationModalInitial(parseLocationCell(value));
              setLocationModalOpen(true);
              return;
            }
            if (colIndex === COL.machine) {
              // 機械名列のうち「指示備考」行（例: 先頭が※）は、種類/種別変更ではなく指示備考編集モーダル
              if ((value ?? "").trim().startsWith("※")) {
                setInstructionNoteTargetRow(rowIndex);
                setInstructionNoteInitial(value ?? "");
                setInstructionNoteModalOpen(true);
                return;
              }

              // 引取は搬入と編集方式が異なるため、専用モーダルで「出庫中一覧/受注一覧」から選択する（デモ）
              const activeKind: "搬入" | "引取" = shouldShowMixedOrdersPdfResult
                ? (ordersPdfDisplaySorted.rowRefs[rowIndex]?.kind ?? ordersPdfKindLabel)
                : ordersPdfKindLabel;
              if (activeKind === "引取") {
                const shownRows = ordersPdfShownRows;
                if (!shownRows[rowIndex]) return;

                const groupStart = getOrdersPdfGroupStartDisplayRow(shownRows, rowIndex);
                let groupEnd = groupStart + 1;
                while (groupEnd < shownRows.length && !isPdfGroupStartRow(shownRows[groupEnd])) groupEnd += 1;

                const inTableNames: string[] = [];
              for (let i = groupStart; i < groupEnd; i += 1) {
                const cell = String(shownRows[i]?.[COL.machine] ?? "").trim();
                  if (!cell) continue;
                  if (cell.startsWith("※")) continue;
                  inTableNames.push(cell);
                }

              const customerCell = getOrdersPdfMergedValueInGroup(shownRows, groupStart, COL.customer);
              const siteCell = getOrdersPdfMergedValueInGroup(shownRows, groupStart, COL.site);
                const customerName = normalizeCustomerNameFromCell(customerCell);
                const siteName = parseSiteFromCell(siteCell).siteName ?? String(siteCell ?? "").trim();

                // 初期チェックは「ダブルクリックしたその行の機械」だけ（=1行=1商品）
                const selectedFallbackMachineNames = parseMachineNamesFromCell(value ?? "");
                const initialSelectedMachineNames = new Set<string>(selectedFallbackMachineNames);
                const pinnedName = selectedFallbackMachineNames[0] ?? "";
                const pinnedId = pinnedName
                  ? pickupOrdersMachineSelectMock.find((x) => x.machineName === pinnedName)?.id ?? ""
                  : "";
                const customerId = ordersFilter.customerId.trim();
                const siteId = ordersFilter.siteId.trim();

                const filtered = pickupOrdersMachineSelectMock.filter((x) => {
                  const customerOk = customerId
                    ? x.customerId.includes(customerId)
                    : customerName
                      ? x.customerName.includes(customerName) || customerName.includes(x.customerName)
                      : true;
                  const siteOk = siteId
                    ? x.siteId.includes(siteId)
                    : siteName
                      ? x.siteName.includes(siteName) || siteName.includes(x.siteName)
                      : true;
                  return customerOk && siteOk;
                });

                // 初期チェックは、フィルタ結果が空でも「デモマスタ全体」から拾う（=表の選択機械を常に操作可能にする）
                const initialSelectedIds = pickupOrdersMachineSelectMock
                  .filter((x) => initialSelectedMachineNames.has(x.machineName))
                  .map((x) => x.id);

                // 指示備考（直下にある※行）を初期値として拾う（同一グループ内のみ）
                const nextRow = shownRows[rowIndex + 1];
                const isNextRowInSameGroup = nextRow && !isPdfGroupStartRow(nextRow);
              const initialNote =
                isNextRowInSameGroup && isInstructionNoteRow(nextRow) ? String(nextRow?.[COL.machine] ?? "").trim() : "";

                setPickupOrdersMachineTargetRow(rowIndex);
                setPickupOrdersMachineInitialSelectedIds(initialSelectedIds);
                setPickupOrdersMachineInitialInstructionNote(initialNote);
                setPickupOrdersMachineInTableNames(inTableNames);
                // フィルタ結果が空でも、表で選択中の機械は表示したい（デモマスタに無い場合もあるため名前でも渡す）
                setPickupOrdersMachineSelectedFallbackNames(selectedFallbackMachineNames);
                setPickupOrdersMachinePinnedId(pinnedId);
                setPickupOrdersMachinePinnedName(pinnedName);
                setPickupOrdersMachineContext({ customerName, siteName });
                setPickupOrdersMachineModalOpen(true);
                return;
              }

              const shownRows = shouldShowMixedOrdersPdfResult
                ? ordersPdfDisplaySorted.rows
                : shouldShowInboundOrdersPdfResult
                  ? inboundRows
                  : pickupRows;
              const nextRow = shownRows[rowIndex + 1];
              const nextRowInstructionNote =
                nextRow &&
                (nextRow[COL.groupNo] ?? "").trim() === "" &&
                (nextRow[COL.location] ?? "").trim() === "" &&
                (nextRow[COL.machine] ?? "").trim().startsWith("※")
                  ? (nextRow[COL.machine] ?? "")
                  : "";
              const parsed = parseMachineTypeFromCell(value);
              const linked = machineTypeByMachineNameMock[parsed.baseName];
              const inferredCategoryId = machineCategoryMasterMock.find((x) => x.name === parsed.baseName)?.id;
              setMachineTypeDisableAddProduct(!String(value ?? "").trim());
              setMachineTypeInitialQuantity(String(shownRows[rowIndex]?.[COL.quantity] ?? "").trim());
              setMachineTypeTargetRow(rowIndex);
              setMachineTypeInitial({
                kindId: parsed.kindId ?? linked?.kindId,
                categoryId: parsed.categoryId ?? linked?.categoryId ?? inferredCategoryId
              });
              setInstructionNoteInitial(nextRowInstructionNote);
              setMachineTypeModalOpen(true);
              return;
            }
            if (colIndex === COL.machineNo) {
              setMachineNoTargetRow(rowIndex);
              setMachineNoInitial(value ?? "");
              setMachineNoModalOpen(true);
              return;
            }
            if (colIndex === COL.quantity) {
              setQuantityTargetRow(rowIndex);
              setQuantityInitial(value ?? "");
              setQuantityModalOpen(true);
              return;
            }
            if (colIndex === COL.vehicle) {
              setVehicleTargetRow(rowIndex);
              setVehicleInitial(value ?? "");
              setVehicleModalOpen(true);
              return;
            }
            if (colIndex === COL.wrecker) {
              // ﾚｯｶｰ
              setWreckerTargetRow(rowIndex);
              setWreckerInitial(value ?? "");
              setWreckerModalOpen(true);
              return;
            }
            if (colIndex === COL.driver) {
              // 運転手
              const parsed = driverAssignParseFromCell(value ?? "");
              setDriverTargetRow(rowIndex);
              setDriverInitial({
                kind: parsed.kind ?? "選択無し",
                driverName: String(parsed.driverName ?? "").trim(),
                id: String(parsed.id ?? "").trim()
              });
              setDriverModalOpen(true);
              return;
            }
            if (colIndex === COL.site) {
              // 現場
              const parsed = parseSiteFromCell(value ?? "");
              setSiteTargetRow(rowIndex);
              setSiteInitial(parsed);
              setSiteModalOpen(true);
              return;
            }
            if (colIndex === COL.time) {
              // 時間
              setTimeTargetRow(rowIndex);
              setTimeInitial(value ?? "");
              setTimeModalOpen(true);
              return;
            }
            if (colIndex === COL.note) {
              // 備考（工場備考）
              setFactoryNoteTargetRow(rowIndex);
              setFactoryNoteInitial(value ?? "");
              setFactoryNoteModalOpen(true);
              return;
            }
            if (colIndex === COL.transportFee) {
              // 回送費
              setTransportFeeTargetRow(rowIndex);
              setTransportFeeInitial(value ?? "");
              setTransportFeeModalOpen(true);
              return;
            }
          }}
        />
      </div>
      {shouldShowInboundOrdersPdfResult && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, gap: 12 }}>
          <button
            className="button"
            type="button"
            disabled={Boolean(inboundDraft)}
            title={inboundDraft ? "新規登録エリアに受注があるためロック中です（クリアしてから新規登録してください）" : undefined}
            onClick={() => setNewInboundModalOpen(true)}
          >
            + 新規受注登録
          </button>
          {draggingDraftKind === "搬入" && (
            <div style={{ color: "#16a34a", fontWeight: 900, fontSize: 12 }}>この表へドロップで追加</div>
          )}
        </div>
      )}

      {shouldShowInboundOrdersPdfResult && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #e2e8f0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <div style={{ fontWeight: 900, color: "#0f172a" }}>新規登録エリア（デモ）</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="button" type="button" disabled={!inboundDraft} onClick={clearInboundDraft}>
                クリア
              </button>
            </div>
          </div>

          {!inboundDraft && (
            <p style={{ marginTop: 8, marginBottom: 0, color: "#475569", fontSize: 12 }}>
              「+ 新規受注登録」から作成すると、ここに1行追加されます。行をダブルクリックで追加入力し、行をドラッグして検索結果の表にドロップすると追加できます。
            </p>
          )}

          {inboundDraft && (
            <>
              <p style={{ marginTop: 8, marginBottom: 0, color: "#475569", fontSize: 12 }}>
                搬入日: <span style={{ fontWeight: 900, color: "#0f172a" }}>{inboundDraft.inboundDate}</span>（行を掴んでドラッグ→上の表へドロップ）
              </p>
              <InboundPdfTable
                ariaLabel="新規登録エリア（搬入）"
                columns={inboundOrderSearchColumns}
                rows={inboundDraftShownRows}
                colWidths={inboundOrderSearchColWidths}
                mergeColumnIndices={[
                  COL.issue,
                  COL.status,
                  COL.groupNo,
                  COL.usagePeriod,
                  COL.quantity,
                  COL.vehicle,
                  COL.wrecker,
                  COL.driver,
                  COL.customer,
                  COL.site,
                  COL.time,
                  COL.note,
                  COL.transportFee
                ]}
                mergeBlankCellsWithinGroup
                groupStartColumnIndices={[COL.groupNo]}
                onCellDoubleClick={handleInboundDraftCellDoubleClick}
                getRowProps={({ rowIndex }) => ({
                  draggable: true,
                  onDragStart: handleStartDragInboundDraft,
                  onDragEnd: handleEndDragDraft,
                  title: "ドラッグして受注検索結果の表にドロップで追加"
                })}
              />
            </>
          )}
        </div>
      )}

      {shouldShowPickupOrdersPdfResult && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, gap: 12 }}>
          <button
            className="button"
            type="button"
            disabled={Boolean(pickupDraft)}
            title={pickupDraft ? "新規登録エリアに受注があるためロック中です（クリアしてから新規登録してください）" : undefined}
            onClick={() => setNewPickupModalOpen(true)}
          >
            + 新規受注登録
          </button>
          {draggingDraftKind === "引取" && (
            <div style={{ color: "#16a34a", fontWeight: 900, fontSize: 12 }}>この表へドロップで追加</div>
          )}
        </div>
      )}

      {shouldShowPickupOrdersPdfResult && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #e2e8f0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <div style={{ fontWeight: 900, color: "#0f172a" }}>新規登録エリア（デモ）</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="button" type="button" disabled={!pickupDraft} onClick={clearPickupDraft}>
                クリア
              </button>
            </div>
          </div>

          {!pickupDraft && (
            <p style={{ marginTop: 8, marginBottom: 0, color: "#475569", fontSize: 12 }}>
              「+ 新規受注登録」から作成すると、ここに1行追加されます。行をダブルクリックで追加入力し、行をドラッグして検索結果の表にドロップすると追加できます。
            </p>
          )}

          {pickupDraft && (
            <>
              <p style={{ marginTop: 8, marginBottom: 0, color: "#475569", fontSize: 12 }}>
                引取日: <span style={{ fontWeight: 900, color: "#0f172a" }}>{pickupDraft.pickupDate}</span>（行を掴んでドラッグ→上の表へドロップ）
              </p>
              <InboundPdfTable
                ariaLabel="新規登録エリア（引取）"
                columns={ordersPdfColumns}
                rows={pickupDraftShownRows}
                colWidths={ordersPdfColWidths}
                mergeColumnIndices={[
                  COL.issue,
                  COL.status,
                  COL.groupNo,
                  COL.usagePeriod,
                  COL.quantity,
                  COL.vehicle,
                  COL.wrecker,
                  COL.driver,
                  COL.customer,
                  COL.site,
                  COL.time,
                  COL.note,
                  COL.transportFee
                ]}
                mergeBlankCellsWithinGroup
                groupStartColumnIndices={[COL.groupNo]}
                onCellDoubleClick={handlePickupDraftCellDoubleClick}
                getRowProps={({ rowIndex }) => ({
                  draggable: true,
                  onDragStart: handleStartDragPickupDraft,
                  onDragEnd: handleEndDragDraft,
                  title: "ドラッグして受注検索結果の表にドロップで追加"
                })}
              />
            </>
          )}
        </div>
      )}
    </div>
  ) : (
    sectionsContent
  );

  return (
    <div className="app-shell">
      {ordersToast && (
        <div className={["orders-toast", `orders-toast--${ordersToast.variant}`].join(" ")}>
          {ordersToast.message}
        </div>
      )}
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
                className="button primary"
                type="button"
                onClick={() => {
                  const params = new URLSearchParams();
                  params.set("dept", activeDepartment);
                  if (inventoryFilter.kind) params.set("kind", inventoryFilter.kind);
                  if (inventoryFilter.category) params.set("category", inventoryFilter.category);
                  if (inventoryFilter.machineNo) params.set("machineNo", inventoryFilter.machineNo);
                  if (inventoryFilter.status) params.set("status", inventoryFilter.status);
                  navigate(`/inventory/check?${params.toString()}`);
                }}
              >
                在庫検索
              </button>
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
                  setPickupSearchMode("create");
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
                  navigate("/orders/move-create");
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
          <div className="filter-bar multi orders-filter-compact" style={{ marginTop: 10 }}>
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
              <label>得意先ID</label>
              <input
                className="filter-input"
                placeholder="得意先ID"
                value={ordersFilter.customerId}
                onChange={(e) => setOrdersFilter((s) => ({ ...s, customerId: e.target.value }))}
              />
            </div>
            <div className="filter-group">
              <label>得意先名</label>
              <input
                className="filter-input"
                placeholder="例) ABC建設"
                value={ordersFilter.customerName}
                onChange={(e) => setOrdersFilter((s) => ({ ...s, customerName: e.target.value }))}
              />
            </div>
            <div className="filter-group">
              <label>現場ID</label>
              <input
                className="filter-input"
                placeholder="現場ID"
                value={ordersFilter.siteId}
                onChange={(e) => setOrdersFilter((s) => ({ ...s, siteId: e.target.value }))}
              />
            </div>
            <div className="filter-group">
              <label>現場名</label>
              <input
                className="filter-input"
                placeholder="例) 高速道路改修A"
                value={ordersFilter.siteName}
                onChange={(e) => setOrdersFilter((s) => ({ ...s, siteName: e.target.value }))}
              />
            </div>
            <div className="filter-group">
              <label>種類ID</label>
              <input
                className="filter-input"
                placeholder="例) 搬入 / 引取 / 移動"
                value={ordersFilter.kindId}
                onChange={(e) => setOrdersFilter((s) => ({ ...s, kindId: e.target.value }))}
              />
            </div>
            <div className="filter-group">
              <label>種別ID</label>
              <input
                className="filter-input"
                placeholder="例) 油圧ショベル"
                value={ordersFilter.typeId}
                onChange={(e) => setOrdersFilter((s) => ({ ...s, typeId: e.target.value }))}
              />
            </div>
            <div className="filter-group">
              <label>機械No.</label>
              <input
                className="filter-input"
                placeholder="例) M-1001"
                value={ordersFilter.machineNo}
                onChange={(e) => setOrdersFilter((s) => ({ ...s, machineNo: e.target.value }))}
              />
            </div>
            <div className="filter-group">
              <label>手配の指定</label>
              <select
                className="filter-input"
                value={ordersFilter.arrangement}
                onChange={(e) => {
                  const next = e.target.value as OrdersFilter["arrangement"];
                  setOrdersFilter((s) => ({
                    ...s,
                    arrangement: next,
                    arrangementPartnerId: next === "other" ? s.arrangementPartnerId : ""
                  }));
                }}
              >
                <option value="all">全件</option>
                <option value="inhouse">自社</option>
                <option value="other">他社</option>
              </select>
            </div>
            <div className="filter-group">
              <label>取引先ID（手配）</label>
              <input
                className="filter-input"
                placeholder="他社のとき入力"
                value={ordersFilter.arrangementPartnerId}
                disabled={ordersFilter.arrangement !== "other"}
                onChange={(e) => setOrdersFilter((s) => ({ ...s, arrangementPartnerId: e.target.value }))}
              />
            </div>
            <div className="filter-group">
              <label>回送指定</label>
              <select
                className="filter-input"
                value={ordersFilter.transport}
                onChange={(e) => {
                  const next = e.target.value as OrdersFilter["transport"];
                  setOrdersFilter((s) => ({
                    ...s,
                    transport: next,
                    transportAssigneeCode: next === "all" ? "" : s.transportAssigneeCode
                  }));
                }}
              >
                <option value="all">全件</option>
                <option value="unconfirmed">未確定</option>
                <option value="client">先方</option>
                <option value="inhouse">自社</option>
                <option value="outsourced">外注</option>
              </select>
            </div>
            <div className="filter-group">
              <label>回送者指定（コード）</label>
              <input
                className="filter-input"
                placeholder={
                  ordersFilter.transport === "inhouse"
                    ? "社員ID"
                    : ordersFilter.transport === "outsourced"
                    ? "取引先ID"
                    : ordersFilter.transport === "all"
                    ? "回送指定が全件以外のとき入力"
                    : "コード入力"
                }
                value={ordersFilter.transportAssigneeCode}
                disabled={ordersFilter.transport === "all"}
                onChange={(e) => setOrdersFilter((s) => ({ ...s, transportAssigneeCode: e.target.value }))}
              />
            </div>
            <div className="filter-actions">
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
        {feature.key === "orders" && showOrdersResults && shouldShowInboundOrdersPdfResult && newInboundModalOpen && (
          <div className="modal-overlay" role="dialog" aria-modal="true">
            <div className="modal" style={{ maxWidth: 520 }}>
              <div className="modal-header">
                <h3 style={{ margin: 0 }}>新規受注登録（搬入・デモ）</h3>
                <button
                  className="button ghost"
                  type="button"
                  onClick={() => {
                    setNewInboundModalOpen(false);
                    setNewInboundErrors({});
                  }}
                >
                  閉じる
                </button>
              </div>
              <div className="modal-body">
                <p style={{ marginTop: 0, marginBottom: 10, color: "#475569", fontSize: 12, lineHeight: 1.35 }}>
                  搬入日と会社名を入力して「登録」すると、新規登録エリアに1行追加されます（デモDB: localStorage）。
                </p>
                <div style={{ display: "grid", gap: 10 }}>
                  <div style={{ display: "grid", gap: 6 }}>
                    <label style={{ fontWeight: 800, color: "#0f172a" }}>搬入日（必須）</label>
                    <input
                      className="filter-input"
                      type="date"
                      value={newInboundDate}
                      onChange={(e) => setNewInboundDate(e.target.value)}
                    />
                    {newInboundErrors.inboundDate && (
                      <div style={{ color: "#b91c1c", fontSize: 12, fontWeight: 800 }}>{newInboundErrors.inboundDate}</div>
                    )}
                  </div>
                  <div style={{ display: "grid", gap: 6 }}>
                    <label style={{ fontWeight: 800, color: "#0f172a" }}>会社名（必須）</label>
                    <input
                      className="filter-input"
                      placeholder="例) 丸建興業"
                      value={newInboundCompanyName}
                      onChange={(e) => setNewInboundCompanyName(e.target.value)}
                    />
                    {newInboundErrors.companyName && (
                      <div style={{ color: "#b91c1c", fontSize: 12, fontWeight: 800 }}>{newInboundErrors.companyName}</div>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
                  <button
                    className="button"
                    type="button"
                    onClick={() => {
                      setNewInboundModalOpen(false);
                      setNewInboundErrors({});
                    }}
                  >
                    キャンセル
                  </button>
                  <button className="button primary" type="button" onClick={handleCreateInboundDraft}>
                    登録
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {feature.key === "orders" && showOrdersResults && shouldShowPickupOrdersPdfResult && newPickupModalOpen && (
          <div className="modal-overlay" role="dialog" aria-modal="true">
            <div className="modal" style={{ maxWidth: 520 }}>
              <div className="modal-header">
                <h3 style={{ margin: 0 }}>新規受注登録（引取・デモ）</h3>
                <button
                  className="button ghost"
                  type="button"
                  onClick={() => {
                    setNewPickupModalOpen(false);
                    setNewPickupErrors({});
                  }}
                >
                  閉じる
                </button>
              </div>
              <div className="modal-body">
                <p style={{ marginTop: 0, marginBottom: 10, color: "#475569", fontSize: 12, lineHeight: 1.35 }}>
                  引取日と会社名を入力して「登録」すると、新規登録エリアに1行追加されます（デモDB: localStorage）。
                </p>
                <div style={{ display: "grid", gap: 10 }}>
                  <div style={{ display: "grid", gap: 6 }}>
                    <label style={{ fontWeight: 800, color: "#0f172a" }}>引取日（必須）</label>
                    <input
                      className="filter-input"
                      type="date"
                      value={newPickupDate}
                      onChange={(e) => setNewPickupDate(e.target.value)}
                    />
                    {newPickupErrors.pickupDate && (
                      <div style={{ color: "#b91c1c", fontSize: 12, fontWeight: 800 }}>{newPickupErrors.pickupDate}</div>
                    )}
                  </div>
                  <div style={{ display: "grid", gap: 6 }}>
                    <label style={{ fontWeight: 800, color: "#0f172a" }}>会社名（必須）</label>
                    <input
                      className="filter-input"
                      placeholder="例) 丸建興業"
                      value={newPickupCompanyName}
                      onChange={(e) => setNewPickupCompanyName(e.target.value)}
                    />
                    {newPickupErrors.companyName && (
                      <div style={{ color: "#b91c1c", fontSize: 12, fontWeight: 800 }}>{newPickupErrors.companyName}</div>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
                  <button
                    className="button"
                    type="button"
                    onClick={() => {
                      setNewPickupModalOpen(false);
                      setNewPickupErrors({});
                    }}
                  >
                    キャンセル
                  </button>
                  <button className="button primary" type="button" onClick={handleCreatePickupDraft}>
                    登録
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {feature.key === "orders" && showOrdersResults && shouldShowAnyOrdersPdfResult && issueSlipConfirmOpen && (
          <div className="modal-overlay" role="dialog" aria-modal="true">
            <div className="modal" style={{ maxWidth: 420 }}>
              <div className="modal-header">
                <h3 style={{ margin: 0 }}>確認</h3>
                <button className="button ghost" type="button" onClick={() => setIssueSlipConfirmOpen(false)}>
                  閉じる
                </button>
              </div>
              <div className="modal-body">
                <p style={{ marginTop: 0, marginBottom: 12, fontWeight: 800, color: "#0f172a" }}>
                  伝票を発行しますか？
                </p>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                  <button className="button" type="button" onClick={() => setIssueSlipConfirmOpen(false)}>
                    キャンセル
                  </button>
                  <button
                    className="button primary"
                    type="button"
                    onClick={() => {
                      setIssueSlipConfirmOpen(false);
                      if (issueSlipTargetRow != null) {
                        const shownRows = ordersPdfShownRows;
                        const groupStart = getOrdersPdfGroupStartDisplayRow(shownRows, issueSlipTargetRow);
                        setOrdersPdfCellByScope(groupStart, COL.status, "払出済");
                      }
                      showToast("✓ 伝票を発行しました（デモ）", "success", 2000);
                    }}
                  >
                    発行
                  </button>
                  <button
                    className="button"
                    type="button"
                    disabled={issueSlipTargetRow == null}
                    onClick={() => {
                      if (issueSlipTargetRow == null) return;
                      setIssueSlipConfirmOpen(false);
                      navigateToInboundOrderDetail({ scope: "results", kind: ordersPdfEditingKind, rowIndex: issueSlipTargetRow });
                    }}
                  >
                    受注詳細
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {feature.key === "orders" && showOrdersResults && shouldShowAnyOrdersPdfResult && (
          <LocationChangeModal
            open={locationModalOpen}
            locations={locationMasterMock}
            initialLocationId={locationModalInitial.id}
            initialLocationName={locationModalInitial.name}
            onOrderDetail={() => {
              const rowIndex = locationModalTargetRow;
              if (rowIndex == null) return;
              navigateToInboundOrderDetail({ scope: ordersPdfEditingScope, kind: ordersPdfEditingKind, rowIndex });
            }}
            onClose={() => {
              setLocationModalOpen(false);
              setLocationModalTargetRow(null);
              setLocationModalInitial({});
            }}
            onConfirm={(next) => {
              if (locationModalTargetRow == null) return;
              setOrdersPdfCellByScope(locationModalTargetRow, COL.location, `${next.name}（${next.id}）`);
              setLocationModalOpen(false);
              setLocationModalTargetRow(null);
              setLocationModalInitial({});
            }}
          />
        )}
        {feature.key === "orders" && showOrdersResults && shouldShowAnyOrdersPdfResult && (
          <InstructionNoteEditModal
            open={instructionNoteModalOpen}
            initialValue={instructionNoteInitial}
            onOrderDetail={() => {
              const rowIndex = instructionNoteTargetRow;
              if (rowIndex == null) return;
              navigateToInboundOrderDetail({ scope: ordersPdfEditingScope, kind: ordersPdfEditingKind, rowIndex });
            }}
            onClose={() => {
              setInstructionNoteModalOpen(false);
              setInstructionNoteTargetRow(null);
              setInstructionNoteInitial("");
            }}
            onConfirm={(nextValue) => {
              if (instructionNoteTargetRow == null) return;
              // 指示備考は「商品ではない」ため、機械名セル（2列目）だけを書き換える
              setOrdersPdfCellByScope(instructionNoteTargetRow, COL.machine, nextValue);
              // 指示備考行は数量を持たない
              setOrdersPdfCellByScope(instructionNoteTargetRow, COL.quantity, "");
              setInstructionNoteModalOpen(false);
              setInstructionNoteTargetRow(null);
              setInstructionNoteInitial("");
            }}
          />
        )}
        {feature.key === "orders" && showOrdersResults && shouldShowAnyOrdersPdfResult && (
          <PickupOrdersMachineSelectModal
            open={pickupOrdersMachineModalOpen}
            customerId={ordersFilter.customerId}
            siteId={ordersFilter.siteId}
            customerName={pickupOrdersMachineContext.customerName}
            siteName={pickupOrdersMachineContext.siteName}
            allItems={pickupOrdersMachineSelectMock}
            initialInstructionNote={pickupOrdersMachineInitialInstructionNote}
            inTableMachineNames={pickupOrdersMachineInTableNames}
            selectedFallbackMachineNames={pickupOrdersMachineSelectedFallbackNames}
            pinnedMachineId={pickupOrdersMachinePinnedId || undefined}
            pinnedMachineName={pickupOrdersMachinePinnedName || undefined}
            outboundItems={pickupOrdersMachineSelectMock
              .filter((x) => x.status === "出庫中")
              .filter((x) => {
                const customerId = ordersFilter.customerId.trim();
                const siteId = ordersFilter.siteId.trim();
                const customerOk = customerId
                  ? x.customerId.includes(customerId)
                  : pickupOrdersMachineContext.customerName
                    ? x.customerName.includes(pickupOrdersMachineContext.customerName) ||
                      pickupOrdersMachineContext.customerName.includes(x.customerName)
                    : true;
                const siteOk = siteId
                  ? x.siteId.includes(siteId)
                  : pickupOrdersMachineContext.siteName
                    ? x.siteName.includes(pickupOrdersMachineContext.siteName) ||
                      pickupOrdersMachineContext.siteName.includes(x.siteName)
                    : true;
                return customerOk && siteOk;
              })}
            orderedItems={pickupOrdersMachineSelectMock
              .filter((x) => x.status === "受注中")
              .filter((x) => {
                const customerId = ordersFilter.customerId.trim();
                const siteId = ordersFilter.siteId.trim();
                const customerOk = customerId
                  ? x.customerId.includes(customerId)
                  : pickupOrdersMachineContext.customerName
                    ? x.customerName.includes(pickupOrdersMachineContext.customerName) ||
                      pickupOrdersMachineContext.customerName.includes(x.customerName)
                    : true;
                const siteOk = siteId
                  ? x.siteId.includes(siteId)
                  : pickupOrdersMachineContext.siteName
                    ? x.siteName.includes(pickupOrdersMachineContext.siteName) ||
                      pickupOrdersMachineContext.siteName.includes(x.siteName)
                    : true;
                return customerOk && siteOk;
              })}
            initialSelectedIds={pickupOrdersMachineInitialSelectedIds}
            onOrderDetail={() => {
              const rowIndex = pickupOrdersMachineTargetRow;
              if (rowIndex == null) return;
              navigateToInboundOrderDetail({ scope: "results", kind: ordersPdfEditingKind, rowIndex });
            }}
            onClose={() => {
              setPickupOrdersMachineModalOpen(false);
              setPickupOrdersMachineTargetRow(null);
              setPickupOrdersMachineInitialSelectedIds([]);
              setPickupOrdersMachineInitialInstructionNote("");
              setPickupOrdersMachineInTableNames([]);
              setPickupOrdersMachineSelectedFallbackNames([]);
              setPickupOrdersMachinePinnedId("");
              setPickupOrdersMachinePinnedName("");
              setPickupOrdersMachineContext({});
            }}
            onConfirm={(selectedIds, instructionNote) => {
              if (pickupOrdersMachineTargetRow == null) return;
              const selected = selectedIds
                .map((id) => pickupOrdersMachineSelectMock.find((x) => x.id === id))
                .filter((x): x is NonNullable<typeof x> => Boolean(x));
              const selectedNames = Array.from(
                new Set(selected.map((x) => x.machineName).map((x) => x.trim()).filter(Boolean))
              );

              // 他行に影響を与えない: ダブルクリックした「その行」だけを更新し、追加分はその直下に挿入する
              const targetRef = ordersPdfDisplaySorted.rowRefs[pickupOrdersMachineTargetRow];
              if (!targetRef || targetRef.kind !== "引取") return;
              const targetSrcIndex = targetRef.sourceRowIndex;

              setPickupRows((prev) => {
                const next = [...prev];
                const makeEmptyRow = () => Array.from({ length: pickupOnlyOrdersPdfColumns.length }).map(() => "");

                // グループ範囲（location列が埋まっている行を起点）を算出
                let groupStart = targetSrcIndex;
                while (groupStart > 0 && !isPdfGroupStartRow(next[groupStart])) groupStart -= 1;
                let groupEnd = groupStart + 1;
                while (groupEnd < next.length && !isPdfGroupStartRow(next[groupEnd])) groupEnd += 1;

                // ピン留め（=ダブルクリックした行の機械）
                const pinnedId = pickupOrdersMachinePinnedId.trim();
                const pinnedName = pickupOrdersMachinePinnedName.trim();
                const wantsPinned = pinnedId ? selectedIds.includes(pinnedId) : true;

                // 選択結果がゼロなら「その機械を引き取らない」= グループごと削除
                const selectedSet = new Set(selectedNames);
                if (selectedSet.size === 0) {
                  // グループ内（指示備考含む）を全削除
                  next.splice(groupStart, groupEnd - groupStart);
                  return next;
                }

                // 現在グループ内の「商品行」（指示備考を除く）
                const groupRows = next.slice(groupStart, groupEnd);
                const existingProductRows: Array<{ row: string[]; machineName: string }> = [];
                for (const r of groupRows) {
                  if (isInstructionNoteRow(r)) continue;
                  const name = String(r?.[COL.machine] ?? "").trim();
                  if (!name) continue;
                  if (name.startsWith("※")) continue;
                  existingProductRows.push({ row: r, machineName: name });
                }

                // 既存行を順序維持で残す（未選択は削除）
                const kept: string[][] = [];
                const keptNames = new Set<string>();
                for (const p of existingProductRows) {
                  if (!selectedSet.has(p.machineName)) continue;
                  kept.push([...p.row]);
                  keptNames.add(p.machineName);
                }

                // 新たに選択されたが表に無いものを追加（1商品=1行）
                for (const name of selectedNames) {
                  if (!name || keptNames.has(name)) continue;
                  const row = makeEmptyRow();
                  row[COL.machine] = name;
                  row[COL.quantity] = "1";
                  kept.push(row);
                  keptNames.add(name);
                }

                // ピン留め機械が未選択なら、その行も残さない（＝チェック外しで削除）
                if (!wantsPinned && pinnedName) {
                  const filtered = kept.filter((r) => String(r?.[COL.machine] ?? "").trim() !== pinnedName);
                  kept.length = 0;
                  kept.push(...filtered);
                }

                if (kept.length === 0) {
                  next.splice(groupStart, groupEnd - groupStart);
                  return next;
                }

                // グループ先頭行の「場所/会社名/時間」などは維持したいので、元の先頭行をベースにして機械名だけ差し替える
                const originalGroupStartRow = [...(next[groupStart] ?? makeEmptyRow())];
                const firstProduct = kept[0] ?? makeEmptyRow();
                originalGroupStartRow[COL.machine] = String(firstProduct?.[COL.machine] ?? "").trim();
                originalGroupStartRow[COL.quantity] = String(firstProduct?.[COL.quantity] ?? "").trim();

                const rebuilt: string[][] = [originalGroupStartRow, ...kept.slice(1)];

                // 指示備考: 1商品選択 + ピン留め有効のときのみ反映（従来仕様）
                const noteText = normalizeInstructionNoteForCell(instructionNote);
                if (selectedIds.length === 1 && wantsPinned && noteText) {
                  const noteRow = makeEmptyRow();
                  noteRow[COL.machine] = noteText;
                  noteRow[COL.quantity] = "";
                  rebuilt.splice(1, 0, noteRow); // 先頭商品の直下
                }

                // 既存グループ（指示備考含む）を置換
                next.splice(groupStart, groupEnd - groupStart, ...rebuilt);
                return next;
              });

              setPickupOrdersMachineModalOpen(false);
              setPickupOrdersMachineTargetRow(null);
              setPickupOrdersMachineInitialSelectedIds([]);
              setPickupOrdersMachineInitialInstructionNote("");
              setPickupOrdersMachineInTableNames([]);
              setPickupOrdersMachineContext({});
            }}
          />
        )}
        {feature.key === "orders" && showOrdersResults && shouldShowAnyOrdersPdfResult && (
          <MachineTypeChangeModal
            open={machineTypeModalOpen}
            kindOptions={machineKindMasterMock}
            categoryOptions={machineCategoryMasterMock}
            initialKindId={machineTypeInitial.kindId}
            initialCategoryId={machineTypeInitial.categoryId}
            initialInstructionNote={instructionNoteInitial}
            initialQuantity={machineTypeInitialQuantity}
            disableAddProduct={machineTypeDisableAddProduct}
            onOrderDetail={() => {
              const rowIndex = machineTypeTargetRow;
              if (rowIndex == null) return;
              navigateToInboundOrderDetail({ scope: ordersPdfEditingScope, kind: ordersPdfEditingKind, rowIndex });
            }}
            onClose={() => {
              setMachineTypeModalOpen(false);
              setMachineTypeTargetRow(null);
              setMachineTypeInitial({});
              setMachineTypeDisableAddProduct(false);
              setMachineTypeInitialQuantity("");
              setInstructionNoteInitial("");
            }}
            onAddProduct={(next) => {
              if (machineTypeTargetRow == null) return;
              const productRow = Array.from({ length: inboundOrderSearchColumns.length }).map(() => "");
              // 要件: 表へ反映される機械名は「種別名」だけ
              productRow[COL.machine] = next.categoryName || "（未選択）";
              productRow[COL.quantity] = next.quantity;

              const noteText = normalizeInstructionNoteForCell(next.instructionNote);
              const rowsToInsert = [productRow];
              if (noteText) {
                const noteRow = Array.from({ length: inboundOrderSearchColumns.length }).map(() => "");
                noteRow[COL.machine] = noteText;
                noteRow[COL.quantity] = ""; // 指示備考は数量なし
                rowsToInsert.push(noteRow);
              }

              // 追加先の直下が「指示備考」なら、その下に追加する（商品と指示備考の間に割り込めないようにする）
              const shownRows =
                ordersPdfEditingScope === "draft"
                  ? inboundDraft?.rows ?? []
                  : shouldShowMixedOrdersPdfResult
                    ? ordersPdfDisplaySorted.rows
                    : shouldShowInboundOrdersPdfResult
                      ? inboundRows
                      : pickupRows;
              let insertAfter = machineTypeTargetRow;
              while (isInstructionNoteRow(shownRows[insertAfter + 1])) insertAfter += 1;

              insertOrdersPdfRowsAfterDisplayRowByScope(insertAfter, rowsToInsert);
              setMachineTypeModalOpen(false);
              setMachineTypeTargetRow(null);
              setMachineTypeInitial({});
              setMachineTypeDisableAddProduct(false);
              setMachineTypeInitialQuantity("");
              setInstructionNoteInitial("");
            }}
            onConfirm={(next) => {
              if (machineTypeTargetRow == null) return;
              // 要件: 表へ反映される機械名は「種別名」だけ
              setOrdersPdfCellByScope(machineTypeTargetRow, COL.machine, next.categoryName || "（未選択）");
              setOrdersPdfCellByScope(machineTypeTargetRow, COL.quantity, next.quantity);

              const noteText = normalizeInstructionNoteForCell(next.instructionNote);
              if (noteText) {
                // 既に直下に指示備考行があるなら更新、なければ追加
                const shownRows =
                  ordersPdfEditingScope === "draft"
                    ? inboundDraft?.rows ?? []
                    : shouldShowMixedOrdersPdfResult
                      ? ordersPdfDisplaySorted.rows
                      : shouldShowInboundOrdersPdfResult
                        ? inboundRows
                        : pickupRows;
                const nextRow = shownRows[machineTypeTargetRow + 1];
                const hasNoteRowDirectlyBelow = isInstructionNoteRow(nextRow);

                if (hasNoteRowDirectlyBelow) {
                  setOrdersPdfCellByScope(machineTypeTargetRow + 1, COL.machine, noteText);
                  setOrdersPdfCellByScope(machineTypeTargetRow + 1, COL.quantity, ""); // 数量なし
                } else {
                  const noteRow = Array.from({ length: inboundOrderSearchColumns.length }).map(() => "");
                  noteRow[COL.machine] = noteText;
                  noteRow[COL.quantity] = ""; // 指示備考は数量なし
                  insertOrdersPdfRowsAfterDisplayRowByScope(machineTypeTargetRow, [noteRow]);
                }
              }

              setMachineTypeModalOpen(false);
              setMachineTypeTargetRow(null);
              setMachineTypeInitial({});
              setMachineTypeDisableAddProduct(false);
              setMachineTypeInitialQuantity("");
              setInstructionNoteInitial("");
            }}
          />
        )}
        {feature.key === "orders" && showOrdersResults && shouldShowAnyOrdersPdfResult && (
          <MachineNoEditModal
            open={machineNoModalOpen}
            machineNoOptions={machineNoOptions}
            initialValue={machineNoInitial}
            onOrderDetail={() => {
              const rowIndex = machineNoTargetRow;
              if (rowIndex == null) return;
              navigateToInboundOrderDetail({ scope: ordersPdfEditingScope, kind: ordersPdfEditingKind, rowIndex });
            }}
            onClose={() => {
              setMachineNoModalOpen(false);
              setMachineNoTargetRow(null);
              setMachineNoInitial("");
            }}
            onConfirm={(nextValue) => {
              if (machineNoTargetRow == null) return;
              setOrdersPdfCellByScope(machineNoTargetRow, COL.machineNo, nextValue);
              setMachineNoModalOpen(false);
              setMachineNoTargetRow(null);
              setMachineNoInitial("");
            }}
          />
        )}
        {feature.key === "orders" && showOrdersResults && shouldShowAnyOrdersPdfResult && (
          <SimpleValueEditModal
            open={orderStatusModalOpen}
            title="状態 変更（デモ）"
            description="状態セルのダブルクリックで開くデモモーダルです。"
            mode="select"
            options={orderStatusOptions}
            initialValue={orderStatusInitial}
            onOrderDetail={() => {
              const rowIndex = orderStatusTargetRow;
              if (rowIndex == null) return;
              navigateToInboundOrderDetail({ scope: ordersPdfEditingScope, kind: ordersPdfEditingKind, rowIndex });
            }}
            onClose={() => {
              setOrderStatusModalOpen(false);
              setOrderStatusTargetRow(null);
              setOrderStatusInitial("予約");
            }}
            onConfirm={(nextValue) => {
              if (orderStatusTargetRow == null) return;
              setOrdersPdfCellByScope(orderStatusTargetRow, COL.status, nextValue);
              setOrderStatusModalOpen(false);
              setOrderStatusTargetRow(null);
              setOrderStatusInitial("予約");
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
            onOrderDetail={() => {
              const rowIndex = quantityTargetRow;
              if (rowIndex == null) return;
              navigateToInboundOrderDetail({ scope: ordersPdfEditingScope, kind: ordersPdfEditingKind, rowIndex });
            }}
            onClose={() => {
              setQuantityModalOpen(false);
              setQuantityTargetRow(null);
              setQuantityInitial("");
            }}
            onConfirm={(nextValue) => {
              if (quantityTargetRow == null) return;
              setOrdersPdfCellByScope(quantityTargetRow, COL.quantity, nextValue);
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
            onOrderDetail={() => {
              const rowIndex = vehicleTargetRow;
              if (rowIndex == null) return;
              navigateToInboundOrderDetail({ scope: ordersPdfEditingScope, kind: ordersPdfEditingKind, rowIndex });
            }}
            onClose={() => {
              setVehicleModalOpen(false);
              setVehicleTargetRow(null);
              setVehicleInitial("");
            }}
            onConfirm={(nextValue) => {
              if (vehicleTargetRow == null) return;
              setOrdersPdfCellByScope(vehicleTargetRow, COL.vehicle, nextValue);
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
            onOrderDetail={() => {
              const rowIndex = wreckerTargetRow;
              if (rowIndex == null) return;
              navigateToInboundOrderDetail({ scope: ordersPdfEditingScope, kind: ordersPdfEditingKind, rowIndex });
            }}
            onClose={() => {
              setWreckerModalOpen(false);
              setWreckerTargetRow(null);
              setWreckerInitial("");
            }}
            onConfirm={(nextValue) => {
              if (wreckerTargetRow == null) return;
              // 「選択無し」は空欄にする
              setOrdersPdfCellByScope(wreckerTargetRow, COL.wrecker, nextValue === "選択無し" ? "" : nextValue);
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
            initialDriverName={driverInitial.driverName}
            initialId={driverInitial.id}
            onOrderDetail={() => {
              const rowIndex = driverTargetRow;
              if (rowIndex == null) return;
              navigateToInboundOrderDetail({ scope: ordersPdfEditingScope, kind: ordersPdfEditingKind, rowIndex });
            }}
            onClose={() => {
              setDriverModalOpen(false);
              setDriverTargetRow(null);
              setDriverInitial({});
            }}
            onConfirm={(next) => {
              if (driverTargetRow == null) return;
              // 表（運転手セル）は「運転手名のみ」表示（区分/IDが未入力でもOK）
              setOrdersPdfCellByScope(driverTargetRow, COL.driver, next.driverName.trim());
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
            onOrderDetail={() => {
              const rowIndex = siteTargetRow;
              if (rowIndex == null) return;
              navigateToInboundOrderDetail({ scope: ordersPdfEditingScope, kind: ordersPdfEditingKind, rowIndex });
            }}
            onClose={() => {
              setSiteModalOpen(false);
              setSiteTargetRow(null);
              setSiteInitial({});
            }}
            onConfirm={(next) => {
              if (siteTargetRow == null) return;
              setOrdersPdfCellByScope(siteTargetRow, COL.site, `${next.siteName}（${next.siteId}）`);
              setSiteModalOpen(false);
              setSiteTargetRow(null);
              setSiteInitial({});
            }}
          />
        )}
        {feature.key === "orders" && (
          <>
            <SimpleValueEditModal
              open={orderTakerModalOpen}
              title="受注者 選択（デモ）"
              description="受注者（選択/検索）のデモモーダルです。"
              mode="select"
              options={orderTakerOptions}
              initialValue={orderDemo.orderTaker || orderTakerOptions[0] || ""}
              onClose={() => setOrderTakerModalOpen(false)}
              onConfirm={(nextValue) => {
                patchOrderDemo({ orderTaker: nextValue });
                setOrderTakerModalOpen(false);
              }}
            />
            <SimpleValueEditModal
              open={customerModalOpen}
              title="取引先 選択（デモ）"
              description="取引先コード/取引先（選択/検索）のデモモーダルです。"
              mode="select"
              options={customerNameOptions}
              initialValue={orderDemo.customerName || customerNameOptions[0] || ""}
              onClose={() => setCustomerModalOpen(false)}
              onConfirm={(nextValue) => {
                patchOrderDemo({ customerName: nextValue, customerCode: createCustomerCode(nextValue) });
                setCustomerModalOpen(false);
              }}
            />
            <SimpleValueEditModal
              open={constructionModalOpen}
              title="工事名 選択（デモ）"
              description="工事名（選択/検索）のデモモーダルです。"
              mode="select"
              options={constructionNameOptions}
              initialValue={orderDemo.constructionName || constructionNameOptions[0] || ""}
              onClose={() => setConstructionModalOpen(false)}
              onConfirm={(nextValue) => {
                patchOrderDemo({ constructionName: nextValue });
                setConstructionModalOpen(false);
              }}
            />
            <SiteEditModal
              open={orderHeaderSiteModalOpen}
              title="現場 選択（デモ）"
              sites={siteMasterMock}
              initialSiteId={orderDemo.siteCode}
              initialSiteName={orderDemo.siteName}
              onClose={() => setOrderHeaderSiteModalOpen(false)}
              onConfirm={(next) => {
                patchOrderDemo({ siteCode: next.siteId, siteName: next.siteName });
                setOrderHeaderSiteModalOpen(false);
              }}
            />
          </>
        )}
        {feature.key === "orders" && showOrdersResults && shouldShowAnyOrdersPdfResult && (
          <TimeRangeEditModal
            open={timeModalOpen}
            initialValue={timeInitial}
            onOrderDetail={() => {
              const rowIndex = timeTargetRow;
              if (rowIndex == null) return;
              navigateToInboundOrderDetail({ scope: ordersPdfEditingScope, kind: ordersPdfEditingKind, rowIndex });
            }}
            onClose={() => {
              setTimeModalOpen(false);
              setTimeTargetRow(null);
              setTimeInitial("");
            }}
            onConfirm={(nextValue) => {
              if (timeTargetRow == null) return;
              setOrdersPdfCellByScope(timeTargetRow, COL.time, nextValue);
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
            onOrderDetail={() => {
              const rowIndex = factoryNoteTargetRow;
              if (rowIndex == null) return;
              navigateToInboundOrderDetail({ scope: ordersPdfEditingScope, kind: ordersPdfEditingKind, rowIndex });
            }}
            onClose={() => {
              setFactoryNoteModalOpen(false);
              setFactoryNoteTargetRow(null);
              setFactoryNoteInitial("");
            }}
            onConfirm={(nextValue) => {
              if (factoryNoteTargetRow == null) return;
              setOrdersPdfCellByScope(factoryNoteTargetRow, COL.note, nextValue);
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
            onOrderDetail={() => {
              const rowIndex = transportFeeTargetRow;
              if (rowIndex == null) return;
              navigateToInboundOrderDetail({ scope: ordersPdfEditingScope, kind: ordersPdfEditingKind, rowIndex });
            }}
            onClose={() => {
              setTransportFeeModalOpen(false);
              setTransportFeeTargetRow(null);
              setTransportFeeInitial("");
            }}
            onConfirm={(nextValue) => {
              if (transportFeeTargetRow == null) return;
              setOrdersPdfCellByScope(transportFeeTargetRow, COL.transportFee, nextValue);
              setTransportFeeModalOpen(false);
              setTransportFeeTargetRow(null);
              setTransportFeeInitial("");
            }}
          />
        )}
        {feature.key === "orders" && orderCreateType && orderCreateType !== "移動" && (
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
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div className="order-lines" style={{ order: 2 }}>
                  <div className="order-lines-header">
                    <div style={{ fontWeight: 800, color: "#334155" }}>商品明細</div>
                    <button
                      className="button"
                      type="button"
                      onClick={() => {
                        if (orderCreateType === "引取") {
                          setPickupSearchMode("append");
                          setPickupSearchForm((s) => ({
                            ...s,
                            customerName: orderDemo.customerName || s.customerName,
                            salesRep: orderDemo.orderTaker || s.salesRep,
                            siteName: orderDemo.siteName || s.siteName,
                            constructionName: orderDemo.constructionName || s.constructionName,
                            address: orderDemo.siteAddress || s.address
                          }));
                          setShowPickupSearchModal(true);
                          setPickupSearchShowResults(false);
                          setPickupMachineSelectedIds([]);
                          return;
                        }
                        setOrderLines((s) => [...s, createInitialOrderLine()]);
                      }}
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

                <div className="order-demo-form" style={{ order: 1 }}>
                  <div className="order-demo-row cols-4">
                    <div className="order-demo-cell">
                      <div className="order-demo-label">ステータス</div>
                      <select
                        className="order-demo-input"
                        value={orderDemo.status}
                        onChange={(e) => patchOrderDemo({ status: e.target.value as OrderDemoForm["status"] })}
                      >
                        <option value="受付">受付</option>
                        <option value="手配中">手配中</option>
                        <option value="完了">完了</option>
                        <option value="キャンセル">キャンセル</option>
                      </select>
                    </div>
                    <div className="order-demo-cell">
                      <div className="order-demo-label">受注番号（自動）</div>
                      <input className="order-demo-input" value={orderDemo.orderNo} readOnly />
                    </div>
                    <div className="order-demo-cell">
                      <div className="order-demo-label">受注種類（自動）</div>
                      <div className="order-demo-inline">
                        <input className="order-demo-input" value={orderCreateType ?? ""} readOnly />
                        <button className="button" type="button" disabled>
                          地図フォルダー（ダミー）
                        </button>
                      </div>
                    </div>
                    <div className="order-demo-cell">
                      <div className="order-demo-label">入力者（自動）</div>
                      <input className="order-demo-input" value={orderDemo.inputer} readOnly />
                    </div>
                  </div>

                  <div className="order-demo-row cols-4">
                    <div className="order-demo-cell">
                      <div className="order-demo-label">{orderCreateType === "引取" ? "引取日" : "日付"}</div>
                      <input
                        className="order-demo-input"
                        type="date"
                        value={orderDemo.inboundDate}
                        onChange={(e) => patchOrderDemo({ inboundDate: e.target.value })}
                      />
                    </div>
                    <div className="order-demo-cell">
                      <div className="order-demo-label">終了日</div>
                      <input
                        className="order-demo-input"
                        type="date"
                        value={orderDemo.endDate}
                        onChange={(e) => patchOrderDemo({ endDate: e.target.value })}
                      />
                    </div>
                    <div className="order-demo-cell">
                      <div className="order-demo-label">{orderCreateType === "引取" ? "引取時間" : "時間"}</div>
                      <div className="order-demo-inline">
                        <input
                          className="order-demo-input"
                          type="time"
                          value={orderDemo.inboundTimeFrom}
                          onChange={(e) => patchOrderDemo({ inboundTimeFrom: e.target.value })}
                        />
                        <span className="order-demo-sep">〜</span>
                        <input
                          className="order-demo-input"
                          type="time"
                          value={orderDemo.inboundTimeTo}
                          onChange={(e) => patchOrderDemo({ inboundTimeTo: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="order-demo-cell">
                      <div className="order-demo-label">引取確定</div>
                      <label className="order-demo-check" style={{ width: "fit-content" }}>
                        <input
                          type="checkbox"
                          checked={orderDemo.pickupConfirmed}
                          onChange={() => patchOrderDemo({ pickupConfirmed: !orderDemo.pickupConfirmed })}
                        />
                        <span>確定</span>
                      </label>
                    </div>
                  </div>

                  <div className="order-demo-row cols-4">
                    <div className="order-demo-cell">
                      <div className="order-demo-label">受注者（選択/検索）</div>
                      <div className="order-demo-inline">
                        <input className="order-demo-input" value={orderDemo.orderTaker} readOnly />
                        <button className="button" type="button" onClick={() => setOrderTakerModalOpen(true)}>
                          選択
                        </button>
                      </div>
                    </div>
                    <div className="order-demo-cell">
                      <div className="order-demo-label">回送区分（区分）</div>
                      <select
                        className="order-demo-input"
                        value={orderDemo.transportDivision}
                        onChange={(e) =>
                          patchOrderDemo({ transportDivision: e.target.value as OrderDemoForm["transportDivision"] })
                        }
                      >
                        <option value="回送">回送</option>
                        <option value="自社">自社</option>
                        <option value="外注">外注</option>
                        <option value="">未選択</option>
                      </select>
                    </div>
                    <div className="order-demo-cell">
                      <div className="order-demo-label">回送区分（回送元）</div>
                      <select
                        className="order-demo-input"
                        value={orderDemo.transportBase}
                        onChange={(e) =>
                          patchOrderDemo({ transportBase: e.target.value as OrderDemoForm["transportBase"] })
                        }
                      >
                        <option value="本社">本社</option>
                        <option value="支店">支店</option>
                        <option value="ヤード">ヤード</option>
                        <option value="">未選択</option>
                      </select>
                    </div>
                    <div className="order-demo-cell">
                      <div className="order-demo-label">レッカー</div>
                      <select
                        className="order-demo-input"
                        value={orderDemo.wrecker}
                        onChange={(e) => patchOrderDemo({ wrecker: e.target.value })}
                      >
                        <option value="">未選択</option>
                        {wreckerOptions.map((x) => (
                          <option key={x} value={x}>
                            {x}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="order-demo-row cols-4">
                    <div className="order-demo-cell">
                      <div className="order-demo-label">取引先コード（選択/検索）</div>
                      <div className="order-demo-inline">
                        <input className="order-demo-input" value={orderDemo.customerCode} readOnly />
                        <button className="button" type="button" onClick={() => setCustomerModalOpen(true)}>
                          選択
                        </button>
                      </div>
                    </div>
                    <div className="order-demo-cell">
                      <div className="order-demo-label">取引先（選択/検索）</div>
                      <div className="order-demo-inline">
                        <input className="order-demo-input" value={orderDemo.customerName} readOnly />
                        <button className="button" type="button" onClick={() => setCustomerModalOpen(true)}>
                          選択
                        </button>
                      </div>
                    </div>
                    <div className="order-demo-cell">
                      <div className="order-demo-label">参考資料リンク</div>
                      <input
                        className="order-demo-input"
                        value={orderDemo.referenceLink}
                        onChange={(e) => patchOrderDemo({ referenceLink: e.target.value })}
                        placeholder="https://...（デモ）"
                      />
                    </div>
                    <div className="order-demo-cell">
                      <div className="order-demo-label">発注者</div>
                      <input
                        className="order-demo-input"
                        value={orderDemo.orderer}
                        onChange={(e) => patchOrderDemo({ orderer: e.target.value })}
                        placeholder="例) ○○様"
                      />
                    </div>
                  </div>

                  <div className="order-demo-row cols-3">
                    <div className="order-demo-cell">
                      <div className="order-demo-label">現場コード（選択/検索）</div>
                      <div className="order-demo-inline">
                        <input className="order-demo-input" value={orderDemo.siteCode} readOnly />
                        <button className="button" type="button" onClick={() => setOrderHeaderSiteModalOpen(true)}>
                          選択
                        </button>
                      </div>
                    </div>
                    <div className="order-demo-cell">
                      <div className="order-demo-label">現場（選択/検索）</div>
                      <div className="order-demo-inline">
                        <input className="order-demo-input" value={orderDemo.siteName} readOnly />
                        <button className="button" type="button" onClick={() => setOrderHeaderSiteModalOpen(true)}>
                          選択
                        </button>
                      </div>
                    </div>
                    <div className="order-demo-cell">
                      <div className="order-demo-label">住所（自動）</div>
                      <input className="order-demo-input" value={orderDemo.siteAddress} readOnly />
                    </div>
                  </div>

                  <div className="order-demo-row cols-3">
                    <div className="order-demo-cell">
                      <div className="order-demo-label">工事名（選択/検索）</div>
                      <div className="order-demo-inline">
                        <input className="order-demo-input" value={orderDemo.constructionName} readOnly />
                        <button className="button" type="button" onClick={() => setConstructionModalOpen(true)}>
                          選択
                        </button>
                      </div>
                    </div>
                    <div className="order-demo-cell">
                      <div className="order-demo-label">引取予定日</div>
                      <input
                        className="order-demo-input"
                        type="date"
                        value={orderDemo.pickupPlannedDate}
                        onChange={(e) => patchOrderDemo({ pickupPlannedDate: e.target.value })}
                      />
                    </div>
                    <div className="order-demo-cell">
                      <div className="order-demo-label">使用日数</div>
                      <input
                        className="order-demo-input"
                        inputMode="numeric"
                        value={orderDemo.useDays}
                        onChange={(e) => patchOrderDemo({ useDays: e.target.value })}
                        placeholder="例) 10"
                      />
                    </div>
                  </div>

                  <div className="order-demo-row cols-4">
                    <div className="order-demo-cell">
                      <div className="order-demo-label">車両</div>
                      <label className="order-demo-check" style={{ width: "fit-content" }}>
                        <input
                          type="checkbox"
                          checked={orderDemo.hasVehicle}
                          onChange={() =>
                            patchOrderDemo({
                              hasVehicle: !orderDemo.hasVehicle,
                              vehicleInfo: !orderDemo.hasVehicle ? orderDemo.vehicleInfo : ""
                            })
                          }
                        />
                        <span>有</span>
                      </label>
                    </div>
                    <div className="order-demo-cell span-2">
                      <div className="order-demo-label">車両指定車情報</div>
                      <input
                        className="order-demo-input"
                        value={orderDemo.vehicleInfo}
                        onChange={(e) => patchOrderDemo({ vehicleInfo: e.target.value })}
                        placeholder="例) ナンバー / 車種など"
                        disabled={!orderDemo.hasVehicle}
                      />
                    </div>
                    <div className="order-demo-cell">
                      <div className="order-demo-label">回送費・車両サイズ</div>
                      <select
                        className="order-demo-input"
                        value={orderDemo.transportFeeVehicleSize}
                        onChange={(e) => patchOrderDemo({ transportFeeVehicleSize: e.target.value })}
                      >
                        <option value="">未選択</option>
                        {vehicleSizeOptions.map((v) => (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="order-demo-row cols-3">
                    <div className="order-demo-cell">
                      <div className="order-demo-label">回送費・住所</div>
                      <input
                        className="order-demo-input"
                        value={orderDemo.transportFeeAddress}
                        onChange={(e) => patchOrderDemo({ transportFeeAddress: e.target.value })}
                        placeholder="例) ○○県○○市..."
                      />
                    </div>
                    <div className="order-demo-cell">
                      <div className="order-demo-label">回送費・金額</div>
                      <input
                        className="order-demo-input"
                        inputMode="numeric"
                        value={orderDemo.transportFeeAmount}
                        onChange={(e) => patchOrderDemo({ transportFeeAmount: e.target.value })}
                        placeholder="例) 30000"
                      />
                    </div>
                    <div className="order-demo-cell">
                      <div className="order-demo-label">作成日時 / 更新日時（自動）</div>
                      <div className="order-demo-inline">
                        <input className="order-demo-input" value={orderDemo.createdAt} readOnly />
                        <input className="order-demo-input" value={orderDemo.updatedAt} readOnly />
                      </div>
                    </div>
                  </div>

                  <div className="order-demo-row cols-3">
                    <div className="order-demo-cell">
                      <div className="order-demo-label">現地連絡先（名前）</div>
                      <input
                        className="order-demo-input"
                        value={orderDemo.siteContactName}
                        onChange={(e) => {
                          const nextName = e.target.value;
                          patchOrderDemo({
                            siteContactName: nextName,
                            siteContactTel: orderDemo.siteContactTel || (nextName.trim() ? "090-0000-0000" : "")
                          });
                        }}
                        placeholder="例) 山田 太郎"
                      />
                    </div>
                    <div className="order-demo-cell">
                      <div className="order-demo-label">現地連絡先（電話番号）（自動）</div>
                      <input className="order-demo-input" value={orderDemo.siteContactTel} readOnly />
                    </div>
                    <div className="order-demo-cell">
                      <div className="order-demo-label">（予備）</div>
                      <input className="order-demo-input" value="" readOnly />
                    </div>
                  </div>

                  <div className="order-demo-row cols-3 notes">
                    <div className="order-demo-cell">
                      <div className="order-demo-label">フロント備考</div>
                      <textarea
                        className="order-demo-textarea"
                        value={orderDemo.noteFront}
                        onChange={(e) => patchOrderDemo({ noteFront: e.target.value })}
                        placeholder="フロント向けメモ"
                      />
                    </div>
                    <div className="order-demo-cell">
                      <div className="order-demo-label">工場備考</div>
                      <textarea
                        className="order-demo-textarea"
                        value={orderDemo.noteFactory}
                        onChange={(e) => patchOrderDemo({ noteFactory: e.target.value })}
                        placeholder="工場向けメモ"
                      />
                    </div>
                    <div className="order-demo-cell">
                      <div className="order-demo-label">ドライバー備考</div>
                      <textarea
                        className="order-demo-textarea"
                        value={orderDemo.noteDriver}
                        onChange={(e) => patchOrderDemo({ noteDriver: e.target.value })}
                        placeholder="ドライバー向けメモ"
                      />
                    </div>
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
                            if (pickupSearchMode === "append") {
                              const nextLines = buildOrderLinesFromSelectedMachines(selected);
                              setOrderLines((prev) => [...prev, ...nextLines]);
                              setShowPickupSearchModal(false);
                              setPickupSearchShowResults(false);
                              setPickupMachineSelectedIds([]);
                              return;
                            }

                            const first = selected[0];
                            setPendingPickupCreate({
                              orderDemoPatch: {
                                orderTaker: first?.salesRep ?? "",
                                customerName: first?.customerName ?? "",
                                customerCode: createCustomerCode(first?.customerName ?? ""),
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
                          {pickupSearchMode === "append" ? "商品追加" : "引取受注作成"}
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

