// Shared data + mutations for one production project (Jira-style workspace).
// Every project sub-page (board / backlog / stages / time) uses this so the logic
// lives in one place. Production-themed vocabulary lives here too.

export const TASK_COLUMNS = ['todo', 'in_progress', 'review', 'done'] as const;
export const COL_LABEL: Record<string, string> = {
  todo: 'Очередь', in_progress: 'В работе', review: 'ОТК (контроль)', done: 'Готово', cancelled: 'Отменено',
};
export const PRI_LABEL: Record<string, string> = { low: 'Низкий', normal: 'Обычный', high: 'Высокий', urgent: 'Срочный' };
export const PROJ_STATUS: Record<string, string> = {
  planning: 'Планирование', active: 'В производстве', on_hold: 'Приостановлен', done: 'Завершён', cancelled: 'Отменён',
};
export const PROJ_STATUSES = ['planning', 'active', 'on_hold', 'done', 'cancelled'];

export function useProject(id: string) {
  const auth = useAuth();
  const { toast } = useToast();

  const project = ref<any>(null);
  const stages = ref<any[]>([]);
  const tasks = ref<any[]>([]);
  const entries = ref<any[]>([]);
  const employees = ref<any[]>([]);
  const summary = reactive<any>({ hours: 0, laborCostMinor: 0, budgetMinor: 0, taskCounts: {}, taskTotal: 0 });

  const canWrite = computed(() => auth.can('projects.write'));
  const canManage = computed(() => auth.can('projects.manage'));
  const overBudget = computed(() =>
    Number(summary.laborCostMinor) > Number(project.value?.budgetMinor || 0) && Number(project.value?.budgetMinor) > 0);

  async function load() {
    const d = await auth.api(`/projects/${id}`);
    project.value = d.project; stages.value = d.stages; tasks.value = d.tasks; Object.assign(summary, d.summary);
  }
  async function loadTime() { entries.value = (await auth.api(`/projects/${id}/time`)).entries; }
  async function loadEmployees() { try { employees.value = (await auth.api('/projects/meta')).employees; } catch { /* HR off */ } }

  const tasksBy = (col: string) => tasks.value.filter((t) => t.status === col);
  const stageName = (sid: string) => stages.value.find((s) => s.id === sid)?.name || '';
  const taskTitle = (tid: string) => tasks.value.find((t) => t.id === tid)?.title || '—';

  async function createTask(body: any) {
    try { await auth.api(`/projects/${id}/tasks`, { method: 'POST', body }); toast('Операция создана'); await load(); return true; }
    catch (e: any) { toast(e.message, true); return false; }
  }
  async function patchTask(tid: string, body: any) {
    try { await auth.api(`/projects/tasks/${tid}`, { method: 'PATCH', body }); await load(); return true; }
    catch (e: any) { toast(e.message, true); return false; }
  }
  async function setTaskStatus(tid: string, status: string) { return patchTask(tid, { status }); }
  async function delTask(t: any) {
    if (!confirm(`Удалить операцию «${t.title}»?`)) return;
    try { await auth.api(`/projects/tasks/${t.id}`, { method: 'DELETE' }); await load(); }
    catch (e: any) { toast(e.message, true); }
  }

  async function addStage(name: string) {
    try { await auth.api(`/projects/${id}/stages`, { method: 'POST', body: { name } }); await load(); }
    catch (e: any) { toast(e.message, true); }
  }
  async function setStageStatus(sid: string, status: string) {
    try { await auth.api(`/projects/stages/${sid}`, { method: 'PATCH', body: { status } }); await load(); }
    catch (e: any) { toast(e.message, true); }
  }
  async function delStage(s: any) {
    if (!confirm(`Удалить этап «${s.name}»?`)) return;
    try { await auth.api(`/projects/stages/${s.id}`, { method: 'DELETE' }); await load(); }
    catch (e: any) { toast(e.message, true); }
  }

  async function saveProject(body: any) {
    try { await auth.api(`/projects/${id}`, { method: 'PATCH', body }); toast('Сохранено'); await load(); return true; }
    catch (e: any) { toast(e.message, true); return false; }
  }
  async function addTime(body: any) {
    try { await auth.api(`/projects/${id}/time`, { method: 'POST', body }); toast('Время записано'); await loadTime(); await load(); return true; }
    catch (e: any) { toast(e.message, true); return false; }
  }
  async function delTime(e: any) {
    try { await auth.api(`/projects/time/${e.id}`, { method: 'DELETE' }); await loadTime(); await load(); }
    catch (err: any) { toast(err.message, true); }
  }

  return {
    project, stages, tasks, entries, employees, summary,
    canWrite, canManage, overBudget,
    load, loadTime, loadEmployees,
    tasksBy, stageName, taskTitle,
    createTask, patchTask, setTaskStatus, delTask,
    addStage, setStageStatus, delStage,
    saveProject, addTime, delTime,
  };
}
