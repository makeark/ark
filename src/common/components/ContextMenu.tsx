import "./ContextMenu.less";

import React, { FC, PropsWithChildren } from "react";
import {
	IconName,
	MenuDivider,
	MenuItem,
	Menu,
	Intent,
} from "@blueprintjs/core";
import { ContextMenu2 } from "@blueprintjs/popover2";

export interface CreateMenuItem {
	item?: string | React.ReactNode;
	key?: string;
	cb?: (key?: string) => void;
	icon?: IconName;
	intent?: Intent;
	divider?: boolean;
	disabled?: boolean;
	submenu?: CreateMenuItem[];
}
export const createContextMenuItems = (items: CreateMenuItem[]) => (
	<Menu>
		{items.map((menuItem, idx) =>
			menuItem.divider ? (
				<MenuDivider key={menuItem.key + "_idx_" + idx} />
			) : menuItem.submenu ? (
				<MenuItem
					{...menuItem}
					key={menuItem.key + "_idx_" + idx}
					text={menuItem.item}
					onClick={() => menuItem.cb && menuItem.cb(menuItem.key)}
				>
					{createContextMenuItems(menuItem.submenu)}
				</MenuItem>
			) : (
				<MenuItem
					{...menuItem}
					key={menuItem.key + "_idx_" + idx}
					text={menuItem.item}
					onClick={() => menuItem.cb && menuItem.cb(menuItem.key)}
				/>
			)
		)}
	</Menu>
);

export const ContextMenu: FC<PropsWithChildren<{ items: CreateMenuItem[] }>> = (
	props
) => {
	const { items, children } = props;
	return (
		<ContextMenu2
			popoverProps={{
				popoverClassName: "context-menu",
			}}
			content={createContextMenuItems(items)}
		>
			{children}
		</ContextMenu2>
	);
};
