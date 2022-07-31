import "./styles.less";
import React, { FC, useCallback, useContext, useEffect, useState } from "react";
import { Icon, Card, IconSize } from "@blueprintjs/core";
import { dispatch, listenEffect } from "../../common/utils/events";
import { Resizable } from "re-resizable";
import { Button } from "../../common/components/Button";
import {
	ConnectionsContext,
	ManagedConnection,
	SettingsContext,
} from "../layout/BaseContextProvider";
import { notify } from "../../common/utils/misc";

export const notifyFailedConnection = (err) => {
	notify({
		type: "error",
		title: "Error",
		description: err.message
			? "Error - " + err.message
			: "Could not connect. Something unexpected happened.",
	});
};

export const notifyFailedDisconnection = (err) => {
	notify({
		type: "error",
		title: "Error",
		description: err.message
			? "Error - " + err.message
			: "Could not disconnnect. Something unexpected happened.",
	});
};

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface ConnectionManagerProps {}

export const ConnectionController: FC<ConnectionManagerProps> = () => {
	const {
		connections,
		setConnections,
		load,
		connect,
		disconnect,
		deleteConnectionOnDisk,
	} = useContext(ConnectionsContext);
	const { currentSidebarOpened } = useContext(SettingsContext);

	const [listViewMode, setListViewMode] = useState<"detailed" | "compact">(
		"detailed"
	);
	const [listLoadError, setListLoadError] = useState<JSX.Element>();

	const openEditOrCloneConnection = useCallback(
		(connectionDetails: ManagedConnection, mode: "edit" | "clone") => {
			dispatch("browser:create_tab:connection_form", {
				connectionDetails,
				mode,
			});
		},
		[]
	);

	const openCreateConnection = useCallback(() => {
		dispatch("browser:create_tab:connection_form");
	}, []);

	/** On-load effect */
	useEffect(() => {
		load().catch((err) => {
			setListLoadError(
				<div>
					<span>Something went wrong with loading the list.</span>
					<p>Error: {err.message}</p>
				</div>
			);
		});
	}, [load]);

	useEffect(
		() =>
			listenEffect([
				{
					event: "connection_manager:add_connection",
					cb: (e, payload) => {
						window.ark.driver
							.run("connection", "load", {
								id: payload.connectionId,
							})
							.then((connection) => {
								setConnections((connections) => [
									...connections.filter((conn) => conn.id !== connection.id),
									connection,
								]);
							});
					},
				},
				{
					event: "connection_manager:disconnect",
					cb: (e, payload) => {
						disconnect(payload.connectionId);
					},
				},
			]),
		[disconnect, setConnections]
	);

	return currentSidebarOpened === "manager" ? (
		<Resizable
			enable={{
				right: true,
			}}
			maxWidth="50%"
			minWidth="25%"
			handleClasses={{
				right: "resize-handle vertical",
			}}
		>
			<div className="connection-manager">
				<div className="container">
					<div className="header">
						<div className="title">Connections</div>
						<div className="buttons">
							{/* @todo: Save to disk to retain view mode */}
							{/* <Button
								shape="round"
								icon="list"
								variant="primary"
								tooltipOptions={{
									content: "Switch view",
									position: "left-top",
								}}
								onClick={() =>
									setListViewMode((mode) =>
										mode === "compact" ? "detailed" : "compact"
									)
								}
							/> */}
							<Button
								shape="round"
								icon="add"
								text="Create"
								variant="primary"
								onClick={() => openCreateConnection()}
							/>
						</div>
					</div>
					<ConnectionsList
						listViewMode={listViewMode}
						connections={connections}
						error={listLoadError}
						onConnect={(conn) => connect(conn.id)}
						onConnectCallback={(err) => {
							if (err) {
								notify({
									type: "error",
									title: "Error",
									description: err.message
										? "Error - " + err.message
										: "Could not connect. Something unexpected happened.",
								});
							}
						}}
						onDisconnect={(conn) => disconnect(conn.id)}
						onDisconnectCallback={(err) => {
							if (err) {
								notify({
									type: "error",
									title: "Error",
									description: err.message
										? "Error - " + err.message
										: "Could not disconnnect. Something unexpected happened.",
								});
							}
						}}
						onEdit={(conn) => openEditOrCloneConnection(conn, "edit")}
						onClone={(conn) => openEditOrCloneConnection(conn, "clone")}
						onDelete={(conn) => deleteConnectionOnDisk(conn.id)}
					/>
				</div>
			</div>
		</Resizable>
	) : (
		<></>
	);
};

