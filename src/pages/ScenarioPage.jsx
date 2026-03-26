import { useState, useEffect } from "react";
import { fetchScenarios, makeDecision } from "../api/client";

const STATE_ICONS = { ALLOW: "✓", HOLD: "⏸", DENY: "✕" };
const SEV_LABELS  = ["LOW RISK", "MODERATE RISK", "HIGH RISK"];
const SEV_CLASSES = ["sev-low", "sev-mid", "sev-high"];

export default function ScenarioPage() {
  const [scenarios,   setScenarios]   = useState({});
  const [activeKey,   setActiveKey]   = useState("healthcare");
  const [activeCase,  setActiveCase]  = useState(0);
  const [U,           setU]           = useState(0.10);
  const [R,           setR]           = useState(0.20);
  const [result,      setResult]      = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);

  useEffect(() => {
    fetchScenarios()
      .then(setScenarios)
      .catch(() => setError("Cannot connect to backend. Is FastAPI running on port 8000?"));
  }, []);

  const scenario = scenarios[activeKey];

  function selectCase(idx) {
    setActiveCase(idx);
    setResult(null);
    if (scenario?.cases[idx]) {
      setU(scenario.cases[idx].U);
      setR(scenario.cases[idx].R);
    }
  }

  function selectScenario(key) {
    setActiveKey(key);
    setActiveCase(0);
    setResult(null);
    const s = scenarios[key];
    if (s?.cases[0]) { setU(s.cases[0].U); setR(s.cases[0].R); }
  }

  async function runDecision() {
    setLoading(true); setError(null);
    try {
      const data = await makeDecision({
        uncertainty: U, risk_factor: R,
        scenario: activeKey, case_index: activeCase,
      });
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const stateLower = result?.state?.toLowerCase() ?? "allow";

  return (
    <div className="scenario-page">
      <div>
        <h1 className="page-title">Quantum-Inspired Kill Switch</h1>
        <p className="page-sub">Safety-critical scenario testing — healthcare · autonomous vehicle · military</p>
      </div>

      {error && (
        <div style={{ background: "var(--deny-bg)", border: "1px solid var(--deny-bdr)", borderRadius: "var(--radius)", padding: "12px 16px", fontSize: 13, color: "var(--deny)" }}>
          ⚠ {error}
        </div>
      )}

      {/* Scenario tabs */}
      <div className="scenario-tabs">
        {Object.entries(scenarios).map(([key, s]) => (
          <button key={key} className={`stab ${activeKey === key ? "active" : ""}`} onClick={() => selectScenario(key)}>
            <span className="stab-icon">{s.icon}</span>
            {s.name}
          </button>
        ))}
      </div>

      {/* Cases */}
      {scenario && (
        <div className="cases-grid">
          {scenario.cases.map((c, i) => (
            <div key={i} className={`case-card ${activeCase === i ? "active" : ""}`} onClick={() => selectCase(i)}>
              <div className={`case-severity ${SEV_CLASSES[i]}`}>{SEV_LABELS[i]}</div>
              <div className="case-label">{c.label}</div>
              <div className="case-params">
                <span className="cparam">U=<span>{c.U.toFixed(2)}</span></span>
                <span className="cparam">R=<span>{c.R.toFixed(2)}</span></span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main grid */}
      <div className="main-grid">
        {/* Control Panel */}
        <div className="control-panel">
          <p className="panel-title">Parameters</p>

          <div className="slider-group">
            <div className="slider-header">
              <span className="slider-label">Uncertainty (U)</span>
              <span className="slider-val">{U.toFixed(2)}</span>
            </div>
            <div className="slider-track">
              <input type="range" min="0" max="100" value={Math.round(U * 100)}
                onChange={e => { setU(e.target.value / 100); setResult(null); }} />
            </div>
            <div className="threshold-markers">
              <span>0.0 — certain</span>
              <span>θ₁=0.30</span>
              <span>θ₂=0.70</span>
              <span>1.0 — uncertain</span>
            </div>
          </div>

          <div className="slider-group">
            <div className="slider-header">
              <span className="slider-label">Risk Factor (R)</span>
              <span className="slider-val">{R.toFixed(2)}</span>
            </div>
            <div className="slider-track">
              <input type="range" min="0" max="100" value={Math.round(R * 100)}
                onChange={e => { setR(e.target.value / 100); setResult(null); }} />
            </div>
          </div>

          <hr className="divider" />

          {scenario?.cases[activeCase] && (
            <>
              <div className="context-label">Scenario context</div>
              <div className="context-box">{scenario.cases[activeCase].context ?? "No context available."}</div>
            </>
          )}

          <button className={`run-btn ${loading ? "loading" : ""}`} onClick={runDecision} disabled={loading}>
            {loading ? "Processing…" : "⬡ Run Quantum Decision"}
          </button>
        </div>

        {/* Result Panel */}
        <div className="result-panel">
          {result ? (
            <>
              <div className={`result-state-bar state-bar-${stateLower}`}>
                <div className={`state-name state-${stateLower}`}>
                  {STATE_ICONS[result.state]} {result.state}
                </div>
                <div style={{ marginLeft: "auto", textAlign: "right" }}>
                  <div style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 10, color: "var(--text3)", letterSpacing: 1 }}>ID: {result.id}</div>
                  <div style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 10, color: "var(--text3)" }}>
                    {new Date(result.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>

              <div className="result-body">
                {/* Explanation */}
                <div className="explanation">{result.explanation}</div>

                {/* Action */}
                {result.action && (
                  <div className={`action-box action-${stateLower}`}>
                    <div className="action-label">System action</div>
                    {result.action}
                  </div>
                )}

                {/* Probabilities */}
                <div className="prob-section">
                  <div style={{ fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: "var(--text3)", marginBottom: 10 }}>Probability distribution</div>
                  {[
                    { key: "P_allow", label: "ALLOW", cls: "allow" },
                    { key: "P_hold",  label: "HOLD",  cls: "hold"  },
                    { key: "P_deny",  label: "DENY",  cls: "deny"  },
                  ].map(({ key, label, cls }) => (
                    <div className="prob-row" key={key}>
                      <span className={`prob-lbl prob-lbl-${cls}`}>{label}</span>
                      <div className="prob-track">
                        <div className={`prob-fill prob-fill-${cls}`}
                          style={{ width: `${(result.probabilities[key] * 100).toFixed(1)}%` }} />
                      </div>
                      <span className="prob-num">{(result.probabilities[key] * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>

                {/* Qubit state */}
                <div>
                  <div style={{ fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: "var(--text3)", marginBottom: 8 }}>Qubit state (Bloch sphere)</div>
                  <div className="qubit-grid">
                    {[
                      { l: "θ (theta)", v: result.qubit.theta },
                      { l: "φ (phi)",   v: result.qubit.phi },
                      { l: "P(|0⟩) certain",   v: result.qubit.prob_certain },
                      { l: "P(|1⟩) uncertain", v: result.qubit.prob_uncertain },
                      { l: "Bloch X", v: result.qubit.bloch_x },
                      { l: "Bloch Z", v: result.qubit.bloch_z },
                    ].map(({ l, v }) => (
                      <div className="qval" key={l}>
                        <div className="qval-label">{l}</div>
                        <div className="qval-num">{v}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Entropy */}
                <div style={{ background: "var(--bg4)", borderRadius: "var(--radius)", padding: "12px 14px" }}>
                  <div style={{ fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: "var(--text3)", marginBottom: 8 }}>Von Neumann Entropy</div>
                  <div className="entropy-row">
                    <div className="entropy-val">{result.entropy}</div>
                    <div>
                      <div className="entropy-label">H(ρ) bits</div>
                      <div className="entropy-sub">Max entropy at U=0.5 → H=1.0</div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">⬡</div>
              <div className="empty-text">Select a scenario case and run the quantum decision engine</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
