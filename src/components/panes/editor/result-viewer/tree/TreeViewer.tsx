import "../styles.less";
import "../../../../../common/styles/layout.less";

import React, { FC, useState, useEffect } from "react";
import { ObjectId, serialize } from "bson";
import { useCallback } from "react";
import Bluebird from "bluebird";
import {
	DocumentField,
	ContentRowActions,
	DocumentConfig,
	DocumentList,
} from "./DocumentList";
import {
	Icon,
	MenuItem,
	InputGroup,
	NumericInput,
	IconSize,
	Code,
	Collapse,
} from "@blueprintjs/core";
import { Select2 } from "@blueprintjs/select";
import { DateInput } from "@blueprintjs/datetime";
import { Button } from "../../../../../common/components/Button";
import { DangerousActionPrompt } from "../../../../dialogs/DangerousActionPrompt";
import { handleErrors, notify } from "../../../../../common/utils/misc";
import {
	formatBsonDocument,
	formatBSONToText,
	isObjectId,
	replaceQuotes,
} from "../../../../../../util/misc";
import { CreateMenuItem } from "../../../../../common/components/ContextMenu";

interface BSONTest {
	type:
		| "oid"
		| "isodate"
		| "number"
		| "string"
		| "boolean"
		| "primitive[]"
		| "subdocument"
		| "subdocument[]"
		| "null"
		| "unknown";
}

const isBSONType = (value) =>
	value instanceof ObjectId ||
	value instanceof Date ||
	typeof value === "string" ||
	typeof value === "number" ||
	typeof value === "boolean" ||
	value === null;

const testBsonValue = (value: Ark.BSONTypes): BSONTest => ({
	type:
		value instanceof ObjectId
			? "oid"
			: value instanceof Date
			? "isodate"
			: typeof value === "string"
			? "string"
			: typeof value === "number"
			? "number"
			: typeof value === "boolean"
			? "boolean"
			: typeof value === "object" &&
			  Array.isArray(value) &&
			  isBSONType(value[0])
			? "primitive[]"
			: typeof value === "object" &&
			  Array.isArray(value) &&
			  !isBSONType(value[0])
			? "subdocument[]"
			: typeof value === "object" && value !== null
			? "subdocument"
			: value === null
			? "null"
			: "unknown",
});

interface SwitchableInputProps {
	onCommit: (key: string, value: Ark.BSONTypes) => void;
	onReset?: (key: string) => void;
	onAction?: (action: ContentRowActions) => void;
	onKeyRemove?: (key: string) => void;
	initialType: "text" | "date" | "number" | "boolean" | "oid";
	field: string;
	value: string | Date | number | boolean | ObjectId | null;
	editable?: boolean;
	editableKey?: boolean;
	hideReset?: boolean;
}

