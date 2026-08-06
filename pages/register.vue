<template>
  <div class="login-wrap">
    <form class="login-card onbo" @submit.prevent="onSubmit">
      <div class="brand-row"><div class="logo">T</div><div class="brand-name">TTR&nbsp;ONE</div></div>
      <div class="login-sub">Регистрация компании — 14 дней бесплатно</div>

      <!-- Stepper -->
      <div class="stepper">
        <div v-for="(s, i) in steps" :key="i" class="stp" :class="{ on: step === i + 1, done: step > i + 1 }">
          <span class="stp-n">{{ step > i + 1 ? '✓' : i + 1 }}</span>
          <span class="stp-l">{{ s }}</span>
        </div>
      </div>

      <!-- Step 1: Account + company -->
      <section v-show="step === 1">
        <label>Название компании</label>
        <input v-model="companyName" placeholder="ООО «Мой Завод»" />
        <div class="row2">
          <div><label>Ваше имя</label><input v-model="fullName" placeholder="Иван Иванов" /></div>
          <div><label>Email</label><input v-model="email" type="email" placeholder="you@company.com" /></div>
        </div>
        <label>Пароль</label>
        <input v-model="password" type="password" placeholder="минимум 8 символов" autocomplete="new-password" />
      </section>

      <!-- Step 2: Niche -->
      <section v-show="step === 2">
        <div class="onbo-hint">Выберите сферу деятельности — подберём подходящие модули.</div>
        <div class="pickgrid">
          <button v-for="n in niches" :key="n.key" type="button" class="pick" :class="{ on: industry === n.key }" @click="setNiche(n)">
            <b>{{ n.label }}</b>
            <small>{{ nicheModuleNames(n) }}</small>
          </button>
        </div>
      </section>

      <!-- Step 3: Plan -->
      <section v-show="step === 3">
        <div class="onbo-hint">Тариф определяет, сколько модулей можно включить.</div>
        <div class="plangrid">
          <button v-for="p in plans" :key="p.key" type="button" class="plan" :class="{ on: plan === p.key, hot: p.highlight }" @click="setPlan(p)">
            <div class="plan-top">
              <b>{{ p.name }}</b>
              <span v-if="p.key === 'trial'" class="tag in">14 дней</span>
              <span v-else-if="p.highlight" class="tag in">Популярный</span>
            </div>
            <div class="plan-price">{{ priceLabel(p) }}</div>
            <div class="plan-mods">{{ moduleQuotaLabel(p) }}</div>
            <small>{{ p.tagline }}</small>
          </button>
        </div>
      </section>

      <!-- Step 4: Modules -->
      <section v-show="step === 4">
        <div class="onbo-hint">
          <template v-if="quota == null">Тариф «{{ selectedPlan?.name }}» — доступны <b>все модули</b>.</template>
          <template v-else>Тариф «{{ selectedPlan?.name }}»: можно выбрать до <b>{{ quota }}</b> {{ pluralMod(quota) }}.</template>
          <span class="count" :class="{ full: quotaFull }">Выбрано {{ selected.length }}<template v-if="quota != null"> / {{ quota }}</template></span>
        </div>
        <div class="modgrid compact">
          <button v-for="m in availableModules" :key="m.key" type="button"
            class="modcard mini"
            :class="{ on: selected.includes(m.key), off: quotaFull && !selected.includes(m.key), rec: recommended.has(m.key) }"
            @click="toggleModule(m.key)">
            <div class="modtop">
              <span class="modic">{{ m.icon }}</span>
              <span class="tag" :class="selected.includes(m.key) ? 'in' : 'muted'">{{ selected.includes(m.key) ? '✓ Вкл' : 'Выкл' }}</span>
            </div>
            <h3>{{ m.name }} <span v-if="recommended.has(m.key)" class="rec-dot" title="Рекомендуем для вашей сферы">★</span></h3>
            <p>{{ m.description }}</p>
          </button>
        </div>
        <div class="onbo-hint" style="margin-top:12px">
          <span class="rec-dot">★</span> — рекомендуется для сферы «{{ nicheLabel }}».
          <template v-if="soonModules.length"> Скоро: {{ soonModules.map(m => m.name).join(', ') }}.</template>
        </div>
        <div v-if="moduleError" class="error">{{ moduleError }}</div>
      </section>

      <!-- Step 5: Company details (optional) -->
      <section v-show="step === 5">
        <div class="onbo-hint">Реквизиты для официальных счетов. Можно заполнить позже.</div>
        <div class="row2">
          <div><label>Юр. название</label><input v-model="bill.billLegalName" placeholder='ООО «Мой Завод»' /></div>
          <div><label>ИНН</label><input v-model="bill.billInn" placeholder="123456789" /></div>
        </div>
        <label>Юридический адрес</label>
        <input v-model="bill.billAddress" placeholder="г. Ташкент, ул. ..." />
        <div class="row2">
          <div><label>Банк</label><input v-model="bill.billBank" placeholder="Название банка" /></div>
          <div><label>Р/счёт</label><input v-model="bill.billAccount" placeholder="2020 8000 ..." /></div>
        </div>
        <div class="row2">
          <div><label>МФО</label><input v-model="bill.billMfo" placeholder="00014" /></div>
          <div><label>Директор</label><input v-model="bill.billDirector" placeholder="Иван Иванов" /></div>
        </div>
        <label>Телефон</label>
        <input v-model="bill.billPhone" placeholder="+998 ..." />
      </section>

      <div v-if="error" class="error">{{ error }}</div>

      <!-- Nav buttons -->
      <div class="onbo-nav">
        <button v-if="step > 1" type="button" class="btn ghost" @click="back">Назад</button>
        <div class="spacer"></div>
        <button v-if="step < steps.length" type="button" class="btn" :disabled="!canNext" @click="next">Далее</button>
        <button v-else type="submit" class="btn green" :disabled="loading">{{ loading ? 'Создаём…' : 'Создать компанию' }}</button>
      </div>

      <div class="hint">Уже есть аккаунт? <NuxtLink to="/login" class="link">Войти</NuxtLink></div>
    </form>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' });
