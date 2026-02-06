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

// トラック予定指示書（フロント）は「空から作る」想定にするため、
// ここでは固定のデモ行・デモ予定を持たせません。
// 行が必要な場合は画面の「トラック追加」で作成、または搬入指示書の運転手名連携で生成します。
const baseRoster: TruckPlanRow[] = [];

const byDate: Record<string, Partial<Record<string, TruckPlanAction[]>>> = {};

export const getTruckPlanRowsByDate = (date: string): TruckPlanRow[] => {
  const patchByName = byDate[date] ?? {};
  return baseRoster.map((r) => ({
    ...r,
    actions: patchByName[r.name] ?? []
  }));
};

