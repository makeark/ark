import "./styles.less";

import { editor } from "monaco-editor";
import React, { FC, useCallback, useState } from "react";
import MONACO_THEME from "../../common/styles/monaco-theme.json";
import { mountMonaco } from "./monaco";
const Monaco = React.lazy(() => import("@monaco-editor/react"));

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
	const { allCollections, code, onCodeChange, onMonacoCommand, settings } = props;

	const [monacoEditor, setMonacoEditor] = useState<editor.IStandaloneCodeEditor>();

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
			<React.Suspense>
				<Monaco
					options={{
						lineNumbers: settings?.lineNumbers ? "on" : "off",
						minimap: {
							enabled: settings?.miniMap ? true : false,
						},
						contextmenu: false,
						lightbulb: {
							enabled: false,
						},
					}}
					theme={"ark"}
					beforeMount={(monaco) => {
						mountMonaco(monaco, { collections: allCollections });
						monaco.editor.defineTheme("ark", MONACO_THEME as editor.IStandaloneThemeData);
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
			</React.Suspense>
		</div>
	);
};
