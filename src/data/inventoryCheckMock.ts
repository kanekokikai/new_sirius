export type InventoryCheckRow = {
  kind: string; // 種類
  type: string; // 種別
  machineNo: string; // 機械No.
  name1: string; // 品名1
  name2: string; // 品名2
  name3: string; // 品名3
  customer: string; // 得意先（出庫中データモーダル用）
  orderTaker: string; // 受注者（出庫中データモーダル用）
  site: string; // 現場（出庫中データモーダル用）
  siteContact: string; // 現場連絡先（出庫中データモーダル用）
  startDate: string; // 開始日（出庫中データモーダル用）
  loaned: number; // 貸出中
  stock: number; // 在庫数
  latestInboundDate: string; // 最新入庫日
  whHonsya: number; // 倉庫1 本社
  whKouta: number; // 倉庫2 公田
  whChiba: number; // 倉庫3 千葉
  whChibaKita: number; // 倉庫4 千葉北
  whIbaraki: number; // 倉庫5 茨城
  whIbarakiOkiba: number; // 倉庫5 茨城置場（※要件の表記に合わせる）
  returnDueDate: string; // 返納予定日
  repairing: number; // 修理中
  maintaining: number; // 整備中
  usedSalePlanned: number; // 中古販売予定
  repairMemo?: {
    id: string; // 管理番号（例: #0001）
    writer: string;
    title: string;
    location: string; // 置場
    body: string;
    /** 修理用（デモ） */
    repairStartDate?: string; // yyyy-mm-dd
    repairEndPlannedDate?: string; // yyyy-mm-dd
    /** 在庫移動（保存で移動確定）した時刻（デモ） */
    completedAt?: number;
    createdAt: number;
    updatedAt: number;
  } | null;
  maintenanceMemo?: {
    id: string; // 管理番号（例: #0001）
    writer: string;
    title: string;
    location: string; // 置場
    body: string;
    /** 在庫移動（保存で移動確定）した時刻（デモ） */
    completedAt?: number;
    createdAt: number;
    updatedAt: number;
  } | null;
  usedSaleMemo?: {
    id: string; // 管理番号（例: #0001）
    writer: string;
    title: string;
    location: string; // 置場
    body: string;
    /** 在庫移動（保存で移動確定）した時刻（デモ） */
    completedAt?: number;
    createdAt: number;
    updatedAt: number;
  } | null;
};

export const inventoryCheckColumns: string[] = [
  "種類",
  "種別",
  "機械No.",
  "品名1",
  "品名2",
  "品名3",
  "貸出中",
  "在庫数",
  "最新入庫日",
  "倉庫1　本社",
  "倉庫2　公田",
  "倉庫3　千葉",
  "倉庫4　千葉北",
  "倉庫5　茨城",
  "倉庫5　茨城置場",
  "返納予定日",
  "修理中",
  "整備中",
  "中古販売予定"
];

const n2 = (n: number) => (n > 0 ? n.toFixed(2) : "");

export const inventoryCheckToTableRow = (r: InventoryCheckRow): string[] => [
  r.kind,
  r.type,
  r.machineNo,
  r.name1,
  r.name2,
  r.name3,
  n2(r.loaned),
  r.repairing > 0 || r.maintaining > 0 || r.usedSalePlanned > 0 ? "" : n2(r.stock),
  r.latestInboundDate,
  n2(r.whHonsya),
  n2(r.whKouta),
  n2(r.whChiba),
  n2(r.whChibaKita),
  n2(r.whIbaraki),
  n2(r.whIbarakiOkiba),
  r.returnDueDate,
  n2(r.repairing),
  n2(r.maintaining),
  n2(r.usedSalePlanned)
];

/**
 * 在庫一覧（デモ）
 * - 添付スクショの見た目を元に、A59〜A73相当の行を作成
 * - 倉庫列は「どこに1台あるか」を示す想定で 1.00 を入れています
 */
