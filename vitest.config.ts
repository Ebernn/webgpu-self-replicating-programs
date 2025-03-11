import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    browser: {
      provider: "playwright",
      enabled: true,
      instances: [
        {
          browser: "chromium",
          // @ts-ignore - WTF are these fucking wrong types??
          launch: {
            args: ["--enable-unsafe-webgpu", "--enable-features=Vulkan"],
          },
        },
      ],
    },
    coverage: {
      reporter: ["json", "cobertura"],
      provider: "istanbul",
      reportsDirectory: "reports/coverage",
      include: ["src/**/*.ts"],
    },
  },
});
