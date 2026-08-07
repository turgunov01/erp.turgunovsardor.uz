// Nav is organised into collapsible folder-groups, each filtered by permission +
// enabled module + platform-admin. A group is shown only if it has ≥1 visible view.
export interface ViewDef { id: string; to: string; label: string; ico: string; perm: string | null; module: string | null; admin?: boolean }
export interface NavGroup { id: string; label: string; views: ViewDef[] }

export const NAV: NavGroup[] = [
  { id: 'main', label: '', views: [
    { id: 'dashboard', to: '/dashboard', label: 'Дашборд', ico: '▦', perm: null, module: null },
  ] },
  { id: 'catalog', label: 'Товары и цены', views: [
    { id: 'products', to: '/products', label: 'Товары', ico: '▣', perm: 'catalog.read', module: 'catalog' },
    { id: 'categories', to: '/categories', label: 'Категории', ico: '≣', perm: 'catalog.read', module: 'catalog' },
  ] },
  { id: 'warehouse', label: 'Склад', views: [
    { id: 'inventory', to: '/inventory', label: 'Остатки', ico: '▤', perm: 'warehouse.read', module: 'warehouse' },
    { id: 'movements', to: '/movements', label: 'Движения', ico: '⇄', perm: 'warehouse.read', module: 'warehouse' },
    { id: 'warehouses', to: '/warehouses', label: 'Склады', ico: '⌂', perm: 'warehouse.read', module: 'warehouse' },
    { id: 'stock-count', to: '/stock-count', label: 'Инвентаризация', ico: '☑', perm: 'warehouse.read', module: 'warehouse' },
    { id: 'batches', to: '/batches', label: 'Партии и сроки', ico: '◷', perm: 'warehouse.read', module: 'warehouse' },
    { id: 'reorder', to: '/reorder', label: 'Мин. остатки', ico: '⚠', perm: 'warehouse.read', module: 'warehouse' },
    { id: 'mobile', to: '/m', label: 'Моб. кладовщик 📱', ico: '📱', perm: 'warehouse.move', module: 'warehouse' },
  ] },
  { id: 'procurement', label: 'Закупки', views: [
    { id: 'suppliers', to: '/suppliers', label: 'Поставщики', ico: '⇲', perm: 'procurement.read', module: 'procurement' },
    { id: 'purchase-requests', to: '/purchase-requests', label: 'Заявки', ico: '✎', perm: 'procurement.read', module: 'procurement' },
    { id: 'purchase-orders', to: '/purchase-orders', label: 'Заказы', ico: '↘', perm: 'procurement.read', module: 'procurement' },
    { id: 'supplier-invoices', to: '/supplier-invoices', label: 'Счета поставщиков', ico: '🧾', perm: 'procurement.read', module: 'procurement' },
    { id: 'tenders', to: '/tenders', label: 'Тендеры', ico: '🔦', perm: 'procurement.read', module: 'procurement' },
    { id: 'mrp', to: '/mrp', label: 'Планирование (MRP)', ico: '⊹', perm: 'procurement.read', module: 'procurement' },
  ] },
  { id: 'sales', label: 'Продажи', views: [
    { id: 'customers', to: '/customers', label: 'Клиенты', ico: '☺', perm: 'sales.read', module: 'sales' },
    { id: 'quotations', to: '/quotations', label: 'Предложения', ico: '✎', perm: 'sales.read', module: 'sales' },
    { id: 'sales-orders', to: '/sales-orders', label: 'Заказы', ico: '↗', perm: 'sales.read', module: 'sales' },
    { id: 'shipments', to: '/shipments', label: 'Отгрузки и возвраты', ico: '🚚', perm: 'sales.read', module: 'sales' },
    { id: 'price-lists', to: '/price-lists', label: 'Прайс-листы', ico: '≣', perm: 'sales.read', module: 'sales' },
  ] },
  { id: 'crm', label: 'CRM', views: [
    { id: 'crm-overview', to: '/crm', label: 'Обзор', ico: '▦', perm: 'crm.read', module: 'crm' },
    { id: 'deals', to: '/deals', label: 'Воронка (доска)', ico: '⚑', perm: 'crm.read', module: 'crm' },
    { id: 'crm-list', to: '/crm/deals', label: 'Список сделок', ico: '≣', perm: 'crm.read', module: 'crm' },
    { id: 'crm-results', to: '/crm/results', label: 'Итоги', ico: '🏁', perm: 'crm.read', module: 'crm' },
  ] },
  { id: 'pos', label: 'Касса (POS)', views: [
    { id: 'pos-terminal', to: '/pos-terminal', label: 'Терминал кассира', ico: '🛒', perm: 'pos.use', module: 'pos' },
    { id: 'pos-shifts', to: '/pos-shifts', label: 'Смены', ico: '◷', perm: 'pos.use', module: 'pos' },
    { id: 'pos-registers', to: '/pos-registers', label: 'Кассы', ico: '☰', perm: 'pos.use', module: 'pos' },
    { id: 'pos-report', to: '/pos-report', label: 'Отчёт продаж', ico: '▦', perm: 'pos.manage', module: 'pos' },
  ] },
  { id: 'projects', label: 'Проекты', views: [
    { id: 'projects', to: '/projects', label: 'Производственные проекты', ico: '❏', perm: 'projects.read', module: 'projects' },
  ] },
  { id: 'logistics', label: 'Логистика', views: [
    { id: 'deliveries', to: '/deliveries', label: 'Рейсы и доставка', ico: '🚚', perm: 'logistics.read', module: 'logistics' },
    { id: 'logistics-vehicles', to: '/logistics-vehicles', label: 'Автопарк', ico: '⛟', perm: 'logistics.read', module: 'logistics' },
  ] },
  { id: 'production', label: 'Производство', views: [
    { id: 'boms', to: '/boms', label: 'Спецификации (BOM)', ico: '≣', perm: 'production.read', module: 'manufacturing' },
    { id: 'production-orders', to: '/production-orders', label: 'Производственные заказы', ico: '⚙', perm: 'production.read', module: 'manufacturing' },
    { id: 'production-routing', to: '/production-routing', label: 'Маршруты и ОТК', ico: '⛓', perm: 'production.read', module: 'manufacturing' },
    { id: 'work-centers', to: '/work-centers', label: 'Рабочие центры', ico: '⚒', perm: 'production.read', module: 'manufacturing' },
  ] },
  { id: 'finance', label: 'Финансы', views: [
    { id: 'fin-accounts', to: '/fin-accounts', label: 'Кассы и банк', ico: '₴', perm: 'finance.read', module: 'finance' },
    { id: 'cash-transactions', to: '/cash-transactions', label: 'Платежи', ico: '⇄', perm: 'finance.read', module: 'finance' },
    { id: 'chart-of-accounts', to: '/chart-of-accounts', label: 'План счетов', ico: '≣', perm: 'finance.read', module: 'finance' },
    { id: 'journal', to: '/journal', label: 'Журнал проводок', ico: '≡', perm: 'finance.read', module: 'finance' },
    { id: 'accounting-periods', to: '/accounting-periods', label: 'Периоды', ico: '◷', perm: 'finance.read', module: 'finance' },
    { id: 'vat', to: '/vat', label: 'НДС', ico: '%', perm: 'finance.read', module: 'finance' },
    { id: 'bank-reconciliation', to: '/bank-reconciliation', label: 'Сверка с банком', ico: '⇋', perm: 'finance.read', module: 'finance' },
    { id: 'budgets', to: '/budgets', label: 'Бюджеты', ico: '◲', perm: 'finance.read', module: 'finance' },
    { id: 'payment-calendar', to: '/payment-calendar', label: 'Платёжный календарь', ico: '🗓', perm: 'finance.read', module: 'finance' },
    { id: 'finance-reports', to: '/finance-reports', label: 'Отчёты', ico: '▦', perm: 'finance.read', module: 'finance' },
  ] },
  { id: 'hr', label: 'Персонал (HR)', views: [
    { id: 'employees', to: '/employees', label: 'Сотрудники', ico: '🧑', perm: 'hr.read', module: 'hr' },
    { id: 'hr-structure', to: '/hr-structure', label: 'Оргструктура', ico: '☰', perm: 'hr.read', module: 'hr' },
    { id: 'leaves', to: '/leaves', label: 'Отпуска', ico: '✈', perm: 'hr.read', module: 'hr' },
    { id: 'timesheet', to: '/timesheet', label: 'Табель', ico: '🗓', perm: 'hr.read', module: 'hr' },
    { id: 'payroll', to: '/payroll', label: 'Зарплата', ico: '₴', perm: 'hr.read', module: 'hr' },
  ] },
  { id: 'org', label: 'Организация', views: [
    { id: 'companies', to: '/companies', label: 'Компании', ico: '☰', perm: 'org.read', module: null },
  ] },
  { id: 'team', label: 'Команда и доступ', views: [
    { id: 'users', to: '/users', label: 'Пользователи', ico: '☺', perm: 'admin.users', module: null },
    { id: 'roles', to: '/roles', label: 'Роли и права', ico: '⚿', perm: 'admin.roles', module: null },
    { id: 'audit', to: '/audit', label: 'Аудит', ico: '≡', perm: 'audit.read', module: null },
  ] },
  { id: 'analytics', label: 'Аналитика', views: [
    { id: 'analytics', to: '/analytics', label: 'Дашборд KPI', ico: '📊', perm: 'analytics.read', module: null },
    { id: 'reports', to: '/reports', label: 'Отчёты', ico: '▤', perm: 'analytics.read', module: null },
    { id: 'forecast', to: '/forecast', label: 'Прогноз спроса', ico: '📈', perm: 'analytics.read', module: null },
    { id: 'abc-analysis', to: '/abc-analysis', label: 'Оборачиваемость / ABC', ico: '🔠', perm: 'analytics.read', module: null },
    { id: 'ai-assistant', to: '/ai-assistant', label: 'AI-ассистент', ico: '✦', perm: 'ai.use', module: null },
  ] },
  { id: 'documents', label: 'Документы', views: [
    { id: 'documents', to: '/documents', label: 'Документооборот', ico: '🗎', perm: 'documents.read', module: 'documents' },
  ] },
  { id: 'studio', label: 'Студия', views: [
    { id: 'marketplace', to: '/marketplace', label: 'Маркетплейс', ico: '⊞', perm: 'tenant.manage', module: null },
    { id: 'integrations', to: '/integrations', label: 'Интеграции', ico: '🔌', perm: 'tenant.manage', module: null },
    { id: 'forms', to: '/forms', label: 'Конструктор форм', ico: '▤', perm: 'forms.use', module: null },
  ] },
  { id: 'manage', label: 'Управление', views: [
    { id: 'billing', to: '/billing', label: 'Подписка', ico: '₴', perm: 'tenant.manage', module: null },
    { id: 'settings', to: '/settings', label: 'Настройки', ico: '⚙', perm: 'tenant.manage', module: null },
    { id: 'jobs', to: '/jobs', label: 'Фоновые задачи', ico: '⚙', perm: 'tenant.manage', module: null },
    { id: 'api-keys', to: '/api-keys', label: 'API-ключи', ico: '🔑', perm: 'tenant.manage', module: null },
    { id: 'webhooks', to: '/webhooks', label: 'Вебхуки', ico: '🔔', perm: 'tenant.manage', module: null },
  ] },
  { id: 'platform', label: 'Платформа', views: [
    { id: 'platform', to: '/platform', label: 'Супер-админ', ico: '★', perm: null, module: null, admin: true },
  ] },
];

// Flat list (used for page-title lookups).
export const VIEWS: ViewDef[] = NAV.flatMap((g) => g.views);

export function useNav() {
  const auth = useAuth();
  const { tf } = useI18n();
  const isVisible = (v: ViewDef) =>
    (!v.perm || auth.can(v.perm)) && (!v.module || auth.moduleOn(v.module)) && (!v.admin || auth.user?.platformAdmin);
  // Labels are translated by id-derived keys (nav.<id> / navg.<id>), falling back to the
  // built-in Russian label. Referencing tf() (which reads the reactive locale) inside the
  // computed makes the whole menu re-render on language change.
  const groups = computed(() =>
    NAV.map((g) => ({
      ...g,
      label: g.label ? tf(`navg.${g.id}`, g.label) : g.label,
      views: g.views.filter(isVisible).map((v) => ({ ...v, label: tf(`nav.${v.id}`, v.label) })),
    })).filter((g) => g.views.length > 0));
  return { groups };
}

// Translate a route path's page title (used by the app layout topbar).
export function useViewTitle() {
  const { tf } = useI18n();
  return (path: string) => {
    const v = VIEWS.find((x) => x.to === path);
    return v ? tf(`nav.${v.id}`, v.label) : 'TTR ONE';
  };
}
