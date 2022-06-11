import AsyncWriter from "@mongosh/async-rewriter2";
import {
	Mongo,
	Database,
	ShellInstanceState,
	ShellApi,
	ReplicaSet,
	Shard,
	AggregationCursor,
	Cursor,
} from "@mongosh/shell-api";
import { bson } from "@mongosh/service-provider-core";
import {
	CliServiceProvider,
	MongoClientOptions,
} from "@mongosh/service-provider-server";
import { EventEmitter } from "stream";
import { exportData, MongoExportOptions } from "../../../modules/exports";

import { _evaluate } from "./_eval";

export interface Evaluator {
	evaluate(
		code: string,
		database: string,
		options: Ark.QueryOptions
	): Promise<Ark.AnyObject>;
	disconnect(): Promise<void>;
	export(
		code: string,
		database: string,
		options: Ark.ExportCsvOptions | Ark.ExportNdjsonOptions
	): Promise<void>;
}

interface CreateEvaluatorOptions {
	uri: string;
	mongoOptions: MongoClientOptions;
}

export async function createEvaluator(
	options: CreateEvaluatorOptions
): Promise<Evaluator> {
	const { uri, mongoOptions } = options;

	const provider = await createServiceProvider(uri, mongoOptions);

	const evaluator: Evaluator = {
		export: (code, database, options) => {
			return evaluate(
				code,
				provider,
				{
					mode: "export",
					params: { database, ...options },
				}
			);
		},
		evaluate: (code, database, options) => {
			return evaluate(
				code,
				provider,
				{
					mode: "query",
					params: { database, ...options }
				}
			);
		},
		disconnect: async () => {
			await provider.close(true);
		},
	};

	return evaluator;
}

async function createServiceProvider(
	uri: string,
	driverOpts: MongoClientOptions = {}
) {
	const provider = await CliServiceProvider.connect(
		uri,
		driverOpts,
		{},
		new EventEmitter()
	);
	return provider;
}

function paginateFindCursor(
	cursor: Cursor,
	page: number,
	limit: number,
	timeout?: number
) {
	const shellTimeout = timeout ? timeout * 1000 : 120000;
	return cursor
		.limit(limit)
		.skip((page - 1) * limit)
		.maxTimeMS(shellTimeout);
}

function paginateAggregationCursor(
	cursor: AggregationCursor,
	page: number,
	limit: number,
	timeout?: number
) {
	const shellTimeout = timeout ? timeout * 1000 : 120000;
	return cursor
		.skip((page - 1) * limit)
		.maxTimeMS(shellTimeout)
		._cursor.limit(limit);
}

interface MongoEvalOptions {
	database: string;
	page?: number;
	timeout?: number;
	limit?: number;
}
interface MongoQueryOptions {
	mode: "query";
	params: MongoEvalOptions;
}

async function evaluate(
	code: string,
	serviceProvider: CliServiceProvider,
	options: MongoQueryOptions | MongoExportOptions<MongoEvalOptions>
) {
	const { database, page, timeout, limit } = options.params;

	const internalState = new ShellInstanceState(serviceProvider);

	const mongo = new Mongo(
		internalState,
		undefined,
		undefined,
		undefined,
		serviceProvider
	);

	const db = new Database(mongo, database);

	const rs = new ReplicaSet(db);

	const sh = new Shard(db);

	const shellApi = new ShellApi(internalState);

	const transpiledCodeString = new AsyncWriter().process(code);

	let result = await _evaluate(
		transpiledCodeString,
		db,
		rs,
		sh,
		shellApi,
		bson
	);

	if (options.mode === "export") {
		return await exportData(result, options);
	} else {
		if (result instanceof AggregationCursor) {
			result = await paginateAggregationCursor(
				result,
				page || 1,
				limit || 50,
				timeout
			).toArray();
		} else if (result instanceof Cursor) {
			result = await paginateFindCursor(
				result,
				page || 1,
				limit || 50,
				timeout
			).toArray();
		} else if (typeof result === "object" && "toArray" in result) {
			result = result.toArray();
		}
	}

	return result;
}