import React from "react";

export type MoveOrderRow = {
  writer?: string;
  date1?: string;
  date2?: string;
  inspectionChecklist?: "有" | "無" | "";
  productName?: string;
  loadingLocation?: string;
  moveReason?: string;
  unloadingLocation?: string;
  contractor?: string;
  notes?: string;
  executionDate?: string;
  driver?: string;
};

type Props = {
  rows?: MoveOrderRow[];
};

const emptyRow: MoveOrderRow = {
  writer: "",
  date1: "",
  date2: "",
  inspectionChecklist: "",
  productName: "",
  loadingLocation: "",
  moveReason: "",
  unloadingLocation: "",
  contractor: "",
  notes: "",
  executionDate: "",
  driver: ""
};

export const MoveOrdersResultsTable: React.FC<Props> = ({ rows }) => {
  const data = rows && rows.length > 0 ? rows : [emptyRow];

  return (
    <div className="move-orders-results-table-wrap" aria-label="移動受注 検索結果">
      <table className="move-orders-results-table">
        <thead>
          <tr>
            <th>記入者</th>
            <th>日付①</th>
            <th>日付②</th>
            <th>点検表（有無）</th>
            <th>品名</th>
            <th>積込み場所/名称</th>
            <th>移動理由（会社名/現場）</th>
            <th>降し場所/名称</th>
            <th>請負人</th>
            <th>備考</th>
            <th>実施日</th>
            <th>ﾄﾞﾗｲﾊﾞｰ</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r, idx) => (
            <tr key={idx}>
              <td>{r.writer ?? ""}</td>
              <td>{r.date1 ?? ""}</td>
              <td>{r.date2 ?? ""}</td>
              <td>{r.inspectionChecklist ?? ""}</td>
              <td>{r.productName ?? ""}</td>
              <td>{r.loadingLocation ?? ""}</td>
              <td>{r.moveReason ?? ""}</td>
              <td>{r.unloadingLocation ?? ""}</td>
              <td>{r.contractor ?? ""}</td>
              <td>{r.notes ?? ""}</td>
              <td>{r.executionDate ?? ""}</td>
              <td>{r.driver ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

