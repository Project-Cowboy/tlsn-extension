export async function sendTlsNProofToProver(url: string, payload: {}) {
  console.log("Sending... ", payload)
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Prover returned ${res.status}`);
  }
  const body = (await res.json()) as { receipt: string };
  return body.receipt;
}
