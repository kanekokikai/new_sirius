import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Department } from "../types";

type InboundRegisterNavState = {
  department?: Department;
  instructionKey?: string;
  instructionId?: string;
  plannedDate?: string;
  plannedTime?: string;
  machine?: string;
  vehicle?: string;
  wrecker?: string;
  driver?: string;
  customer?: string;
  site?: string;
  note?: string;
  hourMeter?: string;
};

const coerceString = (value: unknown) => (value == null ? "" : String(value));

const toYYYYMMDD = (value: string) => {
  const s = value.trim();
  if (!s) return "";
  // accepts "YYYY-MM-DD" or "YYYY/MM/DD"
  const normalized = s.replace(/\//g, "-");
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized;
  return "";
};

const formatJPDate = (value: string) => {
  const ymd = toYYYYMMDD(value);
  if (!ymd) return "";
  const [y, m, d] = ymd.split("-");
  return `${y}/${m}/${d}`;
};

const InboundRegisterPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state ?? {}) as InboundRegisterNavState;

  const initialMachine = coerceString(state.machine);
  const initialCustomer = coerceString(state.customer);
  const initialSite = coerceString(state.site);
  const initialDate = toYYYYMMDD(coerceString(state.plannedDate));
  const initialHourMeter = coerceString(state.hourMeter);

  const [machine, setMachine] = useState(initialMachine);
  const [hourMeter, setHourMeter] = useState(initialHourMeter);
  const [inboundPlace, setInboundPlace] = useState("本社工場");
  const [returnDate, setReturnDate] = useState(initialDate);
  const [returnedFrom, setReturnedFrom] = useState(initialCustomer);
  const [siteName, setSiteName] = useState(initialSite);

  const canSubmit = useMemo(() => {
    return Boolean(machine.trim()) && Boolean(returnDate.trim()) && Boolean(inboundPlace.trim());
  }, [inboundPlace, machine, returnDate]);

  const meta = useMemo(() => {
    const dept = state.department ? `（${state.department}）` : "";
    const id = coerceString(state.instructionId);
    const time = coerceString(state.plannedTime);
    const dateJp = formatJPDate(coerceString(state.plannedDate));
    const chips = [id ? `指示ID: ${id}` : "", dateJp ? `入庫日: ${dateJp}` : "", time ? `時間: ${time}` : ""].filter(Boolean);
    return { dept, chips };
  }, [state.department, state.instructionId, state.plannedDate, state.plannedTime]);

  return (
    <div className="app-shell" style={{ maxWidth: 520, padding: 16 }}>
      <div
        style={{
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: 16,
          padding: 14
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 40px", alignItems: "center" }}>
          <button
            className="button ghost"
            type="button"
            aria-label="戻る"
            onClick={() => navigate(-1)}
            style={{ padding: "8px 10px", borderRadius: 12 }}
          >
            ←
          </button>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700, letterSpacing: 0.2 }}>出入りくん</div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>入庫登録{meta.dept}</div>
          </div>
          <div />
        </div>

        {meta.chips.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10, justifyContent: "center" }}>
            {meta.chips.map((c) => (
              <span key={c} className="pill" style={{ background: "#dcfce7", color: "#166534" }}>
                {c}
              </span>
            ))}
          </div>
        )}

        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 14,
            padding: 14,
            marginTop: 12
          }}
        >
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 10, alignItems: "center" }}>
              <div style={{ fontWeight: 800, color: "#334155" }}>機械</div>
              <select className="filter-input" value={machine} onChange={(e) => setMachine(e.target.value)} aria-label="機械">
                {initialMachine && <option value={initialMachine}>{initialMachine}</option>}
                {!initialMachine && <option value="">選択してください</option>}
                <option value="ZX120（1台）">ZX120（1台）</option>
                <option value="WA100（1台）">WA100（1台）</option>
                <option value="RK70（1台）">RK70（1台）</option>
                <option value="SR45（1台）">SR45（1台）</option>
              </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 10, alignItems: "center" }}>
              <div style={{ fontWeight: 800, color: "#334155" }}>入庫時アワーメータ</div>
              <input
                className="filter-input"
                inputMode="numeric"
                placeholder="アワーメータを入力"
                value={hourMeter}
                onChange={(e) => setHourMeter(e.target.value)}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 10, alignItems: "center" }}>
              <div style={{ fontWeight: 800, color: "#334155" }}>入庫場所</div>
              <select className="filter-input" value={inboundPlace} onChange={(e) => setInboundPlace(e.target.value)} aria-label="入庫場所">
                <option value="本社工場">本社工場</option>
                <option value="本社ヤード">本社ヤード</option>
                <option value="支店ヤード">支店ヤード</option>
              </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 10, alignItems: "center" }}>
              <div style={{ fontWeight: 800, color: "#334155" }}>入庫日</div>
              <input className="filter-input" type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 10, alignItems: "center" }}>
              <div style={{ fontWeight: 800, color: "#334155" }}>返却元</div>
              <input className="filter-input" placeholder="返却元を入力" value={returnedFrom} onChange={(e) => setReturnedFrom(e.target.value)} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 10, alignItems: "center" }}>
              <div style={{ fontWeight: 800, color: "#334155" }}>現場名</div>
              <input className="filter-input" placeholder="現場名を入力" value={siteName} onChange={(e) => setSiteName(e.target.value)} />
            </div>

            {coerceString(state.note).trim() && (
              <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 10 }}>
                <div style={{ fontWeight: 800, color: "#334155" }}>備考（指示書）</div>
                <div style={{ color: "#475569", whiteSpace: "pre-wrap" }}>{coerceString(state.note)}</div>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
          <button className="button" type="button" onClick={() => {}} disabled={!machine.trim()}>
            下書き保存
          </button>
          <button className="button primary" type="button" onClick={() => {}} disabled={!canSubmit}>
            入庫登録
          </button>
        </div>

        <div style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
          <Link to="/home" className="button ghost">
            ホームへ戻る
          </Link>
        </div>
      </div>
    </div>
  );
};

export default InboundRegisterPage;

