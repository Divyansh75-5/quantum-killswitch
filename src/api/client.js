const BASE = "https://quantum-killswitch-production.up.railway.app";

export async function fetchScenarios() {
  const res = await fetch(`${BASE}/api/scenarios`);
  if (!res.ok) throw new Error("Failed to fetch scenarios");
  return res.json();
}

export async function makeDecision(payload) {
  const res = await fetch(`${BASE}/api/decide`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Decision API failed");
  return res.json();
}

export async function fetchLog() {
  const res = await fetch(`${BASE}/api/log`);
  if (!res.ok) throw new Error("Failed to fetch log");
  return res.json();
}
