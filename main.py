from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import numpy as np
import math
import time
import uuid
from datetime import datetime

app = FastAPI(title="Quantum-Inspired Kill Switch API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Quantum-Inspired State Engine ──────────────────────────────────────────

def qubit_superposition(uncertainty: float) -> dict:
    """
    Simulate a qubit in superposition using Bloch sphere representation.
    theta = uncertainty angle on Bloch sphere (0 = |0> = certain, pi = |1> = uncertain)
    """
    theta = uncertainty * math.pi          # map [0,1] → [0, π]
    phi   = uncertainty * 2 * math.pi      # phase angle

    alpha = math.cos(theta / 2)            # amplitude for |0>
    beta_r = math.sin(theta / 2) * math.cos(phi)   # real part of |1> amplitude
    beta_i = math.sin(theta / 2) * math.sin(phi)   # imaginary part

    prob_0 = alpha ** 2                    # P(|0>) = certainty
    prob_1 = beta_r ** 2 + beta_i ** 2    # P(|1>) = uncertainty

    return {
        "theta": round(theta, 4),
        "phi":   round(phi, 4),
        "alpha": round(alpha, 4),
        "beta_real": round(beta_r, 4),
        "beta_imag": round(beta_i, 4),
        "prob_certain":   round(prob_0, 4),
        "prob_uncertain": round(prob_1, 4),
        "bloch_x": round(2 * alpha * beta_r, 4),
        "bloch_y": round(2 * alpha * beta_i, 4),
        "bloch_z": round(alpha ** 2 - prob_1, 4),
    }


def quantum_interference(u: float, r: float) -> dict:
    """
    Constructive/destructive interference to weight P(A), P(H), P(D)
    Inspired by double-slit interference in quantum mechanics.
    """
    psi_allow = math.cos(u * math.pi / 2) ** 2         # strong when low U
    psi_hold  = math.sin(u * math.pi / 2) ** 2 * math.cos(r * math.pi / 2) ** 2
    psi_deny  = math.sin(u * math.pi / 2) ** 2 * math.sin(r * math.pi / 2) ** 2

    total = psi_allow + psi_hold + psi_deny
    return {
        "P_allow": round(psi_allow / total, 4),
        "P_hold":  round(psi_hold  / total, 4),
        "P_deny":  round(psi_deny  / total, 4),
    }


def collapse_state(probs: dict, u: float, theta1=0.3, theta2=0.7) -> str:
    """Wave-function collapse: deterministic threshold-based collapse"""
    if u <= theta1:
        return "ALLOW"
    elif u <= theta2:
        return "HOLD"
    else:
        return "DENY"


def quantum_entropy(u: float) -> float:
    """Von Neumann entropy as uncertainty measure — H = -p*log(p) - (1-p)*log(1-p)"""
    p = max(1e-9, min(1 - 1e-9, u))
    return round(-p * math.log2(p) - (1 - p) * math.log2(1 - p), 4)


# ─── Scenario Definitions ────────────────────────────────────────────────────

SCENARIOS = {
    "healthcare": {
        "name": "Healthcare Diagnosis",
        "icon": "🏥",
        "description": "AI diagnoses patient from incomplete lab records",
        "cases": [
            {"label": "Complete records, clear diagnosis",   "U": 0.10, "R": 0.20, "context": "All patient history available. CT scan clear."},
            {"label": "Missing lab values, ambiguous scan",  "U": 0.52, "R": 0.60, "context": "3 of 7 lab values missing. Scan shows shadow — could be benign or malignant."},
            {"label": "Conflicting reports, critical state", "U": 0.85, "R": 0.90, "context": "Two radiologists disagree. Patient deteriorating. Emergency surgery decision pending."},
        ],
        "allow_action":  "Treatment plan issued to patient",
        "hold_action":   "Additional tests ordered. Specialist review requested.",
        "deny_action":   "Kill-Switch: Decision escalated to senior physician. No autonomous action.",
    },
    "autonomous_vehicle": {
        "name": "Autonomous Vehicle",
        "icon": "🚗",
        "description": "Self-driving car navigating adverse conditions",
        "cases": [
            {"label": "Clear highway, full sensor data",     "U": 0.08, "R": 0.10, "context": "Sunny day. All LiDAR, radar, camera operational. Road clear."},
            {"label": "Light fog, partial obstruction",      "U": 0.48, "R": 0.50, "context": "Fog reducing visibility to 40m. Pedestrian detected — confidence 61%."},
            {"label": "Heavy rain, sensor degraded",         "U": 0.88, "R": 0.95, "context": "Camera failure. LiDAR returns noisy data. Unknown object 5m ahead."},
        ],
        "allow_action":  "Vehicle proceeds at cruise speed",
        "hold_action":   "Speed reduced 40%. Hazard lights on. Driver alert issued.",
        "deny_action":   "Kill-Switch: Emergency stop. Control handed to human driver.",
    },
    "military": {
        "name": "Military Decision System",
        "icon": "🎯",
        "description": "AI threat assessment and response authorization",
        "cases": [
            {"label": "Verified hostile target, clear ID",   "U": 0.12, "R": 0.15, "context": "Target positively identified. Rules of engagement met. Command authorized."},
            {"label": "Ambiguous signal, partial intel",     "U": 0.55, "R": 0.70, "context": "Radar signature matches threat. IFF transponder silent. Civilian zone proximity: 60%."},
            {"label": "Sensor spoofing suspected",           "U": 0.91, "R": 0.98, "context": "Multiple conflicting sensor feeds. GPS jamming detected. Possible spoofed target."},
        ],
        "allow_action":  "Engagement authorized and logged",
        "hold_action":   "Hold fire. Human commander notified. Awaiting confirmation.",
        "deny_action":   "Kill-Switch: All autonomous engagement blocked. Command override required.",
    },
}

# ─── Request/Response Models ─────────────────────────────────────────────────

class DecisionRequest(BaseModel):
    uncertainty: float          # 0.0 – 1.0
    risk_factor: float          # 0.0 – 1.0
    scenario: Optional[str] = None
    case_index: Optional[int] = None
    theta1: float = 0.3
    theta2: float = 0.7

class DecisionResponse(BaseModel):
    id: str
    timestamp: str
    state: str
    probabilities: dict
    qubit: dict
    entropy: float
    action: str
    explanation: str
    scenario_context: Optional[str]
    uncertainty: float
    risk_factor: float

# ─── In-memory decision log ───────────────────────────────────────────────────
decision_log = []

# ─── Routes ──────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"message": "Quantum-Inspired Kill Switch API running", "version": "1.0.0"}


@app.post("/api/decide", response_model=DecisionResponse)
def make_decision(req: DecisionRequest):
    U = max(0.0, min(1.0, req.uncertainty))
    R = max(0.0, min(1.0, req.risk_factor))

    probs   = quantum_interference(U, R)
    qubit   = qubit_superposition(U)
    entropy = quantum_entropy(U)
    state   = collapse_state(probs, U, req.theta1, req.theta2)

    scenario_info = SCENARIOS.get(req.scenario, {}) if req.scenario else {}
    context = None
    action  = ""

    if scenario_info and req.case_index is not None:
        cases   = scenario_info.get("cases", [])
        if 0 <= req.case_index < len(cases):
            context = cases[req.case_index]["context"]
        action_key = f"{state.lower()}_action"
        action = scenario_info.get(action_key, "")

    explanations = {
        "ALLOW": f"Uncertainty U={U:.2f} ≤ θ₁={req.theta1}. Qubit collapsed to |0⟩. P(Allow)={probs['P_allow']:.2%}. Safe to execute.",
        "HOLD":  f"θ₁={req.theta1} < U={U:.2f} ≤ θ₂={req.theta2}. Superposition maintained. Awaiting external validation. P(Hold)={probs['P_hold']:.2%}.",
        "DENY":  f"U={U:.2f} > θ₂={req.theta2}. Kill-Switch activated. Von Neumann entropy={entropy}. P(Deny)={probs['P_deny']:.2%}. Action blocked.",
    }

    result = DecisionResponse(
        id=str(uuid.uuid4())[:8],
        timestamp=datetime.now().isoformat(),
        state=state,
        probabilities=probs,
        qubit=qubit,
        entropy=entropy,
        action=action,
        explanation=explanations[state],
        scenario_context=context,
        uncertainty=U,
        risk_factor=R,
    )

    decision_log.append(result.dict())
    if len(decision_log) > 50:
        decision_log.pop(0)

    return result


@app.get("/api/scenarios")
def get_scenarios():
    return {
        k: {
            "name": v["name"],
            "icon": v["icon"],
            "description": v["description"],
            "cases": [{"label": c["label"], "U": c["U"], "R": c["R"]} for c in v["cases"]],
        }
        for k, v in SCENARIOS.items()
    }


@app.get("/api/log")
def get_log():
    return {"log": list(reversed(decision_log[-20:]))}


@app.get("/api/stats")
def get_stats():
    if not decision_log:
        return {"total": 0, "allow": 0, "hold": 0, "deny": 0}
    states = [d["state"] for d in decision_log]
    return {
        "total": len(states),
        "allow": states.count("ALLOW"),
        "hold":  states.count("HOLD"),
        "deny":  states.count("DENY"),
    }
