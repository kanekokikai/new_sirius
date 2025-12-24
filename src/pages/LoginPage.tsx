import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const ok = login(userId, password);
    if (ok) {
      navigate("/home");
    } else {
      setError("ユーザーIDまたはパスワードが違います");
    }
  };

  return (
    <div className="app-shell">
      <div className="form-card">
        <h1>レンタル会社基幹システム</h1>
        <p>プロトタイプ（モック認証）</p>
        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label htmlFor="userId">ユーザーID</label>
            <input
              id="userId"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="例) front01（未入力でゲスト）"
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">パスワード</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="pass123 / admin（未入力でゲスト）"
            />
          </div>
          {error && <div className="helper-text">{error}</div>}
          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button className="button primary" type="submit">
              ログイン
            </button>
            <button
              className="button ghost"
              type="button"
              onClick={() => {
                setUserId("");
                setPassword("");
                setError(null);
              }}
            >
              クリア
            </button>
          </div>
          <div style={{ marginTop: 16, color: "#475569", fontSize: 13 }}>
            未入力でログインするとゲスト権限で全カードを確認できます。<br />
            デモユーザー例: front01 / account01 / factory01 / admin01（pass123 または admin）
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;

