import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  server: {
    host: "0.0.0.0",
    port: 3008,
    watch: {
      ignored: ["**/ai-docs/**", "**/*.md"]
    }
  },
  preview: {
    host: "0.0.0.0",
    port: 3008
  },
  test: {
    environment: "happy-dom",
    include: ["src/**/*.test.ts"],
    setupFiles: ["./src/test-setup.ts"],
    coverage: {
      include: ["src/**/*.{ts,vue}"],
      exclude: [
        "src/lib/**",
        "src/vite-env.d.ts",
        "src/types/**",
        "src/main.ts",
        "src/App.vue",
        "src/style.css",
        "src/**/*.test.ts",
        "src/composables/useAudioRecording.ts",
        "src/i18n/**",
        "src/router/**",
        "src/constants/**"
      ]
    }
  }
});
