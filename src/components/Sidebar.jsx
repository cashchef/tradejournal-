import { Link } from "react-router-dom";

export default function Sidebar() {
  return (
    <div style={{ width: "200px", padding: "20px", borderRight: "1px solid #333" }}>
      <h2>TradeEdge</h2>

      <nav style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <Link to="/">Dashboard</Link>
        <Link to="/journal">Journal</Link>
        <Link to="/backtest">Backtest</Link>
      </nav>
    </div>
  );
}
