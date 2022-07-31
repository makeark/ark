import React, { FC, useContext } from "react";
import { SettingsContext } from "../../../../layout/BaseContextProvider";
import { formatBSONToText, replaceQuotes } from "../../../../../../util/misc";
const Monaco = React.lazy(() => import("@monaco-editor/react"));
import MONACO_THEME from "../../../../../common/styles/monaco-theme.json";

export interface JSONViewerProps {
	text: Ark.BSONArray | string;
}

export const PlainTextViewer: FC<JSONViewerProps> = (props) => {
	const { text } = props;

	const { settings } = useContext(SettingsContext);

	return (
		<div className={"json-viewer"}>
			<React.Suspense>
				<Monaco
					beforeMount={(monaco) => {
						monaco.editor.defineTheme("ark", {
							base: "vs-dark",
							inherit: true,
							rules: [],
							colors: MONACO_THEME,
						});
					}}
					options={{
						readOnly: true,
						scrollBeyondLastLine: false,
						lineNumbers: settings?.lineNumbers === "off" ? "off" : "on",
						minimap: {
							enabled: settings?.miniMap === "on" ? true : false,
						},
					}}
					theme={"ark"}
					height="100%"
					defaultValue={
						typeof text === "string"
							? text
							: replaceQuotes(formatBSONToText(text, settings?.timezone)) + "\n"
					}
					defaultLanguage="javascript"
				/>
			</React.Suspense>
		</div>
	);
};
