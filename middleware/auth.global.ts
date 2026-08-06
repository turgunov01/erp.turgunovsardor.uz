export default defineNuxtRouteMiddleware((to) => {
  // The customer portal (/portal/*) is a separate auth realm — the internal guard must
  // ignore it entirely (it has its own token + login screen).
  if (to.path.startsWith('/portal')) return;
  const auth = useAuth();
  const publicPages = ['/', '/login', '/register', '/accept-invite', '/developers'];
  if (!auth.isAuthed && !publicPages.includes(to.path)) return navigateTo('/login');
  if (auth.isAuthed && (to.path === '/login' || to.path === '/register')) return navigateTo('/dashboard');
});
