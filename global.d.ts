import type { Connection, Database } from "./electron/core/driver";
import type { MongoClientOptions } from "@mongosh/service-provider-server";
import type { MemoryStore } from "./electron/core/stores/memory";
import type {
	MemEntry,
	StoredScript,
	ScriptSaveActionData,
	ScriptSaveAsActionData,
	ScriptOpenActionData,
} from "./electron/modules/ipc/types";
import type { ShellEvalResult } from "./electron/core/shell-manager/types";
import type { DiskStore } from "./electron/core/stores/disk";
import { ObjectId } from "bson";
import { Query } from "./electron/core/driver/query";

declare global {
	namespace Ark {
		interface StoredIcon {
			name: string;
			path: string;
			lastModified: number;
			size: number;
			type: string;
		}

		interface DriverArgs {
			id?: string;
			[k: string]: any;
		}

		interface DriverStores {
			memoryStore: MemoryStore<MemEntry>;
			diskStore: DiskStore<StoredConnection>;
			iconStore: DiskStore<StoredIcon>;
			settingsStore: DiskStore<Settings>;
		}
		interface DriverDependency {
			_stores: DriverStores;
			memEntry: MemEntry | undefined;
			storedConnection: StoredConnection | undefined;
			icon: StoredIcon | undefined;
		}

		interface StoredConnection {
			id: string;
			name: string;
			protocol: string;
			hosts: Array<string>;
			database?: string;
			username?: string;
			iv?: string;
			password?: string;
			icon?: boolean;
			type: "directConnection" | "replicaSet";
			options: Pick<
				MongoClientOptions,
				| "authSource"
				| "retryWrites"
				| "tls"
				| "tlsCertificateFile"
				| "w"
				| "replicaSet"
				| "authMechanism"
				| "tlsCertificateKeyFilePassword"
				| "tlsCAFile"
			>;
			ssh: {
				useSSH?: boolean;
				host?: string;
				port?: string;
				username?: string;
				method?: "privateKey" | "password";
				password?: string;
				privateKey?: string;
				passphrase?: string;
				askEachTime?: boolean;
				mongodHost?: string;
				mongodPort?: string;
			};
			uri?: string;
		}

		interface StoredScript {
			id: string;
			fullpath: string;
			storedConnectionId?: string;
		}

		type AnyObject = BSONDocument | BSONArray;

		type BSONTypes =
			| ObjectId
			| Date
			| string
			| number
			| boolean
			| BSONArray
			| BSONDocument
			| Record<string, any>
			| null;

		type BSONDocument = {
			_id: ObjectId;
			[k: string]: BSONTypes;
		};
		type BSONArray = Array<BSONDocument>;

		type SettingTypes = "general";

		interface Driver {
			run<D extends keyof Database>(
				library: "database",
				action: D,
				arg: Parameters<Database[D]>[1]
			): ReturnType<Database[D]>;
			run<C extends keyof Connection>(
				library: "connection",
				action: C,
				arg: Parameters<Connection[C]>[1]
			): ReturnType<Connection[C]>;
			run<Q extends keyof Query>(
				library: "query",
				action: Q,
				arg: Parameters<Query[Q]>[1]
			): ReturnType<Query[Q]>;
		}

		interface ShellConfig {
			name: string;
			uri: string;
			hosts: string[];
			database?: string;
			username: string;
			password: string;
			collection: string;
		}

		interface ExportNdjsonOptions {
			type: "NDJSON";
			saveLocation: string;
			fileName: string;
		}

		interface ExportCsvOptions {
			type: "CSV";
			fields?: Array<string>;
			saveLocation: string;
			fileName: string;
		}

		interface QueryOptions {
			page: number;
			limit: number;
			timeout?: number;
		}

		interface Shell {
			create: (
				contextDB: string,
				storedConnectionId: string,
				encryptionKey?: Settings["encryptionKey"]
			) => Promise<{ id: string }>;
			destroy: (uri: string) => Promise<{ id: string }>;
			eval: (
				shellId: string,
				code: string,
				options: QueryOptions
			) => Promise<ShellEvalResult>;
			export: (
				shellId: string,
				code: string,
				options: ExportCsvOptions | ExportNdjsonOptions
			) => Promise<{ exportPath: string }>;
		}
		interface Titlebar {
			close: () => void;
			maximize: () => void;
			minimize: () => void;
		}

		interface Scripts {
			open(
				params: ScriptOpenActionData["params"]
			): Promise<{ code: string; script: StoredScript }>;
			save(params: ScriptSaveActionData["params"]): Promise<StoredScript>;
			saveAs(params: ScriptSaveAsActionData["params"]): Promise<StoredScript>;
			delete(scriptId: string): Promise<void>;
		}

		interface GeneralSettings {
			save: (type: SettingTypes, settings: Ark.Settings) => Promise<void>;
			fetch: (type: SettingTypes) => Promise<Ark.Settings>;
		}

		interface Context {
			browseForDirs: (
				title?: string,
				buttonLabel?: string
			) => Promise<{ dirs: string[] }>;
			browseForFile: (
				title?: string,
				buttonLabel?: string
			) => Promise<{ path: string }>;
			copyText(text: string): void;
			getIcon(id: string): Promise<StoredIcon>;
			copyIcon(
				cacheFolder: string,
				name: string,
				path: string
			): Promise<{ path: string }>;
			rmIcon(path: string): Promise<void>;
			scripts: Scripts;
			driver: {
				run: Driver["run"];
			};
			settings: GeneralSettings;
			shell: Shell;
			titlebar: Titlebar;
			[k: string]: any;
		}

		interface Settings {
			timezone?: "local" | "utc";
			shellTimeout?: number;
			lineNumbers?: "on" | "off";
			miniMap?: "on" | "off";
			autoUpdates?: "on" | "off";
			hotKeys?: "on" | "off";
			encryptionKey?: {
				type: "file" | "url";
				source: "generated" | "userDefined";
				value: string;
			};
		}
	}
	interface Window {
		ark: Ark.Context;
	}
}
