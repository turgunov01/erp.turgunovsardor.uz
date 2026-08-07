<template>
  <!-- Pass-through parent so /projects/:id/{board,backlog,stages,time} render as nested pages. -->
  <NuxtPage />
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app' });
</script>