const SwitchableInput: FC<SwitchableInputProps> = (props) => {
	const {
		onCommit,
		onKeyRemove,
		onReset,
		initialType,
		field,
		value,
		editable,
		editableKey,
		hideReset = false,
	} = props;

	const [type, setType] = useState(initialType);
	const [editedKey, setEditedKey] = useState(field);
	const [editedValue, setEditedValue] = useState(value);
	const [commited, setCommited] = useState(false);
	const [deleted, setDeleted] = useState(false);

	const isModified = value !== editedValue;

	const commitRow = (value?: SwitchableInputProps["value"]) => {
		if (isModified) {
			typeof value !== "undefined" && setEditedValue(value);
			onCommit(editedKey, value || editedValue);
			setDeleted(false);
			setCommited(true);
		}
	};

	const onValueChange = (value: SwitchableInputProps["value"]) => {
		setEditedValue(value);
	};

	const resetKey = () => {
		setCommited(false);
		setDeleted(false);
		setEditedValue(value);
		onReset && onReset(editedKey);
	};

	const deleteKey = (key: string) => {
		setDeleted(true);
		onKeyRemove && onKeyRemove(key);
	};

	const wrap = (input: React.ReactNode) => {
		return (
			<div className="switchable-input">
				{!commited && editable && (
					<Select2<SwitchableInputProps["initialType"]>
						items={["boolean", "date", "number", "oid", "text"]}
						itemRenderer={(item, { handleClick }) => (
							<MenuItem key={item} onClick={handleClick} text={String(item)} />
						)}
						onItemSelect={(item) => {
							setType(item);
						}}
						filterable={false}
						popoverProps={{
							position: "left",
						}}
					>
						<Button icon={"exchange"} size="small" variant="link" />
					</Select2>
				)}
				<div className="switchable-input-child">{input}</div>
				<div className="button-container">
					{isModified && !commited && editable && (
						<div className="button">
							<Button
								onClick={() => {
									commitRow();
								}}
								size={"small"}
								icon="small-tick"
								variant={"link"}
								tooltipOptions={{
									content: "Modify",
									position: "auto-start",
								}}
							/>
						</div>
					)}
					{!hideReset && isModified && !deleted && (
						<div className="button">
							<Button
								onClick={() => resetKey()}
								size={"small"}
								icon={"reset"}
								variant="link"
								tooltipOptions={{
									content: "Reset",
									position: "auto-start",
								}}
							/>
						</div>
					)}
					{editable && (
						<div className="button">
							<Button
								onClick={() => (deleted ? resetKey() : deleteKey(field))}
								size={"small"}
								icon={deleted ? "reset" : "trash"}
								variant="link"
								tooltipOptions={{
									content: deleted ? "Reset" : "Delete",
									position: "auto-start",
								}}
							/>
						</div>
					)}
				</div>
			</div>
		);
	};

	let jsx;

	switch (type) {
		case "text": {
			const input = (editedValue || "") as string;
			jsx =
				!commited && editable ? (
					<InputGroup
						defaultValue={input.toString()}
						onChange={(e) => onValueChange(e.currentTarget.value)}
						onKeyPress={(e) => (e.key === "Enter" ? commitRow() : undefined)}
					/>
				) : (
					String(input)
				);
			break;
		}
		case "oid": {
			const input = (editedValue || new ObjectId()) as string;
			jsx =
				!commited && editable ? (
					<div className="object-id">
						<span>{'ObjectId("'}</span>
						<InputGroup
							defaultValue={input.toString()}
							onChange={(e) =>
								onValueChange(new ObjectId(e.currentTarget.value))
							}
							onKeyPress={(e) => (e.key === "Enter" ? commitRow() : undefined)}
						/>
						<span>{'")'}</span>
					</div>
				) : (
					`ObjectId("` + input.toString() + `")`
				);
			break;
		}
		case "date": {
			const date = (editedValue || new Date()) as Date;
			jsx =
				!commited && editable ? (
					<DateInput
						shortcuts
						parseDate={(str) => new Date(str)}
						formatDate={(date) => date.toISOString()}
						onChange={(date, isUserChange) =>
							isUserChange && onValueChange(date)
						}
						defaultValue={date instanceof Date ? date : new Date()}
						timePrecision="millisecond"
					/>
				) : (
					`ISODate("` + date.toISOString() + `")`
				);
			break;
		}
		case "number": {
			const num = (editedValue || 0) as number;
			jsx =
				!commited && editable ? (
					<NumericInput
						buttonPosition="none"
						onValueChange={(value) => onValueChange(value)}
						onKeyPress={(e) => (e.key === "Enter" ? commitRow() : undefined)}
						defaultValue={typeof num === "number" ? num : 0}
						onPaste={(e) => {
							if (!/^\d+$/.test(e.clipboardData.getData("text"))) {
								e.preventDefault();
							}
						}}
					/>
				) : (
					String(num)
				);
			break;
		}
		case "boolean": {
			const bool = !!editedValue as boolean;
			jsx =
				!commited && editable ? (
					<Select2<boolean>
						items={[true, false]}
						itemRenderer={(item, { handleClick }) => (
							<MenuItem
								key={String(item)}
								onClick={handleClick}
								text={String(item)}
							/>
						)}
						onItemSelect={(item) => {
							onValueChange(item);
						}}
						activeItem={bool}
						filterable={false}
					>
						<Button rightIcon="caret-down" text={String(bool)} />
					</Select2>
				) : (
					String(bool)
				);
			break;
		}
		default: {
			jsx = <></>;
			break;
		}
	}

	const keyInput = (
		<InputGroup
			small
			defaultValue={editedKey}
			onChange={(e) =>
				setEditedKey(
					(e as unknown as React.ChangeEvent<HTMLInputElement>).currentTarget
						.value
				)
			}
			onKeyPress={(e) => (e.key === "Enter" ? commitRow() : undefined)}
		/>
	);

	return (
		<>
			<div className="left">{editableKey ? keyInput : field}</div>
			<div className="modified">
				{isModified && editable && (
					<Icon icon="symbol-circle" size={IconSize.STANDARD} />
				)}
			</div>
			<div className="right">{wrap(jsx)}</div>
		</>
	);
};