const auth = useAuth();

const steps = ['Аккаунт', 'Сфера', 'Тариф', 'Модули', 'Реквизиты'];
const step = ref(1);

// Form state
const companyName = ref(''); const fullName = ref(''); const email = ref(''); const password = ref('');
const industry = ref(''); const plan = ref('');
const selected = ref<string[]>([]);
const bill = reactive<Record<string, string>>({});
const error = ref(''); const moduleError = ref(''); const loading = ref(false);

// Metadata from the server
const niches = ref<any[]>([]);
const modules = ref<any[]>([]);
const plans = ref<any[]>([]);

const availableModules = computed(() => modules.value.filter((m) => m.status === 'available'));
const availableKeys = computed(() => availableModules.value.map((m) => m.key));
const soonModules = computed(() => modules.value.filter((m) => m.status !== 'available'));
const moduleName = (key: string) => modules.value.find((m) => m.key === key)?.name || key;
const selectedPlan = computed(() => plans.value.find((p) => p.key === plan.value) || null);
const quota = computed<number | null>(() => (selectedPlan.value ? selectedPlan.value.maxModules : null));
const quotaFull = computed(() => quota.value != null && selected.value.length >= quota.value);
const currentNiche = computed(() => niches.value.find((n) => n.key === industry.value) || null);
const nicheLabel = computed(() => currentNiche.value?.label || 'вашей компании');
// Modules recommended for the chosen company type (niche preset ∩ available).
const recommended = computed(() => new Set((currentNiche.value?.modules || []).filter((k: string) => availableKeys.value.includes(k))));

onMounted(async () => {
  try {
    const d = await auth.api<any>('/auth/onboarding-meta');
    niches.value = d.niches; modules.value = d.modules; plans.value = d.plans;
    plan.value = (d.plans.find((p: any) => p.highlight) || d.plans[0])?.key || '';
  } catch (e: any) { error.value = e.message; }
});