interface ConnectionsListProps extends ConnectionCardFunctions {
	connections: Ark.StoredConnection[];
	listViewMode: "detailed" | "compact";
	error?: JSX.Element;
}

export const ConnectionsList: FC<ConnectionsListProps> = (props) => {
	const {
		connections,
		listViewMode,
		error,
		onEdit,
		onDisconnect,
		onDisconnectCallback,
		onDelete,
		onConnect,
		onConnectCallback,
		onClone,
	} = props;
	return (
		<div className="list">
			{!error ? (
				connections && connections.length ? (
					connections.map((conn) => (
						<div key={conn.id}>
							{listViewMode === "detailed" ? (
								<DetailedConnectionCard
									conn={conn}
									onConnect={onConnect}
									onConnectCallback={onConnectCallback}
									onDisconnect={onDisconnect}
									onDisconnectCallback={onDisconnectCallback}
									onEdit={onEdit}
									onClone={onClone}
									onDelete={onDelete}
								/>
							) : (
								<CompactConnectionCard
									conn={conn}
									onConnect={onConnect}
									onConnectCallback={onConnectCallback}
									onDisconnect={onDisconnect}
									onDisconnectCallback={onDisconnectCallback}
									onEdit={onEdit}
									onClone={onClone}
									onDelete={onDelete}
								/>
							)}
						</div>
					))
				) : (
					<></>
				)
			) : (
				<p className="error">{error}</p>
			)}
		</div>
	);
};

interface ConnectionCardFunctions {
	onConnect: (conn: Ark.StoredConnection) => Promise<ManagedConnection | void>;
	onConnectCallback: (err?: any) => void;
	onDisconnect: (conn: Ark.StoredConnection) => Promise<void>;
	onDisconnectCallback: (err?: any) => void;
	onEdit?: (conn: Ark.StoredConnection) => void;
	onClone?: (conn: Ark.StoredConnection) => void;
	onDelete?: (conn: Ark.StoredConnection) => void;
}
interface DetailedConnectionCardProps extends ConnectionCardFunctions {
	conn: ManagedConnection;
}

export const DetailedConnectionCard = (
	props: DetailedConnectionCardProps
): JSX.Element => {
	const {
		conn,
		onConnect,
		onConnectCallback,
		onDisconnect,
		onDisconnectCallback,
		onEdit,
		onClone,
		onDelete,
	} = props;

	return (
		<Card className="card-detailed" interactive={false}>
			<DetailedCardTitle
				title={conn.name}
				onDisconnect={() => onDisconnect(conn)}
				onDisconnectCallback={onDisconnectCallback}
				onConnect={() => onConnect(conn).then(() => {})}
				onConnectCallback={onConnectCallback}
				active={conn.active}
			/>
			<div className="card-info">
				<div className="cell">
					<div className="cell-title">Host</div>

					{conn.hosts.length > 1 ? (
						<div className="cell-content">
							{conn.hosts.map((host) => (
								<div key={host}>{host}</div>
							))}
						</div>
					) : (
						<div className="cell-content">{conn.hosts[0]}</div>
					)}
				</div>
				<div className="cell">
					<div className="cell-title">
						{conn.username && conn.database
							? "User / AuthDB"
							: conn.username
							? "User"
							: ""}
					</div>
					<div className="cell-content">
						{conn.username && conn.database
							? `${conn.username} / ${conn.database}`
							: conn.username
							? `${conn.username}`
							: ""}
					</div>
				</div>
			</div>
			<div className="card-buttons">
				<Button
					variant="none"
					shape="round"
					icon="clipboard"
					size="small"
					onClick={() => window.ark.copyText(conn.uri || "")}
					tooltipOptions={{
						content: "Copy URI",
						position: "bottom",
					}}
				/>
				{onEdit && (
					<Button
						variant="none"
						shape="round"
						icon="edit"
						size="small"
						onClick={() => onEdit(conn)}
						tooltipOptions={{
							content: "Edit",
							position: "bottom",
						}}
					/>
				)}
				{onClone && (
					<Button
						variant="none"
						shape="round"
						icon={"add-row-bottom"}
						size="small"
						onClick={() => onClone(conn)}
						tooltipOptions={{
							content: "Clone",
							position: "bottom",
						}}
					/>
				)}
				{onDelete && (
					<Button
						variant="none"
						shape="round"
						icon="trash"
						size="small"
						onClick={() => onDelete(conn)}
						tooltipOptions={{
							content: "Delete",
							position: "bottom",
						}}
					/>
				)}
			</div>
		</Card>
	);
};

