export type EmployeeMasterItem = {
  id: string;
  name: string;
};

// デモ用：社員マスタ（本来はAPI/DBから取得）
export const employeeMasterMock: EmployeeMasterItem[] = [
  { id: "147", name: "小出達也" },
  { id: "158", name: "山田太陽" },
  { id: "201", name: "佐藤 健" },
  { id: "305", name: "鈴木 花子" },
  { id: "412", name: "高橋 仁" },
  { id: "501", name: "田中 亮" },
  { id: "502", name: "伊藤 美咲" }
];

