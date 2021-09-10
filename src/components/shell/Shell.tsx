import "./shell.less";

import React, { FC, useCallback, useEffect, useState } from "react";
import {
	VscDatabase,
	VscGlobe,
	VscAccount,
	VscListTree,
} from "react-icons/vsc";
import { Menu, Dropdown } from "antd";
import { DownOutlined } from "@ant-design/icons";
import { default as Monaco } from "@monaco-editor/react";
import type { Monaco as MonacoType } from "@monaco-editor/react";
import { KeyMod, KeyCode, editor } from "monaco-editor";
import { mountMonaco } from "./monaco";
import { dispatch } from "../../util/events";

import SHELL_CONFIG_STUB from "../../json-stubs/shell-config.json";

const DEFAULT_CODE = `// Mongo shell
db.getCollection('test').find({});
`;
interface ExecutionResult {
	data: Ark.AnyObject;
}
interface CreateMenuItem {
	item: string;
	cb: (item: string) => void;
}
const createMenu = (items: CreateMenuItem[]) => (
	<Menu>
		{items.map((menuItem, i) => (
			<Menu.Item key={i} onClick={() => menuItem.cb(menuItem.item)}>
				<a>{menuItem.item}</a>
			</Menu.Item>
		))}
	</Menu>
);

interface HostListProps {
	hosts: string[];
	onHostChange: (host: string) => void;
}
const HostList = (props: HostListProps) => {
	const { hosts, onHostChange } = props;

	return (
		<Dropdown
			overlay={createMenu(
				hosts.map((host) => ({ item: host, cb: onHostChange }))
			)}
			trigger={["click"]}
		>
			<a style={{ display: "flex" }} onClick={(e) => e.preventDefault()}>
				{hosts[0]}
				<DownOutlined />
			</a>
		</Dropdown>
	);
};

export interface ShellProps {
	collections: string[];
	shellConfig: {
		uri: string;
		hosts: string[];
		db: string;
		user: string;
		collection?: string;
	};
	onExecutionResult?: (result: ExecutionResult) => void;
	onShellMessage?: (message: string) => void;
}
export const Shell: FC<ShellProps> = (props) => {
	const {
		collections,
		onExecutionResult,
		shellConfig: config,
		onShellMessage,
	} = props;

	const { db, collection, user, hosts, uri } = config || {};

	const [code, setCode] = useState(DEFAULT_CODE);
	const [monacoEditor, setMonacoEditor] =
		useState<editor.IStandaloneCodeEditor>();
	const [shellId, setShellId] = useState<string>();

	console.log(`render:`);
	console.log(`shellId=${shellId}`);

	const exec = useCallback(() => {
		const _code = code.replace(/(\/\/.*)|(\n)/g, "");

		shellId &&
			window.ark.shell
				.eval(shellId, _code)
				.then(function ({ result, err }) {
					if (err) {
						onShellMessage && onShellMessage(err.message);
						return console.error("exec shell error", err);
					}
					console.log("exec shell result: ", result);
					onExecutionResult && onExecutionResult({ data: result.result });
				})
				.catch(function (err) {
					console.error("exec shell error: ", err);
				});
	}, [code, onExecutionResult, onShellMessage, shellId]);

	const cloneCurrentTab = useCallback(() => {
		dispatch("browser:create_tab:editor", {
			shellConfig: config,
		});
	}, [config]);

	useEffect(() => {
		if (monacoEditor) {
			monacoEditor.addCommand(KeyMod.CtrlCmd | KeyCode.Enter, exec);
			monacoEditor.addCommand(
				KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_N,
				cloneCurrentTab
			);
		}
	}, [cloneCurrentTab, exec, monacoEditor]);

	useEffect(() => {
		window.ark.shell.create(uri).then(function ({ id }) {
			setShellId(id);
		});
	}, [uri]);

	return (
		<div className={"Shell"}>
			<div className={"ShellHeader"}>
				<div className={"ShellHeaderItem"}>
					<span>
						<VscGlobe />
					</span>
					{hosts.length === 1 ? (
						<span>{hosts[0]}</span>
					) : (
						<HostList
							hosts={hosts}
							onHostChange={(host) => {
								console.log("Host change to:", host);
							}}
						/>
					)}
				</div>
				<div className={"ShellHeaderItem"}>
					<span>
						<VscDatabase />
					</span>
					<span>{db}</span>
				</div>
				<div className={"ShellHeaderItem"}>
					<span>
						<VscAccount />
					</span>
					<span>{user}</span>
				</div>
				<div className={"ShellHeaderItem"}>
					<span>
						<VscListTree />
					</span>
					<span>{collection}</span>
				</div>
			</div>
			<Monaco
				options={{
					minimap: {
						enabled: false,
					},
				}}
				theme={"ark"}
				beforeMount={(monaco) => {
					mountMonaco(monaco, { collections });
					monaco.editor.defineTheme("ark", {
						base: "vs-dark",
						inherit: true,
						rules: [],
						colors: {
							"editor.foreground": "#000000",
							"editor.background": "#060a21",
							"editorCursor.foreground": "#8B0000",
							"editor.lineHighlightBackground": "#0000FF20",
							"editor.selectionBackground": "#8B0000",
							"editor.inactiveSelectionBackground": "#88000015",
						},
					});
				}}
				onMount={(editor: editor.IStandaloneCodeEditor, monaco: MonacoType) => {
					setMonacoEditor(editor);
				}}
				onChange={(value, ev) => {
					value && setCode(value);
				}}
				height="100%"
				defaultValue={code}
				defaultLanguage="typescript"
			/>
		</div>
	);
};
