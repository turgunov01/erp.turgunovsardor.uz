<template>
  <div class="rich">
    <div class="rich-toolbar">
      <button type="button" title="Жирный" @mousedown.prevent="exec('bold')"><b>Ж</b></button>
      <button type="button" title="Курсив" @mousedown.prevent="exec('italic')"><i>К</i></button>
      <button type="button" title="Подчёркнутый" @mousedown.prevent="exec('underline')"><u>Ч</u></button>
      <button type="button" title="Зачёркнутый" @mousedown.prevent="exec('strikeThrough')"><s>З</s></button>
      <span class="sep"></span>
      <select title="Стиль" @change="block($event)">
        <option value="P">Текст</option>
        <option value="H1">Заголовок 1</option>
        <option value="H2">Заголовок 2</option>
        <option value="H3">Заголовок 3</option>
        <option value="BLOCKQUOTE">Цитата</option>
      </select>
      <span class="sep"></span>
      <button type="button" title="Маркированный список" @mousedown.prevent="exec('insertUnorderedList')">• —</button>
      <button type="button" title="Нумерованный список" @mousedown.prevent="exec('insertOrderedList')">1.</button>
      <span class="sep"></span>
      <button type="button" title="По левому краю" @mousedown.prevent="exec('justifyLeft')">⯇</button>
      <button type="button" title="По центру" @mousedown.prevent="exec('justifyCenter')">≡</button>
      <button type="button" title="По правому краю" @mousedown.prevent="exec('justifyRight')">⯈</button>
      <span class="sep"></span>
      <button type="button" title="Ссылка" @mousedown.prevent="link">🔗</button>
      <button type="button" title="Таблица" @mousedown.prevent="insertTable">▦</button>
      <button type="button" title="Очистить формат" @mousedown.prevent="exec('removeFormat')">✗</button>
    </div>
    <div ref="editor" class="rich-body" contenteditable="true" @input="onInput" @blur="onInput"></div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ modelValue: string }>();
const emit = defineEmits(['update:modelValue']);
const editor = ref<HTMLElement | null>(null);

function sync() { if (editor.value) emit('update:modelValue', editor.value.innerHTML); }
function onInput() { sync(); }
function exec(cmd: string, val?: string) {
  editor.value?.focus();
  document.execCommand(cmd, false, val);
  sync();
}
function block(e: Event) {
  const v = (e.target as HTMLSelectElement).value;
  exec('formatBlock', `<${v.toLowerCase()}>`);
  (e.target as HTMLSelectElement).selectedIndex = 0;
}
function link() {
  const url = prompt('Адрес ссылки (URL):', 'https://');
  if (url) exec('createLink', url);
}
function insertTable() {
  const rows = Math.max(1, Math.min(20, Number(prompt('Строк:', '3')) || 0));
  const cols = Math.max(1, Math.min(10, Number(prompt('Столбцов:', '3')) || 0));
  if (!rows || !cols) return;
  let html = '<table border="1" cellpadding="6" style="border-collapse:collapse;width:100%">';
  for (let r = 0; r < rows; r++) { html += '<tr>'; for (let c = 0; c < cols; c++) html += '<td>&nbsp;</td>'; html += '</tr>'; }
  html += '</table><p><br></p>';
  exec('insertHTML', html);
}

// Load external content (initial value / docx import) without clobbering the caret
// while the user is typing.
watch(() => props.modelValue, (v) => {
  if (editor.value && document.activeElement !== editor.value && (v || '') !== editor.value.innerHTML) {
    editor.value.innerHTML = v || '';
  }
});
onMounted(() => { if (editor.value) editor.value.innerHTML = props.modelValue || ''; });
</script>

<style scoped>
.rich { border: 1px solid var(--line); border-radius: 8px; overflow: hidden; }
.rich-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 2px; padding: 6px 8px; background: #f8fafc; border-bottom: 1px solid var(--line); }
.rich-toolbar button { min-width: 28px; height: 28px; border: 1px solid transparent; background: none; border-radius: 6px; cursor: pointer; font-size: 13px; padding: 0 6px; }
.rich-toolbar button:hover { background: #e2e8f0; }
.rich-toolbar select { height: 28px; border: 1px solid var(--line); border-radius: 6px; font-size: 12px; background: #fff; }
.rich-toolbar .sep { width: 1px; height: 18px; background: var(--line); margin: 0 4px; }
.rich-body { min-height: 240px; max-height: 50vh; overflow-y: auto; padding: 14px 16px; font-size: 14px; line-height: 1.5; outline: none; background: #fff; }
.rich-body :deep(h1) { font-size: 20px; margin: 8px 0; }
.rich-body :deep(h2) { font-size: 17px; margin: 8px 0; }
.rich-body :deep(h3) { font-size: 15px; margin: 6px 0; }
.rich-body :deep(blockquote) { border-left: 3px solid var(--line); margin: 8px 0; padding-left: 12px; color: #64748b; }
.rich-body :deep(table) { margin: 8px 0; }
.rich-body :deep(td) { border: 1px solid #cbd5e1; padding: 6px; }
.rich-body :deep(ul), .rich-body :deep(ol) { padding-left: 22px; margin: 6px 0; }
</style>
