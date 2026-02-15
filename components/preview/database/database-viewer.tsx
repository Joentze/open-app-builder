"use client";

import { Button } from "@/components/ui/button";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { WebContainer } from "@webcontainer/api";
import { Loader2Icon, Plus, RefreshCcwIcon, Table as TableIcon } from "lucide-react";
import { parse } from "@ansi-tools/parser";
import { useDatabaseStore } from "@/stores/database-store";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface DatabaseViewerProps {
    isReady: boolean;
    wc: WebContainer | null;
    studioUrl: string | null;
}

interface DbColumnRow {
    table_name: string;
    column_name: string;
    data_type: string;
    udt_name: string;
}

interface DbQueryResult<T = unknown> {
    rows: T[];
    fields: Array<{ name: string; dataTypeID: number }>;
    affectedRows: number;
}

const DatabaseViewer = ({ isReady, wc, studioUrl }: DatabaseViewerProps) => {
    const {
        tables,
        setTables,
        selectedTable,
        setSelectedTable,
        getTableData,
        setTableData,
        isLoadingSchema,
        setIsLoadingSchema,
        isLoadingTableData,
        setIsLoadingTableData,
    } = useDatabaseStore();

    const runDatabaseCommand = async <T = unknown,>(command: string) => {
        if (!wc) return;

        const responses: string[] = [];
        const process = await wc.spawn("pnpm", ["db:command", command]);
        const reader = process.output.getReader();
        try {
            while (responses.length < 2) {
                const { done, value } = await reader.read();
                if (done) break;
                const text = value.toString();
                responses.push(text);
            }
        } finally {
            await reader.cancel().catch(() => undefined);
            reader.releaseLock();
        }

        if (responses.length >= 2) {
            process.kill();
        }
        await process.exit;
        const responseText = parse(responses.slice(-1)[0]).filter(({ type }) => type === "TEXT").map(({ raw }) => raw).join("");
        const jsonResponse = JSON.parse(responseText);
        if (jsonResponse.success && jsonResponse.type === "db_command") {
            return JSON.parse(jsonResponse.result) as DbQueryResult<T>;
        } else {
            throw new Error(jsonResponse.error || "Failed to run database command");
        }
    };

    const refreshTables = async () => {
        if (!wc) return;
        setIsLoadingSchema(true);
        try {
            const result = await runDatabaseCommand<DbColumnRow>(
                "SELECT table_name, column_name, data_type, udt_name FROM information_schema.columns WHERE table_schema = 'public' ORDER BY table_name, ordinal_position"
            );

            if (result) {
                // Group columns by table
                const tableMap = new Map<string, { name: string; dataType: string; udtName: string }[]>();
                result.rows.forEach((row) => {
                    if (!tableMap.has(row.table_name)) {
                        tableMap.set(row.table_name, []);
                    }
                    tableMap.get(row.table_name)!.push({
                        name: row.column_name,
                        dataType: row.data_type,
                        udtName: row.udt_name,
                    });
                });

                // Convert to array of DbTable
                const parsedTables = Array.from(tableMap.entries()).map(
                    ([tableName, columns]) => ({
                        name: tableName,
                        columns,
                    })
                );

                setTables(parsedTables);
            }
        } catch (error) {
            console.error("Failed to refresh tables:", error);
        } finally {
            setIsLoadingSchema(false);
        }
    };

    const loadTableData = async (tableName: string, forceRefresh = false) => {
        if (!wc) return;

        // Check cache first (unless forcing refresh)
        if (!forceRefresh) {
            const cached = getTableData(tableName);
            if (cached) {
                setSelectedTable(tableName);
                return;
            }
        }

        setIsLoadingTableData(true);
        try {
            const result = await runDatabaseCommand(`SELECT * FROM "${tableName}"`);

            if (result) {
                const tableSchema = tables.find(t => t.name === tableName);
                setTableData(tableName, {
                    tableName,
                    rows: result.rows as Array<{ [key: string]: unknown }>,
                    columns: tableSchema?.columns || [],
                });
                setSelectedTable(tableName);
            }
        } catch (error) {
            console.error(`Failed to load data for table ${tableName}:`, error);
        } finally {
            setIsLoadingTableData(false);
        }
    };

    const refreshCurrentTable = async () => {
        if (!selectedTable) return;
        await loadTableData(selectedTable, true);
    };

    const selectedTableData = selectedTable ? getTableData(selectedTable) : null;

    if (!isReady) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <Loader2Icon className="size-4 animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex flex-row overflow-auto h-full">
            <ResizablePanelGroup orientation="horizontal">
                <ResizablePanel defaultSize={20} className="flex flex-col">
                    <div className="flex flex-row gap-2 p-2 border-b border-border">
                        <p className="text-sm font-medium my-auto text-muted-foreground font-mono flex gap-1">
                            <span className="inline-block mr-1 my-auto"><TableIcon className="size-4" /></span>
                            TABLES</p>
                        <Button
                            size={"icon-sm"}
                            className="my-auto ml-auto"
                            variant={"ghost"}
                            onClick={refreshTables}
                            disabled={!wc || isLoadingSchema}
                        >
                            {isLoadingSchema ? (
                                <Loader2Icon className="text-muted-foreground animate-spin" />
                            ) : (
                                <RefreshCcwIcon className="text-muted-foreground" />
                            )}
                        </Button>
                    </div>
                    <div className="flex-1 overflow-auto p-2">
                        {tables.length === 0 ? (
                            <div className="text-xs text-muted-foreground">
                                {isLoadingSchema ? "Loading tables..." : "No tables found. Click refresh."}
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {tables.map((table) => (
                                    <div
                                        key={table.name}
                                        className={`text-sm font-medium font-mono px-2 py-1 rounded hover:bg-accent cursor-pointer ${selectedTable === table.name ? "bg-accent" : ""
                                            }`}
                                        onClick={() => loadTableData(table.name)}
                                    >
                                        {table.name}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </ResizablePanel>
                <ResizableHandle />
                <ResizablePanel defaultSize={80} className="flex flex-col">
                    <div className="w-full p-2 border-b border-border flex items-center gap-2">
                        {selectedTableData && (
                            <div className="text-sm font-medium">
                                {selectedTableData.tableName} ({selectedTableData.rows.length} rows)
                            </div>
                        )}
                        <Button
                            size={"icon-sm"}
                            variant={"ghost"}
                            className="ml-auto"
                            onClick={refreshCurrentTable}
                            disabled={!selectedTable || isLoadingTableData}
                        >
                            {isLoadingTableData ? (
                                <Loader2Icon className="size-4 animate-spin" />
                            ) : (
                                <RefreshCcwIcon className="size-4" />
                            )}
                        </Button>
                        <Button size={"sm"} variant={"outline"} disabled={!selectedTable}>
                            <Plus />Add Row
                        </Button>
                    </div>
                    <div className="flex-1 overflow-auto">
                        {isLoadingTableData ? (
                            <div className="flex items-center justify-center h-full">
                                <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : selectedTableData ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        {selectedTableData.columns.map((col) => (
                                            <TableHead key={col.name} className="bg-muted">
                                                {col.name}
                                                <span className="text-[10px] font-mono text-muted-foreground ml-1">
                                                    ({col.udtName})
                                                </span>
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {selectedTableData.rows.length === 0 ? (
                                        <TableRow>
                                            <TableCell
                                                colSpan={selectedTableData.columns.length}
                                                className="text-center text-muted-foreground"
                                            >
                                                No rows in this table
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        selectedTableData.rows.map((row, idx) => (
                                            <TableRow key={idx}>
                                                {selectedTableData.columns.map((col) => (
                                                    <TableCell key={col.name} className="font-mono text-xs">
                                                        {row[col.name] !== null && row[col.name] !== undefined
                                                            ? String(row[col.name])
                                                            : <span className="text-muted-foreground italic">null</span>
                                                        }
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                                Select a table to view its data
                            </div>
                        )}
                    </div>
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    );
};

export default DatabaseViewer;