function nicheModuleNames(n: any) {
  return n.modules.map((k: string) => moduleName(k)).filter((_: string, i: number) => i < 4).join(' · ');
}
// Genitive form used after «до N…» / «не более N…»: 1 → модуля, otherwise → модулей.
function pluralMod(n: number) { return n === 1 ? 'модуля' : 'модулей'; }
function emailValid(v: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
const canNext = computed(() => {
  if (step.value === 1) return companyName.value.trim().length >= 2 && fullName.value.trim().length >= 2 && emailValid(email.value.trim()) && password.value.length >= 8;
  if (step.value === 2) return !!industry.value;
  if (step.value === 3) return !!plan.value;
  if (step.value === 4) return selected.value.length >= 1;
  return true;
});

// Recompute the module selection whenever the niche or plan changes.
// Free tier (all modules) → everything on; paid tiers → niche preset capped to the quota.
function applyPlanSelection() {
  const preset = (currentNiche.value?.modules || []).filter((k: string) => availableKeys.value.includes(k));
  if (quota.value == null && plan.value === 'trial') {
    selected.value = [...availableKeys.value]; // free tier: give all modules
  } else {
    selected.value = preset.slice(0, quota.value == null ? undefined : quota.value);
  }
  moduleError.value = '';
}
function setNiche(n: any) { industry.value = n.key; applyPlanSelection(); }
function setPlan(p: any) { plan.value = p.key; applyPlanSelection(); }
function toggleModule(key: string) {
  moduleError.value = '';
  const i = selected.value.indexOf(key);
  if (i >= 0) { selected.value.splice(i, 1); return; }
  if (quota.value != null && selected.value.length >= quota.value) {
    moduleError.value = `Тариф «${selectedPlan.value?.name}» позволяет не более ${quota.value} ${pluralMod(quota.value)}. Снимите другой модуль или выберите тариф выше.`;
    return;
  }
  selected.value.push(key);
}

function priceLabel(p: any) {
  if (p.priceMinor == null) return 'По запросу';
  if (p.priceMinor === 0) return 'Бесплатно';
  return (p.priceMinor / 100).toLocaleString('ru-RU') + ' сум/мес';
}
function moduleQuotaLabel(p: any) { return p.maxModules == null ? 'Все модули' : `До ${p.maxModules} ${pluralMod(p.maxModules)}`; }

function next() { if (canNext.value && step.value < steps.length) step.value++; }
function back() { if (step.value > 1) step.value--; }

async function onSubmit() {
  error.value = '';
  if (step.value < steps.length) { next(); return; }
  loading.value = true;
  try {
    const billOut: Record<string, string> = {};
    for (const [k, v] of Object.entries(bill)) { if (v && v.trim()) billOut[k] = v.trim(); }
    await auth.register({
      companyName: companyName.value.trim(),
      industry: industry.value,
      fullName: fullName.value.trim(),
      email: email.value.trim(),
      password: password.value,
      plan: plan.value,
      modules: selected.value,
      bill: Object.keys(billOut).length ? billOut : undefined,
    });
    await navigateTo('/dashboard');
  } catch (e: any) { error.value = e.message; loading.value = false; }
}
</script>

<style scoped>
.onbo { max-width: 640px; }
.stepper { display: flex; gap: 6px; margin: 4px 0 22px; }
.stp { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; opacity: .5; }
.stp.on, .stp.done { opacity: 1; }
.stp-n { width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center; font-size: 13px; font-weight: 700;
  background: #f1f5f9; color: #475569; border: 1px solid var(--line); }
.stp.on .stp-n { background: var(--brand); color: #fff; border-color: var(--brand); }
.stp.done .stp-n { background: #dcfce7; color: #166534; border-color: #86efac; }
.stp-l { font-size: 11px; color: var(--muted); }
.onbo-hint { color: var(--muted); font-size: 13px; margin-bottom: 14px; }
.onbo-hint .count { display: inline-block; margin-left: 8px; padding: 2px 10px; border-radius: 999px; background: #eff6ff; color: var(--brand); font-weight: 700; }
.onbo-hint .count.full { background: #fef3c7; color: #92400e; }
.pickgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.pick { text-align: left; background: #fff; border: 1px solid var(--line); border-radius: 10px; padding: 12px 14px; cursor: pointer;
  display: flex; flex-direction: column; gap: 3px; }
.pick:hover { border-color: var(--brand); }
.pick.on { border-color: var(--brand); box-shadow: 0 0 0 3px rgba(37,99,235,.08); }
.pick b { font-size: 14px; } .pick small { color: var(--muted); font-size: 11px; }
.plangrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; }
.plan { text-align: left; background: #fff; border: 1px solid var(--line); border-radius: 12px; padding: 16px; cursor: pointer;
  display: flex; flex-direction: column; gap: 6px; }
.plan:hover { border-color: var(--brand); }
.plan.on { border-color: var(--brand); box-shadow: 0 0 0 3px rgba(37,99,235,.08); }
.plan-top { display: flex; align-items: center; justify-content: space-between; }
.plan-top b { font-size: 16px; }
.plan-price { font-size: 15px; font-weight: 700; color: var(--ink); }
.plan-mods { font-size: 13px; color: var(--brand); font-weight: 600; }
.plan small { color: var(--muted); font-size: 12px; }
.modgrid.compact { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; }
.modcard.mini { padding: 12px 14px; cursor: pointer; text-align: left; transition: opacity .15s, border-color .15s; }
.modcard.mini:hover { border-color: var(--brand); }
.modcard.mini h3 { font-size: 14px; } .modcard.mini p { font-size: 12px; }
.modcard.mini.rec { border-color: #86efac; }
.modcard.mini.on { border-color: var(--brand); }
.modcard.mini.off { opacity: .45; }
.modcard.mini.off:hover { border-color: var(--line); }
.rec-dot { color: #16a34a; font-size: 12px; }
.tag.rec { background: #dcfce7; color: #166534; }
.onbo-nav { display: flex; align-items: center; gap: 10px; margin-top: 22px; }
.onbo-nav .spacer { flex: 1; }
.btn[disabled] { opacity: .5; cursor: default; }
</style>
