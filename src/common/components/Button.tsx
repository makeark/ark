import "./Button.less";

import React, { FC, useState, useMemo } from "react";
import { Button as AntButton } from "antd";
import { PromiseCompleteCallback, asyncEventOverload } from "../util";
import { Popover } from "./Popover";

interface PopoverOptions {
	content?: React.ReactNode;
	title: string;
}

interface ButtonProps {
	variant?: "primary" | "secondary" | "danger" | "success";
	shape?: "round" | "circle";
	text?: string;
	icon?: React.ReactNode;
	size?: "large" | "middle" | "small";
	popoverOptions?: {
		hover?: PopoverOptions;
		click?: PopoverOptions;
	};
	onClick?:
		| (() => void)
		| {
				promise: () => Promise<void>;
				callback: PromiseCompleteCallback;
		  };
}

export const Button: FC<ButtonProps> = (props) => {
	const { icon, text, onClick, popoverOptions, size, variant, shape } = props;

	const [loading, setLoading] = useState(false);

	const baseButton = useMemo(
		() => (
			<AntButton
				className={variant ? "button-" + variant : "button-primary"}
				shape={shape}
				disabled={loading}
				onClick={() => {
					if (!popoverOptions || (popoverOptions && !popoverOptions.click))
						onClick && asyncEventOverload(setLoading, onClick);
				}}
				loading={icon ? loading : undefined}
				icon={
					icon ? (
						<span className={"button-icon-wrapper"}>{icon}</span>
					) : undefined
				}
				size={size || "large"}
			>
				{text && <span>{text}</span>}
			</AntButton>
		),
		[icon, loading, onClick, popoverOptions, shape, size, text, variant]
	);

	const buttonWithPopovers = useMemo(
		() =>
			popoverOptions
				? Object.keys(popoverOptions).reduce((children, trigger) => {
						const options = popoverOptions[trigger];
						return options ? (
							<Popover
								trigger={trigger as "click" | "hover"}
								content={options.content}
								title={options.title}
							>
								{React.Children.toArray(children)}
							</Popover>
						) : (
							React.cloneElement(children)
						);
				  }, baseButton)
				: baseButton,
		[baseButton, popoverOptions]
	);

	return buttonWithPopovers;
};