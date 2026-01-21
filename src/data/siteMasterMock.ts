export type SiteMasterItem = {
  id: string;
  name: string;
};

// デモ用：現場マスタ（本来はAPI/DBから取得）
export const siteMasterMock: SiteMasterItem[] = [
  { id: "S-0001", name: "葛飾区東金町" },
  { id: "S-0002", name: "富津市小久保" },
  { id: "S-0003", name: "水戸市" },
  { id: "S-0004", name: "港北区東神奈川" },
  { id: "S-0005", name: "千代田区西神田" }
];

