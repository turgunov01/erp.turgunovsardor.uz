<template>
  <div class="lang">
    <button class="lang-btn" @click="open = !open">{{ current.flag }} ▾</button>
    <template v-if="open">
      <div class="lang-back" @click="open = false"></div>
      <div class="lang-drop">
        <button v-for="l in locales" :key="l.code" class="lang-opt" :class="{ on: l.code === locale }" @click="pick(l.code)">
          <b>{{ l.flag }}</b> {{ l.label }}
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
const { locale, setLocale, locales } = useI18n();
const open = ref(false);
const current = computed(() => locales.find((l) => l.code === locale.value) || locales[0]);
function pick(code: any) { setLocale(code); open.value = false; }
</script>

<style scoped>
.lang { position: relative; display: inline-block; }
.lang-btn { background: none; border: 1px solid var(--line, #e2e8f0); border-radius: 8px; padding: 5px 10px; font-size: 13px; font-weight: 600; cursor: pointer; color: inherit; }
.lang-back { position: fixed; inset: 0; z-index: 60; }
.lang-drop { position: absolute; right: 0; top: 38px; z-index: 61; background: #fff; border: 1px solid var(--line, #e2e8f0); border-radius: 10px; box-shadow: 0 12px 30px rgba(0,0,0,.15); min-width: 150px; overflow: hidden; }
.lang-opt { display: block; width: 100%; text-align: left; background: none; border: none; padding: 10px 14px; font-size: 14px; cursor: pointer; color: #0f172a; }
.lang-opt:hover { background: #f1f5f9; } .lang-opt.on { color: var(--brand, #2563eb); font-weight: 600; }
.lang-opt b { display: inline-block; width: 26px; }
</style>
