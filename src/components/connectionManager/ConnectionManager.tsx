import "./connectionManager.less";
import React, { useCallback, useEffect, useState } from "react";
import { Button, Card } from "antd";
import {
	VscDatabase,
	VscEdit,
	VscRepoClone,
	VscTrash,
	VscAdd,
} from "react-icons/vsc";
import { dispatch } from "../../util/events";

export interface ConnectionDetails {
	connections: Array<{
		id: string;
		name: string;
		members: Array<string>;
		database: string;
		username: string;
		password: string;
		options: {
			authSource?: string;
			retryWrites?: "true" | "false";
			tls?: boolean;
			tlsCertificateFile?: string;
			w?: string;
		};
	}>;
}

export interface ConnectionManagerProps {
	connectionIds: Array<string>;
	setConnectionIds: React.Dispatch<React.SetStateAction<Array<string>>>;
}

export function ConnectionManager(): JSX.Element {
	const [connections, setConnections] = useState<
		ConnectionDetails["connections"]
	>([]);

	const connect = useCallback((id: string) => {
		window.ark.connection.create(id);
		dispatch("explorer:add_connections", id);
	}, []);

	useEffect(() => {
		window.ark.connection.getAllConnections().then((connectionDetails) => {
			setConnections(Object.values(connectionDetails));
		});

		return () => setConnections([]);
	}, []);

	const CardTitle = (title: string, id: string) => (
		<div className={"CardTitle"}>
			<div style={{ display: "flex", flexGrow: 1, gap: "10px" }}>
				<VscDatabase size="20" />
				<div className={"NameContainer"}>{title}</div>
			</div>
			<div>
				<Button
					type="ghost"
					shape="round"
					icon={<VscAdd />}
					size="large"
					onClick={() => connect(id)}
				>
					Connect
				</Button>
			</div>
		</div>
	);

	return (
		<div className="Manager">
			{connections && (
				<div className="ConnectionsContainer">
					{connections.map((conn) => (
						<Card key={conn.name} title={CardTitle(conn.name, conn.id)}>
							<div style={{ display: "flex", gap: "20px" }}>
								<div style={{ flexGrow: 1 }}>{conn.members[0]}</div>
								<div style={{ flexGrow: 1 }}>
									<span>{conn.username}</span>
									<span> / {conn.database}</span>
								</div>
							</div>
							<div style={{ display: "flex", marginTop: "20px" }}>
								<div>
									<Button
										type="ghost"
										shape="circle"
										icon={<VscEdit />}
										size={"large"}
									/>
								</div>
								<div>
									<Button
										type="ghost"
										shape="circle"
										icon={<VscRepoClone />}
										size={"large"}
									/>
								</div>
								<div>
									<Button
										type="ghost"
										shape="circle"
										icon={<VscTrash />}
										size={"large"}
									/>
								</div>
							</div>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}
