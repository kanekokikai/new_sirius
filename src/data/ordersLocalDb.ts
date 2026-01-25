export type InboundDraft = {
  inboundDate: string; // yyyy-mm-dd (demo)
  rows: string[][];
};

const KEY_INBOUND_ROWS = "demo.ordersPdf.inboundRows.v1";
const KEY_PICKUP_ROWS = "demo.ordersPdf.pickupRows.v1";
const KEY_INBOUND_DRAFT = "demo.ordersPdf.inboundDraft.v1";

const TARGET_COLS = 15;

// v0(=14列) -> v1(=15列: 払出/件数の2列追加) へ移行
const migrateRowToV1 = (row: string[]): string[] => {
  if (row.length === TARGET_COLS) return [...row];
  if (row.length === 14) {
    // old: [0]空欄 [1]場所 [2]機械名 [3]No [4]数量 [5]車輛 [6]ﾚｯｶｰ [7]運転手 [8]会社名 [9]現場 [10]時間 [11]備考 [12]アワー [13]回送費
    return ["", "", row[1] ?? "", row[2] ?? "", row[3] ?? "", row[4] ?? "", row[5] ?? "", row[6] ?? "", row[7] ?? "", row[8] ?? "", row[9] ?? "", row[10] ?? "", row[11] ?? "", row[12] ?? "", row[13] ?? ""];
  }
  // best-effort: pad/truncate
  const next = Array.from({ length: TARGET_COLS }).map((_, idx) => String(row[idx] ?? ""));
  return next;
};

const migrateRowsToV1 = (rows: string[][]): string[][] => rows.map((r) => migrateRowToV1(r));

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
    const migrated = migrateRowsToV1(parsed);
    // persist migration to avoid mixed formats causing "見え方が壊れる"
    saveInboundRows(migrated);
    return migrated.map((r) => [...r]);
  }
  const migratedFallback = migrateRowsToV1(fallback);
  return migratedFallback.map((r) => [...r]);
};

export const saveInboundRows = (rows: string[][]) => {
  localStorage.setItem(KEY_INBOUND_ROWS, JSON.stringify(rows));
};

export const loadPickupRows = (fallback: string[][]): string[][] => {
  const parsed = safeParseJson(localStorage.getItem(KEY_PICKUP_ROWS));
  if (isStringArrayArray(parsed)) {
    const migrated = migrateRowsToV1(parsed);
    savePickupRows(migrated);
    return migrated.map((r) => [...r]);
  }
  const migratedFallback = migrateRowsToV1(fallback);
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
  const migrated = migrateRowsToV1(obj.rows);
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

