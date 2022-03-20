import { Collapse, Icon } from "@blueprintjs/core";
import { ContextMenu2 } from "@blueprintjs/popover2";
import React, { FC, useState } from "react";

import "./CollapseList.less";

export interface CollapseContent {
	jsx: React.ReactNode;
	header: {
		menu?: JSX.Element;
		primary?: boolean;
		title: string;
		key: string | number;
		rightElement?: React.ReactNode;
	};
}

export interface CollapseListProps {
	tabIndex?: number;
	content: CollapseContent[];
}

export const CollapseList: FC<CollapseListProps> = (props) => {
	const { tabIndex, content } = props;
	const [openKeys, setOpenKeys] = useState<Set<number>>(new Set());

	const toggleKey = (key: number) =>
		setOpenKeys(
			(keys) => (
				keys.has(key) ? keys.delete(key) : keys.add(key), new Set(keys)
			)
		);

	return (
		<div tabIndex={tabIndex} className="collapse-list">
			{content.map(({ jsx, header }, key) => {
				return (
					<ContextMenu2
						key={header.key}
						disabled={!header.menu}
						content={header.menu}
					>
						<div
							className={"item" + (header.primary ? " primary" : "")}
							onClick={() => {
								toggleKey(key);
							}}
						>
							<Icon
								icon={
									("chevron-" + (openKeys.has(key) ? "down" : "right")) as
										| "chevron-right"
										| "chevron-down"
								}
							/>
							<span className="heading">{header.title}</span>
							{header.rightElement && (
								<div className="top-right-element">{header.rightElement}</div>
							)}
						</div>
						<Collapse isOpen={openKeys.has(key)}>
							<div
								onFocus={() => {
									if (!openKeys.has(key)) toggleKey(key);
								}}
							>
								{jsx}
							</div>
						</Collapse>
					</ContextMenu2>
				);
			})}
		</div>
	);
};
