import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { InboundPdfTable } from "../components/InboundPdfTable";
import { OutboundInProgressModal } from "../components/OutboundInProgressModal";
import { InventoryMemoModal, InventoryMemoInput, InventoryMemoMeta } from "../components/InventoryMemoModal";
import {
  inventoryCheckColumns,
  inventoryCheckMockRows,
  inventoryCheckToTableRow,
  InventoryCheckRow
} from "../data/inventoryCheckMock";

type MoveField =
  | "whHonsya"
  | "whKouta"
  | "whChiba"
  | "whChibaKita"
  | "whIbaraki"
  | "whIbarakiOkiba"
  | "repairing"
  | "maintaining"
  | "usedSalePlanned";

const moveFieldByColIndex = (colIndex: number): MoveField | null => {
  // columns indices:
  // 9..14 = 倉庫, 16..18 = 修理/整備/中古販売
  switch (colIndex) {
    case 9:
      return "whHonsya";
    case 10:
      return "whKouta";
    case 11:
      return "whChiba";
    case 12:
      return "whChibaKita";
    case 13:
      return "whIbaraki";
    case 14:
      return "whIbarakiOkiba";
    case 16:
      return "repairing";
    case 17:
      return "maintaining";
    case 18:
      return "usedSalePlanned";
    default:
      return null;
  }
};

const allMoveFields: readonly MoveField[] = [
  "whHonsya",
  "whKouta",
  "whChiba",
  "whChibaKita",
  "whIbaraki",
  "whIbarakiOkiba",
  "repairing",
  "maintaining",
  "usedSalePlanned"
] as const;

type MemoKind = "repair" | "maintenance" | "usedSale";
type PendingMove = { machineNo: string; to: MoveField };
type EditMemo = { machineNo: string; field: MoveField };

const MEMO_COUNTER_PREFIX = "demo.inventory.memoCounter.";
const nextMemoId = (kind: MemoKind) => {
  try {
    const key = `${MEMO_COUNTER_PREFIX}${kind}`;
    const current = Number(sessionStorage.getItem(key) ?? "0") || 0;
    const next = current + 1;
    sessionStorage.setItem(key, String(next));
    return `#${String(next).padStart(4, "0")}`;
  } catch {
    // fallback (non-persistent)
    const n = Math.floor(Math.random() * 9000) + 1000;
    return `#${n}`;
  }
};

const InventoryCheckPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [outboundModalOpen, setOutboundModalOpen] = useState(false);
  const [outboundRowIndex, setOutboundRowIndex] = useState<number | null>(null);
  const [rows, setRows] = useState<InventoryCheckRow[]>(inventoryCheckMockRows);
  const [dragOver, setDragOver] = useState<{ machineNo: string; colIndex: number } | null>(null);
  const [memoModalOpen, setMemoModalOpen] = useState(false);
  const [memoKind, setMemoKind] = useState<MemoKind>("repair");
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const [editMemo, setEditMemo] = useState<EditMemo | null>(null);

  const params = new URLSearchParams(location.search);
  const dept = params.get("dept") ?? "";
  const kind = params.get("kind") ?? "";
  const category = params.get("category") ?? "";
  const machineNo = params.get("machineNo") ?? "";
  const status = params.get("status") ?? "";

  const backTo = `/feature/inventory${dept ? `?dept=${encodeURIComponent(dept)}` : ""}`;

  const filteredRows = useMemo(() => {
    const qKind = kind.trim();
    const qCategory = category.trim();
    const qMachineNo = machineNo.trim();
    const qStatus = status.trim();

    const includes = (base: string, q: string) =>
      !q || base.toLowerCase().includes(q.toLowerCase());

    return rows.filter((r) => {
      if (!includes(r.kind, qKind)) return false;
      if (!includes(r.type, qCategory)) {
        // 種別はスクショ的にコード(0012)なので、入力が名称っぽい場合は品名側にも当てる
        const nameCombo = `${r.name1} ${r.name2} ${r.name3}`;
        if (!includes(nameCombo, qCategory)) return false;
      }
      if (!includes(r.machineNo, qMachineNo)) return false;

      if (qStatus) {
        const statusText = [
          r.loaned > 0 ? "貸出中" : "",
          r.repairing > 0 ? "修理中" : "",
          r.maintaining > 0 ? "整備中" : "",
          r.usedSalePlanned > 0 ? "中古販売予定" : ""
        ]
          .filter(Boolean)
          .join(" ");
        if (!includes(statusText, qStatus)) return false;
      }

      return true;
    });
  }, [category, kind, machineNo, rows, status]);

  const tableRows = useMemo(() => filteredRows.map(inventoryCheckToTableRow), [filteredRows]);
  const outboundRow = outboundRowIndex == null ? null : filteredRows[outboundRowIndex] ?? null;
  const memoMeta: InventoryMemoMeta | null = useMemo(() => {
    const target = editMemo;
    if (!target) return null;
    const row = rows.find((r) => r.machineNo === target.machineNo);
    if (!row) return null;
    if (target.field === "repairing" && row.repairMemo) {
      return { id: row.repairMemo.id, createdAt: row.repairMemo.createdAt, updatedAt: row.repairMemo.updatedAt };
    }
    if (target.field === "maintaining" && row.maintenanceMemo) {
      return {
        id: row.maintenanceMemo.id,
        createdAt: row.maintenanceMemo.createdAt,
        updatedAt: row.maintenanceMemo.updatedAt
      };
    }
    if (target.field === "usedSalePlanned" && row.usedSaleMemo) {
      return { id: row.usedSaleMemo.id, createdAt: row.usedSaleMemo.createdAt, updatedAt: row.usedSaleMemo.updatedAt };
    }
    return { id: null, createdAt: null, updatedAt: null };
  }, [editMemo, rows]);
  const memoInitialValue = useMemo(() => {
    const target = editMemo;
    if (!target) return null;
    const row = rows.find((r) => r.machineNo === target.machineNo);
    if (!row) return null;
    if (target.field === "repairing" && row.repairMemo) {
      const { writer, title, body } = row.repairMemo;
      return { writer, title, body };
    }
    if (target.field === "maintaining" && row.maintenanceMemo) {
      const { writer, title, body } = row.maintenanceMemo;
      return { writer, title, body };
    }
    if (target.field === "usedSalePlanned" && row.usedSaleMemo) {
      const { writer, title, body } = row.usedSaleMemo;
      return { writer, title, body };
    }
    return null;
  }, [editMemo, rows]);

  const colWidths = useMemo(
    () => [
      "52px", // 種類
      "64px", // 種別
      "84px", // 機械No.
      "180px", // 品名1
      "110px", // 品名2
      "120px", // 品名3
      "70px", // 貸出中
      "70px", // 在庫数
      "96px", // 最新入庫日
      "90px", // 本社
      "90px", // 公田
      "90px", // 千葉
      "96px", // 千葉北
      "90px", // 茨城
      "110px", // 茨城置場
      "96px", // 返納予定日
      "70px", // 修理中
      "70px", // 整備中
      "110px" // 中古販売予定
    ],
    []
  );

  return (
    <div className="page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>在庫確認（検索結果：仮）</h2>
        <button className="button" type="button" onClick={() => navigate(backTo)}>
          在庫確認へ戻る
        </button>
      </div>

      <p style={{ marginTop: 8, color: "#475569" }}>
        ここは仮ページです。次のステップで、条件に応じた在庫の検索結果表示を実装します。
      </p>

      <div style={{ marginTop: 12, padding: 12, border: "1px solid #e2e8f0", borderRadius: 10, background: "#fff" }}>
        <div style={{ fontWeight: 900, color: "#0f172a", marginBottom: 8 }}>受け取った検索条件</div>
        <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", rowGap: 6, columnGap: 12 }}>
          <div style={{ color: "#64748b" }}>部署</div>
          <div style={{ color: "#0f172a" }}>{dept || "-"}</div>
          <div style={{ color: "#64748b" }}>種類</div>
          <div style={{ color: "#0f172a" }}>{kind || "-"}</div>
          <div style={{ color: "#64748b" }}>種別</div>
          <div style={{ color: "#0f172a" }}>{category || "-"}</div>
          <div style={{ color: "#64748b" }}>機械No.</div>
          <div style={{ color: "#0f172a" }}>{machineNo || "-"}</div>
          <div style={{ color: "#64748b" }}>状況</div>
          <div style={{ color: "#0f172a" }}>{status || "-"}</div>
        </div>
      </div>

      <div style={{ marginTop: 14, display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <div style={{ fontWeight: 900, color: "#0f172a" }}>在庫一覧（デモ）</div>
        <div style={{ color: "#64748b", fontSize: 12 }}>表示件数: {tableRows.length} 件</div>
      </div>

      <InboundPdfTable
        ariaLabel="在庫一覧（デモ）"
        columns={inventoryCheckColumns}
        rows={tableRows}
        colWidths={colWidths}
        tableClassName="inventory-table"
        mergeColumnIndices={[]}
        renderCell={({ rowIndex, colIndex, value }) => {
          const row = filteredRows[rowIndex];
          if (!row) return value;

          const field = moveFieldByColIndex(colIndex);
          if (!field) return value;

          const hasValue = Boolean(String(value ?? "").trim());
          const isDragOver = dragOver?.machineNo === row.machineNo && dragOver?.colIndex === colIndex;

          return (
            <div
              className={[
                "inventory-dnd-cell",
                hasValue ? "inventory-dnd-cell--draggable" : "inventory-dnd-cell--empty",
                isDragOver ? "inventory-dnd-cell--over" : ""
              ]
                .filter(Boolean)
                .join(" ")}
              draggable={hasValue}
              onDragStart={(e) => {
                if (!hasValue) return;
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData(
                  "application/x-inventory-move",
                  JSON.stringify({ machineNo: row.machineNo, from: field })
                );
              }}
              onDragEnd={() => setDragOver(null)}
              onDragOver={(e) => {
                // allow dropping onto any target in the same row
                e.preventDefault();
                setDragOver({ machineNo: row.machineNo, colIndex });
              }}
              onDragLeave={() => {
                setDragOver((s) => {
                  if (!s) return s;
                  if (s.machineNo === row.machineNo && s.colIndex === colIndex) return null;
                  return s;
                });
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(null);
                const raw = e.dataTransfer.getData("application/x-inventory-move");
                if (!raw) return;
                try {
                  const parsed = JSON.parse(raw) as { machineNo: string; from: MoveField };
                  if (!parsed?.machineNo || !parsed?.from) return;
                  if (parsed.machineNo !== row.machineNo) return; // 同一行内だけ許可
                  if (parsed.from === field) return;

                  // if dropping into 修理/整備/中古販売 -> ask memo first
                  if (field === "repairing" || field === "maintaining" || field === "usedSalePlanned") {
                    setPendingMove({ machineNo: row.machineNo, to: field });
                    setMemoKind(field === "repairing" ? "repair" : field === "maintaining" ? "maintenance" : "usedSale");
                    setMemoModalOpen(true);
                    return;
                  }

                  // warehouse move: apply immediately
                  setRows((prev) =>
                    prev.map((r) => {
                      if (r.machineNo !== row.machineNo) return r;
                      const next: InventoryCheckRow = { ...r };
                      for (const f of allMoveFields) (next as any)[f] = 0;
                      (next as any)[field] = 1;
                      next.repairMemo = null;
                      next.maintenanceMemo = null;
                      next.usedSaleMemo = null;
                      next.loaned = 0;
                      next.returnDueDate = "";
                      next.customer = "";
                      next.orderTaker = "";
                      next.site = "";
                      next.siteContact = "";
                      next.startDate = "";
                      next.stock = Math.max(1, next.stock || 0);
                      return next;
                    })
                  );
                } catch {
                  // ignore
                }
              }}
              title={hasValue ? "ドラッグして移動" : "ドロップで移動"}
            >
              {value}
            </div>
          );
        }}
        onCellDoubleClick={({ rowIndex, colIndex }) => {
          const row = filteredRows[rowIndex];
          if (!row) return;

          // 修理/整備/中古販売の「1」をダブルクリック → 保存済みメモを表示＆編集
          if (colIndex === 16 || colIndex === 17 || colIndex === 18) {
            const field = moveFieldByColIndex(colIndex);
            if (!field) return;
            if ((row as any)[field] <= 0) return; // 「1」が無い場合は対象外
            setPendingMove(null);
            setEditMemo({ machineNo: row.machineNo, field });
            setMemoKind(field === "repairing" ? "repair" : field === "maintaining" ? "maintenance" : "usedSale");
            setMemoModalOpen(true);
            return;
          }

          if (row.loaned <= 0) return;
          setOutboundRowIndex(rowIndex);
          setOutboundModalOpen(true);
        }}
      />

      <OutboundInProgressModal
        open={outboundModalOpen}
        customer={outboundRow?.customer ?? ""}
        orderTaker={outboundRow?.orderTaker ?? ""}
        site={outboundRow?.site ?? ""}
        siteContact={outboundRow?.siteContact ?? ""}
        startDate={outboundRow?.startDate ?? ""}
        returnDueDate={outboundRow?.returnDueDate ?? ""}
        onClose={() => {
          setOutboundModalOpen(false);
          setOutboundRowIndex(null);
        }}
      />

      <InventoryMemoModal
        open={memoModalOpen}
        title={
          memoKind === "repair"
            ? "修理内容モーダル（デモ）"
            : memoKind === "maintenance"
              ? "整備内容モーダル（デモ）"
              : "中古販売内容モーダル（デモ）"
        }
        initialValue={memoInitialValue}
        meta={memoMeta ?? undefined}
        onCancel={() => {
          // キャンセル: 移動は確定しない（＝元の位置のまま）
          setMemoModalOpen(false);
          setPendingMove(null);
          setEditMemo(null);
        }}
        onSave={(memo: InventoryMemoInput) => {
          const move = pendingMove;
          const edit = editMemo;

          // 既存メモの編集（移動なし）
          if (!move && edit) {
            const to = edit.field;
            const now = Date.now();
            setRows((prev) =>
              prev.map((r) => {
                if (r.machineNo !== edit.machineNo) return r;
                const next: InventoryCheckRow = { ...r };
                if (to === "repairing") {
                  const createdAt = next.repairMemo?.createdAt ?? now;
                  const id = next.repairMemo?.id ?? nextMemoId("repair");
                  next.repairMemo = { id, ...memo, createdAt, updatedAt: now };
                }
                if (to === "maintaining") {
                  const createdAt = next.maintenanceMemo?.createdAt ?? now;
                  const id = next.maintenanceMemo?.id ?? nextMemoId("maintenance");
                  next.maintenanceMemo = { id, ...memo, createdAt, updatedAt: now };
                }
                if (to === "usedSalePlanned") {
                  const createdAt = next.usedSaleMemo?.createdAt ?? now;
                  const id = next.usedSaleMemo?.id ?? nextMemoId("usedSale");
                  next.usedSaleMemo = { id, ...memo, createdAt, updatedAt: now };
                }
                return next;
              })
            );
            setMemoModalOpen(false);
            setEditMemo(null);
            return;
          }

          // 移動時メモ（保存で移動確定）
          if (!move) {
            setMemoModalOpen(false);
            setEditMemo(null);
            return;
          }

          const to = move.to;
          setRows((prev) =>
            prev.map((r) => {
              if (r.machineNo !== move.machineNo) return r;
              const next: InventoryCheckRow = { ...r };
              for (const f of allMoveFields) (next as any)[f] = 0;
              (next as any)[to] = 1;
              const now = Date.now();
              next.repairMemo = null;
              next.maintenanceMemo = null;
              next.usedSaleMemo = null;
              if (to === "repairing") next.repairMemo = { id: nextMemoId("repair"), ...memo, createdAt: now, updatedAt: now };
              if (to === "maintaining")
                next.maintenanceMemo = { id: nextMemoId("maintenance"), ...memo, createdAt: now, updatedAt: now };
              if (to === "usedSalePlanned")
                next.usedSaleMemo = { id: nextMemoId("usedSale"), ...memo, createdAt: now, updatedAt: now };

              next.loaned = 0;
              next.returnDueDate = "";
              next.customer = "";
              next.orderTaker = "";
              next.site = "";
              next.siteContact = "";
              next.startDate = "";
              next.stock = Math.max(1, next.stock || 0);
              return next;
            })
          );

          setMemoModalOpen(false);
          setPendingMove(null);
          setEditMemo(null);
        }}
      />
    </div>
  );
};

export default InventoryCheckPage;

