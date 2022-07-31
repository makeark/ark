import "./styles.less";

import React, { useCallback, useContext } from "react";
import { Button } from "../../common/components/Button";
import { Menu, MenuItem, FormGroup, FileInput } from "@blueprintjs/core";
import { useState } from "react";
import { SelectConnectionForFilePath } from "../dialogs/SelectConnectionForScript";
import { Dialog } from "../../common/components/Dialog";
import { Checkbox, InputGroup } from "@blueprintjs/core";
import { notify } from "../../common/utils/misc";
import { useEffect } from "react";
import { SettingsContext } from "./BaseContextProvider";
import { DropdownMenu } from "../../common/components/DropdownMenu";

export interface EncryptionKey {
	source: "userDefined" | "generated";
	type: "file" | "url";
	keyFile: string;
	url: string;
}

const PLATFORM = window.navigator.platform;
const PATH_SEPARATOR = PLATFORM.includes("Win") ? "\\" : "/";

export const TitleBar = (): JSX.Element => {
	const { settings, setSettings } = useContext(SettingsContext);

	const [openScriptPath, setOpenScriptPath] = useState("");
	const [timeoutDialog, setTimeoutDialog] = useState(false);
	const [localSettings, setLocalsettings] = useState({
		shellTimeout: "120",
		lineNumbers: true,
		miniMap: false,
		autoUpdates: true,
		hotKeys: true,
	});

	const [secretKeyDialog, showSecretKeyDialog] = useState(false);
	const [encryptionKey, setEncryptionKey] = useState<EncryptionKey>({
		source: settings?.encryptionKey?.source || "generated",
		type: settings?.encryptionKey?.type || "file",
		keyFile:
			settings?.encryptionKey?.type === "file"
				? settings.encryptionKey.value
						.split(PATH_SEPARATOR)
						.slice(0, -1)
						.join(PATH_SEPARATOR)
				: "",
		url:
			settings?.encryptionKey?.type === "url"
				? settings.encryptionKey.value
				: "",
	});

	useEffect(() => {
		if (
			!settings?.encryptionKey?.source ||
			!settings.encryptionKey.type ||
			!settings.encryptionKey.value
		) {
			showSecretKeyDialog(true);
		}
	}, [settings]);

	useEffect(() => {
		setLocalsettings({
			shellTimeout: settings?.shellTimeout?.toString() || "120",
			lineNumbers: settings?.lineNumbers === "off" ? false : true,
			miniMap: settings?.miniMap === "on" ? true : false,
			autoUpdates: settings?.autoUpdates === "off" ? false : true,
			hotKeys: settings?.hotKeys === "off" ? false : true,
		});
	}, [
		settings?.autoUpdates,
		settings?.hotKeys,
		settings?.lineNumbers,
		settings?.miniMap,
		settings?.shellTimeout,
	]);

	const changeSettings = useCallback(
		function <T extends keyof Ark.Settings>(
			setting: T,
			value: Ark.Settings[T]
		) {
			setSettings && setSettings((s) => ({ ...s, [setting]: value }));
			window.ark.settings
				.save("general", { ...settings, [setting]: value })
				.then(() => {
					notify({
						title: "Success!",
						description: "Settings saved successfully.",
						type: "success",
					});
				})
				.catch((err) => {
					console.log("Error", err);
					notify({
						title: "Error!",
						description: err.message ? err.message : err.toString(),
						type: "error",
					});
				});
		},
		[setSettings, settings]
	);

	const changeEncryptionKey = useCallback(
		(forceCreate?: boolean) => {
			//Validations

			const encryptionKeyPromise =
				encryptionKey.source === "generated" || forceCreate
					? window.ark.driver.run("connection", "createEncryptionKey", {
							path: !forceCreate ? encryptionKey.keyFile : "",
					  })
					: Promise.resolve("");

			encryptionKeyPromise.then((path: string) => {
				changeSettings("encryptionKey", {
					type: encryptionKey.type,
					source: encryptionKey.source,
					value:
						encryptionKey.type === "url"
							? encryptionKey.url
							: encryptionKey.source === "userDefined"
							? encryptionKey.keyFile
							: path,
				});
			});
		},
		[
			changeSettings,
			encryptionKey.keyFile,
			encryptionKey.source,
			encryptionKey.type,
			encryptionKey.url,
		]
	);

	const encrytionSourceTypeMenu = (
		<Menu>
			<MenuItem
				onClick={() => {
					setEncryptionKey((encryptionKey) => ({
						...encryptionKey,
						type: "file",
						url: "",
					}));
				}}
				key={"file"}
				text={"File"}
			/>
			<MenuItem
				onClick={() => {
					setEncryptionKey((encryptionKey) => ({
						...encryptionKey,
						type: "url",
						keyFile: "",
					}));
				}}
				key={"url"}
				text={"URL"}
			/>
		</Menu>
	);

	const encryptionSourceMenu = (
		<Menu>
			<MenuItem
				onClick={() => {
					setEncryptionKey((encryptionKey) => ({
						...encryptionKey,
						source: "generated",
						type: "file",
						keyFile: "",
						url: "",
					}));
				}}
				key={"generated"}
				text={"Generate a key"}
			/>
			<MenuItem
				onClick={() => {
					setEncryptionKey((encryptionKey) => ({
						...encryptionKey,
						source: "userDefined",
						type: "file",
						keyFile: "",
						url: "",
					}));
				}}
				key={"userDefined"}
				text={"Use an existing key"}
			/>
		</Menu>
	);

	const encryptionDialog = (
		<div>
			<FormGroup label="Encryption Key Source">
				<div className="input-field">
					<Button
						fill
						dropdownOptions={{
							content: encryptionSourceMenu,
							interactionKind: "click-target",
							fill: true,
						}}
						text={
							encryptionKey.source === "userDefined"
								? "Use an existing key"
								: "Generate a key"
						}
					/>
				</div>
			</FormGroup>
			{encryptionKey.source === "userDefined" && (
				<FormGroup label="Encryption Key Source type">
					<div className="input-field">
						<Button
							fill
							dropdownOptions={{
								content: encrytionSourceTypeMenu,
								interactionKind: "click-target",
								fill: true,
							}}
							text={encryptionKey.type === "file" ? "File" : "URL"}
						/>
					</div>
				</FormGroup>
			)}
			{encryptionKey.source === "generated" && (
				<FormGroup
					label="Directory to save the encryption key"
					helperText={
						"Full path to a directory. Make sure the key isn't deleted as it will be needed when the connection is made."
					}
				>
					<div className="input-field">
						<InputGroup
							value={encryptionKey.keyFile}
							onChange={(e) => {
								setEncryptionKey((encryptionKey) => ({
									...encryptionKey,
									keyFile: e.target.value,
									url: "",
								}));
							}}
						/>
					</div>
				</FormGroup>
			)}
			{encryptionKey.source === "userDefined" && encryptionKey.type === "file" && (
				<FormGroup
					className="flex-fill"
					label="Encryption Key File"
					helperText={
						"The encryption key must be a 256 bit hex encoded string."
					}
				>
					<div className="input-field">
						<FileInput
							fill
							text={
								encryptionKey && encryptionKey.type === "file"
									? encryptionKey.keyFile
									: "Select encryption key..."
							}
							onInputChange={(e) => {
								const list = e.currentTarget.files;
								const file = list?.item(0) as File & {
									path: string;
								};
								if (file) {
									if (file.size >= 10000) {
										notify({
											title: "Validation failed",
											type: "error",
											description: "File size must be less than 10KBs",
										});
									} else {
										setEncryptionKey((encryptionKey) => ({
											...encryptionKey,
											keyFile: file.path,
											url: "",
										}));
									}
								}
							}}
						/>
					</div>
				</FormGroup>
			)}
			{encryptionKey.source === "userDefined" && encryptionKey.type === "url" && (
				<FormGroup label="Encryption Key URL">
					<div className="input-field">
						<InputGroup
							value={encryptionKey.url}
							onChange={(e) => {
								setEncryptionKey((encryptionKey) => ({
									...encryptionKey,
									keyFile: "",
									url: e.target.value,
								}));
							}}
						/>
					</div>
				</FormGroup>
			)}
		</div>
	);

	return (
		<div className="title-bar">
			{secretKeyDialog && (
				<Dialog
					size="large"
					onCancel={() => {
						if (
							!settings?.encryptionKey?.source ||
							!settings.encryptionKey.type ||
							!settings.encryptionKey.value
						) {
							changeEncryptionKey(true);
						}
						showSecretKeyDialog(false);
					}}
					onConfirm={() => {
						changeEncryptionKey();
						showSecretKeyDialog(false);
					}}
				>
					{encryptionDialog}
				</Dialog>
			)}
			<div className="header-container">
				<div className="logo">Ark</div>
				<DropdownMenu
					position="bottom-right"
					items={[
						{
							text: "Open Script",
							onClick: () => {
								window.ark
									.browseForFile("Select A File", "Select")
									.then((result) => {
										const { path } = result;
										setOpenScriptPath(path);
									});
							},
							icon: "document-open",
							key: "open_script",
						},
						{
							title: "Connection Settings",
							divider: true,
							key: "divider_two",
						},
						{
							text: "Encryption Key",
							icon: "key",
							key: "encryption",
							onClick: () => showSecretKeyDialog(true),
						},
						{ title: "Editor Settings", divider: true, key: "divider_one" },
						{
							key: "shell_timeout",
							text: "Query Timeout",
							icon: "outdated",
							onClick: () => setTimeoutDialog(true),
						},
						{
							key: "result_tz",
							text: "Result Timezone",
							icon: "globe",
							submenu: [
								{
									key: "tz_local",
									text: "Local",
									onClick: () =>
										changeSettings<"timezone">("timezone", "local"),
								},
								{
									key: "tz_utc",
									text: "UTC",
									onClick: () => changeSettings<"timezone">("timezone", "utc"),
								},
							],
						},
						{
							key: "line_nos",
							text: (
								<Checkbox
									style={{
										marginRight: 0,
										marginBottom: 0,
									}}
									checked={localSettings.lineNumbers}
									label={"Show Line Numbers"}
									onChange={(e) => {
										const showLineNumbers = (e.target as HTMLInputElement)
											.checked
											? "on"
											: "off";
										changeSettings("lineNumbers", showLineNumbers);
									}}
								/>
							),
						},
						{
							key: "minimap",
							text: (
								<Checkbox
									style={{
										marginRight: 0,
										marginBottom: 0,
									}}
									checked={localSettings.miniMap}
									label={"Show Mini Map"}
									onChange={(e) => {
										const showMiniMap = (e.target as HTMLInputElement).checked
											? "on"
											: "off";
										changeSettings("miniMap", showMiniMap);
									}}
								/>
							),
						},
						{
							key: "hotkeys",
							text: (
								<Checkbox
									style={{
										marginRight: 0,
										marginBottom: 0,
									}}
									checked={localSettings.hotKeys}
									label={"Enable Hot Keys"}
									onChange={(e) => {
										const enableHotkeys = (e.target as HTMLInputElement).checked
											? "on"
											: "off";
										changeSettings("hotKeys", enableHotkeys);
									}}
								/>
							),
						},
						{ divider: true, key: "divider_three" },
						{
							intent: "danger",
							text: "Exit",
							icon: "cross",
							key: "exit",
							onClick: () => window.ark.titlebar.close(),
						},
					]}
				>
					<div className="header-item">
						<Button variant="link" size="small" icon="menu" />
					</div>
				</DropdownMenu>
			</div>
			<div className="header-draggable-area"></div>
			<div className="header-container">
				<Button
					variant="link"
					icon="minus"
					onClick={() => window.ark.titlebar.minimize()}
				/>
				<Button
					variant="link"
					icon="symbol-square"
					onClick={() => window.ark.titlebar.maximize()}
				/>
				<Button
					icon="cross"
					variant="link"
					outlined
					onClick={() => window.ark.titlebar.close()}
				/>
			</div>

			{openScriptPath && (
				<SelectConnectionForFilePath
					path={openScriptPath}
					onClose={() => setOpenScriptPath("")}
				/>
			)}
			{timeoutDialog && (
				<Dialog
					size="small"
					confirmButtonText="Change"
					onCancel={() => setTimeoutDialog(false)}
					onConfirm={() => {
						const timeout = Number(localSettings.shellTimeout);
						if (isNaN(timeout)) {
							return notify({
								description: "Timeout must be a number!",
								type: "error",
							});
						}

						changeSettings("shellTimeout", timeout);
						setTimeoutDialog(false);
					}}
					title={"Change Query Timeout"}
				>
					<div>
						<InputGroup
							value={localSettings.shellTimeout.toString()}
							onChange={(event) =>
								setLocalsettings((ls) => ({
									...ls,
									shellTimeout: event.target.value,
								}))
							}
							placeholder={"Shell timeout (in seconds)"}
						/>
					</div>
				</Dialog>
			)}
		</div>
	);
};
