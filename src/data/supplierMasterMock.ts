export type SupplierMasterItem = {
  id: string;
  name: string;
};

// デモ用：仕入先/他社マスタ（本来はAPI/DBから取得）
export const supplierMasterMock: SupplierMasterItem[] = [
  { id: "7105", name: "株式会社マルシンレンタカー＆リース" },
  { id: "5116", name: "ナカハラ株式会社" },
  { id: "6420", name: "有限会社オオサカレンタル" },
  { id: "8888", name: "テスト商事" },
  { id: "9001", name: "株式会社サンプル運送" }
];

