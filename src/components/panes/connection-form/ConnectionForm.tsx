import React, { useCallback, useEffect, useState } from "react";
import { dispatch } from "../../../common/utils/events";
import "../styles.less";
import "../../../common/styles/layout.less";
import { notify } from "../../../common/utils/misc";
import { parse } from "mongodb-uri";
import {
	Checkbox,
	FormGroup,
	ButtonGroup,
	InputGroup,
	TextArea,
	Menu,
	MenuItem,
	Code,
	FileInput,
} from "@blueprintjs/core";
import { Button } from "../../../common/components/Button";

export interface ConnectionFormProps {
	connectionParams?: Ark.StoredConnection;
	mode?: "edit" | "clone";
}

export function ConnectionForm(props: ConnectionFormProps): JSX.Element {
	const [type, setType] = useState<"basic" | "advanced">(
		props.mode === "edit" || props.mode === "clone" ? "advanced" : "basic"
	);

	const [form, setForm] = useState<
		"connection" | "authentication" | "ssh" | "tls" | "misc"
	>("connection");

	const [sshAuthMethod, toggleAuthMethod] = useState<"password" | "privateKey">(
		"password"
	);

	const [tlsAuthMethod, toggleTlsAuthMethod] = useState<
		"CACertificate" | "self-signed"
	>("self-signed");

	const [host, setHost] = useState<string>(
		props.connectionParams?.hosts
			? props.connectionParams?.hosts[0].split(":")[0]
			: ""
	);

	const [icon, setIcon] = useState<Ark.StoredIcon>();

	const [port, setPort] = useState<string>(
		props.connectionParams?.hosts
			? props.connectionParams?.hosts[0].split(":")[1]
			: ""
	);

	const editConnection = useCallback(function <T extends Ark.StoredConnection>(
		key: keyof T,
		value: T[keyof T]
	) {
		if (key && value !== undefined) {
			setConnectionData((conn) => ({ ...conn, [key]: value }));
		}
	},
	[]);

	const emptyConnection = () => ({
		id: "",
		name: "",
		protocol: "mongodb",
		hosts: [],
		database: "",
		type: "directConnection" as const,
		username: "",
		password: "",
		encryptionKey: {
			source: "generated" as const,
			type: "file" as const,
			keyFile: "",
			url: "",
		},
		options: {
			tls: false,
			authMechanism:
				"SCRAM-SHA-1" as Ark.StoredConnection["options"]["authMechanism"],
		},
		ssh: {
			useSSH: false,
			mongodHost: "127.0.0.1",
			port: "22",
			mongodPort: "27017",
		},
	});

	const connectionDetails = props.connectionParams
		? {
				...props.connectionParams,
				id:
					props.connectionParams && props.mode === "clone"
						? ""
						: props.connectionParams.id,
		  }
		: emptyConnection();

	const [mongoURI, setMongoURI] = useState("");
	const [connectionData, setConnectionData] =
		useState<Ark.StoredConnection>(connectionDetails);

	const resetForm = useCallback(() => {
		setMongoURI("");
		setIcon(undefined);
		setHost("");
		setPort("");
		setConnectionData(emptyConnection());
	}, []);

	useEffect(() => {
		if (connectionData.id && connectionData.icon) {
			window.ark.getIcon(connectionData.id).then((icon) => {
				if (icon && icon.name) {
					setIcon(icon);
				}
			});
		}
		/* We just need the icon fetched during the initial render.
		Subsequent updates are being handled within the component */
		/* eslint-disable-next-line */
	}, []);

	useEffect(() => {
		if (
			connectionData.password &&
			(props.mode === "edit" || props.mode === "clone")
		) {
			window.ark.driver
				.run<"decryptPassword">("connection", "decryptPassword", {
					pwd: connectionData.password,
					iv: connectionData.iv || "",
				})
				.then((pwd) => {
					editConnection("password", pwd);
				});
		}
		// We just need to decrypt the password on initial render
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const validateUri = useCallback((uri: string) => {
		try {
			const parsedUri = parse(uri);
			if (
				parsedUri &&
				parsedUri.scheme === "mongodb" &&
				parsedUri.hosts.every((elem) => !!elem.host && !!elem.port)
			) {
				return { ok: true };
			}

			if (
				parsedUri &&
				parsedUri.scheme === "mongodb+srv" &&
				parsedUri.hosts.every((elem) => !!elem.host)
			) {
				return { ok: true };
			}

			return { ok: false, err: "Invalid URI format" };
		} catch (err) {
			return {
				ok: true,
				err:
					err && (err as Error).message
						? (err as Error).message
						: "Invalid URI",
			};
		}
	}, []);

	const saveMongoURI = useCallback(() => {
		const { ok, err } = validateUri(mongoURI);
		if (ok) {
			window.ark.driver
				.run("connection", "save", {
					type: "uri",
					config: {
						uri: mongoURI,
						name:
							connectionData.name || "Test Connection " + new Date().valueOf(),
					},
				})
				.then((connectionId) => {
					dispatch("connection_manager:add_connection", { connectionId });
					resetForm();
				});
		} else {
			if (err) {
				notify({
					type: "error",
					description: err,
				});
			} else {
				notify({
					type: "error",
					description: "Validation of inputs failed",
				});
			}
		}
	}, [validateUri, mongoURI, connectionData.name, resetForm]);

	const testURIConnection = useCallback(() => {
		const { ok, err } = validateUri(mongoURI);
		if (ok) {
			window.ark.driver
				.run("connection", "test", {
					type: "uri",
					config: {
						uri: mongoURI,
						name: "",
					},
				})
				.then((res) => {
					const notification: Parameters<typeof notify>[0] = {
						title: "Connection Test",
						description: res.message,
						type: res.status ? "success" : "error",
					};

					notify(notification);
				});
		} else {
			if (err) {
				notify({
					type: "error",
					description: err,
				});
			} else {
				notify({
					type: "error",
					description: "Validation of inputs failed",
				});
			}
		}
	}, [mongoURI, validateUri]);

	const validateAdvancedConfig = useCallback(() => {
		const error: Partial<Parameters<typeof notify>[0]> = {};
		if (!connectionData.type) {
			error.description = "Invalid connection type.";
		} else if (!connectionData.hosts || !(!!host && !isNaN(Number(port)))) {
			error.description = "Invalid hosts.";
		} else if (
			connectionData.options.tls &&
			tlsAuthMethod === "CACertificate" &&
			!connectionData.options.tlsCertificateFile
		) {
			error.description = "Specify the TLS certificate file to be used.";
		} else if (connectionData.ssh.useSSH) {
			if (
				!connectionData.ssh.host ||
				!connectionData.ssh.port ||
				isNaN(Number(connectionData.ssh.port))
			) {
				error.description = "Incorrect ssh host or port format.";
			} else if (
				!connectionData.ssh.mongodHost ||
				!connectionData.ssh.mongodPort ||
				isNaN(Number(connectionData.ssh.mongodPort))
			) {
				error.description = "Incorrect mongod host or port.";
			} else if (!connectionData.ssh.username) {
				error.description = "Invalid username.";
			} else if (
				(sshAuthMethod === "password" && !connectionData.ssh.password) ||
				(sshAuthMethod === "privateKey" && !connectionData.ssh.privateKey)
			) {
				error.description =
					"Either the password or the private key must be specified.";
			}

			if (error.description) {
				error.title = "Invalid SSH config";
			}
		}

		if (error.description) {
			notify({
				title: error.title || "Configuration error.",
				description: error.description || "",
				type: "error",
			});

			return false;
		}

		return true;
	}, [connectionData, host, port, sshAuthMethod, tlsAuthMethod]);

	const saveAdvancedConnection = useCallback(() => {
		if (validateAdvancedConfig()) {
			return window.ark.driver.run("connection", "save", {
				type: "config",
				config: {
					...connectionData,
					hosts:
						connectionData.type === "directConnection"
							? [`${host}:${port}`]
							: connectionData.hosts,
					name:
						connectionData.name || "Test Connection " + new Date().valueOf(),
				},
				icon: icon,
			});
		} else {
			return Promise.resolve();
		}
	}, [connectionData, host, icon, port, validateAdvancedConfig]);

	const testAdvancedConnection = useCallback(() => {
		if (validateAdvancedConfig()) {
			return window.ark.driver.run("connection", "test", {
				type: "config",
				config: {
					...connectionData,
					hosts:
						connectionData.type === "directConnection"
							? [`${host}:${port}`]
							: connectionData.hosts,
					name: "",
				},
			});
		} else {
			return Promise.resolve();
		}
	}, [connectionData, host, port, validateAdvancedConfig]);

	const editSSHDetails = useCallback(
		function <T extends Ark.StoredConnection["ssh"]>(
			key: keyof T,
			value: T[keyof T]
		) {
			if (key && value !== undefined) {
				editConnection("ssh", {
					...connectionData.ssh,
					[key]: value,
				});
			}
		},
		[connectionData.ssh, editConnection]
	);

	const sshAuthMenu = (
		<Menu>
			<MenuItem
				onClick={() => toggleAuthMethod("password")}
				key="password"
				text="Password"
			/>
			<MenuItem
				onClick={() => toggleAuthMethod("privateKey")}
				key="privateKey"
				text="Private Key"
			/>
		</Menu>
	);

	const tlsAuthMenu = (
		<Menu>
			<MenuItem
				onClick={() => toggleTlsAuthMethod("self-signed")}
				key="self-signed"
				text="Self-signed certificate"
			/>
			<MenuItem
				onClick={() => toggleTlsAuthMethod("CACertificate")}
				key="CACertificate"
				text="Provide Root CA"
			/>
		</Menu>
	);

	const authMechanismMenu = (
		<Menu>
			<MenuItem
				onClick={() =>
					editConnection("options", {
						...connectionData.options,
						authMechanism: "SCRAM-SHA-1",
					})
				}
				key={"SCRAM-SHA-1"}
				text={"SCRAM-SHA-1"}
			/>
			<MenuItem
				onClick={() =>
					editConnection("options", {
						...connectionData.options,
						authMechanism: "SCRAM-SHA-256",
					})
				}
				key={"SCRAM-SHA-256"}
				text={"SCRAM-SHA-256"}
			/>
		</Menu>
	);

	const connectionTypeMenu = (
		<Menu>
			<MenuItem
				onClick={() => editConnection("type", "directConnection")}
				key="directConnection"
				text="Direct Connection"
			/>
			<MenuItem
				onClick={() => editConnection("type", "replicaSet")}
				key="replicaSet"
				text="Replica Set"
			/>
		</Menu>
	);

	const TestAndSaveButtons = (
		<div className="button-row">
			<Button
				text="Advanced Settings"
				variant="link"
				onClick={() => setType("advanced")}
			/>
			<ButtonGroup className="button-group">
				<Button
					text="Test"
					variant="link"
					onClick={() => testURIConnection()}
				/>
				<Button text="Save" variant="primary" onClick={() => saveMongoURI()} />
			</ButtonGroup>
		</div>
	);

	const TestAndSaveAdvanced = (
		<ButtonGroup className="button-group">
			<Button
				text="Test"
				variant="link"
				onClick={{
					promise: () => testAdvancedConnection(),
					callback: (err, res) => {
						if (err) {
							console.log(err);
							notify({
								type: "error",
								description: "Something went wrong!",
							});
							return;
						} else if (res) {
							const notification: Parameters<typeof notify>[0] = {
								title: "Test connection",
								description: res.message,
								type: res.status ? "success" : "error",
							};

							notify(notification);
						}
					},
				}}
			/>
			<Button
				text="Save"
				variant="primary"
				onClick={{
					promise: () => saveAdvancedConnection(),
					callback: (err, res) => {
						if (err) {
							console.log(err);
							notify({
								type: "error",
								description: "Something went wrong!",
							});
							return;
						} else {
							const connectionId = res;
							dispatch("connection_manager:add_connection", { connectionId });
							resetForm();
						}
					},
				}}
			/>
		</ButtonGroup>
	);

	return (
		<div className="uri-container">
			<div className="container">
				{type === "basic" && (
					<div className="basic-wrapper">
						<div className="form">
							<FormGroup label="Name" labelFor="connection-name-basic">
								<InputGroup
									id="connection-name-basic"
									value={connectionData?.name}
									onChange={(e) => editConnection("name", e.target.value)}
								/>
							</FormGroup>
							<FormGroup
								helperText={
									<span>
										{"Enter a URI starting with "}
										<Code>{"mongodb://"}</Code>
										{" or "}
										<Code>{"mongodb+srv://"}</Code>
									</span>
								}
								label="URI"
								labelFor="uri"
							>
								<InputGroup
									id="uri"
									onChange={(e) => setMongoURI(e.target.value)}
									value={mongoURI}
								/>
							</FormGroup>
							{TestAndSaveButtons}
						</div>
					</div>
				)}
				{type === "advanced" && (
					<div className="advanced-wrapper">
						<div className="header">
							<div className="section-header">
								<Button
									text="Connection"
									variant="link"
									active={form === "connection"}
									onClick={() => setForm("connection")}
								/>
							</div>
							<div className="section-header">
								<Button
									text="Authentication"
									variant="link"
									active={form === "authentication"}
									onClick={() => setForm("authentication")}
								/>
							</div>
							<div className="section-header">
								<Button
									text="SSH"
									variant="link"
									active={form === "ssh"}
									onClick={() => setForm("ssh")}
								/>
							</div>
							<div className="section-header">
								<Button
									text="TLS"
									variant="link"
									active={form === "tls"}
									onClick={() => setForm("tls")}
								/>
							</div>
							<div className="section-header">
								<Button
									text="Misc"
									variant="link"
									active={form === "misc"}
									onClick={() => setForm("misc")}
								/>
							</div>
						</div>
						{form === "connection" && (
							<div className="form">
								<FormGroup
									helperText={<span>{"Select the type of connection."}</span>}
									label="Type"
									labelFor="connection-type"
								>
									<div className="input-field">
										<Button
											fill
											dropdownOptions={{
												content: connectionTypeMenu,
												interactionKind: "click-target",
												fill: true,
											}}
											text={
												connectionData?.type === "replicaSet"
													? "Replica Set"
													: "Direct connection"
											}
										/>
									</div>
								</FormGroup>
								<div>
									<FormGroup label="Name">
										<div className="input-field">
											<InputGroup
												value={connectionData?.name}
												onChange={(e) => editConnection("name", e.target.value)}
											/>
										</div>
									</FormGroup>
								</div>

								{connectionData.type === "directConnection" && (
									<div className="flex-inline">
										<div style={{ flexGrow: 1 }}>
											<FormGroup label="Host">
												<div className="input-field">
													<InputGroup
														value={host}
														onChange={(e) => setHost(e.target.value)}
													/>
												</div>
											</FormGroup>
										</div>
										<div>
											<FormGroup label="Port">
												<div className="input-field">
													<InputGroup
														value={port}
														onChange={(e) => setPort(e.target.value)}
													/>
												</div>
											</FormGroup>
										</div>
									</div>
								)}

								{connectionData.type === "replicaSet" && (
									<div>
										<FormGroup
											label="Hosts"
											helperText="Use a comma to separate hosts"
										>
											<div className="input-field">
												<TextArea
													value={connectionData?.hosts}
													onChange={(e) =>
														editConnection("hosts", e.target.value.split(","))
													}
												/>
											</div>
										</FormGroup>
									</div>
								)}
							</div>
						)}
						{form === "authentication" && (
							<div className="form">
								<FormGroup
									label="Database"
									helperText="Authentication database name"
								>
									<div className="input-field">
										<InputGroup
											value={connectionData?.database}
											onChange={(e) =>
												editConnection("database", e.target.value)
											}
										/>
									</div>
								</FormGroup>
								<FormGroup label="Username">
									<div className="input-field">
										<InputGroup
											value={connectionData?.username}
											onChange={(e) =>
												editConnection("username", e.target.value)
											}
										/>
									</div>
								</FormGroup>
								<FormGroup label="Password">
									<div className="input-field">
										<InputGroup
											type="password"
											value={connectionData?.password}
											onChange={(e) =>
												editConnection("password", e.target.value)
											}
										/>
									</div>
								</FormGroup>
								<FormGroup label="Authentication Mechanism">
									<div className="input-field">
										<Button
											fill
											dropdownOptions={{
												content: authMechanismMenu,
												interactionKind: "click-target",
												fill: true,
											}}
											text={connectionData.options.authMechanism}
										/>
									</div>
								</FormGroup>
							</div>
						)}
						{form === "ssh" && (
							<div className="form">
								<div className="flex-inline">
									<FormGroup helperText="When enabled, any configurations made in the 'Connection' section will be ignored.">
										<div className="input-field">
											<Checkbox
												checked={connectionData.ssh.useSSH}
												onChange={() =>
													editSSHDetails("useSSH", !connectionData.ssh.useSSH)
												}
												label="Use SSH Tunnel"
											/>
										</div>
									</FormGroup>
								</div>
								<div className="flex-inline">
									<FormGroup label="Tunnel Host">
										<div className="input-field">
											<InputGroup
												value={connectionData?.ssh?.host}
												disabled={!connectionData.ssh.useSSH}
												onChange={(e) => editSSHDetails("host", e.target.value)}
											/>
										</div>
									</FormGroup>
									<FormGroup label="Tunnel Port">
										<div className="input-field">
											<InputGroup
												value={connectionData?.ssh?.port}
												disabled={!connectionData.ssh.useSSH}
												onChange={(e) => editSSHDetails("port", e.target.value)}
											/>
										</div>
									</FormGroup>
								</div>
								<div className="flex-inline">
									<FormGroup label="MongoDB Host">
										<div className="input-field">
											<InputGroup
												value={connectionData?.ssh?.mongodHost}
												disabled={!connectionData.ssh.useSSH}
												onChange={(e) =>
													editSSHDetails("mongodHost", e.target.value)
												}
											/>
										</div>
									</FormGroup>
									<FormGroup label="MongoDB Port">
										<div className="input-field">
											<InputGroup
												value={connectionData?.ssh?.mongodPort}
												disabled={!connectionData.ssh.useSSH}
												onChange={(e) =>
													editSSHDetails("mongodPort", e.target.value)
												}
											/>
										</div>
									</FormGroup>
								</div>
								<FormGroup label="Username">
									<div className="input-field">
										<InputGroup
											value={connectionData?.ssh?.username}
											disabled={!connectionData.ssh.useSSH}
											onChange={(e) =>
												editSSHDetails("username", e.target.value)
											}
										/>
									</div>
								</FormGroup>
								<FormGroup label="Authentication Method">
									<div className="input-field">
										<Button
											fill
											disabled={!connectionData.ssh.useSSH}
											dropdownOptions={{
												content: sshAuthMenu,
												interactionKind: "click-target",
												fill: true,
											}}
											text={
												sshAuthMethod === "password"
													? "Password"
													: "Private key"
											}
										/>
									</div>
								</FormGroup>
								{sshAuthMethod === "password" && (
									<FormGroup label="Password">
										<div className="input-field">
											<InputGroup
												value={connectionData.ssh?.password}
												disabled={!connectionData.ssh.useSSH}
												onChange={(e) =>
													editSSHDetails("password", e.target.value)
												}
											/>
										</div>
									</FormGroup>
								)}
								{sshAuthMethod === "privateKey" && (
									<FormGroup
										label="Private Key"
										helperText="Enter your private key contents here"
									>
										<div className="input-field">
											<TextArea
												value={connectionData?.ssh?.privateKey}
												disabled={!connectionData.ssh.useSSH}
												onChange={(e) =>
													editSSHDetails("privateKey", e.target.value)
												}
											/>
										</div>
									</FormGroup>
								)}
								{sshAuthMethod === "privateKey" && (
									<FormGroup
										label="Passphrase"
										helperText="Optional key passphrase"
									>
										<div className="input-field">
											<InputGroup
												value={connectionData?.ssh?.method}
												disabled={!connectionData.ssh.useSSH}
												onChange={(e) =>
													editSSHDetails("passphrase", e.target.value)
												}
											/>
										</div>
									</FormGroup>
								)}
							</div>
						)}
						{form === "tls" && (
							<div className="form">
								<div className="flex-inline">
									<FormGroup>
										<div className="input-field">
											<Checkbox
												checked={connectionData.options.tls}
												onChange={() =>
													editConnection("options", {
														...connectionData.options,
														tls: !connectionData.options.tls,
													})
												}
												label="Use TLS protocol"
											/>
										</div>
									</FormGroup>
								</div>
								<FormGroup label="Authentication Method">
									<div className="input-field">
										<Button
											fill
											disabled={!connectionData.options.tls}
											dropdownOptions={{
												content: tlsAuthMenu,
												interactionKind: "click-target",
												fill: true,
											}}
											text={
												tlsAuthMethod === "self-signed"
													? "Self-signed certificate"
													: "Provide root CA"
											}
										/>
									</div>
								</FormGroup>
								{tlsAuthMethod === "CACertificate" && (
									<div className="flex-inline">
										<FormGroup
											disabled
											helperText="Ark only supports self-signed certificates for now. Sorry!"
											label="CA Certificate"
										>
											<div className="input-field">
												<FileInput
													disabled
													text="Choose a file..."
													onInputChange={(e) => {}}
												/>
											</div>
										</FormGroup>
									</div>
								)}
							</div>
						)}
						{form === "misc" && (
							<div className="form">
								<div className="flex-inline">
									<FormGroup
										className="flex-fill"
										label="Icon"
										helperText={
											"This icon will be used in the sidebar. Ark will copy the icon to it's own location."
										}
									>
										<div className="input-field">
											<FileInput
												fill
												text={
													icon && icon.path ? icon.path : "Choose an image..."
												}
												inputProps={{
													accept: "image/png,image/svg,image/jpeg",
												}}
												onInputChange={(e) => {
													const list = e.currentTarget.files;
													const file = list?.item(0);
													if (file) {
														if (
															file.type !== "image/png" &&
															file.type !== "image/svg" &&
															file.type !== "image/jpeg"
														) {
															notify({
																title: "Validation failed",
																type: "error",
																description:
																	"Only PNG, SVG, and JPEG types are supported!",
															});
														} else if (file.size >= 10000) {
															notify({
																title: "Validation failed",
																type: "error",
																description:
																	"File size must be less than 10KBs",
															});
														} else {
															let rmIconIfRequired = Promise.resolve();
															if (icon && icon.name) {
																rmIconIfRequired = window.ark.rmIcon(icon.path);
															}
															rmIconIfRequired
																.then(() =>
																	window.ark.copyIcon(
																		"icons",
																		file.name,
																		(file as any).path
																	)
																)
																.then((result) => {
																	const { path } = result;
																	setIcon({
																		path,
																		type: file.type,
																		name: file.name,
																		size: file.size,
																		lastModified: file.lastModified,
																	});
																});
														}
													}
												}}
											/>
										</div>
									</FormGroup>
									<div className="connection-form-icon">
										{icon ? (
											<img
												src={`ark://icons/${icon.name}`}
												width={30}
												height={30}
											/>
										) : (
											<span>No Icon</span>
										)}
									</div>
								</div>
							</div>
						)}
						<div className="advanced-footer-row">
							<ButtonGroup className="button-group">
								<Button
									text="Back"
									variant="link"
									onClick={() => setType("basic")}
								/>
							</ButtonGroup>
							{TestAndSaveAdvanced}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
