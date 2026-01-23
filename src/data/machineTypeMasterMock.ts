export type MachineKindMasterItem = {
  id: string;
  name: string;
};

export type MachineCategoryMasterItem = {
  id: string;
  name: string;
};

// デモ用：種類/種別マスタ（本来はAPI/DBから取得）
export const machineKindMasterMock: MachineKindMasterItem[] = [
  { id: "K-001", name: "建機" },
  { id: "K-002", name: "発電機" },
  { id: "K-003", name: "部品" },
  { id: "K-004", name: "仮設" },
  { id: "K-999", name: "その他" }
];

export const machineCategoryMasterMock: MachineCategoryMasterItem[] = [
  { id: "C-101", name: "油圧ショベル" },
  { id: "C-102", name: "ホイールローダー" },
  { id: "C-103", name: "クレーン" },
  { id: "C-201", name: "発電機" },
  { id: "C-999", name: "その他" }
];

/**
 * デモ用：機械名（検索結果の機械名セル）→ 種類ID/種別ID の紐づけ
 * - 要件: 「元から入ってる機械名に紐ずく種類と種別を入力しておいて下さい。」
 * - 機械名セルは複数行の場合があるため、Feature側では「1行目（baseName）」で参照する。
 */
export const machineTypeByMachineNameMock: Record<string, { kindId: string; categoryId: string }> = {
  // inboundOrderSearchRawRows の機械名（例）
  "0.459レーザー": { kindId: "K-003", categoryId: "C-999" },
  "○都筑移動、コベルコ希望": { kindId: "K-001", categoryId: "C-101" },
  "無線機X10": { kindId: "K-004", categoryId: "C-999" },
  "タイピンマイク": { kindId: "K-004", categoryId: "C-999" },
  "0.2t?": { kindId: "K-003", categoryId: "C-999" },
  "SR30本体": { kindId: "K-001", categoryId: "C-101" },
  "SR30シャフト": { kindId: "K-003", categoryId: "C-999" },
  "3寸ケーシング": { kindId: "K-003", categoryId: "C-999" },
  "7MPR-": { kindId: "K-001", categoryId: "C-999" }
};

