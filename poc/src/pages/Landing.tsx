import { useState } from "react";
import { useNavigate } from "react-router-dom";

const page: React.CSSProperties = {
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background:
    "radial-gradient(ellipse 60% 50% at 50% 40%, rgba(108, 92, 231, 0.14), transparent), #09090b",
};

const card: React.CSSProperties = {
  width: 420,
  padding: "40px 36px",
  borderRadius: 20,
  border: "1px solid rgba(255, 255, 255, 0.08)",
  background: "rgba(255, 255, 255, 0.03)",
  boxShadow: "0 24px 80px rgba(0, 0, 0, 0.5)",
  display: "flex",
  flexDirection: "column",
  gap: 20,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: 12,
  border: "1px solid rgba(255, 255, 255, 0.12)",
  background: "rgba(0, 0, 0, 0.4)",
  color: "#fafafa",
  fontSize: 15,
  outline: "none",
};

const buttonStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: 12,
  border: "none",
  background: "#6C5CE7",
  color: "#fff",
  fontSize: 15,
  fontWeight: 600,
  cursor: "pointer",
};

export const Landing: React.FC = () => {
  const [url, setUrl] = useState("");
  const navigate = useNavigate();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      return;
    }
    navigate(`/editor?url=${encodeURIComponent(url.trim())}`);
  };

  return (
    <div style={page}>
      <form style={card} onSubmit={onSubmit}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5 }}>
            Agape
          </div>
          <div style={{ fontSize: 14, color: "#8b8b93", marginTop: 6 }}>
            Turn your website into a launch video in seconds.
          </div>
        </div>
        <input
          style={inputStyle}
          placeholder="yourstartup.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          autoFocus
        />
        <button style={buttonStyle} type="submit">
          Generate launch video →
        </button>
      </form>
    </div>
  );
};
