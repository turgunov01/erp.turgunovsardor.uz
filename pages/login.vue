<template>
  <div class="login-wrap">
    <form class="login-card" @submit.prevent="submit">
      <div class="brand-row"><div class="logo">T</div><div class="brand-name">TTR&nbsp;ONE</div><div style="margin-left:auto"><LangSwitcher /></div></div>
      <div class="login-sub">{{ t('auth.loginTitle') }}</div>
      <label>{{ t('auth.email') }}</label>
      <input v-model="email" type="email" placeholder="you@company.com" autocomplete="username" />
      <label>{{ t('auth.password') }}</label>
      <input v-model="password" type="password" autocomplete="current-password" />
      <template v-if="needMfa">
        <label>Код 2FA</label>
        <input v-model="mfaCode" inputmode="numeric" placeholder="6 цифр" />
      </template>
      <button class="btn block" type="submit">{{ t('auth.login') }}</button>
      <div class="error">{{ error }}</div>
      <div style="text-align:center;margin-top:14px"><a href="#" class="link" @click.prevent="openForgot">{{ t('auth.forgot') }}</a></div>
      <div class="hint">
        {{ t('auth.noAccount') }} <NuxtLink to="/register" class="link">{{ t('auth.register') }}</NuxtLink><br>
        Демо: admin@demo-factory.com / Admin123!
      </div>
    </form>

    <Modal v-if="fm.show" title="Восстановление пароля" submit-label="Получить ссылку" @close="fm.show = false" @submit="submitForgot">
      <label>Email</label><input v-model="fm.email" type="email" />
      <label>Тенант <span style="color:#94a3b8">(необязательно)</span></label><input v-model="fm.tenant" placeholder="demo-factory" />
    </Modal>

    <Modal v-if="rm.show" title="Новый пароль" submit-label="Сбросить пароль" @close="rm.show = false" @submit="submitReset">
      <div class="hint" style="text-align:left;margin:0 0 10px">Dev-режим: токен подставлен автоматически.</div>
      <label>Новый пароль</label><input v-model="rm.p1" type="password" placeholder="минимум 8 символов" />
      <label>Повторите пароль</label><input v-model="rm.p2" type="password" />
      <div class="error">{{ rm.err }}</div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' });
const auth = useAuth();
const { t } = useI18n();
const { toast } = useToast();
const email = ref('admin@demo-factory.com');
const password = ref('Admin123!');
const mfaCode = ref('');
const needMfa = ref(false);
const error = ref('');
const fm = reactive({ show: false, email: '', tenant: '' });
const rm = reactive({ show: false, token: '', p1: '', p2: '', err: '' });

async function submit() {
  error.value = '';
  try {
    await auth.login(email.value.trim(), password.value, mfaCode.value || undefined);
    await navigateTo('/dashboard');
  } catch (e: any) {
    if (e.code === 'MFA_REQUIRED' || e.code === 'MFA_INVALID') { needMfa.value = true; error.value = e.code === 'MFA_INVALID' ? 'Неверный код' : ''; }
    else error.value = e.message;
  }
}
function openForgot() { fm.email = email.value; fm.tenant = ''; fm.show = true; }
async function submitForgot() {
  try {
    const r = await auth.api<any>('/auth/forgot-password', { method: 'POST', retry: false, body: { email: fm.email.trim(), tenant: fm.tenant.trim() || undefined } });
    fm.show = false;
    if (r.devResetToken) { rm.token = r.devResetToken; rm.p1 = ''; rm.p2 = ''; rm.err = ''; rm.show = true; }
    else toast('Если аккаунт существует, ссылка отправлена на email');
  } catch (e: any) { toast(e.message, true); }
}
async function submitReset() {
  rm.err = '';
  if (rm.p1 !== rm.p2) { rm.err = 'Пароли не совпадают'; return; }
  try { await auth.api('/auth/reset-password', { method: 'POST', retry: false, body: { token: rm.token, newPassword: rm.p1 } }); rm.show = false; toast('Пароль сброшен — войдите с новым'); }
  catch (e: any) { rm.err = e.message; }
}
</script>
