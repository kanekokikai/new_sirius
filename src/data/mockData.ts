import { Department, FeatureCard, FeatureKey, User } from "../types";

export const departments: Department[] = [
  "フロント",
  "営業",
  "経理",
  "ドライバー",
  "工場",
  "AK",
  "マスター管理"
];

export const featureCards: FeatureCard[] = [
  {
    key: "inventory",
    name: "在庫確認",
    description: "在庫一覧・検索・稼働状況の確認",
    subFeatures: ["在庫一覧", "検索", "利用可能 / 貸出中 / 修理中"]
  },
  {
    key: "machine",
    name: "機械管理",
    description: "機械台帳の閲覧（参照のみ）",
    subFeatures: ["機械台帳", "検索", "詳細閲覧"]
  },
  {
    key: "orders",
    name: "受注管理",
    description: "搬入 / 引き取り / 移動の受注管理",
    subFeatures: [
      "搬入（新規・検索・編集）",
      "引き取り（新規・検索・編集）",
      "移動（新規・検索・編集）"
    ]
  },
  {
    key: "dispatch",
    name: "配車",
    description: "指示書・行動予定の管理と出力",
    subFeatures: [
      "搬入機械指示書",
      "移動機械指示書",
      "引取機械指示書",
      "トラック行動予定（カレンダー / 一覧 / 出力）"
    ]
  },
  {
    key: "sites",
    name: "現場管理",
    description: "現場登録・検索・詳細編集",
    subFeatures: ["現場一覧", "新規登録", "検索", "詳細・編集"]
  },
  {
    key: "data",
    name: "データ管理",
    description: "データ出力 / レポート / CSV・Excel",
    subFeatures: ["エクスポート", "レポート", "CSV / Excel"]
  },
  {
    key: "ar",
    name: "売掛台帳",
    description: "売掛一覧・検索・未収金表示",
    subFeatures: ["売掛一覧", "検索 / フィルター", "未収金表示", "詳細"]
  },
  {
    key: "invoices",
    name: "請求書発行",
    description: "請求書一覧と発行・出力",
    subFeatures: ["請求書一覧", "新規発行", "検索", "PDF出力"]
  },
  {
    key: "adjustment",
    name: "金額訂正",
    description: "訂正入力と履歴管理",
    subFeatures: ["訂正対象検索", "訂正入力", "訂正履歴表示"]
  },
  {
    key: "repair",
    name: "修理管理",
    description: "修理関連のタブ管理",
    subFeatures: [
      "見積作成（新規・一覧）",
      "社内修理（一覧・登録）",
      "アラート管理",
      "貴社機械（一覧・詳細）"
    ]
  },
  {
    key: "masters",
    name: "マスター管理",
    description: "顧客・機械・社員マスター",
    subFeatures: [
      "顧客マスター（一覧・登録・検索・詳細）",
      "機械マスター（一覧・登録・検索・詳細）",
      "社員マスター（一覧・登録・検索・詳細）"
    ]
  }
];

export const departmentAccess: Record<Department, FeatureKey[]> = {
  フロント: ["inventory", "machine", "orders", "dispatch", "sites", "data"],
  営業: ["inventory", "orders", "sites", "ar", "dispatch", "data"],
  経理: ["ar", "invoices", "adjustment", "machine"],
  ドライバー: ["dispatch"],
  工場: ["dispatch", "inventory", "repair"],
  AK: ["orders", "data", "dispatch"],
  マスター管理: ["masters"]
};

export const mockUsers: User[] = [
  {
    userId: "front01",
    userName: "フロント 花子",
    password: "pass123",
    departments: ["フロント", "営業"],
    permissions: {
      フロント: departmentAccess["フロント"],
      営業: departmentAccess["営業"]
    }
  },
  {
    userId: "account01",
    userName: "経理 太郎",
    password: "pass123",
    departments: ["経理"],
    permissions: { 経理: departmentAccess["経理"] }
  },
  {
    userId: "factory01",
    userName: "工場 次郎",
    password: "pass123",
    departments: ["工場", "ドライバー"],
    permissions: {
      工場: departmentAccess["工場"],
      ドライバー: departmentAccess["ドライバー"]
    }
  },
  {
    userId: "admin01",
    userName: "管理者",
    password: "admin",
    departments: departments,
    permissions: departmentAccess
  }
];