interface CompactConnectionCardProps extends ConnectionCardFunctions {
	conn: ManagedConnection;
}

export const CompactConnectionCard = (
	props: CompactConnectionCardProps
): JSX.Element => {
	const {
		conn,
		onConnect,
		onConnectCallback,
		onDisconnect,
		onDisconnectCallback,
		onDelete,
		onEdit,
		onClone,
	} = props;
	return (
		<div className="card-compact">
			<div className="cell">
				<div className="cell-title">Name</div>
				<div className="cell-content">{conn.name}</div>
			</div>
			<div className="cell">
				<div className="cell-title">Host</div>
				<div className="cell-content">{conn.hosts[0]}</div>
			</div>
			<div className="cell">
				<div className="cell-title">{"User / AuthDB"}</div>
				<div className="cell-content">
					{`${conn.username || "-"} / ${conn.database || "-"}`}
				</div>
			</div>
			<div className="cell">
				<div className="cell-buttons">
					{!conn.active && onConnect && (
						<Button
							shape="round"
							icon="globe"
							size="small"
							onClick={{
								promise: () => onConnect(conn),
								callback: onConnectCallback,
							}}
						/>
					)}
					{conn.active && onDisconnect && (
						<Button
							shape="round"
							icon="th-disconnect"
							size="small"
							variant="danger"
							onClick={{
								promise: () => onDisconnect(conn),
								callback: onDisconnectCallback,
							}}
						/>
					)}
					{onEdit && (
						<Button
							shape="round"
							icon="edit"
							size="small"
							onClick={() => onEdit(conn)}
						/>
					)}
					{onClone && (
						<Button
							shape="round"
							icon="add-row-bottom"
							size="small"
							onClick={() => onClone(conn)}
						/>
					)}
					{onDelete && (
						<Button
							shape="round"
							icon="trash"
							size="small"
							onClick={() => onDelete(conn)}
						/>
					)}
				</div>
			</div>
		</div>
	);
};

interface CardTitleProps {
	title: string;
	onDisconnect: () => Promise<void>;
	onDisconnectCallback: () => void;
	onConnect: () => Promise<void>;
	onConnectCallback: () => void;
	active?: boolean;
}

const DetailedCardTitle: FC<CardTitleProps> = ({
	onConnect,
	onConnectCallback,
	onDisconnect,
	onDisconnectCallback,
	title,
	active,
}) => (
	<div className="card-title">
		<div className="title">
			<Icon size={IconSize.LARGE} icon="database" />
			<span>{title}</span>
		</div>
		{!active && (
			<Button
				shape="round"
				icon="globe-network"
				size="small"
				text="Connect"
				variant="none"
				outlined
				onClick={{ promise: onConnect, callback: onConnectCallback }}
			/>
		)}

		{active && (
			<Button
				shape="round"
				icon="small-cross"
				size="small"
				variant="danger"
				text="Disconnect"
				onClick={{ promise: onDisconnect, callback: onDisconnectCallback }}
			/>
		)}
	</div>
);
