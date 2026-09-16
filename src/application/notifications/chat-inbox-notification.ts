/** Chat P2P alerts belong to the inbox, not the notification bell. */
export function isChatInboxNotification(input: {
  type?: string | null;
  resourceType?: string | null;
  message?: string | null;
}): boolean {
  const type = String(input.type || "").toUpperCase();
  const resource = String(input.resourceType || "");
  const message = String(input.message || "");
  return (
    type === "MESSAGE" &&
    resource === "Message" &&
    /^nouveau message\b/i.test(message)
  );
}
