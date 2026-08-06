import { defineStore } from 'pinia';

export interface Notif { id: string; type: string; title: string; body?: string | null; refType?: string | null; refId?: string | null; readAt?: string | null; createdAt: string }

export const useNotifications = defineStore('notifications', {
  state: () => ({ items: [] as Notif[], unreadCount: 0, loaded: false }),
  actions: {
    async load() {
      const auth = useAuth();
      try {
        const d = await auth.api<any>('/platform/notifications?pageSize=30');
        this.items = d.items; this.unreadCount = d.unreadCount; this.loaded = true;
      } catch { /* ignore */ }
    },
    // A realtime push from the SSE stream.
    push(n: Notif) {
      if (this.items.find((x) => x.id === n.id)) return;
      this.items.unshift(n); this.unreadCount += 1;
    },
    async markRead(id: string) {
      const auth = useAuth();
      const n = this.items.find((x) => x.id === id);
      if (!n || n.readAt) return;
      await auth.api(`/platform/notifications/${id}/read`, { method: 'POST' });
      n.readAt = new Date().toISOString(); this.unreadCount = Math.max(0, this.unreadCount - 1);
    },
    async markAllRead() {
      const auth = useAuth();
      await auth.api('/platform/notifications/read-all', { method: 'POST' });
      this.items.forEach((n) => { n.readAt = n.readAt || new Date().toISOString(); });
      this.unreadCount = 0;
    },
  },
});
