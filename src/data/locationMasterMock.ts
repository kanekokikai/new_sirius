export type LocationMasterItem = {
  id: string;
  name: string;
};

// デモ用：置場マスタ（本来はAPI/DBから取得）
export const locationMasterMock: LocationMasterItem[] = [
  { id: "001", name: "本社" },
  { id: "002", name: "部品" },
  { id: "003", name: "実機" },
  { id: "004", name: "ヤードA" },
  { id: "005", name: "ヤードB" }
];

