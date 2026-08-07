<template>
  <div class="proj-head">
    <NuxtLink to="/projects" class="back">← Все проекты</NuxtLink>
    <div class="title-row">
      <h2>
        <span class="code" v-if="project">{{ project.code }}</span>
        {{ project?.name || '…' }}
        <span v-if="project" class="tag" :class="project.status">{{ statusLabel(project.status) }}</span>
      </h2>
    </div>
    <nav class="tabs">
      <NuxtLink :to="`/projects/${id}/board`" class="tab">📊 Доска</NuxtLink>
      <NuxtLink :to="`/projects/${id}/backlog`" class="tab">📋 Операции</NuxtLink>
      <NuxtLink :to="`/projects/${id}/stages`" class="tab">🏭 Этапы</NuxtLink>
      <NuxtLink :to="`/projects/${id}/time`" class="tab">⏱ Трудозатраты</NuxtLink>
    </nav>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ id: string; project?: any }>();
const statusLabel = (s: string) => PROJ_STATUS[s] || s;
</script>

<style scoped>
.proj-head { margin-bottom: 16px; }
.back { font-size: 13px; color: var(--muted, #64748b); text-decoration: none; }
.back:hover { color: var(--accent, #2563eb); }
.title-row h2 { margin: 4px 0 10px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.code { font-family: ui-monospace, monospace; font-size: 13px; color: #64748b; background: #f1f5f9; padding: 2px 8px; border-radius: 6px; }
.tag { font-size: 12px; padding: 2px 10px; border-radius: 10px; background: #f1f5f9; color: #475569; }
.tag.active { background: #dbeafe; color: #1e40af; }
.tag.done { background: #dcfce7; color: #166534; }
.tag.on_hold { background: #fef9c3; color: #854d0e; }
.tag.cancelled { background: #fee2e2; color: #991b1b; }
.tabs { display: flex; gap: 4px; border-bottom: 2px solid #e2e8f0; }
.tab { padding: 8px 16px; text-decoration: none; color: #64748b; font-weight: 500; font-size: 14px; border-bottom: 2px solid transparent; margin-bottom: -2px; border-radius: 6px 6px 0 0; }
.tab:hover { color: var(--accent, #2563eb); background: #f8fafc; }
.tab.router-link-active { color: var(--accent, #2563eb); border-bottom-color: var(--accent, #2563eb); font-weight: 600; }
</style>
