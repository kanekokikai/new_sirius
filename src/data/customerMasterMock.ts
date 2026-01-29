export type CustomerMasterItem = {
  id: string;
  name: string;
};

// デモ用：得意先マスタ（本来はAPI/DBから取得）
export const customerMasterMock: CustomerMasterItem[] = [
  { id: "C-0001", name: "ABC建設" },
  { id: "C-0002", name: "東西土木" },
  { id: "C-0003", name: "北工業" },
  { id: "C-0004", name: "南関東建設" },
  { id: "C-0005", name: "調和工業" }
];

