import React, { FC, useState, useEffect, useCallback } from "react";
import { deserialize } from "bson";
import "../styles.less";
import { MONACO_COMMANDS, Shell } from "../../shell/Shell";
import { Resizable } from "re-resizable";

import { dispatch, listenEffect } from "../../../common/utils/events";
import { handleErrors, notify } from "../../../common/utils/misc";
import { ResultViewer, ResultViewerProps } from "./result-viewer/ResultViewer";
import { Button } from "../../../common/components/Button";
import { CircularLoading } from "../../../common/components/Loading";
import { useRefresh } from "../../../hooks/useRefresh";
import { bsonTest } from "../../../../util/misc";
import { useContext } from "react";
import { SettingsContext } from "../../layout/BaseContextProvider";
import { Menu, MenuItem, Tag } from "@blueprintjs/core";
import { ExportQueryResult } from "../../dialogs/ExportQueryResult";
import { useDebounce } from "../../../hooks/useDebounce";

const EDITOR_HELP_COMMENT = `/**
* Ark Editor
* 
* Welcome to Ark's script editor.
* 
*/
`;

const createDefaultCodeSnippet = (collection: string, helpText = true) => `${
	helpText ? EDITOR_HELP_COMMENT : ""
}db.getCollection('${collection}').find({ });
`;

interface ReplicaSetMember {
	name: string;
	health: number;
	state: number;
	stateStr: "PRIMARY" | "SECONDARY";
}

export interface EditorProps {
	shellConfig: Ark.ShellConfig;
	storedConnectionId: string;
	contextDB: string;
	collections: string[];
	initialCode?: string;
	scriptId?: string;
	/** Browser tab id */
	id: string;
}

