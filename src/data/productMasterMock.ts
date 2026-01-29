export type ProductMasterItem = {
  id: string;
  name: string;
};

// デモ用：商品マスタ（本来はAPI/DBから取得）
// - id: 商品ID（例: 商品No.）
// - name: 品名
export const productMasterMock: ProductMasterItem[] = [
  { id: "M-1001", name: "ZX120" },
  { id: "M-1008", name: "WA100" },
  { id: "M-1015", name: "RK70" },
  { id: "M-1042", name: "PC30MR" }
];

