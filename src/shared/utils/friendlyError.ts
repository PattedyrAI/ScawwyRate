/** Map raw RPC/Postgres error codes to user-facing copy; log the raw message. */
export function friendlyError(e: Error, overrides: Record<string, string> = {}): string {
  for (const [code, message] of Object.entries(overrides)) {
    if (e.message.includes(code)) return message;
  }
  if (e.message.includes('not_authenticated')) return 'Your session expired — sign in again.';
  console.warn('[rpc]', e.message);
  return 'Something went wrong. Check your connection and try again.';
}
