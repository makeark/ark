import React, { ReactNode } from "react";
import { Classes, Dialog as Modal } from "@blueprintjs/core";
import "./Dialog.less";
import { Button } from "./Button";
import { EventOverloadMethod } from "../utils/misc";

interface ModalProps {
	size: "small" | "large";
	variant?: "regular" | "danger";
	title?: string | JSX.Element;
	confirmButtonText?: string;
	onConfirm?: EventOverloadMethod;
	onCancel?: () => void;
	children?: ReactNode;
	noFooter?: boolean;
}

function DialogFooter(
	footerOptions: Pick<
		ModalProps,
		"onCancel" | "onConfirm" | "variant" | "confirmButtonText"
	>
) {
	const { onCancel, onConfirm, confirmButtonText, variant } = footerOptions;

	return (
		<div className={[Classes.DIALOG_FOOTER, "footer"].join(" ")}>
			<div className={Classes.DIALOG_FOOTER_ACTIONS}>
				{onCancel && (
					<div className={Classes.DIALOG_CLOSE_BUTTON}>
						<Button variant="link" text={"Cancel"} onClick={onCancel} />
					</div>
				)}
				{onConfirm && (
					<div>
						<Button
							variant={variant === "danger" ? "danger" : "primary"}
							text={confirmButtonText || "Confirm"}
							onClick={onConfirm}
						/>
					</div>
				)}
			</div>
		</div>
	);
}

export function Dialog({
	size,
	title,
	variant,
	confirmButtonText,
	onConfirm,
	children,
	onCancel,
	noFooter = false,
}: ModalProps): JSX.Element {
	const rootElement = document.getElementById("root");

	const sizeClass = size === "small" ? "small" : "large";

	return rootElement ? (
		<Modal
			isOpen
			usePortal
			title={
				<span className={["title", Classes.DIALOG_HEADER].join(" ")}>
					{title}
				</span>
			}
			onClose={onCancel}
			portalContainer={rootElement}
			className={["modal", sizeClass].join(" ")}
		>
			<div className={[Classes.DIALOG_BODY, "content"].join(" ")}>
				{children}
			</div>
			{!noFooter && (
				<DialogFooter
					variant={variant}
					onCancel={onCancel}
					onConfirm={onConfirm}
					confirmButtonText={confirmButtonText}
				/>
			)}
		</Modal>
	) : (
		<></>
	);
}
