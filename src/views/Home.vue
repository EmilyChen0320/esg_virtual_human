<script setup lang="ts">
import { onMounted, shallowRef } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";

import LanguageSelector from "../components/LanguageSelector.vue";
import RestartDialog from "../components/RestartDialog.vue";
import { useNightServiceRedirect } from "../composables/useNightServiceRedirect";
import { usePageLanguage } from "../composables/usePageLanguage";
import { LANG_QUERY_PARAM, SESSION_QUERY_PARAM } from "../constants/api";
import { AUTH_PASSWORD, isAuthSessionValid, saveAuthSession } from "../constants/auth";

const router = useRouter();
const { t, locale } = useI18n();
const { applyLocale } = usePageLanguage(locale);
useNightServiceRedirect();

onMounted(() => {
  if (isAuthSessionValid()) {
    const searchParams = new URLSearchParams(window.location.search);
    const lang = searchParams.get(LANG_QUERY_PARAM);
    const session = searchParams.get(SESSION_QUERY_PARAM);
    const query: Record<string, string> = {};
    if (lang) {
      query[LANG_QUERY_PARAM] = lang;
    }
    if (session) {
      query[SESSION_QUERY_PARAM] = session;
    }
    router.push({
      name: "Chat",
      query
    });
  }
});

const password = shallowRef("");
const hasError = shallowRef(false);
const showRestartDialog = shallowRef(false);
const pendingLanguage = shallowRef("");

function handleInput(e: Event) {
  const target = e.target as HTMLInputElement;
  const digits = target.value.replace(/\D/g, "").slice(0, 6);
  password.value = digits;
  hasError.value = false;
}

function handleSubmit() {
  if (password.value !== AUTH_PASSWORD) {
    hasError.value = true;
    return;
  }
  saveAuthSession();
  const searchParams = new URLSearchParams(window.location.search);
  const lang = searchParams.get(LANG_QUERY_PARAM);
  const session = searchParams.get(SESSION_QUERY_PARAM);
  const query: Record<string, string> = {};
  if (lang) {
    query[LANG_QUERY_PARAM] = lang;
  }
  if (session) {
    query[SESSION_QUERY_PARAM] = session;
  }
  router.push({
    name: "Chat",
    query
  });
}

function handleLanguageChange(lang: string) {
  pendingLanguage.value = lang;
  showRestartDialog.value = true;
}

function confirmLanguageChange() {
  showRestartDialog.value = false;
  applyLocale(pendingLanguage.value);
  const url = new URL(window.location.href);
  url.searchParams.set(LANG_QUERY_PARAM, pendingLanguage.value);
  window.history.replaceState({}, "", url.toString());
  pendingLanguage.value = "";
}

function cancelLanguageChange() {
  showRestartDialog.value = false;
  pendingLanguage.value = "";
}
</script>

<template>
  <div class="login-page">
    <div class="login-lang">
      <LanguageSelector @language-change="handleLanguageChange" />
    </div>

    <div class="login-content">
      <h1 class="login-title">{{ t("login.title") }}</h1>
      <p class="login-instruction">{{ t("login.instruction") }}</p>

      <form class="login-form" @submit.prevent="handleSubmit">
        <input
          class="login-input"
          :class="{ 'login-input-error': hasError }"
          type="text"
          inputmode="numeric"
          pattern="\d{6}"
          maxlength="6"
          :placeholder="t('login.placeholder')"
          :value="password"
          @input="handleInput"
          autocomplete="off"
        />
        <p v-if="hasError" class="login-error">{{ t("login.error") }}</p>
        <button class="login-submit" type="submit" :disabled="password.length !== 6">
          {{ t("login.submit") }}
        </button>
      </form>
    </div>

    <RestartDialog
      :show="showRestartDialog"
      :title="t('confirm.language-change-title')"
      :body="t('confirm.restart-lang')"
      @confirm="confirmLanguageChange"
      @cancel="cancelLanguageChange"
    />
  </div>
</template>

<style scoped>
.login-page {
  position: relative;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
}

.login-lang {
  position: absolute;
  top: 30px;
  right: 30px;
  z-index: 10;
}

.login-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 40px;
  text-align: center;
}

.login-title {
  font-size: 36px;
  font-weight: bold;
  color: #333;
  letter-spacing: 1.5px;
  margin: 0;
}

.login-instruction {
  font-size: 18px;
  color: #666;
  margin: 0 0 24px;
}

.login-form {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  width: 100%;
  max-width: 320px;
}

.login-input {
  width: 100%;
  padding: 16px 20px;
  font-size: 28px;
  text-align: center;
  letter-spacing: 12px;
  border: 2px solid #ccc;
  border-radius: 12px;
  outline: none;
  background: #fff;
  color: #333;
  transition: border-color 0.2s;
}

.login-input:focus {
  border-color: #666;
}

.login-input-error {
  border-color: #e53e3e;
}

.login-error {
  color: #e53e3e;
  font-size: 14px;
  margin: 0;
}

.login-submit {
  width: 100%;
  padding: 14px 40px;
  font-size: 20px;
  font-weight: bold;
  color: #fff;
  background: #333;
  border: none;
  border-radius: 47px;
  cursor: pointer;
  letter-spacing: 1px;
  transition: opacity 0.2s;
}

.login-submit:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.login-submit:not(:disabled):hover {
  opacity: 0.85;
}
</style>
