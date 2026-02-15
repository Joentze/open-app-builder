import { create } from "zustand";

export interface DbColumn {
    name: string;
    dataType: string;
    udtName: string;
}

export interface DbTable {
    name: string;
    columns: DbColumn[];
}

export interface TableRow {
    [key: string]: unknown;
}

export interface TableData {
    tableName: string;
    rows: TableRow[];
    columns: DbColumn[];
}

interface DatabaseState {
    // Schema storage
    tables: DbTable[];
    setTables: (tables: DbTable[]) => void;
    
    // Selected table
    selectedTable: string | null;
    setSelectedTable: (tableName: string | null) => void;
    
    // Table data storage
    tableDataCache: Map<string, TableData>;
    setTableData: (tableName: string, data: TableData) => void;
    getTableData: (tableName: string) => TableData | undefined;
    
    // Loading states
    isLoadingSchema: boolean;
    setIsLoadingSchema: (loading: boolean) => void;
    isLoadingTableData: boolean;
    setIsLoadingTableData: (loading: boolean) => void;
}

export const useDatabaseStore = create<DatabaseState>((set, get) => ({
    // Schema storage
    tables: [],
    setTables: (tables) => set({ tables }),
    
    // Selected table
    selectedTable: null,
    setSelectedTable: (tableName) => set({ selectedTable: tableName }),
    
    // Table data storage
    tableDataCache: new Map(),
    setTableData: (tableName, data) => {
        const cache = new Map(get().tableDataCache);
        cache.set(tableName, data);
        set({ tableDataCache: cache });
    },
    getTableData: (tableName) => get().tableDataCache.get(tableName),
    
    // Loading states
    isLoadingSchema: false,
    setIsLoadingSchema: (loading) => set({ isLoadingSchema: loading }),
    isLoadingTableData: false,
    setIsLoadingTableData: (loading) => set({ isLoadingTableData: loading }),
}));
