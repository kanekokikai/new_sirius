export type InboundDraft = {
  inboundDate: string; // yyyy-mm-dd (demo)
  rows: string[][];
};

export type PickupDraft = {
  pickupDate: string; // yyyy-mm-dd (demo)
  rows: string[][];
};

const KEY_INBOUND_ROWS = "demo.ordersPdf.inboundRows.v2";
const KEY_PICKUP_ROWS = "demo.ordersPdf.pickupRows.v2";
const KEY_INBOUND_DRAFT = "demo.ordersPdf.inboundDraft.v2";
const KEY_PICKUP_DRAFT = "demo.ordersPdf.pickupDraft.v2";

const TARGET_COLS = 17;

// v0(=14列) -> v1(=15列: 払出/件数の2列追加) -> v2(=16列: 状態の1列追加) -> v3(=17列: 使用期間の1列追加) へ移行
const migrateRowToV3 = (row: string[]): string[] => {
  if (row.length === TARGET_COLS) return [...row];
  if (row.length === 16) {
    // v2: [0]払出 [1]状態 [2]件数 [3]場所 [4]機械名 [5]No [6]数量 [7]車輛 [8]ﾚｯｶｰ [9]運転手 [10]会社名 [11]現場 [12]時間 [13]備考 [14]アワー [15]回送費
    // v3: [0]払出 [1]状態 [2]件数 [3]使用期間 [4]場所 ...
    return [
      row[0] ?? "",
      row[1] ?? "",
      row[2] ?? "",
      "", // 使用期間
      row[3] ?? "",
      row[4] ?? "",
      row[5] ?? "",
      row[6] ?? "",
      row[7] ?? "",
      row[8] ?? "",
      row[9] ?? "",
      row[10] ?? "",
      row[11] ?? "",
      row[12] ?? "",
      row[13] ?? "",
      row[14] ?? "",
      row[15] ?? ""
    ];
  }
  if (row.length === 15) {
    // v1: [0]払出 [1]件数 [2]場所 [3]機械名 [4]No [5]数量 [6]車輛 [7]ﾚｯｶｰ [8]運転手 [9]会社名 [10]現場 [11]時間 [12]備考 [13]アワー [14]回送費
    // v3: [0]払出 [1]状態 [2]件数 [3]使用期間 [4]場所 ...
    return [
      row[0] ?? "",
      "",
      row[1] ?? "",
      "", // 使用期間
      row[2] ?? "",
      row[3] ?? "",
      row[4] ?? "",
      row[5] ?? "",
      row[6] ?? "",
      row[7] ?? "",
      row[8] ?? "",
      row[9] ?? "",
      row[10] ?? "",
      row[11] ?? "",
      row[12] ?? "",
      row[13] ?? "",
      row[14] ?? ""
    ];
  }
  if (row.length === 14) {
    // v0(old): [0]空欄 [1]場所 [2]機械名 [3]No [4]数量 [5]車輛 [6]ﾚｯｶｰ [7]運転手 [8]会社名 [9]現場 [10]時間 [11]備考 [12]アワー [13]回送費
    // v3: [0]払出 [1]状態 [2]件数 [3]使用期間 [4]場所 ...
    return [
      "",
      "",
      "",
      "", // 使用期間
      row[1] ?? "",
      row[2] ?? "",
      row[3] ?? "",
      row[4] ?? "",
      row[5] ?? "",
      row[6] ?? "",
      row[7] ?? "",
      row[8] ?? "",
      row[9] ?? "",
      row[10] ?? "",
      row[11] ?? "",
      row[12] ?? "",
      row[13] ?? ""
    ];
  }
  // best-effort: pad/truncate
  return Array.from({ length: TARGET_COLS }).map((_, idx) => String(row[idx] ?? ""));
};

const migrateRowsToV3 = (rows: string[][]): string[][] => rows.map((r) => migrateRowToV3(r));

