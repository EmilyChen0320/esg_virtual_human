import { onMounted } from "vue";

import { LANG_QUERY_PARAM } from "../constants/api";

interface LocaleRef {
  value: string;
}

export function usePageLanguage(locale: LocaleRef) {
  function applyLocale(lang: string) {
    locale.value = lang;
    document.documentElement.lang = lang;
  }

  function syncLocaleFromQuery() {
    const lang = new URLSearchParams(window.location.search).get(LANG_QUERY_PARAM);
    if (lang) {
      applyLocale(lang);
    }
  }

  onMounted(syncLocaleFromQuery);

  return {
    applyLocale,
    syncLocaleFromQuery
  };
}
