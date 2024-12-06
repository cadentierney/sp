import { Box, MenuItem } from "@mui/material";
import {
    GridCsvExportMenuItem,
    GridToolbarColumnsButton,
    GridToolbarContainer,
    GridToolbarExportContainer,
    GridToolbarFilterButton,
    useGridApiContext,
    gridFilteredSortedRowEntriesSelector,
    gridVisibleColumnFieldsSelector,
    DataGrid,
    GridFilterInputValue,
    getGridDefaultColumnTypes,
} from "@mui/x-data-grid";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const handleDownloadPDF = (apiRef, tableName) => {
    const doc = new jsPDF();

    const visibleColumnsField = gridVisibleColumnFieldsSelector(apiRef);
    const filteredSortedRowData = getActiveRows(apiRef, visibleColumnsField);
    
    const rowData = filteredSortedRowData.map(row => {    
        const { id, ...rest } = row; // Destructure to remove 'id'
        const vals = Object.values(rest);
        return vals;
    });

    autoTable(doc, {
      head: [visibleColumnsField],
      body: rowData
    });

    doc.save((tableName || "result") + ".pdf");
  };

function GridPDFExportMenuItem(props) {
    const apiRef = useGridApiContext();
    const { hideMenu, tableName } = props;
    return (
        <MenuItem
            onClick={() => {
                handleDownloadPDF(apiRef, tableName);
                hideMenu();
            }}
        >
            Download as PDF
        </MenuItem>
    )
}

const RegexFilterOperator = {
    label: 'regex',
    value: 'regex',
    getApplyFilterFn: (filterItem, column) => {
        if (!filterItem.field || !filterItem.value || !filterItem.operator) {
            return null;
        }

        return (value, row, column, apiRef) => {
            // Treat value like a regex string, then check if the filterItem is matched by the regex
            try {
                const regex = new RegExp(filterItem.value);
                return regex.test(value);
            } catch (e) {
                return false;
            }
        };
    },

    InputComponent: GridFilterInputValue,
};

function TableToolbar({ tableName }) {
    return (
        <GridToolbarContainer>
            <GridToolbarColumnsButton />
            <GridToolbarFilterButton />
            <Box sx={{ flexGrow: 1 }} />
            <GridToolbarExportContainer>
                <GridCsvExportMenuItem options= {{fileName: tableName || "result"}} />
                <GridPDFExportMenuItem tableName={tableName} />
            </GridToolbarExportContainer>
        </GridToolbarContainer>
    )
}

export const getActiveRows = (apiRef, activeColumns) => {
    return gridFilteredSortedRowEntriesSelector(apiRef).map(row => {
        const model = row.model;
        return Object.fromEntries(
            Object.entries(model).filter(([key]) => activeColumns.includes(key))
        );
    });
};

export default function TableDataGrid(props) {
    const {tableName, columns, initialState, ...otherProps} = props;
    const defaultColumnTypes = getGridDefaultColumnTypes();

    return (
        <DataGrid
            slots={{toolbar: () => <TableToolbar tableName={tableName} />}}
            columns={columns.map(col => {
                const filterOperators = col.filterOperators ?? defaultColumnTypes[col.type ?? "string"].filterOperators;
                return {
                    ...col,
                    filterOperators: [...filterOperators, RegexFilterOperator]
                }
            })}
            initialState={{
                ...initialState,
                pagination: { paginationModel: { pageSize: 10 } }
            }}
            {...otherProps}
        />
    )
}