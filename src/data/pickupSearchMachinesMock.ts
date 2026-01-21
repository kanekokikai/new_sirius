export type PickupMachineStatus = "出庫中" | "受注中";

export type PickupSearchMachineItem = {
  id: string;
  status: PickupMachineStatus;
  machineName: string; // 機械名（表示）
  siteName: string; // 現場（表示）
  outboundStartDate: string; // 出庫開始日（表示）

  // ↓検索条件（デモ用に持たせる）
  customerName: string; // 得意先名
  salesRep: string; // 営業担当
  kind: string; // 種類
  type: string; // 種別
  constructionName: string; // 工事名
  address: string; // 住所
};

export const pickupSearchMachinesMock: PickupSearchMachineItem[] = [
  {
    id: "PM-001",
    status: "出庫中",
    machineName: "WA100",
    siteName: "倉庫新築B",
    outboundStartDate: "2024-12-20",
    customerName: "東西土木",
    salesRep: "田中",
    kind: "建機",
    type: "ホイールローダー",
    constructionName: "倉庫新築工事B",
    address: "埼玉県○○市○○ 1-2-3"
  },
  {
    id: "PM-002",
    status: "出庫中",
    machineName: "ZX120",
    siteName: "高速道路改修A",
    outboundStartDate: "2025-01-02",
    customerName: "ABC建設",
    salesRep: "佐藤",
    kind: "建機",
    type: "油圧ショベル",
    constructionName: "高速道路改修工事A",
    address: "東京都○○区○○ 4-5-6"
  },
  {
    id: "PM-003",
    status: "受注中",
    machineName: "RK70",
    siteName: "造成現場C",
    outboundStartDate: "2025-01-10",
    customerName: "北工業",
    salesRep: "鈴木",
    kind: "建機",
    type: "ラフタークレーン",
    constructionName: "造成工事C",
    address: "茨城県○○市○○ 7-8-9"
  },
  {
    id: "PM-004",
    status: "受注中",
    machineName: "PC30MR",
    siteName: "河川護岸C",
    outboundStartDate: "2024-12-28",
    customerName: "南関東建設",
    salesRep: "高橋",
    kind: "小型",
    type: "ミニショベル",
    constructionName: "河川護岸補修C",
    address: "神奈川県○○市○○ 10-11-12"
  }
];