interface ContentBuilderOptions {
	document: Ark.BSONDocument | Ark.BSONArray | Ark.BSONTypes[];
	enableInlineEdits: boolean;
	allowModifyActions: boolean;
	onChange(
		changed: "update_value" | "delete_key" | "reset_key",
		key: string,
		value?: Ark.BSONTypes
	): void;
	onRowAction: (
		action: ContentRowActions,
		key: string | number,
		value: Ark.BSONTypes
	) => void;
	renderSubdocRightElement: (key: string) => React.ReactNode;
}

interface ContentBuilder {
	(options: ContentBuilderOptions): React.ReactNode[];
}

const contentBuilder: ContentBuilder = (
	contentBuilderOptions: ContentBuilderOptions
) => {
	const {
		document,
		enableInlineEdits,
		onChange,
		onRowAction,
		allowModifyActions,
		renderSubdocRightElement,
	} = contentBuilderOptions;

	const onValueChange = (key: string, newValue: Ark.BSONTypes) =>
		onChange && onChange("update_value", key, newValue);

	const onKeyRemove = (key: string) => onChange && onChange("delete_key", key);

	const onKeyReset = (key: string) => onChange && onChange("reset_key", key);

	const rows = Object.entries(document).reduce<React.ReactNode[]>(
		(rows, [key, value], rowIdx) => {
			const { type } = testBsonValue(value);

			let inputJSX;

			// console.log("KEY", key, "TYPE", type, "VALUE", value);

			switch (type) {
				case "oid": {
					inputJSX = (
						<SwitchableInput
							key={key + "_idx_" + rowIdx}
							initialType={type}
							field={key}
							value={value as ObjectId}
							editable={enableInlineEdits}
							onAction={(action) => onRowAction(action, key, value)}
							onCommit={onValueChange}
							onKeyRemove={onKeyRemove}
							onReset={onKeyReset}
						/>
					);
					break;
				}
				case "isodate": {
					inputJSX = (
						<SwitchableInput
							key={key + "_idx_" + rowIdx}
							initialType={"date"}
							field={key}
							value={value as Date}
							editable={enableInlineEdits}
							onAction={(action) => onRowAction(action, key, value)}
							onCommit={onValueChange}
							onKeyRemove={onKeyRemove}
							onReset={onKeyReset}
						/>
					);
					break;
				}
				case "number": {
					inputJSX = (
						<SwitchableInput
							key={key + "_idx_" + rowIdx}
							initialType={type}
							field={key}
							value={value as number}
							editable={enableInlineEdits}
							onAction={(action) => onRowAction(action, key, value)}
							onCommit={onValueChange}
							onKeyRemove={onKeyRemove}
							onReset={onKeyReset}
						/>
					);
					break;
				}
				case "boolean": {
					inputJSX = (
						<SwitchableInput
							key={key + "_idx_" + rowIdx}
							initialType={type}
							field={key}
							value={value as boolean}
							editable={enableInlineEdits}
							onAction={(action) => onRowAction(action, key, value)}
							onCommit={onValueChange}
							onKeyRemove={onKeyRemove}
							onReset={onKeyReset}
						/>
					);
					break;
				}
				case "null":
				case "string": {
					inputJSX = (
						<SwitchableInput
							key={key + "_idx_" + rowIdx}
							initialType={"text"}
							field={key}
							value={String(value) as string}
							editable={enableInlineEdits}
							onAction={(action) => onRowAction(action, key, value)}
							onCommit={onValueChange}
							onKeyRemove={onKeyRemove}
							onReset={onKeyReset}
						/>
					);
					break;
				}
				case "primitive[]": {
					const bsonTypes = value as Ark.BSONTypes[];
					inputJSX = (
						<DocumentList
							key={key}
							content={[
								{
									jsx: (
										<div>
											{contentBuilder({
												...contentBuilderOptions,
												document: bsonTypes,
												onChange: (changed, k, value) => {
													onChange(changed, key + "." + k, value);
												},
												onRowAction: (action, k) =>
													onRowAction(action, key + "." + k, bsonTypes),
												renderSubdocRightElement,
											})}
										</div>
									),
									header: {
										key: String(key),
										title: String(key),
										rightElement:
											enableInlineEdits && renderSubdocRightElement(key),
									},
								},
							]}
						/>
					);
					break;
				}
				case "subdocument[]": {
					const subdocumentArray = value as Ark.BSONArray;
					inputJSX = (
						<DocumentList
							key={key}
							content={[
								{
									jsx: (
										<DocumentList
											allowAddDocument={enableInlineEdits}
											content={subdocumentArray.map((document, index) => ({
												jsx: (
													<div>
														{contentBuilder({
															...contentBuilderOptions,
															document: document,
															onChange: (changed, k, value) => {
																onChange(
																	changed,
																	key + "." + index + "." + k,
																	value
																);
															},
															onRowAction: (action, k) =>
																onRowAction(
																	action,
																	key + "." + index + "." + k,
																	subdocumentArray
																),
														})}
													</div>
												),
												header: {
													key: String(index),
													title: "(" + String(index + 1) + ")",
													rightElement:
														enableInlineEdits &&
														renderSubdocRightElement(key + "." + index),
												},
											}))}
										/>
									),
									header: {
										key: String(key),
										title: String(key),
										rightElement:
											enableInlineEdits && renderSubdocRightElement(key),
									},
								},
							]}
						/>
					);
					break;
				}
				case "subdocument": {
					const document = value as Ark.BSONDocument;
					inputJSX = (
						<DocumentList
							key={key + "_idx_" + rowIdx}
							content={[
								{
									jsx: (
										<div>
											{contentBuilder({
												...contentBuilderOptions,
												document,
												onChange: (changed, k, value) => {
													onChange(changed, key + "." + k, value);
												},
												onRowAction: (action, k) =>
													onRowAction(action, key + "." + k, document),
											})}
										</div>
									),
									header: {
										key: String(key),
										title: String(key),
										rightElement:
											enableInlineEdits && renderSubdocRightElement(key),
									},
								},
							]}
						/>
					);
					break;
				}
				case "unknown":
				default:
					inputJSX = (
						<div style={{ display: "flex" }} key={key}>
							<div style={{ width: "50%" }}>{key}</div>
							<div style={{ width: "50%" }}>{}</div>
						</div>
					);
			}

			rows.push(
				<DocumentField
					onContextMenuAction={(action) => onRowAction(action, key, value)}
					key={key}
					enableInlineEdits={!!enableInlineEdits}
					allowModifyActions={allowModifyActions}
				>
					{inputJSX}
				</DocumentField>
			);

			return rows;
		},
		[]
	);

	if (enableInlineEdits) {
		rows.push(
			<NewFieldRows
				key={rows.length}
				onChange={onValueChange}
				onRemove={onKeyReset}
			/>
		);
	}

	return rows;
};