// Hotfix for demo data that got persisted with older column shifts.
// We keep this very small and surgical to avoid impacting real data.
const applyInboundRowsHotfixes = (rows: string[][]): string[][] => {
  // v3 columns (TARGET_COLS=17):
  // [4]場所 [5]機械名 [8]車輛 [9]ﾚｯｶｰ [10]運転手 [11]会社名 [12]現場 [13]時間
  return rows.map((r) => {
    const row = [...r];
    const company = String(row[11] ?? "").trim();
    const site = String(row[12] ?? "").trim();
    const time = String(row[13] ?? "").trim();
    const machine = String(row[5] ?? "").trim();

    // Fix: サンレントマシン工事 / 水戸市 / 8:30 の行で、列ズレにより
    // ﾚｯｶｰに「6t」、運転手に「有」が入ってしまうケースを補正する
    if (
      company === "サンレントマシン工事" &&
      site === "水戸市" &&
      time.startsWith("8:30") &&
      machine === "SR30本体"
    ) {
      row[8] = "大型可"; // 車輛
      row[9] = "有"; // ﾚｯｶｰ
      if (String(row[10] ?? "").trim() === "有") row[10] = ""; // 運転手
    }

    return row;
  });
};

const safeParseJson = (raw: string | null): unknown => {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const isStringArrayArray = (v: unknown): v is string[][] => {
  if (!Array.isArray(v)) return false;
  return v.every((row) => Array.isArray(row) && row.every((cell) => typeof cell === "string"));
};

export const loadInboundRows = (fallback: string[][]): string[][] => {
  const parsed = safeParseJson(localStorage.getItem(KEY_INBOUND_ROWS));
  if (isStringArrayArray(parsed)) {
    const migrated = applyInboundRowsHotfixes(migrateRowsToV3(parsed));
    // persist migration to avoid mixed formats causing "見え方が壊れる"
    saveInboundRows(migrated);
    return migrated.map((r) => [...r]);
  }
  const migratedFallback = applyInboundRowsHotfixes(migrateRowsToV3(fallback));
  return migratedFallback.map((r) => [...r]);
};

export const saveInboundRows = (rows: string[][]) => {
  localStorage.setItem(KEY_INBOUND_ROWS, JSON.stringify(rows));
};

export const clearInboundPersisted = () => {
  localStorage.removeItem(KEY_INBOUND_ROWS);
  localStorage.removeItem(KEY_INBOUND_DRAFT);
};

export const loadPickupRows = (fallback: string[][]): string[][] => {
  const parsed = safeParseJson(localStorage.getItem(KEY_PICKUP_ROWS));
  if (isStringArrayArray(parsed)) {
    const migrated = migrateRowsToV3(parsed);
    savePickupRows(migrated);
    return migrated.map((r) => [...r]);
  }
  const migratedFallback = migrateRowsToV3(fallback);
  return migratedFallback.map((r) => [...r]);
};

export const savePickupRows = (rows: string[][]) => {
  localStorage.setItem(KEY_PICKUP_ROWS, JSON.stringify(rows));
};

export const loadInboundDraft = (): InboundDraft | null => {
  const parsed = safeParseJson(localStorage.getItem(KEY_INBOUND_DRAFT));
  if (!parsed || typeof parsed !== "object") return null;
  const obj = parsed as { inboundDate?: unknown; rows?: unknown };
  if (typeof obj.inboundDate !== "string") return null;
  if (!isStringArrayArray(obj.rows)) return null;
  const migrated = migrateRowsToV3(obj.rows);
  // persist migration
  saveInboundDraft({ inboundDate: obj.inboundDate, rows: migrated });
  return { inboundDate: obj.inboundDate, rows: migrated.map((r) => [...r]) };
};

export const saveInboundDraft = (draft: InboundDraft | null) => {
  if (!draft) {
    localStorage.removeItem(KEY_INBOUND_DRAFT);
    return;
  }
  localStorage.setItem(KEY_INBOUND_DRAFT, JSON.stringify(draft));
};

export const loadPickupDraft = (): PickupDraft | null => {
  const parsed = safeParseJson(localStorage.getItem(KEY_PICKUP_DRAFT));
  if (!parsed || typeof parsed !== "object") return null;
  const obj = parsed as { pickupDate?: unknown; rows?: unknown };
  if (typeof obj.pickupDate !== "string") return null;
  if (!isStringArrayArray(obj.rows)) return null;
  const migrated = migrateRowsToV3(obj.rows);
  // persist migration
  savePickupDraft({ pickupDate: obj.pickupDate, rows: migrated });
  return { pickupDate: obj.pickupDate, rows: migrated.map((r) => [...r]) };
};

export const savePickupDraft = (draft: PickupDraft | null) => {
  if (!draft) {
    localStorage.removeItem(KEY_PICKUP_DRAFT);
    return;
  }
  localStorage.setItem(KEY_PICKUP_DRAFT, JSON.stringify(draft));
};

