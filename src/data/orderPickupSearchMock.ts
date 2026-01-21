export type PickupOrderSearchItem = {
  id: string;
  customerName: string; // 得意先名
  salesRep: string; // 営業担当
  siteName: string; // 現場
  kind: string; // 種類
  type: string; // 種別
  constructionName: string; // 工事名
  address: string; // 住所
};

// 引取受注作成の「検索条件モーダル」用ダミーデータ
export const pickupOrderSearchMock: PickupOrderSearchItem[] = [
  {
    id: "PS-001",
    customerName: "東西土木",
    salesRep: "田中",
    siteName: "倉庫新築B",
    kind: "建機",
    type: "ホイールローダー",
    constructionName: "倉庫新築工事B",
    address: "埼玉県○○市○○ 1-2-3"
  },
  {
    id: "PS-002",
    customerName: "ABC建設",
    salesRep: "佐藤",
    siteName: "高速道路改修A",
    kind: "建機",
    type: "油圧ショベル",
    constructionName: "高速道路改修工事A",
    address: "東京都○○区○○ 4-5-6"
  },
  {
    id: "PS-003",
    customerName: "北工業",
    salesRep: "鈴木",
    siteName: "造成現場C",
    kind: "建機",
    type: "ラフタークレーン",
    constructionName: "造成工事C",
    address: "茨城県○○市○○ 7-8-9"
  },
  {
    id: "PS-004",
    customerName: "南関東建設",
    salesRep: "高橋",
    siteName: "河川護岸C",
    kind: "小型",
    type: "ミニショベル",
    constructionName: "河川護岸補修C",
    address: "神奈川県○○市○○ 10-11-12"
  }
];