interface NewFieldRowsProps {
	onChange?: (key: string, value: Ark.BSONTypes) => void;
	onRemove?: (key: string) => void;
}
const NewFieldRows: FC<NewFieldRowsProps> = (props) => {
	const { onChange, onRemove } = props;

	const [rows, setRows] = useState<
		{ key: string; value: Ark.BSONTypes; commited?: boolean }[]
	>([]);
	const [addingKeys, setAddingKeys] = useState<boolean>(false);

	useEffect(() => {
		if (rows.length === 0) setAddingKeys(false);
		else if (rows.length > 0 && !addingKeys) setAddingKeys(true);
	}, [addingKeys, rows.length]);

	const setKeyValue = (idx, key, value) => {
		setRows((fields) => {
			if (typeof fields[idx] === "undefined")
				fields[idx] = { key: "", value: "" };
			fields[idx].key = key;
			fields[idx].value = value;
			return [...fields];
		});
	};

	const addField = () => {
		setRows((fields) => {
			fields.push({ key: "", value: "" });
			return [...fields];
		});
	};

	const removeKeyValue = (idx) => {
		onRemove && onRemove(rows[idx].key);
		setRows((fields) => {
			fields.splice(idx, 1);
			return [...fields];
		});
	};

	const commitRow = (idx: number) => {
		onChange && onChange(rows[idx].key, rows[idx].value);
		setRows((fields) => {
			fields[idx].commited = true;
			return [...fields];
		});
	};

	return (
		<>
			{addingKeys && rows.length ? (
				rows.map((field, idx) => (
					<div key={field.key + "." + idx}>
						<div className="content-row">
							<SwitchableInput
								key={idx}
								hideReset
								editable
								onCommit={(key, value) => {
									setKeyValue(idx, key, value);
									commitRow(idx);
								}}
								onKeyRemove={() => {
									removeKeyValue(idx);
								}}
								initialType="text"
								field={field.key}
								value={field.value as string}
								editableKey={!field.commited}
							/>
						</div>
						{rows.length - 1 === idx && (
							<div className="content-row">
								<Button
									fill
									outlined
									onClick={() => {
										addField();
									}}
									size={"small"}
									icon="small-plus"
									text="Add more"
									variant={"link"}
								/>
							</div>
						)}
					</div>
				))
			) : (
				<div className="content-row">
					<Button
						fill
						outlined
						onClick={() => {
							addField();
						}}
						size={"small"}
						icon="small-plus"
						variant={"link"}
						text={"Add new fields"}
					/>
				</div>
			)}
		</>
	);
};

