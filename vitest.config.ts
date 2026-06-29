import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        exclude: [
            "**/node_modules/**",
            "**/dist/**",
            "**/dist_old/**",
            "**/public_old/**",
            "**/src_old/**",
        ],
        include: ["src/**/*.test.ts", "public/**/*.test.ts"],
    },
});
