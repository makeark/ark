import "./styles.less";

import React, { FC, useCallback, useEffect, useMemo, useState } from "react";
import Monaco from "@monaco-editor/react";
import { mountMonaco } from "./monaco";
import { editor, KeyCode, KeyMod } from "monaco-editor";
// import { useHotkeys } from "react-hotkeys-hook";

export enum MONACO_COMMANDS {
	CLONE_SHELL,
	EXEC_CODE,
}

export interface ShellProps {
	allCollections: string[];
	code: string;
	settings: Ark.Settings | undefined;
	onCodeChange: (code: string) => void;
	onMonacoCommand?: (command: MONACO_COMMANDS) => void;
}
export const Shell: FC<ShellProps> = (props) => {
	const { allCollections, code, onCodeChange, onMonacoCommand, settings } =
		props;

	const [monacoEditor, setMonacoEditor] =
		useState<editor.IStandaloneCodeEditor>();

	const exec = useCallback(() => {
		onMonacoCommand && onMonacoCommand(MONACO_COMMANDS.EXEC_CODE);
	}, [onMonacoCommand]);

	// @todo: When multiple editors are opened, the most recently opened
	// one only triggers the command callback. Track this issue - https://github.com/microsoft/monaco-editor/issues/2947
	// Reducing to version 0.31.0 also does not work, not sure why.
	// useEffect(() => {
	// 	monacoEditor?.addCommand(KeyMod.CtrlCmd | KeyCode.Enter, () => exec());
	// }, [monacoEditor]);

	return (
		<div className={"shell"}>
			<Monaco
				options={{
					lineNumbers: settings?.lineNumbers === "off" ? "off" : "on",
					minimap: {
						enabled: settings?.miniMap === "on" ? true : false,
					},
				}}
				theme={"ark"}
				beforeMount={(monaco) => {
					mountMonaco(monaco, { collections: allCollections });
					monaco.editor.defineTheme("ark", {
						base: "vs-dark",
						inherit: true,
						rules: [],
						colors: {
							"editor.background": "#111731",
							foreground: "#e2e6f8",
						},
					});
				}}
				onMount={(editor) => {
					setMonacoEditor(editor);
				}}
				onChange={(value, ev) => {
					value && onCodeChange(value);
				}}
				height="100%"
				defaultValue={code}
				defaultLanguage="typescript"
			/>
		</div>
	);
};
