// 9.3 Realtime client. Opens an SSE connection to the platform stream and feeds
// incoming notifications into the store (+ a toast). Reconnects on drop while the
// user stays authenticated.
let es: EventSource | null = null;
let stopped = false;

export function useRealtime() {
  const auth = useAuth();
  const notifs = useNotifications();
  const { toast } = useToast();

  function connect() {
    if (!import.meta.client || es || !auth.access) return;
    stopped = false;
    const base = useRuntimeConfig().public.apiBase as string;
    es = new EventSource(`${base}/platform/realtime?token=${encodeURIComponent(auth.access)}`);
    es.addEventListener('notification', (e: MessageEvent) => {
      try {
        const n = JSON.parse(e.data);
        notifs.push(n);
        toast(n.title, n.type === 'error' || n.type === 'warning');
      } catch { /* ignore */ }
    });
    es.onerror = () => {
      es?.close(); es = null;
      if (!stopped && auth.access) setTimeout(connect, 5000); // retry while logged in
    };
  }

  function disconnect() {
    stopped = true;
    es?.close(); es = null;
  }

  return { connect, disconnect };
}