interface DocumentPanelProps {
	document: Ark.BSONDocument | Ark.BSONTypes[];
	allowModifyActions: boolean;
	enableInlineEdits: boolean;
	onDocumentModified: ContentBuilderOptions["onChange"];
	onDocumentEdit: () => void;
	onDocumentDelete: () => void;
	onDocumentChangeDiscard: () => void;
}
const DocumentPanel: FC<DocumentPanelProps> = (props) => {
	const {
		document,
		allowModifyActions,
		enableInlineEdits = false,
		onDocumentModified,
		onDocumentEdit,
		onDocumentDelete,
		onDocumentChangeDiscard,
	} = props;

	const [deleted, setDeleted] = useState<Record<string, boolean>>({});

	const onRowAction = useCallback(
		(action: ContentRowActions, key: string, value: Ark.BSONTypes) => {
			// console.log(`[onRowAction] action=${action} key=${key} value=${value}`);
			switch (action) {
				case ContentRowActions.copy_key: {
					window.ark.copyText(key);
					break;
				}
				case ContentRowActions.copy_value: {
					window.ark.copyText(replaceQuotes(formatBsonDocument(value)));
					break;
				}
				case ContentRowActions.edit_document: {
					onDocumentEdit();
					break;
				}
				case ContentRowActions.discard_edit: {
					onDocumentChangeDiscard();
					break;
				}
				case ContentRowActions.delete_document: {
					onDocumentDelete();
					break;
				}
			}
		},
		[onDocumentEdit, onDocumentChangeDiscard, onDocumentDelete]
	);

	const renderSubdocRightElement = (key: string) => (
		<div className="key-delete">
			<Button
				onClick={(e) => {
					e.stopPropagation();
					if (deleted[key]) {
						setDeleted((deleted) => ({ ...deleted, [key]: false }));
						onDocumentModified("reset_key", key);
					} else {
						setDeleted((deleted) => ({ ...deleted, [key]: true }));
						onDocumentModified("delete_key", key);
					}
				}}
				size={"small"}
				icon={deleted[key] ? "reset" : "trash"}
				variant="link"
				tooltipOptions={{
					content: deleted[key] ? "Revert deletion" : "Delete document",
					position: "auto-start",
				}}
			/>
		</div>
	);

	return (
		<>
			{contentBuilder({
				document,
				enableInlineEdits,
				allowModifyActions,
				onChange: onDocumentModified,
				onRowAction: (action, key, value) =>
					onRowAction(action, String(key), value),
				renderSubdocRightElement,
			})}
		</>
	);
};

interface Update {
	_id: string;
	update: {
		[k in "$set" | "$unset"]: Ark.BSONTypes | undefined;
	};
}

interface JSONViewerProps {
	bson: Ark.BSONArray;
	driverConnectionId: string;
	shellConfig: Ark.ShellConfig;
	onRefresh: () => void;
	allowDocumentEdits: boolean;
}

