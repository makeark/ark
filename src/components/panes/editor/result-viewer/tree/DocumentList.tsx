import { Collapse, Icon, IconSize } from "@blueprintjs/core";
import React, { FC, PropsWithChildren, useState } from "react";
import { Button } from "../../../../../common/components/Button";
import {
	ContextMenu,
	CreateMenuItem,
} from "../../../../../common/components/ContextMenu";

export enum ContentRowActions {
	copy_json = "copy_json",
	copy_key = "copy_key",
	copy_value = "copy_value",
	edit_document = "edit_document",
	discard_edit = "discard_edit",
	delete_document = "delete_document",
}

export interface ContentRowProps {
	onContextMenuAction?: (action: ContentRowActions) => void;
	enableInlineEdits: boolean;
	allowModifyActions: boolean;
}

export const DocumentField: FC<PropsWithChildren<ContentRowProps>> = (
	props
) => {
	const {
		children,
		onContextMenuAction = () => {},
		enableInlineEdits,
		allowModifyActions,
	} = props;

	const items: CreateMenuItem[] = [
		{
			item: "Copy",
			key: "copy",
			icon: "comparison",
			submenu: [
				{
					key: ContentRowActions.copy_key,
					item: "Key",
					cb: () => onContextMenuAction(ContentRowActions.copy_key),
				},
				{
					key: ContentRowActions.copy_value,
					item: "Value",
					cb: () => onContextMenuAction(ContentRowActions.copy_value),
				},
			],
		},
	];

	if (allowModifyActions) {
		items.push(
			{
				divider: true,
				key: "div_1",
			},
			{
				item: "Delete Document",
				key: ContentRowActions.delete_document,
				cb: () => onContextMenuAction(ContentRowActions.delete_document),
				icon: "trash",
				intent: "danger",
			}
		);

		items.splice(
			1,
			0,
			enableInlineEdits
				? {
						item: "Discard Edits",
						cb: () => onContextMenuAction(ContentRowActions.discard_edit),

						icon: "cross",
						key: ContentRowActions.discard_edit,
				  }
				: {
						item: "Inline Edit Document",
						cb: () => onContextMenuAction(ContentRowActions.edit_document),

						icon: "edit",
						key: ContentRowActions.edit_document,
				  }
		);
	}

	return (
		<ContextMenu items={items}>
			<div className={"content-row"}>{children}</div>
		</ContextMenu>
	);
};

interface DocumentConfigHeader {
	menu?: CreateMenuItem[];
	primary?: boolean;
	title: React.ReactNode | string;
	key: string | number;
	rightElement?: React.ReactNode;
}

export interface DocumentConfig {
	jsx: React.ReactNode;
	header: DocumentConfigHeader;
}

export interface DocumentTreeProps {
	allowAddDocument?: boolean;
	tabIndex?: number;
	content: DocumentConfig[];
}

export const DocumentList: FC<DocumentTreeProps> = (props) => {
	const { tabIndex, content, allowAddDocument = false } = props;
	const [openKeys, setOpenKeys] = useState<Set<number>>(new Set());

	const toggleKey = (key: number) =>
		setOpenKeys(
			(keys) => (
				keys.has(key) ? keys.delete(key) : keys.add(key), new Set(keys)
			)
		);

	const createDocument = (
		jsx: React.ReactNode,
		header: DocumentConfigHeader,
		key: number
	) => (
		<ContextMenu items={header.menu || []}>
			<div
				className={"item" + (header.primary ? " primary" : "")}
				onClick={() => {
					toggleKey(key);
				}}
			>
				<div className="handle">
					<Icon
						size={IconSize.STANDARD}
						icon={
							("chevron-" + (openKeys.has(key) ? "down" : "right")) as
								| "chevron-right"
								| "chevron-down"
						}
					/>
				</div>
				<span className="heading">{header.title}</span>
				{header.rightElement && (
					<div className="top-right-element">{header.rightElement}</div>
				)}
			</div>
			<Collapse isOpen={openKeys.has(key)}>
				<div
					className="panel"
					onFocus={() => {
						if (!openKeys.has(key)) toggleKey(key);
					}}
				>
					{jsx}
				</div>
			</Collapse>
		</ContextMenu>
	);

	return (
		<div tabIndex={tabIndex} className="document-tree">
			{content.map(({ jsx, header }, key) => {
				return createDocument(jsx, header, key);
			})}
			{allowAddDocument && (
				<div className="content-row">
					<Button
						fill
						outlined
						onClick={() => {}}
						size={"small"}
						icon="small-plus"
						variant={"link"}
						text={"Add a document"}
					/>
				</div>
			)}
		</div>
	);
};
