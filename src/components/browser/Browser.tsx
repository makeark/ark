import "./browser.less";

import { Tabs } from "antd";
import { nanoid } from "nanoid";
import React, { useCallback, useEffect, useState } from "react";
import type { FC, ComponentClass } from "react";
import { ShellProps } from "../shell/Shell";
import { listenEffect } from "../../util/events";
import { Editor, EditorProps } from "../panes/Editor";
import { ConnectionFormProps } from "../panes/ConnectionForm";

import SHELL_CONFIG_STUB from "../../json-stubs/shell-config.json";

const { TabPane } = Tabs;

interface BaseTab {
	title: string;
	id: string;
	closable: boolean;
}
interface EditorTab extends BaseTab {
	type: "editor";
	shellConfig: ShellProps["shellConfig"];
}

interface ConnectionFormTab extends BaseTab {
	type: "connection_form";
	connectionDefaults: ConnectionFormProps["connectionDefaults"];
}

interface CreateEditorTabArgs {
	shellConfig: ShellProps["shellConfig"];
}

interface DeleteEditorTabArgs {
	id: string;
}

export type TabType = "editor" | "connection_form";
export type Tab = EditorTab | ConnectionFormTab;
export type TabComponentProps = EditorProps | ConnectionFormProps;
export interface TabComponentMap {
	editor: EditorProps;
	connection_form: ConnectionFormProps;
}

const TAB_PANES: {
	[k in TabType]?: FC<TabComponentMap[k]> | ComponentClass<TabComponentMap[k]>;
} = {
	// eslint-disable-next-line react/display-name
	editor: Editor,
};

const EmptyState = () => {
	return <div>This is an empty state!</div>;
};

export const Browser = (): JSX.Element => {
	const [tabs, setTabs] = useState<Tab[]>([]);
	const [activeKey, setActiveKey] = useState<string>();

	/* onload useEffect */
	useEffect(() => {
		createEditorTab({
			shellConfig: SHELL_CONFIG_STUB,
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const goToFirstTab = useCallback(() => {
		if (tabs && tabs.length) setActiveKey(tabs[0].id);
	}, [tabs]);

	const createEditorTab = useCallback((args: CreateEditorTabArgs) => {
		const { shellConfig } = args;
		setTabs((tabs) => {
			const id = nanoid();
			const title = "Query - " + id;
			setActiveKey(() => id);
			return [
				...tabs,
				{
					type: "editor",
					title,
					id: "" + id,
					closable: true,
					shellConfig,
				},
			];
		});
	}, []);

	const deleteEditorTab = useCallback(
		(args: DeleteEditorTabArgs) => {
			const { id } = args;
			setTabs((tabs) => {
				const deleteIdx = tabs.findIndex((tab) => tab.id === id);
				tabs.splice(deleteIdx, 1);
				return [...tabs];
			});
			if (id !== activeKey) goToFirstTab();
		},
		[activeKey, goToFirstTab]
	);

	/** Register browser event listeners */
	useEffect(
		() =>
			listenEffect([
				{
					event: "browser:create_tab:editor",
					cb: (e, payload) => createEditorTab(payload),
				},
				{
					event: "browser:delete_tab:editor",
					cb: (e, payload) => deleteEditorTab(payload),
				},
			]),
		[createEditorTab, deleteEditorTab]
	);

	return (
		<div className="Browser">
			<Tabs
				hideAdd
				type="editable-card"
				activeKey={activeKey}
				className={"BrowserTabs"}
				defaultActiveKey="1"
				onEdit={(e, action) => {
					if (typeof e === "string")
						switch (action) {
							case "remove": {
								deleteEditorTab({ id: e });
								return;
							}
						}
				}}
				onChange={(activeKey) => setActiveKey(activeKey)}
			>
				{tabs && tabs.length ? (
					tabs.map((tab) => {
						const Component = TAB_PANES[tab.type];
						return (
							<TabPane
								className={"BrowserTabPane"}
								closable={tab.closable}
								// closeIcon={}
								tab={tab.title}
								key={tab.id}
							>
								{Component && React.createElement(Component as any, tab)}
							</TabPane>
						);
					})
				) : (
					<EmptyState />
				)}
			</Tabs>
		</div>
	);
};