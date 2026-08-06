<template>
  <div>
    <div class="panel">
      <div class="panel-head"><h2>Компания</h2></div>
      <div v-if="tenant" class="panel-body" style="padding:18px 18px 20px">
        <div style="font-size:16px"><b>{{ tenant.name }}</b></div>
        <div style="color:#64748b;margin-top:6px">
          Тариф: <b>{{ tenant.plan }}</b> · статус: {{ tenant.status }} · сфера: {{ industryLabel }} · адрес: <code>{{ tenant.slug }}.app</code>
        </div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-head"><h2>Модули</h2><span style="color:#64748b;font-size:13px">Включайте только нужное — как плагины</span></div>
      <div class="panel-body" style="padding:18px">
        <div class="modgrid">
          <div v-for="m in modules" :key="m.key" class="modcard" :class="{ on: m.enabled, soon: m.status !== 'available' }">
            <div class="modtop"><span class="modic">{{ m.icon }}</span>
              <span v-if="m.status !== 'available'" class="tag muted">Скоро</span>
              <span v-else-if="m.enabled" class="tag in">Включён</span>
              <span v-else class="tag muted">Выключен</span>
            </div>
            <h3>{{ m.name }}</h3><p>{{ m.description }}</p>
            <button v-if="m.status !== 'available'" class="btn ghost sm" disabled>Скоро</button>
            <button v-else-if="canManage" class="btn sm" :class="{ ghost: m.enabled }" @click="toggle(m)">{{ m.enabled ? 'Выключить' : 'Включить' }}</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="canManage" class="panel">
      <div class="panel-head"><h2>Оформление (White-label)</h2></div>
      <div class="panel-body" style="padding:18px">
        <div class="row2" style="max-width:520px">
          <div><label>Название бренда</label><input v-model="brandName" placeholder="TTR ONE" /></div>
          <div><label>Акцентный цвет</label><input v-model="brandColor" type="color" style="height:42px;padding:4px" /></div>
        </div>
        <button class="btn sm" style="margin-top:14px" @click="saveBrand">Сохранить оформление</button>
        <button class="btn ghost sm" style="margin-top:14px" @click="resetBrand">Сбросить</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app' });
const auth = useAuth();
const { toast } = useToast();
const tenant = ref<any>(null); const modules = ref<any[]>([]);
const brandName = ref(''); const brandColor = ref('#2563eb');
const canManage = computed(() => auth.can('tenant.manage'));
const industries: Record<string, string> = { manufacturing: 'Производство', retail: 'Ритейл / Магазин', ecommerce: 'Интернет-магазин', wholesale: 'Оптовая торговля', construction: 'Строительство', services: 'Услуги', logistics: 'Логистика', other: 'Другое' };
const industryLabel = computed(() => industries[tenant.value?.industry] || tenant.value?.industry || '—');

async function load() {
  const s = await auth.api<any>('/tenant/settings');
  tenant.value = s.tenant; modules.value = s.modules;
  brandName.value = s.tenant.brandName || ''; brandColor.value = s.tenant.brandColor || '#2563eb';
  auth.enabledModules = s.modules.filter((m: any) => m.enabled).map((m: any) => m.key);
}
async function toggle(m: any) {
  try {
    await auth.api(`/tenant/modules/${m.key}`, { method: 'PATCH', body: { enabled: !m.enabled } });
    toast('Модуль обновлён'); await load();
  } catch (e: any) { toast(e.message, true); }
}
async function saveBrand() {
  try {
    await auth.api('/tenant/branding', { method: 'PATCH', body: { brandName: brandName.value.trim() || null, brandColor: brandColor.value } });
    auth.tenant = { ...auth.tenant, brandName: brandName.value.trim() || null, brandColor: brandColor.value };
    toast('Оформление сохранено');
  } catch (e: any) { toast(e.message, true); }
}
async function resetBrand() {
  try {
    await auth.api('/tenant/branding', { method: 'PATCH', body: { brandName: null, brandColor: null } });
    auth.tenant = { ...auth.tenant, brandName: null, brandColor: null };
    brandName.value = ''; brandColor.value = '#2563eb'; toast('Оформление сброшено');
  } catch (e: any) { toast(e.message, true); }
}
onMounted(load);
</script>
