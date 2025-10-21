export async function connectionStatusApi() {
  const res = await fetch("/api/spapi/connection-status/", {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch connection status");
  return (await res.json()) as { has_refresh_token: boolean };
}
