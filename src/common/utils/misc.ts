import { dispatch } from "./events";
import { Toaster, Intent, IconName } from "@blueprintjs/core";
import {
	ERR_CODES,
	getErrorMessageForCode,
	isValidErrorCode,
} from "../../../util/errors";

export type PromiseCompleteCallback = (err?: Error, data?: any) => void;

export type OneKey<K extends string, V = any> = {
	[P in K]: Record<P, V> & Partial<Record<Exclude<K, P>, never>> extends infer O
		? { [Q in keyof O]: O[Q] }
		: never;
}[K];

export type EventOverloadMethod =
	| ((...args) => void)
	| {
			promise: (...args) => Promise<any>;
			callback: PromiseCompleteCallback;
	  };

export const asyncEventOverload = (
	loadingFn: (val: boolean) => void,
	fn: EventOverloadMethod,
	...args: any[]
): Promise<void> => {
	if (typeof fn === "function") {
		return Promise.resolve(fn(...args));
	} else if (typeof fn === "object") {
		loadingFn(true);
		return fn
			.promise(...args)
			.then((result) => (loadingFn(false), fn.callback(undefined, result)))
			.catch((err) => {
				loadingFn(false);
				fn.callback(err);
			});
	} else {
		return Promise.reject(
			new Error(ERR_CODES.UTILS$ASYNC_OVERLOAD$INVALID_HANDLER_TYPE)
		);
	}
};

interface ToastProps {
	title?: string;
	description: string;
	onClick?: () => void;
	type: "success" | "error" | "warning" | "info";
}

export const notify = (props: ToastProps): void => {
	const { description, type } = props;

	const intent: Record<string, Intent> = {
		success: Intent.SUCCESS,
		error: Intent.DANGER,
		warning: Intent.WARNING,
		info: Intent.NONE,
	};

	const icon: Record<string, IconName> = {
		success: "tick-circle",
		error: "error",
		warning: "warning-sign",
		info: "info-sign",
	};

	const timeout: Record<string, number> = {
		success: 3000,
		error: 10000,
		warning: 5000,
		info: 5000,
	};

	const toast = Toaster.create({
		className: "toast",
	});

	toast.show({
		message: description,
		intent: intent[type],
		icon: icon[type],
		timeout: timeout[type],
	});
};

export const handleErrors = (
	err: Error | string | unknown,
	connectionId?: string
): void => {
	const error =
		err instanceof Error
			? err.message
			: typeof err === "string"
			? err
			: undefined;

	switch (error) {
		case ERR_CODES.CORE$DRIVER$NO_CACHED_CONNECTION:
		case ERR_CODES.CORE$DRIVER$NO_STORED_CONNECTION:
		case ERR_CODES.CORE$DRIVER$SSH_TUNNEL_CLOSED: {
			console.log(error);
			if (connectionId) {
				dispatch("connection_manager:disconnect", { connectionId });
			}
			break;
		}
		default: {
			console.log(error);
		}
	}

	if (error) {
		notify({
			description: isValidErrorCode(error)
				? getErrorMessageForCode(error)
				: error,
			type: "error",
		});
	}
};
