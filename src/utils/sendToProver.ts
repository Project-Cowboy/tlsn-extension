export async function sendTlsNProofToProver(url: string, hexData: string) {
  const res = await fetch(url, {
    method: "POST",
    body: hexData,
  });
  if (!res.ok) {
    throw new Error(`Prover returned ${res.status}`);
  }

  const body = (await res.json()) as { receipt: string };

  console.log("Returning receipt ", body.receipt);

  return body.receipt;
}
