import "./style.css";

import { createApp } from "vue";

import App from "./App.vue";
import i18n from "./i18n";
import router from "./router";
import { initMobileConsole } from "./utils/mobileConsole";

initMobileConsole();

const app = createApp(App);
app.use(router);
app.use(i18n);
app.mount("#app");
