<template>
  <Modal :title="modalTitle" :wide="step === 'main'" :submit-label="step === 'main' ? 'Закрыть' : (step === 'mfa-setup' ? 'Подтвердить' : 'Готово')"
         @close="$emit('close')" @submit="onSubmit">
    <!-- Main -->
    <template v-if="step === 'main'">
      <h4 style="margin:0 0 6px">Двухфакторная аутентификация</h4>
      <div v-if="sec.mfaEnabled">2FA: <span class="tag in">включена</span> <button class="btn ghost sm" @click="step = 'mfa-off'">Отключить</button></div>
      <div v-else>2FA: <span class="tag muted">выключена</span> <button class="btn sm" @click="setupMfa">Включить</button></div>

      <h4 style="margin:14px 0 6px">PIN-код (шифрует доступ на устройстве)</h4>
      <div v-if="auth.vaultExists">PIN: <span class="tag in">задан 🔒</span> <button class="btn ghost sm" @click="clearPin">Сбросить</button></div>
      <div v-else>PIN: <span class="tag muted">нет</span> <button class="btn sm" @click="step = 'pin-set'">Задать PIN</button></div>

      <div class="sess-head">
        <h4 style="margin:16px 0 6px">Активные сессии ({{ sessions.length }})</h4>
        <button class="btn red sm" @click="revokeAll">Выйти на всех устройствах</button>
      </div>
      <div class="sess-list">
        <table class="sess-table"><tbody>
          <tr v-for="s in visibleSessions" :key="s.id">
            <td class="ua">{{ s.userAgent || 'устройство' }}</td>
            <td class="ip">{{ s.ip || '' }}</td>
            <td class="dt">{{ dt(s.createdAt) }}</td>
            <td class="act"><button class="btn ghost sm" @click="revoke(s.id)">Отозвать</button></td>
          </tr>
          <tr v-if="!sessions.length"><td>Нет активных сессий</td></tr>
        </tbody></table>
      </div>
      <div v-if="sessions.length > visibleSessions.length" class="hint" style="margin-top:8px">
        Показаны последние {{ visibleSessions.length }} из {{ sessions.length }}. «Выйти на всех устройствах» очистит остальные.
      </div>
    </template>

    <!-- MFA setup -->
    <template v-else-if="step === 'mfa-setup'">
      <div class="hint" style="text-align:left;margin:0 0 8px">Добавьте в Google Authenticator / любой TOTP-аутентификатор:</div>
      <div>Ключ: <code>{{ setup.secret }}</code></div>
      <div style="margin-top:6px;word-break:break-all;font-size:12px;color:#64748b">{{ setup.otpauth }}</div>
      <label style="margin-top:12px">Код из приложения</label><input v-model="code" inputmode="numeric" placeholder="6 цифр" />
      <div class="error">{{ err }}</div>
    </template>

    <!-- MFA off -->
    <template v-else-if="step === 'mfa-off'">
      <label>Код из приложения (если требуется)</label><input v-model="code" inputmode="numeric" placeholder="6 цифр" />
      <div class="error">{{ err }}</div>
    </template>

    <!-- PIN set -->
    <template v-else-if="step === 'pin-set'">
      <label>PIN (4–8 цифр)</label><input v-model="pin" inputmode="numeric" />
      <div class="error">{{ err }}</div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
const auth = useAuth();
const { toast } = useToast();
const emit = defineEmits(['close']);

const step = ref<'main' | 'mfa-setup' | 'mfa-off' | 'pin-set'>('main');
const sec = ref<any>({ mfaEnabled: false, pinSet: false });
const sessions = ref<any[]>([]);
const setup = ref<any>({ secret: '', otpauth: '' });
const code = ref(''); const pin = ref(''); const err = ref('');

const modalTitle = computed(() => ({ main: 'Безопасность аккаунта', 'mfa-setup': 'Включение 2FA', 'mfa-off': 'Отключить 2FA', 'pin-set': 'Задать PIN' } as any)[step.value]);
// Render only the most recent sessions (they can accumulate into the hundreds).
const visibleSessions = computed(() => sessions.value.slice(0, 50));

async function load() {
  const [s, ss] = await Promise.all([auth.api('/auth/security'), auth.api('/auth/sessions')]);
  sec.value = s; sessions.value = (ss as any).sessions;
}
async function setupMfa() { const s = await auth.api<any>('/auth/mfa/setup', { method: 'POST' }); setup.value = s; code.value = ''; err.value = ''; step.value = 'mfa-setup'; }
async function clearPin() { try { await auth.api('/auth/pin/clear', { method: 'POST' }); } catch {} auth.clearVault(); toast('PIN сброшен'); await load(); }
async function revoke(id: string) { await auth.api(`/auth/sessions/${id}/revoke`, { method: 'POST' }); toast('Сессия отозвана'); await load(); }
async function revokeAll() { await auth.api('/auth/sessions/revoke-all', { method: 'POST' }); toast('Сессии сброшены — войдите заново'); setTimeout(() => auth.logout(), 800); }

async function onSubmit() {
  err.value = '';
  try {
    if (step.value === 'main') { emit('close'); return; }
    if (step.value === 'mfa-setup') { await auth.api('/auth/mfa/enable', { method: 'POST', body: { code: code.value.trim() } }); toast('2FA включена'); step.value = 'main'; await load(); return; }
    if (step.value === 'mfa-off') { await auth.api('/auth/mfa/disable', { method: 'POST', body: { code: code.value.trim() } }); toast('2FA отключена'); step.value = 'main'; await load(); return; }
    if (step.value === 'pin-set') { await auth.createVault(pin.value.trim()); toast('PIN задан — доступ зашифрован'); step.value = 'main'; await load(); return; }
  } catch (e: any) { err.value = e.message; }
}
onMounted(load);
</script>

<style scoped>
.sess-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.sess-list { max-height: 320px; overflow-y: auto; border: 1px solid var(--line); border-radius: 8px; }
.sess-table { width: 100%; font-size: 12px; border-collapse: collapse; }
.sess-table td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
.sess-table tr:last-child td { border-bottom: none; }
.sess-table .ua { max-width: 340px; word-break: break-word; color: #334155; }
.sess-table .ip { white-space: nowrap; color: var(--muted); }
.sess-table .dt { white-space: nowrap; color: var(--muted); }
.sess-table .act { text-align: right; white-space: nowrap; }
</style>
