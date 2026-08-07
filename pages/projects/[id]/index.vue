<script setup lang="ts">
// Opening a project lands on its board (the Jira-style default view).
definePageMeta({ layout: 'app' });
const route = useRoute();
await navigateTo(`/projects/${route.params.id}/board`, { replace: true });
</script>

<template>
  <div />
</template>
