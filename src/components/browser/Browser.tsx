import "./styles.less";

import { nanoid } from "nanoid";
import React, { useCallback, useEffect, useState } from "react";
import { dispatch, listenEffect } from "../../common/utils/events";
import { EmptyState } from "../onboarding/EmptyState";
import { ConnectionFormTab, EditorTab, Tab, Tabs } from "./Tabs";

interface CreateEditorTabArgs {
	shellConfig: Ark.ShellConfig;
	contextDB: string;
	collections: string[];
	storedConnectionId: string;
}

interface DeleteEditorTabArgs {
	id: string;
}

export const Browser = (): JSX.Element => {
	const [tabs, setTabs] = useState<Tab[]>([]);
	const [currentTab, setCurrentTab] = useState<Tab>();
	const [untitledCount, setUntitledCount] = useState(0);

	const changeCurrentTabWithIdx = useCallback(
		(idx: number) => {
			setCurrentTab(() => tabs[idx]);
		},
		[tabs],
	);

	useEffect(() => {
		if (!currentTab && tabs.length) {
			changeCurrentTabWithIdx(0);
		}
	}, [changeCurrentTabWithIdx, currentTab, tabs]);

	const createConnectionFormTab = useCallback(
		(connectionParams?: { connectionDetails: Ark.StoredConnection; mode?: "edit" | "clone" }) => {
			const id = "cf-" + nanoid();
			setTabs((tabs) => {
				const title =
					connectionParams && connectionParams.mode
						? connectionParams.mode === "edit"
							? "Edit connection"
							: "Clone connection"
						: "New connection";

				const tab: ConnectionFormTab = {
					type: "connection_form",
					closable: true,
					connectionParams: connectionParams?.connectionDetails,
					mode: connectionParams?.mode,
					id,
					title,
				};

				setCurrentTab(tab);

				return [...tabs, tab];
			});
		},
		[],
	);

	const createEditorTab = useCallback(
		(args: CreateEditorTabArgs) => {
			const id = "e-" + nanoid();
			setTabs((tabs) => {
				const title = `Untitled-${untitledCount + 1} ${args.shellConfig.name.slice(0, 24)}...`;

				const tab: EditorTab = {
					type: "editor",
					title,
					id: "" + id,
					closable: true,
					...args,
				};

				setCurrentTab(tab);

				return [...tabs, tab];
			});
			setUntitledCount((count) => (count += 1));
		},
		[untitledCount],
	);

	const deleteTab = useCallback(
		(args: DeleteEditorTabArgs) => {
			const { id } = args;
			setTabs((tabs) => {
				const deleteIdx = tabs.findIndex((tab) => tab.id === id);

				if (deleteIdx > -1) {
					const nextIdx = deleteIdx + 1;
					const prevIdx = deleteIdx - 1;
					if (currentTab && id === currentTab.id && nextIdx <= tabs.length - 1)
						// Shift to next if possible
						changeCurrentTabWithIdx(nextIdx);
					else if (currentTab && id === currentTab.id && prevIdx >= 0)
						// else shift back
						changeCurrentTabWithIdx(prevIdx);
					tabs.splice(deleteIdx, 1);
					return [...tabs];
				}
				return tabs;
			});
		},
		[changeCurrentTabWithIdx, currentTab],
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
					cb: (e, payload) => deleteTab(payload),
				},
				{
					event: "browser:create_tab:connection_form",
					cb: (e, payload) => createConnectionFormTab(payload),
				},
				{
					event: "browser:delete_tab:connection_form",
					cb: (e, payload) => deleteTab(payload),
				},
			]),
		[createEditorTab, deleteTab, createConnectionFormTab],
	);

	return (
		<div className="browser">
			{tabs && tabs.length && currentTab ? (
				<Tabs
					selectedTab={currentTab}
					onSelect={(tab) => setCurrentTab(tab)}
					onReorder={(orderedTabs) => {
						if (orderedTabs.length) setTabs(orderedTabs);
					}}
					onRemove={(tab) => {
						if (tab.id.startsWith("e-")) return dispatch("browser:delete_tab:editor", { id: tab.id });
						else if (tab.id.startsWith("cf-"))
							return dispatch("browser:delete_tab:connection_form", {
								id: tab.id,
							});
					}}
					tabs={tabs}
				/>
			) : (
				<EmptyState />
			)}
		</div>
	);
};
