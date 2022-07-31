import React, { useState, useCallback, useEffect } from "react";
import { Hotkeys } from "../../common/components/Hotkeys";
import { TitleBar } from "./Titlebar";

export interface SettingsContextType {
	settings?: Ark.Settings;
	setSettings?: React.Dispatch<React.SetStateAction<Ark.Settings>>;
	currentSidebarOpened: string;
	setCurrentSidebarOpened: React.Dispatch<React.SetStateAction<string>>;
}

export const SettingsContext = React.createContext<SettingsContextType>({
	currentSidebarOpened: "manager",
	setCurrentSidebarOpened: () => {},
});

export interface ConnectionsContextType {
	connections: ManagedConnection[];
	setConnections: React.Dispatch<React.SetStateAction<ManagedConnection[]>>;
	load: () => Promise<void>;
	connect: (id: string) => Promise<ManagedConnection | void>;
	disconnect: (id: string) => Promise<void>;
	deleteConnectionOnDisk: (id: string) => Promise<void>;
}
export const ConnectionsContext = React.createContext<ConnectionsContextType>({
	connections: [],
	load: () => Promise.resolve(),
	connect: () => Promise.resolve(),
	disconnect: () => Promise.resolve(),
	deleteConnectionOnDisk: () => Promise.resolve(),
	setConnections: () => {},
});

export interface ManagedConnection extends Ark.StoredConnection {
	active?: boolean;
	iconFileName?: string;
}
interface PageBodyProps {
	children?: React.ReactNode;
}

export const BaseContextProvider = (props: PageBodyProps): JSX.Element => {
	const { children } = props;

	const [currentSidebarOpened, setCurrentSidebarOpened] =
		useState<string>("none");

	const [connections, setConnections] = useState<ManagedConnection[]>([]);
	const [settings, setSettings] = useState<Ark.Settings>({});
	const [settingsFetched, setSettingsFetched] = useState(false);

	const [enableHotkeys, setEnableHotkeys] = useState(true);

	const load = useCallback(() => {
		return window.ark.driver
			.run("connection", "list", undefined)
			.then(setConnections);
	}, []);

	const connect = useCallback((id: string) => {
		return window.ark.driver
			.run("connection", "connect", {
				id,
			})
			.then(() =>
				Promise.all([
					window.ark.driver.run("connection", "load", {
						id,
					}),
					window.ark.getIcon(id),
				]).then(([connection, icon]) => {
					setConnections((connections) => {
						const idx = connections.findIndex(
							(conn) => conn.id === connection.id
						);
						if (idx > -1) {
							connections[idx].active = true;
							connections[idx].iconFileName = icon.name;
							return [...connections];
						}
						return connections;
					});

					const managed: ManagedConnection = {
						...connection,
						active: true,
						iconFileName: icon.name,
					};

					return managed;
				})
			);
	}, []);

	const disconnect = useCallback((id: string) => {
		return window.ark.driver
			.run("connection", "disconnect", { id })
			.then(() => {
				setConnections((connections) => {
					const idx = connections.findIndex((c) => c.id === id);
					if (idx > -1) {
						connections[idx].active = false;
						return [...connections];
					}
					return connections;
				});
			});
	}, []);

	const deleteConnectionOnDisk = useCallback(
		(id: string) => {
			const connection = connections.find((c) => c.id === id);
			if (connection) {
				if (connection.active) {
					disconnect(id);
				}

				return window.ark.driver
					.run("connection", "delete", { id: connection.id })
					.then(() => {
						setConnections((connections) => {
							const connectionIdx = connections.findIndex((c) => c.id === id);
							if (connectionIdx > -1) {
								connections.splice(connectionIdx, 1);
								return [...connections];
							}
							return connections;
						});
					});
			} else {
				return Promise.resolve();
			}
		},
		[connections, disconnect]
	);

	useEffect(() => {
		window.ark.settings
			.fetch("general")
			.then((settings) => {
				if (settings) {
					setSettings(settings);
					setEnableHotkeys(settings.hotKeys !== "off");
				}
				setSettingsFetched(true);
			})
			.catch((err) => {
				console.log("Settings context error:", err);
			});
	}, []);

	return (
		<div className="layout">
			{settingsFetched && (
				<SettingsContext.Provider
					value={{
						settings,
						setSettings,
						currentSidebarOpened,
						setCurrentSidebarOpened,
					}}
				>
					<ConnectionsContext.Provider
						value={{
							connections,
							setConnections,
							load,
							connect,
							deleteConnectionOnDisk,
							disconnect,
						}}
					>
						{enableHotkeys && <Hotkeys />}

						<TitleBar />
						<div className="page-content">{children}</div>
					</ConnectionsContext.Provider>
				</SettingsContext.Provider>
			)}
		</div>
	);
};