export const Editor: FC<EditorProps> = (props) => {
	const {
		shellConfig,
		contextDB,
		id: TAB_ID,
		collections: COLLECTIONS,
		storedConnectionId,
		initialCode,
		scriptId,
	} = props;

	const { collection, username: user, uri, hosts } = shellConfig || {};

	const { settings } = useContext(SettingsContext);
	const [initialRender, setInitialRender] = useState<boolean>(true);

	const [queryParams, setQueryParams] = useState<Ark.QueryOptions>({
		page: 1,
		limit: 50,
		timeout: settings?.shellTimeout,
	});

	const debouncedQueryParams = useDebounce(queryParams, 600);

	const [effectRefToken, refreshEffect] = useRefresh();
	const [executing, setExecuting] = useState(false);
	const [currentResult, setCurrentResult] =
		useState<Partial<ResultViewerProps>>();
	const [savedScriptId, setSavedScriptId] = useState<string | undefined>(
		scriptId
	);
	const [shellId, setShellId] = useState<string>();
	const [shellLoadError, setShellLoadError] = useState<string>();
	const [currentReplicaHost, setCurrentReplicaHost] =
		useState<ReplicaSetMember>();
	const [replicaHosts, setReplicaHosts] = useState<ReplicaSetMember[]>();
	const [code, setCode] = useState(() =>
		initialCode
			? initialCode
			: collection
			? createDefaultCodeSnippet(collection)
			: createDefaultCodeSnippet("test")
	);
	const [exportDialog, toggleExportDialog] = useState<boolean>(false);

	const onCodeChange = useCallback((code: string) => {
		const _code = code.replace(/(\/\/.*)|(\n)/g, "");
		setCode(_code);
	}, []);

	const switchViews = useCallback((type: "tree" | "plaintext") => {
		setCurrentResult((currentResult) => ({
			...currentResult,
			type: type,
			bson: currentResult?.bson || [],
		}));
	}, []);

	const changeQueryParams = useCallback(
		(type: Exclude<keyof Ark.QueryOptions, "timeout">, value: number) => {
			setInitialRender(false);
			setQueryParams((params) => ({
				...params,
				[type]: value,
			}));
		},
		[]
	);

	const exec = useCallback(
		(code) => {
			const _code = code.replace(/(\/\/.*)|(\n)/g, "");
			console.log(`executing ${shellId} code`);
			setExecuting(true);
			setCurrentResult(undefined);
			shellId
				? window.ark.shell
						.eval(shellId, _code, debouncedQueryParams)
						.then(function ({
							editable,
							result,
							isCursor,
							isNotDocumentArray,
							err,
						}) {
							if (err) {
								console.log("exec shell");
								console.log(err);
								return;
							}

							if (result) {
								if (isNotDocumentArray) {
									setCurrentResult({
										type: "plaintext",
										bson: new TextDecoder().decode(result),
										forceView: "plaintext",
										hidePagination: !isCursor,
									});
								} else {
									const bson = deserialize(result);

									const bsonArray: Ark.BSONArray = bsonTest(bson)
										? Object.values(bson)
										: [bson];

									setCurrentResult({
										type: "tree",
										bson: bsonArray,
										allowDocumentEdits: editable,
										hidePagination: !isCursor,
									});
								}
							} else {
								notify({
									title: "Error",
									description: "Did not get result from main process.",
									type: "error",
								});
							}
						})
						.catch(function (err) {
							console.error("exec shell error: ", err);
							handleErrors(err, storedConnectionId);
						})
						.finally(() => setExecuting(false))
				: setExecuting(false);
		},
		[shellId, storedConnectionId, debouncedQueryParams]
	);

	const destroyShell = useCallback(
		(shellId: string) =>
			Promise.all([
				window.ark.shell.destroy(shellId).then(() => setShellId(undefined)),
				savedScriptId && window.ark.scripts.delete(savedScriptId),
			]),
		[savedScriptId]
	);

	const switchReplicaShell = useCallback(
		(member: ReplicaSetMember) => {
			console.log(
				`[switch replica] creating shell ${member.name} ${member.stateStr}`
			);
			return window.ark.shell
				.create(contextDB, storedConnectionId, settings?.encryptionKey)
				.then(({ id }) => {
					console.log(
						`[switch replica] created shell ${id} ${member.name} ${member.stateStr}`
					);
					setShellId(id);
					setCurrentReplicaHost(member);
				});
		},
		[contextDB, storedConnectionId, settings?.encryptionKey]
	);
	const exportData = useCallback(
		(code, options) => {
			const _code = code.replace(/(\/\/.*)|(\n)/g, "");
			setExecuting(true);
			shellId &&
				window.ark.shell
					.export(shellId, _code, options)
					.then((result) => {
						const { exportPath } = result;
						notify({
							title: "Export complete!",
							description: `File saved to path - ${exportPath}`,
							type: "success",
						});
					})
					.catch((err) => {
						notify({
							title: "Export failed!",
							description: err.message || err,
							type: "error",
						});
						console.error("exec shell error: ", err);
					})
					.finally(() => setExecuting(false));
		},
		[shellId]
	);

	const terminateExecution = useCallback(() => {
		if (shellId) return destroyShell(shellId).then(() => refreshEffect());
	}, [destroyShell, refreshEffect, shellId]);

	useEffect(() => {
		if (debouncedQueryParams && !initialRender) {
			exec(code);
		}

		/* Just need these dependencies for code to re-execute
			when either the page or the limit is changed */
	}, [debouncedQueryParams]);

	useEffect(() => {
		if (settings?.shellTimeout) {
			setQueryParams((params) => ({
				...params,
				timeout: settings.shellTimeout,
			}));
		}
	}, [settings?.shellTimeout]);

	useEffect(() => {
		if (contextDB && storedConnectionId) {
			setShellLoadError(undefined);
			Promise.resolve()
				.then(() => {
					console.log("[editor onload]", shellId);
					if (hosts && hosts.length > 1) {
						console.log("[editor onload] multi-host");
						return window.ark.driver
							.run("connection", "info", {
								id: storedConnectionId,
							})
							.then((connection) => {
								if (connection.replicaSetDetails) {
									console.log("[editor onload] multi-host replica set");
									const primary = connection.replicaSetDetails.members.find(
										(x) => x.stateStr === "PRIMARY"
									);
									if (primary) {
										setReplicaHosts(
											() => connection.replicaSetDetails?.members
										);
										switchReplicaShell(primary);
									} else {
										console.error("NO PRIMARY");
									}
								}
							});
					} else {
						console.log("[editor onload] single-host");
						return Promise.all([
							window.ark.shell.create(
								contextDB,
								storedConnectionId,
								settings?.encryptionKey
							),
							window.ark.driver.run("connection", "info", {
								id: storedConnectionId,
							}),
						]).then(([{ id }, connection]) => {
							console.log("[editor onload] single-host shell created - " + id);
							setShellId(id);
							// incase of single node replica set
							connection.replicaSetDetails &&
								setReplicaHosts(() => connection.replicaSetDetails?.members);
						});
					}
				})
				.catch(function (err) {
					console.log(err);
					if (err.message.startsWith("No mem entry found for id")) {
						setShellLoadError(
							"Unable to load the editor, connection was not made."
						);
					} else {
						setShellLoadError(
							`Something unexpected happened when loading the editor.\nError: ${err.message}`
						);
					}
				});
		}
		return () => {
			if (shellId) destroyShell(shellId);
		};
	}, [
		contextDB,
		uri,
		storedConnectionId,
		hosts,
		switchReplicaShell,
		effectRefToken,
		// shellId, // Causes infinite re-renders @todo: fix
		destroyShell,
	]);

	/** Register browser event listeners */
	useEffect(
		() =>
			listenEffect([
				{
					event: "browser:delete_tab:editor",
					cb: (e, payload) => {
						if (payload.id === TAB_ID && shellId) {
							destroyShell(shellId);
						}
					},
				},
			]),
		[TAB_ID, destroyShell, shellId]
	);

	return (
		<>
			<div className={"editor"}>
				<Resizable
					handleClasses={{
						bottom: "resize-handle horizontal",
					}}
					minHeight={
						currentResult && currentResult.bson && currentResult.type
							? "250px"
							: "100%"
					}
					defaultSize={{
						height: "250px",
						width: "100%",
					}}
					enable={{ bottom: true }}
				>
					<div className={"editor-header"}>
						<div className={"editor-header-item"}>
							{!!replicaHosts && !!currentReplicaHost ? (
								<HostList
									currentHost={currentReplicaHost}
									hosts={replicaHosts}
									onHostChange={(host) => {
										if (host.name !== currentReplicaHost.name) {
											(shellId
												? destroyShell(shellId)
												: Promise.resolve()
											).then(() => switchReplicaShell(host));
										}
									}}
								/>
							) : (
								<Tag icon={"globe-network"} round>
									{hosts[0]}
								</Tag>
							)}
						</div>
						<div className={"editor-header-item"}>
							<Tag icon={"database"} round>
								{contextDB}
							</Tag>
						</div>
						<div className={"editor-header-item"}>
							<Tag icon={"person"} round>
								{user || "(no auth)"}
							</Tag>
						</div>
						{shellId && !shellLoadError && (
							<>
								<div className={"editor-header-item"}>
									<Button
										size="small"
										icon={"floppy-disk"}
										onClick={{
											callback: (err, script) => {
												if (err) {
													notify({
														description: err.message
															? err.message
															: "Could not save script.",
														type: "error",
													});
												} else if (script) {
													setSavedScriptId(script.id);
												}
											},
											promise: () =>
												window.ark.scripts.saveAs({
													code,
													storedConnectionId,
												}),
										}}
										tooltipOptions={{
											position: "bottom",
											content: "Save as",
										}}
									/>
								</div>
								{savedScriptId && (
									<div className={"editor-header-item"}>
										<Button
											size="small"
											icon={"saved"}
											onClick={{
												callback: (err, script) => {
													if (err) {
														notify({
															description: err.message
																? err.message
																: "Could not save script.",
															type: "error",
														});
													} else if (script) {
														setSavedScriptId(script.id);
													}
												},
												promise: () => {
													return window.ark.scripts.save({
														code,
														id: savedScriptId,
													});
												},
											}}
											tooltipOptions={{
												position: "bottom",
												content: "Save script",
											}}
										/>
									</div>
								)}

								<div className="editor-header-item">
									<Button
										size="small"
										icon={"export"}
										onClick={() => toggleExportDialog(true)}
										tooltipOptions={{
											position: "bottom",
											content: "Export script result",
										}}
									/>
								</div>
								<div className={"editor-header-item"}>
									{executing ? (
										<Button
											size="small"
											icon={"stop"}
											variant="danger"
											text="Stop"
											onClick={() => terminateExecution()}
											tooltipOptions={{
												position: "bottom",
												content: "Stop",
											}}
										/>
									) : (
										<Button
											size="small"
											variant="primary"
											outlined
											text="Run"
											icon={"play"}
											onClick={() => exec(code)}
											tooltipOptions={{
												position: "bottom",
												content: "Run query",
											}}
										/>
									)}
								</div>
							</>
						)}
					</div>
					{shellId ? (
						<Shell
							code={code}
							onCodeChange={onCodeChange}
							allCollections={COLLECTIONS} // @todo: Fetch these collection names
							settings={settings}
							onMonacoCommand={(command) => {
								switch (command) {
									case MONACO_COMMANDS.CLONE_SHELL: {
										dispatch("browser:create_tab:editor", {
											shellConfig,
											contextDB,
											collections: COLLECTIONS,
											storedConnectionId,
										});
										return;
									}
									case MONACO_COMMANDS.EXEC_CODE: {
										exec(code);
									}
								}
							}}
						/>
					) : (
						<div
							style={{
								display: "flex",
								justifyContent: "center",
								alignItems: "center",
								height: "100%",
							}}
						>
							{shellLoadError ? shellLoadError : <CircularLoading />}
						</div>
					)}
				</Resizable>
				{currentResult && currentResult.bson && currentResult.type && (
					<ResultViewer
						{...currentResult}
						bson={currentResult.bson}
						type={currentResult.type}
						shellConfig={{ ...shellConfig, database: contextDB }}
						driverConnectionId={storedConnectionId}
						switchViews={switchViews}
						paramsState={{
							queryParams,
							changeQueryParams,
						}}
						onRefresh={() => {
							exec(code);
						}}
						onClose={() => {
							setCurrentResult(undefined);
						}}
					/>
				)}
			</div>
			{/* Dialogs */}
			<>
				{exportDialog && (
					<ExportQueryResult
						onCancel={() => toggleExportDialog(false)}
						onExport={(exportOptions) => {
							exportData(code, exportOptions);
							toggleExportDialog(false);
						}}
					/>
				)}
			</>
		</>
	);
};

