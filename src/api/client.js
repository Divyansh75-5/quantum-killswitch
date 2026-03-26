const BASE_URL = "https://quantum-killswitch-1.onrender.com";

// Fetch all scenarios
export async function fetchScenarios() {
  const res = await fetch(`${BASE_URL}/api/scenarios`);
  
  if (!res.ok) {
    throw new Error("Failed to fetch scenarios");
  }

  return res.json();
}

// Send decision request
export async function makeDecision(data) {
  const res = await fetch(`${BASE_URL}/api/decide`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    throw new Error("Decision request failed");
  }

  return res.json();
}