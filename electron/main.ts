import { app } from "electron";

import Bootstrap from "./bootstrap";
import { registerProcessListeners } from "./helpers/ipc";
import { createConnection, dbHandler } from "./helpers/connection";

(async function main() {

	try {
		app.allowRendererProcessReuse = true;

		registerProcessListeners();

		await app.whenReady();

		await Bootstrap();
	} catch (e) {
		console.error(e);
	}
})();
