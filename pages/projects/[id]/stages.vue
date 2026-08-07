<template>
  <div>
    <ProjectTabs :id="id" :project="project" />
    <div class="panel">
      <div class="panel-head">
        <h3>Этапы производства</h3>
        <button v-if="canWrite" class="btn sm" @click="add">+ Этап</button>
      </div>
      <div class="panel-body">
        <p class="hint">ℹ️ Этапы — это крупные фазы работы над заказом (например: Заготовка → Обработка → Сборка → ОТК → Упаковка). Полоска показывает, сколько операций этапа уже готово.</p>
        <div class="stages">
          <div v-for="s in stages" :key="s.id" class="stage" :class="s.status">
            <div class="stage-top">
              <div class="stage-name">{{ s.name }}</div>
              <div class="stage-ctl">
                <select v-if="canWrite" :value="s.status" class="mini" @change="setStageStatus(s.id, ($event.target as HTMLSelectElement).value)">
                  <option value="pending">Ожидает</option><option value="active">В работе</option><option value="done">Готов</option>
                </select>
                <button v-if="canWrite" class="x" title="Удалить этап" @click="delStage(s)">✕</button>
              </div>
            </div>
            <div class="bar"><div class="bar-fill" :style="{ width: prog(s.id).pct + '%' }"></div></div>
            <div class="stage-foot">{{ prog(s.id).done }} из {{ prog(s.id).total }} операций готово · {{ prog(s.id).pct }}%</div>
          </div>
          <div v-if="!stages.length" class="empty-card">
            Этапов пока нет. Добавьте первый — например, «Заготовка».
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app' });
const route = useRoute();
const id = route.params.id as string;
const { project, stages, tasks, canWrite, load, addStage, setStageStatus, delStage } = useProject(id);

function prog(sid: string) {
  const inStage = tasks.value.filter((t: any) => t.stageId === sid);
  const total = inStage.length;
  const done = inStage.filter((t: any) => t.status === 'done').length;
  return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
}
async function add() {
  const name = prompt('Название этапа? (например: Заготовка, Сборка, ОТК)');
  if (name && name.trim()) await addStage(name.trim());
}

onMounted(load);
</script>

<style scoped>
.hint { background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; border-radius: 10px; padding: 10px 14px; margin: 0 0 14px; font-size: 14px; }
.stages { display: flex; flex-direction: column; gap: 10px; }
.stage { border: 1px solid #e2e8f0; border-left: 4px solid #cbd5e1; border-radius: 10px; padding: 12px 14px; background: #fff; }
.stage.active { border-left-color: #2563eb; background: #eff6ff; }
.stage.done { border-left-color: #16a34a; background: #f0fdf4; }
.stage-top { display: flex; justify-content: space-between; align-items: center; }
.stage-name { font-weight: 600; font-size: 15px; }
.stage-ctl { display: flex; align-items: center; gap: 8px; }
.mini { font-size: 12px; padding: 3px 6px; }
.x { background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 14px; }
.x:hover { color: #dc2626; }
.bar { height: 8px; background: #e2e8f0; border-radius: 6px; overflow: hidden; margin: 10px 0 6px; }
.bar-fill { height: 100%; background: #16a34a; border-radius: 6px; transition: width .3s; }
.stage-foot { font-size: 12px; color: #64748b; }
.empty-card { border: 1px dashed #cbd5e1; border-radius: 10px; padding: 20px; text-align: center; color: #64748b; }
</style>
