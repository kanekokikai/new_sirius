export type TruckSize = "4t" | "7t" | "大型" | "その他";

export type TransportFeeMasterItem = {
  address: string;
  truckSize: TruckSize;
  amount: number;
};

export const transportFeeTruckSizeOptions: TruckSize[] = ["4t", "7t", "大型", "その他"];

export const transportFeeAddressOptions: string[] = [
  "東京都",
  "神奈川県",
  "千葉県",
  "茨城県",
  "その他"
];

// デモ用：回送費マスタ（住所×トラックサイズ→金額）
export const transportFeeMasterMock: TransportFeeMasterItem[] = [
  { address: "東京都", truckSize: "4t", amount: 18000 },
  { address: "東京都", truckSize: "7t", amount: 25000 },
  { address: "東京都", truckSize: "大型", amount: 53000 },

  { address: "神奈川県", truckSize: "4t", amount: 20000 },
  { address: "神奈川県", truckSize: "7t", amount: 28000 },
  { address: "神奈川県", truckSize: "大型", amount: 55000 },

  { address: "千葉県", truckSize: "4t", amount: 19000 },
  { address: "千葉県", truckSize: "7t", amount: 27000 },
  { address: "千葉県", truckSize: "大型", amount: 54000 },

  { address: "茨城県", truckSize: "4t", amount: 23000 },
  { address: "茨城県", truckSize: "7t", amount: 30000 },
  { address: "茨城県", truckSize: "大型", amount: 58000 },

  { address: "その他", truckSize: "その他", amount: 0 }
];

