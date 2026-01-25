import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

type DetailState = {
  kind: "搬入" | "引取";
  scope: "results" | "draft";
  groupNo: string;
  location: string;
  customer: string;
  site: string;
  time: string;
  driver: string;
  items: Array<{ machineName: string; machineNo: string; quantity: string }>;
};

const InboundOrderDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? null) as DetailState | null;

  if (!state) {
    return (
      <div className="page">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ marginTop: 0 }}>搬入受注詳細（デモ）</h2>
          <button className="button" type="button" onClick={() => navigate(-1)}>
            戻る
          </button>
        </div>
        <p style={{ color: "#475569" }}>遷移情報がありません。検索結果のモーダルから「受注詳細」を押して遷移してください。</p>
      </div>
    );
  }

  return (
    <div className="page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ marginTop: 0 }}>搬入受注詳細（デモ）</h2>
        <button className="button" type="button" onClick={() => navigate(-1)}>
          戻る
        </button>
      </div>
      <p style={{ marginTop: 0, color: "#475569", fontSize: 12 }}>
        デモ画面です。{state.scope === "draft" ? "新規登録エリア" : "検索結果"}から遷移しました（種類: {state.kind}）。
      </p>

      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontWeight: 900, color: "#0f172a" }}>受注情報</div>
          <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 6, fontSize: 13 }}>
            <div style={{ color: "#64748b", fontWeight: 800 }}>件数</div>
            <div style={{ fontWeight: 800 }}>{state.groupNo || "（未採番）"}</div>
            <div style={{ color: "#64748b", fontWeight: 800 }}>場所</div>
            <div style={{ fontWeight: 800, whiteSpace: "pre-wrap" }}>{state.location || "（未入力）"}</div>
            <div style={{ color: "#64748b", fontWeight: 800 }}>会社名</div>
            <div style={{ fontWeight: 800, whiteSpace: "pre-wrap" }}>{state.customer || "（未入力）"}</div>
            <div style={{ color: "#64748b", fontWeight: 800 }}>現場</div>
            <div style={{ fontWeight: 800, whiteSpace: "pre-wrap" }}>{state.site || "（未入力）"}</div>
            <div style={{ color: "#64748b", fontWeight: 800 }}>時間</div>
            <div style={{ fontWeight: 800 }}>{state.time || "（未入力）"}</div>
            <div style={{ color: "#64748b", fontWeight: 800 }}>運転手</div>
            <div style={{ fontWeight: 800, whiteSpace: "pre-wrap" }}>{state.driver || "（未入力）"}</div>
          </div>
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontWeight: 900, color: "#0f172a" }}>商品</div>
          {state.items.length === 0 ? (
            <div style={{ color: "#475569", fontSize: 13 }}>商品がありません。</div>
          ) : (
            <div className="table-container">
              <table aria-label="商品一覧（デモ）" style={{ marginTop: 0 }}>
                <thead>
                  <tr>
                    <th>機械名</th>
                    <th>No.</th>
                    <th>数量</th>
                  </tr>
                </thead>
                <tbody>
                  {state.items.map((x, idx) => (
                    <tr key={`item-${idx}`}>
                      <td style={{ whiteSpace: "pre-wrap" }}>{x.machineName}</td>
                      <td>{x.machineNo}</td>
                      <td style={{ textAlign: "center" }}>{x.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InboundOrderDetailPage;

