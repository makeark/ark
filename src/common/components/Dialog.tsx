import React, { ReactNode } from "react";
import { Classes, Dialog as Modal } from "@blueprintjs/core";
import "./Dialog.less";
import { Button } from "./Button";
import { EventOverloadMethod } from "../utils/misc";

import { Dialog as BPDialog } from "@blueprintjs/core";

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
		<div className={Classes.DIALOG_FOOTER}>
			<div className={Classes.DIALOG_FOOTER_ACTIONS}>
				{onCancel && (
					<div className={Classes.DIALOG_CLOSE_BUTTON}>
						<Button text={"Cancel"} onClick={onCancel} />
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
			isOpen={true}
			title={<span className={Classes.DIALOG_HEADER}>{title}</span>}
			onClose={onCancel}
			portalContainer={rootElement}
			usePortal={true}
			className={sizeClass}
		>
			<div className={Classes.DIALOG_BODY}>{children}</div>
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
