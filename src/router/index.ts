import { createRouter, createWebHistory } from "vue-router";

import EsgVirtualHuman from "../views/EsgVirtualHuman.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      name: "EsgVirtualHuman",
      component: EsgVirtualHuman
    },
    {
      path: "/:pathMatch(.*)*",
      redirect: "/"
    }
  ]
});

export default router;
