import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig(function (_a) {
    var mode = _a.mode;
    var env = loadEnv(mode, process.cwd(), "");
    return {
        base: env.VITE_BASE_PATH || "/",
        plugins: [react()],
        server: {
            port: 5173,
        },
        build: {
            rollupOptions: {
                output: {
                    manualChunks: function (id) {
                        if (id.includes("node_modules/docx")) {
                            return "export-word-tools";
                        }
                        if (id.includes("node_modules/html2canvas") || id.includes("node_modules/jspdf")) {
                            return "export-pdf-tools";
                        }
                        return undefined;
                    },
                },
            },
        },
    };
});