export const inventoryCheckMockRows: InventoryCheckRow[] = [
  {
    kind: "M",
    type: "0012",
    machineNo: "A59",
    name1: "0.15 ミニショベル",
    name2: "VIO25-6",
    name3: "0.12-A59",
    customer: "",
    orderTaker: "",
    site: "",
    siteContact: "",
    startDate: "",
    loaned: 0,
    stock: 1,
    latestInboundDate: "2025/11/18",
    whHonsya: 0,
    whKouta: 0,
    whChiba: 1,
    whChibaKita: 0,
    whIbaraki: 0,
    whIbarakiOkiba: 0,
    returnDueDate: "",
    repairing: 0,
    maintaining: 0,
    usedSalePlanned: 0
  },
  {
    kind: "M",
    type: "0012",
    machineNo: "A60",
    name1: "0.15 ミニショベル",
    name2: "VIO25-6",
    name3: "0.12-A60",
    customer: "山田建設",
    orderTaker: "鈴木",
    site: "千葉市中央区 新築現場",
    siteContact: "090-1234-5678",
    startDate: "2026/01/10",
    loaned: 1,
    stock: 0,
    latestInboundDate: "",
    whHonsya: 0,
    whKouta: 0,
    whChiba: 0,
    whChibaKita: 0,
    whIbaraki: 0,
    whIbarakiOkiba: 0,
    returnDueDate: "",
    repairing: 0,
    maintaining: 0,
    usedSalePlanned: 0
  },
  {
    kind: "M",
    type: "0012",
    machineNo: "A61",
    name1: "0.15 ミニショベル",
    name2: "VIO25-6",
    name3: "0.12-A61",
    customer: "",
    orderTaker: "",
    site: "",
    siteContact: "",
    startDate: "",
    loaned: 0,
    stock: 1,
    latestInboundDate: "2026/01/28",
    whHonsya: 0,
    whKouta: 0,
    whChiba: 0,
    whChibaKita: 0,
    whIbaraki: 0,
    whIbarakiOkiba: 0,
    returnDueDate: "",
    repairing: 1,
    maintaining: 0,
    usedSalePlanned: 0
  },
  {
    kind: "M",
    type: "0012",
    machineNo: "A62",
    name1: "0.15 ミニショベル",
    name2: "VIO25-6",
    name3: "0.12-A62",
    customer: "佐藤工務店",
    orderTaker: "田中",
    site: "茨城県つくば市 造成現場",
    siteContact: "029-123-4567",
    startDate: "2026/01/18",
    loaned: 1,
    stock: 0,
    latestInboundDate: "",
    whHonsya: 0,
    whKouta: 0,
    whChiba: 0,
    whChibaKita: 0,
    whIbaraki: 0,
    whIbarakiOkiba: 0,
    returnDueDate: "2026/02/15",
    repairing: 0,
    maintaining: 0,
    usedSalePlanned: 0
  },
  {
    kind: "M",
    type: "0012",
    machineNo: "A63",
    name1: "0.15 ミニショベル",
    name2: "VIO25-6",
    name3: "0.12-A63",
    customer: "",
    orderTaker: "",
    site: "",
    siteContact: "",
    startDate: "",
    loaned: 0,
    stock: 1,
    latestInboundDate: "2026/01/28",
    whHonsya: 0,
    whKouta: 0,
    whChiba: 0,
    whChibaKita: 0,
    whIbaraki: 0,
    whIbarakiOkiba: 0,
    returnDueDate: "",
    repairing: 0,
    maintaining: 1,
    usedSalePlanned: 0
  },
  {
    kind: "M",
    type: "0012",
    machineNo: "A64",
    name1: "0.15 ミニショベル",
    name2: "VIO25-6",
    name3: "0.12-A64",
    customer: "丸和土木",
    orderTaker: "伊藤",
    site: "柏市 道路改良工事",
    siteContact: "04-1234-5678",
    startDate: "2026/01/05",
    loaned: 1,
    stock: 0,
    latestInboundDate: "",
    whHonsya: 0,
    whKouta: 0,
    whChiba: 0,
    whChibaKita: 0,
    whIbaraki: 0,
    whIbarakiOkiba: 0,
    returnDueDate: "",
    repairing: 0,
    maintaining: 0,
    usedSalePlanned: 0
  },
  {
    kind: "M",
    type: "0012",
    machineNo: "A65",
    name1: "0.15 ミニショベル",
    name2: "VIO25-6",
    name3: "0.12-A65",
    customer: "新星建機リース",
    orderTaker: "高橋",
    site: "成田市 倉庫増築",
    siteContact: "0476-12-3456",
    startDate: "2026/01/12",
    loaned: 1,
    stock: 0,
    latestInboundDate: "",
    whHonsya: 0,
    whKouta: 0,
    whChiba: 0,
    whChibaKita: 0,
    whIbaraki: 0,
    whIbarakiOkiba: 0,
    returnDueDate: "",
    repairing: 0,
    maintaining: 0,
    usedSalePlanned: 0
  },
  {
    kind: "M",
    type: "0012",
    machineNo: "A66",
    name1: "0.15 ミニショベル",
    name2: "VIO25-6",
    name3: "0.12-A66",
    customer: "松本建設",
    orderTaker: "佐々木",
    site: "流山市 造成工事",
    siteContact: "04-9876-5432",
    startDate: "2026/01/14",
    loaned: 1,
    stock: 0,
    latestInboundDate: "",
    whHonsya: 0,
    whKouta: 0,
    whChiba: 0,
    whChibaKita: 0,
    whIbaraki: 0,
    whIbarakiOkiba: 0,
    returnDueDate: "",
    repairing: 0,
    maintaining: 0,
    usedSalePlanned: 0
  },
  {
    kind: "M",
    type: "0012",
    machineNo: "A67",
    name1: "0.15 ミニショベル",
    name2: "VIO25-6",
    name3: "0.12-A67",
    customer: "小林工業",
    orderTaker: "加藤",
    site: "市原市 擁壁工事",
    siteContact: "0436-12-3456",
    startDate: "2026/01/20",
    loaned: 1,
    stock: 0,
    latestInboundDate: "",
    whHonsya: 0,
    whKouta: 0,
    whChiba: 0,
    whChibaKita: 0,
    whIbaraki: 0,
    whIbarakiOkiba: 0,
    returnDueDate: "2026/02/10",
    repairing: 0,
    maintaining: 0,
    usedSalePlanned: 0
  },
  {
    kind: "M",
    type: "0012",
    machineNo: "A68",
    name1: "0.15 ミニショベル",
    name2: "VIO25-6",
    name3: "0.12-A68",
    customer: "",
    orderTaker: "",
    site: "",
    siteContact: "",
    startDate: "",
    loaned: 0,
    stock: 1,
    latestInboundDate: "2026/01/28",
    whHonsya: 1,
    whKouta: 0,
    whChiba: 0,
    whChibaKita: 0,
    whIbaraki: 0,
    whIbarakiOkiba: 0,
    returnDueDate: "",
    repairing: 0,
    maintaining: 0,
    usedSalePlanned: 0
  },
  {
    kind: "M",
    type: "0012",
    machineNo: "A69",
    name1: "0.15 ミニショベル",
    name2: "VIO25-6",
    name3: "0.12-A69",
    customer: "東関東建設",
    orderTaker: "渡辺",
    site: "千葉市若葉区 解体現場",
    siteContact: "043-123-4567",
    startDate: "2026/01/08",
    loaned: 1,
    stock: 0,
    latestInboundDate: "",
    whHonsya: 0,
    whKouta: 0,
    whChiba: 0,
    whChibaKita: 0,
    whIbaraki: 0,
    whIbarakiOkiba: 0,
    returnDueDate: "",
    repairing: 0,
    maintaining: 0,
    usedSalePlanned: 0
  },
  {
    kind: "M",
    type: "0012",
    machineNo: "A70",
    name1: "0.15 ミニショベル",
    name2: "VIO25-6",
    name3: "0.12-A70",
    customer: "",
    orderTaker: "",
    site: "",
    siteContact: "",
    startDate: "",
    loaned: 0,
    stock: 1,
    latestInboundDate: "2026/01/23",
    whHonsya: 0,
    whKouta: 0,
    whChiba: 0,
    whChibaKita: 0,
    whIbaraki: 0,
    whIbarakiOkiba: 1,
    returnDueDate: "",
    repairing: 0,
    maintaining: 0,
    usedSalePlanned: 0
  },
  {
    kind: "M",
    type: "0012",
    machineNo: "A71",
    name1: "0.15 ミニショベル　クレーン仕様",
    name2: "VIO25-6",
    name3: "0.12クレーン-A71",
    customer: "田中建設",
    orderTaker: "中村",
    site: "千葉北 造成現場",
    siteContact: "090-0000-1111",
    startDate: "2026/01/15",
    loaned: 1,
    stock: 0,
    latestInboundDate: "",
    whHonsya: 0,
    whKouta: 0,
    whChiba: 0,
    whChibaKita: 0,
    whIbaraki: 0,
    whIbarakiOkiba: 0,
    returnDueDate: "2026/03/01",
    repairing: 0,
    maintaining: 0,
    usedSalePlanned: 0
  },
  {
    kind: "M",
    type: "0012",
    machineNo: "A72",
    name1: "0.15 ミニショベル　クレーン仕様",
    name2: "VIO25-6",
    name3: "0.12クレーン-A72",
    customer: "",
    orderTaker: "",
    site: "",
    siteContact: "",
    startDate: "",
    loaned: 0,
    stock: 1,
    latestInboundDate: "2026/01/27",
    whHonsya: 0,
    whKouta: 0,
    whChiba: 1,
    whChibaKita: 0,
    whIbaraki: 0,
    whIbarakiOkiba: 0,
    returnDueDate: "",
    repairing: 0,
    maintaining: 0,
    usedSalePlanned: 0
  },
  {
    kind: "M",
    type: "0012",
    machineNo: "A73",
    name1: "0.15 ミニショベル",
    name2: "VIO25-6",
    name3: "0.15-A73",
    customer: "",
    orderTaker: "",
    site: "",
    siteContact: "",
    startDate: "",
    loaned: 0,
    stock: 1,
    latestInboundDate: "",
    whHonsya: 0,
    whKouta: 0,
    whChiba: 0,
    whChibaKita: 0,
    whIbaraki: 0,
    whIbarakiOkiba: 0,
    returnDueDate: "",
    repairing: 0,
    maintaining: 0,
    usedSalePlanned: 1
  }
];