export const TreeViewer: FC<JSONViewerProps> = (props) => {
	const {
		bson,
		driverConnectionId,
		shellConfig,
		allowDocumentEdits,
		onRefresh,
	} = props;

	const [updates, setUpdates] = useState<Array<Update>>([]);
	const [docsBeingEdited, setDocsBeingUpdated] = useState<
		Set<Ark.BSONDocument>
	>(new Set());
	const [showSaveAllDialog, setShowSaveAllDialog] = useState(false);
	const [showSaveDialog, setShowSaveDialog] = useState(false);
	const [docBeingSaved, setDocBeingSaved] = useState<Ark.BSONDocument>();
	const [docBeingDeleted, setDocBeingDeleted] = useState<Ark.BSONDocument>();
	const [refreshCounts, setRefreshCounts] = useState({});

	const driverArgs = useCallback(
		(args) => ({
			id: driverConnectionId,
			database: shellConfig.database,
			collection: shellConfig.collection,
			...args,
		}),
		[driverConnectionId, shellConfig.collection, shellConfig.database]
	);

	const startEditingDocument = useCallback((document: Ark.BSONDocument) => {
		setDocsBeingUpdated((docs) => {
			if (!docs.has(document)) {
				docs.add(document);
				return new Set(docs);
			}
			return docs;
		});
	}, []);

	const stopEditingDocument = useCallback((document: Ark.BSONDocument) => {
		setDocsBeingUpdated((docs) => {
			if (docs.has(document)) {
				docs.delete(document);
				return new Set(docs);
			}
			return docs;
		});
	}, []);

	const refreshDocument = useCallback((document: Ark.BSONDocument) => {
		setRefreshCounts((counts) => {
			if (document._id) {
				counts[document._id.toString()] =
					(counts[document._id.toString()] || 0) + 1;
				return { ...counts };
			}
			return counts;
		});
	}, []);

	const clearUpdates = () => setUpdates([]);

	const deleteSetAndUnsetIfEmpty = (updates, idx) => {
		const info = updates[idx];
		const update = info.update;
		let noSet = !update.$set;
		let noUnset = !update.$unset;
		if (update.$set && Object.keys(update.$set).length === 0) {
			delete update.$set;
			noSet = true;
		}
		if (update.$unset && Object.keys(update.$unset).length === 0) {
			delete update.$unset;
			noUnset = true;
		}
		if (noSet && noUnset) {
			updates.splice(idx, 1);
		}
	};

	const unsetKey = (id: string, key: string) =>
		setUpdates((updates) => {
			const idx = updates.findIndex((u) => u._id === id);
			if (idx > -1) {
				if (updates[idx].update.$unset) {
					(updates[idx].update.$unset as any)[key] = "";
				} else {
					(updates[idx].update.$unset as any) = { [key]: "" };
				}
				if (updates[idx].update.$set) {
					delete (updates[idx].update.$set as any)[key];
				}
				deleteSetAndUnsetIfEmpty(updates, idx);
			} else {
				updates.push({
					_id: id,
					update: {
						$unset: { [key]: "" },
						$set: undefined,
					},
				});
			}
			return Array.from(updates);
		});

	const setKeyValue = (id: string, key: string, value: Ark.BSONTypes) =>
		setUpdates((updates) => {
			const idx = updates.findIndex((u) => u._id === id);
			if (idx > -1) {
				if (updates[idx].update.$set) {
					(updates[idx].update.$set as any)[key] = value;
				} else {
					(updates[idx].update.$set as any) = { [key]: value };
				}
				if (updates[idx].update.$unset) {
					delete (updates[idx].update.$unset as any)[key];
				}
				deleteSetAndUnsetIfEmpty(updates, idx);
			} else {
				updates.push({
					_id: id,
					update: {
						$set: { [key]: value },
						$unset: undefined,
					},
				});
			}
			return Array.from(updates);
		});

	const resetKey = (id: string, key: string) =>
		setUpdates((updates) => {
			const idx = updates.findIndex((u) => u._id === id);
			if (idx > -1) {
				if (updates[idx].update.$set) {
					delete (updates[idx].update.$set as any)[key];
				}
				if (updates[idx].update.$unset) {
					delete (updates[idx].update.$unset as any)[key];
				}
				deleteSetAndUnsetIfEmpty(updates, idx);
			}
			return Array.from(updates);
		});

	const removeDocumentUpdates = useCallback(
		(id: string) =>
			setUpdates((updates) => {
				const idx = updates.findIndex((u) => u._id === id);
				if (idx > -1) {
					updates.splice(idx, 1);
					return Array.from(updates);
				} else {
					return updates;
				}
			}),
		[]
	);

	const updateAllDocuments = useCallback((): Promise<void> => {
		return Bluebird.map(updates, (update) => {
			return window.ark.driver
				.run(
					"query",
					"updateOne",
					driverArgs({
						query: serialize({
							_id: new ObjectId(update._id),
						}),
						update: serialize(update.update),
					})
				)
				.then(() => update)
				.catch((err) => {
					removeDocumentUpdates(update._id);
					handleErrors(err, driverConnectionId);
				});
		}).then((updates) =>
			updates.forEach((update) => removeDocumentUpdates(update._id))
		);
	}, [driverArgs, driverConnectionId, removeDocumentUpdates, updates]);

	const updateDocument = useCallback(
		(documentId: string) => {
			const current = updates.find((update) => update._id === documentId);

			if (current) {
				return window.ark.driver
					.run(
						"query",
						"updateOne",
						driverArgs({
							query: serialize({
								_id: new ObjectId(current._id),
							}),
							update: serialize(current.update),
						})
					)
					.then((result) => {
						removeDocumentUpdates(documentId);
						onRefresh();
						return result;
					})
					.catch((err) => {
						removeDocumentUpdates(documentId);
						handleErrors(err, driverConnectionId);
						return Promise.reject(err);
					});
			} else {
				console.log("no updates found for", documentId);
				return Promise.resolve();
			}
		},
		[driverArgs, driverConnectionId, onRefresh, removeDocumentUpdates, updates]
	);

	const discardChanges = useCallback(
		(document: Ark.BSONDocument) => {
			if (document._id) {
				refreshDocument(document);
				removeDocumentUpdates(document._id.toString());
				stopEditingDocument(document);
			}
		},
		[refreshDocument, removeDocumentUpdates, stopEditingDocument]
	);

	const documentContextMenu = useCallback(
		(document: any, allowEdits: boolean) => {
			const items: CreateMenuItem[] = [
				{
					item: "Copy JSON",
					cb: () =>
						window.ark.copyText(replaceQuotes(formatBSONToText(document))),
					icon: "comparison",
					key: ContentRowActions.copy_json,
				},
			];

			if (allowEdits) {
				items.push(
					{
						divider: true,
						key: "div_2",
					},
					{
						item: "Delete Document",
						cb: () => setDocBeingDeleted(document),
						icon: "trash",
						intent: "danger",
						key: ContentRowActions.delete_document,
					}
				);

				items.splice(
					1,
					0,
					docsBeingEdited.has(document)
						? {
								item: "Discard Edits",
								cb: () => {
									discardChanges(document);
								},
								icon: "cross",
								key: ContentRowActions.discard_edit,
						  }
						: {
								item: "Inline Edit Document",
								cb: () => {
									startEditingDocument(document);
								},
								icon: "edit",
								key: ContentRowActions.edit_document,
						  }
				);
			}

			return items;
		},
		[discardChanges, docsBeingEdited, startEditingDocument]
	);

	const createDocumentPanelListContent = useCallback(
		(document, index): DocumentConfig => {
			return {
				jsx: (
					<DocumentPanel
						allowModifyActions={allowDocumentEdits}
						enableInlineEdits={docsBeingEdited.has(document)}
						document={document}
						key={(refreshCounts[document._id] || 0) + "" + index}
						onDocumentModified={(change, key, value) => {
							if (change === "update_value" && typeof value !== "undefined") {
								setKeyValue(document._id.toString(), key, value);
							} else if (change === "delete_key") {
								unsetKey(document._id.toString(), key);
							} else if (change === "reset_key") {
								resetKey(document._id.toString(), key);
							}
						}}
						onDocumentEdit={() => startEditingDocument(document)}
						onDocumentDelete={() => setDocBeingDeleted(document)}
						onDocumentChangeDiscard={() => discardChanges(document)}
					/>
				),
				header: {
					menu: documentContextMenu(document, allowDocumentEdits),
					primary: true,
					key: index,
					title: `(${String(index + 1)}) ${
						document && document._id && isObjectId(document._id)
							? `ObjectId("${document._id.toString()}")`
							: document && document._id
							? `${document._id}`
							: ``
					}`,
					rightElement: docsBeingEdited.has(document) ? (
						<div className="document-header-buttons">
							<Button
								size="small"
								text={"Save"}
								variant={"link"}
								onClick={(e) => {
									e.stopPropagation();
									setDocBeingSaved(document);
									setShowSaveDialog(true);
								}}
							/>
							<Button
								size="small"
								text={"Discard"}
								variant={"link"}
								onClick={(e) => {
									e.stopPropagation();
									discardChanges(document);
								}}
							/>
						</div>
					) : (
						<div></div>
					),
				},
			};
		},
		[
			docsBeingEdited,
			refreshCounts,
			allowDocumentEdits,
			documentContextMenu,
			startEditingDocument,
			discardChanges,
		]
	);

	// console.log("UPDATES", updates);
	// console.log("BSON", bson);

	return (
		<div className="tree-viewer">
			<div className="header">
				{docsBeingEdited.size === 0 && (
					<Button
						disabled={!allowDocumentEdits}
						onClick={() => bson.map((doc) => startEditingDocument(doc))}
						size={"small"}
						icon="edit"
						variant={"link"}
						text="Edit All"
					/>
				)}
				{docsBeingEdited.size > 0 && (
					<>
						<Button
							onClick={() => setShowSaveAllDialog(true)}
							size={"small"}
							icon="small-tick"
							variant={"link"}
							text="Save All"
						/>
						<Button
							onClick={() => {
								clearUpdates();
								onRefresh();
							}}
							size={"small"}
							icon="small-cross"
							variant={"link-danger"}
							text="Discard All"
						/>
					</>
				)}
			</div>
			<div className="content">
				{bson && bson.length ? (
					<DocumentList content={bson.map(createDocumentPanelListContent)} />
				) : (
					<span>No results to show.</span>
				)}
			</div>
			{/* Dialogs */}
			<>
				{docBeingDeleted && docBeingDeleted._id && (
					<DangerousActionPrompt
						dangerousAction={() => {
							if (docBeingDeleted._id)
								return window.ark.driver.run(
									"query",
									"deleteOne",
									driverArgs({
										query: serialize({
											_id: new ObjectId(docBeingDeleted._id),
										}),
									})
								);
							return Promise.reject(new Error("Document does not have an _id"));
						}}
						dangerousActionCallback={() => {
							setDocBeingDeleted(undefined);
							onRefresh();
						}}
						onCancel={() => {
							setDocBeingDeleted(undefined);
						}}
						prompt={
							<div className="delete-list">
								<p>{"Are you sure you would like to delete this document?"}</p>
								<p>
									<Code>{`_id => ObjectId("${docBeingDeleted._id.toString()}")`}</Code>
								</p>
								<br />
								<p>
									{`This deletion will be run on the collection - ${shellConfig.collection}. `}
								</p>
							</div>
						}
						title={"Deleting Document"}
					/>
				)}
				{showSaveAllDialog && (
					<DangerousActionPrompt
						size="large"
						dangerousAction={() => updateAllDocuments()}
						dangerousActionCallback={(err) => {
							if (err) {
								notify({
									title: "Update",
									description: err.message,
									type: "error",
								});
							} else {
								notify({
									title: "Update",
									description: "All documents updated",
									type: "success",
								});
							}
							setShowSaveAllDialog(false);
							onRefresh();
						}}
						onCancel={() => {
							setShowSaveAllDialog(false);
						}}
						prompt={
							<UpdatesList
								collection={shellConfig.collection}
								updates={updates}
							/>
						}
						title={"Saving Changes"}
					/>
				)}
				{showSaveDialog && docBeingSaved && docBeingSaved._id && (
					<DangerousActionPrompt
						size="large"
						dangerousAction={() =>
							docBeingSaved._id
								? updateDocument(docBeingSaved._id.toString())
								: Promise.reject(new Error("Document does not have an _id"))
						}
						dangerousActionCallback={(err, result) => {
							if (err || !result.ack) {
								notify({
									title: "Update",
									description: "Document update failed",
									type: "error",
								});
							} else {
								notify({
									title: "Update",
									description: "Document updated succesfully",
									type: "success",
								});
							}
							setShowSaveDialog(false);
							onRefresh();
						}}
						onCancel={() => {
							setShowSaveDialog(false);
						}}
						prompt={
							<UpdatesList
								collection={shellConfig.collection}
								updates={updates.filter(
									(update) => update._id === docBeingSaved._id?.toString()
								)}
							/>
						}
						title={"Review Changes"}
					/>
				)}
			</>
		</div>
	);
};

