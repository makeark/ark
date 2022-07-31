import React, { FC, useContext, useEffect, useState } from "react";
import { useCallback } from "react";
import { Button } from "../../common/components/Button";
import { Dialog } from "../../common/components/Dialog";
import { CircularLoading } from "../../common/components/Loading";
import { dispatch } from "../../common/utils/events";
import {
	ConnectionsList,
	notifyFailedConnection,
	notifyFailedDisconnection,
} from "../connection-controller/ConnectionController";
import {
	ConnectionsContext,
	ManagedConnection,
} from "../layout/BaseContextProvider";

interface SelectConnectionForScriptProps {
	path: string;
	/* conn will be undefined if no connection is selected */
	onClose?: (conn?: Ark.StoredConnection) => void;
}

export const SelectConnectionForFilePath: FC<
	SelectConnectionForScriptProps
> = ({ path, onClose }) => {
	const [loading, setLoading] = useState(false);

	const { connections, load, connect, disconnect } =
		useContext(ConnectionsContext);

	const [databaseOptions, setDatabaseOptions] = useState<
		(string | undefined)[]
	>([]);
	const [code, setCode] = useState<string>();
	const [selectedStoredConnection, setSelectedStoredConnection] =
		useState<ManagedConnection>();
	const [storedScript, setStoredScript] = useState<Ark.StoredScript>();

	const openShell = useCallback(
		(database) => {
			if (database && selectedStoredConnection) {
				dispatch("browser:create_tab:editor", {
					shellConfig: { ...selectedStoredConnection },
					contextDB: typeof database === "string" ? database : database.name,
					collections: [],
					storedConnectionId: selectedStoredConnection.id,
					initialCode: code,
					scriptId: storedScript?.id,
				});

				dispatch("sidebar:add_item", {
					id: selectedStoredConnection.id,
					name: selectedStoredConnection.name,
					icon: selectedStoredConnection.icon,
				});

				onClose && onClose(selectedStoredConnection);
			}
		},
		[code, onClose, selectedStoredConnection, storedScript?.id]
	);

	/** On-load effect */
	useEffect(() => {
		setLoading(true);
		load().then(() => {
			setLoading(false);
		});
	}, [load]);

	return (
		<Dialog
			size={databaseOptions && databaseOptions.length ? "small" : "large"}
			title={
				databaseOptions && databaseOptions.length
					? "Select a Database"
					: "Select a Connection"
			}
			onCancel={onClose}
			noFooter
		>
			{loading ? (
				<CircularLoading />
			) : databaseOptions && databaseOptions.length ? (
				<div className="database-select-list">
					<div className="database-list">
						{databaseOptions.map((option) => (
							<Button
								key={option}
								onClick={() => openShell(option)}
								text={option}
							/>
						))}
					</div>
					<Button
						key="back"
						icon="caret-left"
						onClick={() => {
							setDatabaseOptions([]);
							setSelectedStoredConnection(undefined);
						}}
					/>
				</div>
			) : (
				<div className="container">
					<ConnectionsList
						connections={connections}
						listViewMode="compact"
						onConnect={(conn) => {
							return window.ark.scripts
								.open({
									fileLocation: path,
									storedConnectionId: conn.id,
								})
								.then((result) => {
									const { code, script } = result;
									return connect(conn.id).then((connection) => {
										if (connection)
											return window.ark.driver
												.run("connection", "listDatabases", {
													id: connection.id,
												})
												.then((result) => {
													const databases: string[] = result.map(
														(database) => database.name
													);
													setDatabaseOptions(databases);
													setCode(code);
													setSelectedStoredConnection(connection);
													setStoredScript(script);
												});
									});
								});
						}}
						onConnectCallback={(err) => {
							if (err) {
								notifyFailedConnection(err);
							}
						}}
						onDisconnect={(conn) => disconnect(conn.id)}
						onDisconnectCallback={(err) => {
							if (err) {
								notifyFailedDisconnection(err);
							} else {
								setSelectedStoredConnection(undefined);
							}
						}}
					/>
				</div>
			)}
		</Dialog>
	);
};
