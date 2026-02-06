export type TruckPlanAction = {
  /** 例) 搬入 / 引取 / 移動 など */
  kind: string;
  /** 例) 大 / 指定車 など（スクショの「搬入 大」相当） */
  size?: string;
  /** 例) 横須賀市 / 八王子市 */
  place?: string;
  /** 右上：自由テキスト（ドライバー向けメモ等） */
  freeText?: string;
  /** 例) 9:00 / 11:00 */
  time?: string;
  /** 受注検索結果（搬入）からの自動反映か、手入力か */
  source?: "inbound" | "manual";
  /** source=inbound のとき、受注検索結果（搬入）のアンカー行index */
  inboundRowIndex?: number;
};

export type TruckPlanRow = {
  /** 例) 特大セル / 10tエッセル など（左端の色付きラベル） */
  category: string;
  /** 例) 小出 達也 */
  name: string;
  /** 1日内の行動（スロット） */
  actions: TruckPlanAction[];
};

// トラック予定指示書（フロント）: 初期表示でドライバー行が見えるようにロスターだけは固定で持つ。
// ※予定（actions）は空のまま。予定は搬入受注連携 or 手入力 or トラック追加で作成する想定。
const baseRoster: TruckPlanRow[] = [
  { category: "特大セル", name: "小出達也", actions: [] },
  { category: "特大セル", name: "長谷川利弘", actions: [] },
  { category: "特大セル", name: "高木孝一", actions: [] },
  { category: "特大セル", name: "下浅敏治★", actions: [] },
  { category: "特大平", name: "五十嵐誠", actions: [] },
  { category: "特大平", name: "米坂和彦", actions: [] },
  { category: "10t エッセル", name: "若井亮", actions: [] },
  { category: "10t セル-エッセル", name: "藤田一央", actions: [] },
  { category: "7t セル-フォーク 2071", name: "山田太陽", actions: [] }
];

const byDate: Record<string, Partial<Record<string, TruckPlanAction[]>>> = {};

export const getTruckPlanRowsByDate = (date: string): TruckPlanRow[] => {
  const patchByName = byDate[date] ?? {};
  return baseRoster.map((r) => ({
    ...r,
    actions: patchByName[r.name] ?? []
  }));
};