interface CreateMenuItem {
	item: string;
	cb: () => void;
	active: boolean;
}
const createMenu = (items: CreateMenuItem[]) => (
	<Menu>
		{items.map((menuItem, i) => (
			<MenuItem
				disabled={menuItem.active}
				text={menuItem.item}
				key={i}
				onClick={() => menuItem.cb()}
			/>
		))}
	</Menu>
);

interface HostListProps {
	currentHost: ReplicaSetMember;
	hosts: ReplicaSetMember[];
	onHostChange: (host: ReplicaSetMember) => void;
}
const HostList = (props: HostListProps) => {
	const { currentHost, hosts, onHostChange } = props;

	return (
		<Tag icon={"globe-network"} /* interactive */ round>
			{currentHost.name +
				" " +
				"(" +
				currentHost.stateStr.substring(0, 1) +
				")"}
		</Tag>
	);

	// @todo: Build a system where switching
	// replica set nodes makes a direct connection
	// to the node via a connection string. This
	// may require a util to build a connection string
	// for any chosen node of a replica set stored
	// connection.
	// return (
	// 	<Popover2
	// 		position="bottom-right"
	// 		content={createMenu(
	// 			hosts.map((host) => ({
	// 				item: `${host.name} (${host.stateStr.substring(0, 1)})`,
	// 				cb: () => onHostChange(host),
	// 				active: currentHost.name === host.name,
	// 			}))
	// 		)}
	// 	>
	// 		<Tag icon={"globe-network"} /* interactive */ round>
	// 			{currentHost.name +
	// 				" " +
	// 				"(" +
	// 				currentHost.stateStr.substring(0, 1) +
	// 				")"}
	// 		</Tag>
	// 	</Popover2>
	// );
};
