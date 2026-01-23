export type PickupOrdersMachineStatus = "出庫中" | "受注中";

export type PickupOrdersMachineSelectItem = {
  id: string;
  status: PickupOrdersMachineStatus;
  machineName: string; // 表示

  // 絞り込み条件（デモ）
  customerId: string;
  siteId: string;
  customerName: string;
  siteName: string;
};

// 引取受注（受注検索結果）: 機械名ダブルクリックで出す「出庫中一覧 / 受注一覧」用のデモデータ
// NOTE: customerId/siteId は、画面上の検索条件（得意先ID/現場ID）で絞り込めるように持たせています。
export const pickupOrdersMachineSelectMock: PickupOrdersMachineSelectItem[] = [
  // 中村土木 / 春日部市
  // NOTE: 出庫（引取側）のデモは「全て受注中」として扱う
  { id: "POMS-001", status: "受注中", machineName: "0.25砕?", customerId: "C-2001", siteId: "S-0101", customerName: "中村土木", siteName: "春日部市" },
  { id: "POMS-003", status: "受注中", machineName: "60K", customerId: "C-2001", siteId: "S-0101", customerName: "中村土木", siteName: "春日部市" },
  { id: "POMS-004", status: "受注中", machineName: "7リーマベ", customerId: "C-2001", siteId: "S-0101", customerName: "中村土木", siteName: "春日部市" },
  // 表に載っていない（デモ追加）
  { id: "POMS-005", status: "受注中", machineName: "SV08", customerId: "C-2001", siteId: "S-0101", customerName: "中村土木", siteName: "春日部市" },
  { id: "POMS-006", status: "受注中", machineName: "HITACHI発電機 5kVA", customerId: "C-2001", siteId: "S-0101", customerName: "中村土木", siteName: "春日部市" },
  { id: "POMS-007", status: "受注中", machineName: "2吋100V水中", customerId: "C-2001", siteId: "S-0101", customerName: "中村土木", siteName: "春日部市" },
  { id: "POMS-008", status: "受注中", machineName: "HBツメ", customerId: "C-2001", siteId: "S-0101", customerName: "中村土木", siteName: "春日部市" },

  // 成田基礎 / 墨田区
  { id: "POMS-101", status: "受注中", machineName: "3サイロ", customerId: "C-2002", siteId: "S-0102", customerName: "成田基礎", siteName: "墨田区" },
  { id: "POMS-102", status: "受注中", machineName: "PR用6t蓋", customerId: "C-2002", siteId: "S-0102", customerName: "成田基礎", siteName: "墨田区" },
  // 表に載っていない（デモ追加）
  { id: "POMS-103", status: "受注中", machineName: "スイーパー小型", customerId: "C-2002", siteId: "S-0102", customerName: "成田基礎", siteName: "墨田区" },
  { id: "POMS-104", status: "受注中", machineName: "スロープ材", customerId: "C-2002", siteId: "S-0102", customerName: "成田基礎", siteName: "墨田区" },

  // タクト / 新宿区
  { id: "POMS-201", status: "受注中", machineName: "DW", customerId: "C-2003", siteId: "S-0103", customerName: "タクト", siteName: "新宿区" },
  { id: "POMS-202", status: "受注中", machineName: "DW用CT一式", customerId: "C-2003", siteId: "S-0103", customerName: "タクト", siteName: "新宿区" },
  // 表に載っていない（デモ追加）
  { id: "POMS-203", status: "受注中", machineName: "無線機X10（予備）", customerId: "C-2003", siteId: "S-0103", customerName: "タクト", siteName: "新宿区" },
  { id: "POMS-204", status: "受注中", machineName: "CT単体", customerId: "C-2003", siteId: "S-0103", customerName: "タクト", siteName: "新宿区" },

  // 正栄工業 / 中央区
  { id: "POMS-301", status: "受注中", machineName: "EA30", customerId: "C-2004", siteId: "S-0104", customerName: "正栄工業", siteName: "中央区" },
  { id: "POMS-302", status: "受注中", machineName: "EA30用ピン", customerId: "C-2004", siteId: "S-0104", customerName: "正栄工業", siteName: "中央区" },
  { id: "POMS-303", status: "受注中", machineName: "0.2配管", customerId: "C-2004", siteId: "S-0104", customerName: "正栄工業", siteName: "中央区" },
  // 表に載っていない（デモ追加）
  { id: "POMS-304", status: "受注中", machineName: "配管セット（予備）", customerId: "C-2004", siteId: "S-0104", customerName: "正栄工業", siteName: "中央区" },
  { id: "POMS-305", status: "受注中", machineName: "EA30用ホース", customerId: "C-2004", siteId: "S-0104", customerName: "正栄工業", siteName: "中央区" },
  { id: "POMS-306", status: "受注中", machineName: "20001M", customerId: "C-2004", siteId: "S-0104", customerName: "正栄工業", siteName: "中央区" },
  { id: "POMS-307", status: "受注中", machineName: "2000パﾝ?", customerId: "C-2004", siteId: "S-0104", customerName: "正栄工業", siteName: "中央区" },

  // ジャパンバイル / 都筑区
  { id: "POMS-401", status: "受注中", machineName: "3K", customerId: "C-2005", siteId: "S-0105", customerName: "ジャパンバイル", siteName: "都筑区" },
  { id: "POMS-402", status: "受注中", machineName: "無線機X10", customerId: "C-2005", siteId: "S-0105", customerName: "ジャパンバイル", siteName: "都筑区" },
  { id: "POMS-403", status: "受注中", machineName: "集塵機", customerId: "C-2005", siteId: "S-0105", customerName: "ジャパンバイル", siteName: "都筑区" },
  { id: "POMS-404", status: "受注中", machineName: "分銅", customerId: "C-2005", siteId: "S-0105", customerName: "ジャパンバイル", siteName: "都筑区" }
  ,
  // 表に載っていない（デモ追加）
  { id: "POMS-404A", status: "受注中", machineName: "タイピンマイク", customerId: "C-2005", siteId: "S-0105", customerName: "ジャパンバイル", siteName: "都筑区" },
  { id: "POMS-405", status: "受注中", machineName: "タイピンマイク（予備）", customerId: "C-2005", siteId: "S-0105", customerName: "ジャパンバイル", siteName: "都筑区" },
  { id: "POMS-406", status: "受注中", machineName: "集塵機ホース", customerId: "C-2005", siteId: "S-0105", customerName: "ジャパンバイル", siteName: "都筑区" }
];

