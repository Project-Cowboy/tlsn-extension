export async function sendTlsNProofToProver(url: string, hexData: string) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json "
    },
    body: hexData,
  });
  if (!res.ok) {
    throw new Error(`Prover returned ${res.status}`);
  }
  const body = (await res.json()) as { receipt: string };
  return body.receipt;
}