interface UpdateListProps {
	updates: Update[];
	collection: string;
}

const UpdatesList: FC<UpdateListProps> = (props) => {
	const { updates } = props;

	const [opened, setOpened] = useState<Record<string, boolean>>({});

	const toggle = (key) =>
		setOpened((x) => {
			x[key] = !x[key];
			return { ...x };
		});

	useEffect(() => {
		if (updates.length > 0) {
			const update = updates[0];
			toggle(update._id.toString());
		}
	}, []);

	return (
		<div className="updates-list">
			<p className="help-text">
				Review update documents that will be applied to each document before
				confirming the update.
			</p>
			<br />
			{updates.length
				? updates.map((update) => (
						<>
							<div className="item" key={update._id.toString()}>
								<p>
									<Code>{`_id => ObjectId(${update._id.toString()})`}</Code>
									<a onClick={() => toggle(update._id.toString())}>
										{opened[update._id.toString()]
											? "Hide update"
											: "See update"}
									</a>
								</p>
								<Collapse isOpen={opened[update._id.toString()]}>
									<Code className="multi-line">
										{replaceQuotes(formatBSONToText([update.update as any]))}
									</Code>
								</Collapse>
							</div>
							<br />
						</>
				  ))
				: `No changes were made.`}
		</div>
	);
};
