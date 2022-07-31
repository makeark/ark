import { defineConfig } from "vite";
import reactRefresh from "@vitejs/plugin-react-refresh";
import svgr from "vite-plugin-svgr";
import eslintPlugin from "vite-plugin-eslint";

// https://vitejs.dev/config/
export default defineConfig({
	base: "./",
	// This changes the out put dir @from dist to build
	// comment this out if that isn't relevant for your project
	build: {
		outDir: "build",
	},
	css: {
		preprocessorOptions: {
			less: {
				javascriptEnabled: true,
			},
		},
	},
	plugins: [reactRefresh(), svgr(), eslintPlugin()],
});
