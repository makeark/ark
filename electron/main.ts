import { app, BrowserWindow, BrowserWindowConstructorOptions, protocol } from "electron";
import path from "path";

import IPC from "./modules/ipc";

import { ARK_FOLDER_PATH } from "./utils/constants";
import { enableDevTools } from "./utils/dev";

(async function main() {
	try {
		await app.whenReady();

		protocol.registerFileProtocol("ark", (request, callback) => {
			console.log(request.url);
			const url = request.url.slice(5);
			callback({ path: `${ARK_FOLDER_PATH}${url}` });
		});

		const mainWindowOptions: BrowserWindowConstructorOptions = {
			width: 1400,
			height: 900,
			frame: false,
			webPreferences: {
				preload: path.join(__dirname, "preload"),
			},
		};

		const mainWindow = new BrowserWindow(mainWindowOptions);

		mainWindow.removeMenu();

		IPC.init({
			window: mainWindow,
		});

		if (process.env.ARK_ENABLE_DEV_TOOLS && process.env.ARK_DEV_TOOLS_PATH)
			await enableDevTools(mainWindow, process.env.ARK_DEV_TOOLS_PATH);

		const loadURL = process.env.ARK_ENTRY_URL || `file://${path.join(__dirname, "../../index.html")}`;

		await mainWindow.loadURL(loadURL);

		if (process.env.ARK_OPEN_DEV_TOOLS === "true") mainWindow.webContents.openDevTools();
	} catch (e) {
		console.error(e);
	}
})();
