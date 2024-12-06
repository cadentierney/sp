"use client";

import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Grid,
  MenuItem,
  Select,
  Typography,
  TextField,
} from "@mui/material";
import {
  useGridApiRef,
  gridVisibleColumnFieldsSelector,
} from "@mui/x-data-grid";
import { supabaseClient } from "../../utils/supabase/client";
import { useRouter } from "next/navigation";
import { useAuth } from "../../hooks/Auth";
import TableDataGrid, { getActiveRows } from "../../components/TableDataGrid";
import TableSearchMenu from "../../components/TableSearchMenu";

export default function Join() {
  const [errorMessage, setErrorMessage] = useState();
  const [portfolios, setPortfolios] = useState();

  const [curSaveToPortfolio, setCurSaveToPortfolio] = useState();

  const [curTable, setCurTable] = useState();
  const [curColumns, setCurColumns] = useState();
  const [curRows, setCurRows] = useState();

  const [aggOperator, setAggOperator] = useState("count");
  const [aggColumn, setAggColumn] = useState("");
  const [groupedRows, setGroupedRows] = useState([]);
  const [groupedColumns, setGroupedColumns] = useState([]);

  const [saveToTableName, setSaveToTableName] = useState("");

  const { user, session } = useAuth();
  const router = useRouter();

  useEffect(() => {
    async function getUserData() {
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: portfoliosData, error: portfoliosError } = await supabaseClient
        .from("portfolios")
        .select()
        .eq("user", user.id);

      if (portfoliosError) {
        setErrorMessage(portfoliosError);
        return;
      }

      let userPortfolios = portfoliosData.map((portfolio) => ({
        id: portfolio.id,
        name: portfolio.name,
      }));

      setPortfolios(userPortfolios);
    }

    getUserData();
  }, []);

  const apiRefCur = useGridApiRef();
  const apiRefGrouped = useGridApiRef();

  const handleSaveToPortfolioChange = (event) => {
    setCurSaveToPortfolio(event.target.value);
  }

  const handleAggOperatorChange = (event) => {
    setAggOperator(event.target.value);
  }

  // Using aggColumn, aggOperator, and curRows, create groupedRows and groupedColumns
  // Supported operators are count, sum, min, max, avg
  const handleGroup = () => {
    const activeColumns = gridVisibleColumnFieldsSelector(apiRefCur);
    const activeRows = getActiveRows(apiRefCur, activeColumns);

    const groupByColumns = activeColumns.filter(col => col !== aggColumn);
    const groupedData = {};

    activeRows.forEach(row => {
      const groupKey = groupByColumns.map(col => row[col]).join('|');
      if (!groupedData[groupKey]) {
        groupedData[groupKey] = { ...row, [aggColumn]: [] };
      }
      groupedData[groupKey][aggColumn].push(row[aggColumn]);
    });

    const newAggColumnName = `${aggColumn}_${aggOperator}`;

    const groupedRowsArray = Object.entries(groupedData).map(([key, value], index) => {
      const aggregatedValue = (() => {
        const values = value[aggColumn];
        switch (aggOperator) {
          case 'count':
            return values.length;
          case 'sum':
            return values.reduce((acc, val) => acc + val, 0);
          case 'min':
            return Math.min(...values);
          case 'max':
            return Math.max(...values);
          case 'avg':
            return (values.reduce((acc, val) => acc + val, 0) / values.length).toFixed(2);
          default:
            return values.length;
        }
      })();
      return { ...value, [newAggColumnName]: aggregatedValue, id: `grouped_${index}` };
    });

    const groupedColumns = [
      { field: newAggColumnName, headerName: newAggColumnName, width: 150, headerAlign: 'center', align: 'center' },
      ...groupByColumns.map(col => ({
        field: col,
        headerName: col,
        width: 150,
        headerAlign: 'center',
        align: 'center',
      }))
    ];

    setGroupedRows(groupedRowsArray);
    setGroupedColumns(groupedColumns);
  };

  const handleAggColumnChange = (event) => {
    const selectedColumn = event.target.value;
    setAggColumn(selectedColumn);
  };
  
  const handleCreateTable = async () => {
    // Require portfolio and table name
    if (!curSaveToPortfolio || !saveToTableName) {
      return;
    }

    const activeColumns = gridVisibleColumnFieldsSelector(apiRefGrouped);
    const activeRows = getActiveRows(apiRefGrouped, activeColumns);

    // Remove id
    const rowData = activeRows.map(row => {
      const { id, ...rest } = row; // Destructure to remove 'id'
      // Rename the row attributes if the column headers have been renamed
      const renamedRow = {};
      Object.entries(rest).forEach(([key, value]) => {
        const newColumn = groupedColumns.find(col => col.field === key);
        renamedRow[newColumn.headerName] = value;
      });
      return renamedRow;
    });

    const tableData = {
      'tableName': saveToTableName,
      'portfolio': curSaveToPortfolio,
      'columns': activeColumns,
      'rows': rowData
    };

    await fetch(`/api/table`, { method: "put", body: JSON.stringify(tableData), headers: {
      "Authorization": "Bearer " + session.access_token
    }}).catch((err) => {
      console.error(err);
      setErrorMessage(err.error);
      return;
    });

    router.push('/portfolios');
  };

  return (
    <Box display="flex" gap="20px" flexDirection="column" justifyContent="center" alignItems="center" style={{ paddingLeft: "100px", paddingRight: "100px", paddingTop: "20px" }}>
      {errorMessage && (
        <Grid item>
          <Alert severity="error">{errorMessage}</Alert>
        </Grid>
      )}

      <TableSearchMenu
        user={user}
        setCurTable={setCurTable}
        setCurColumns={setCurColumns}
        setCurRows={setCurRows}
      >
        Select a Table
      </TableSearchMenu>

      <Box style={{ display: "flex", flexDirection: "row", gap: "250px", alignItems: "center" }}>
        <Box style={{ display: "flex", flexDirection: "column", gap: "5px", alignItems: "center" }}>
          <Typography fontSize={25}>{curTable}</Typography>
          {curColumns && (
            <>
              <TableDataGrid apiRef={apiRefCur} tableName={curTable} columns={curColumns} rows={curRows} pageSizeOptions={[10]} rowSelection={false} style={{marginBottom: "15px"}} />
              <Typography>Select Aggregation Column</Typography>
              <Select onChange={handleAggColumnChange} value={aggColumn}>
                {curColumns.map((col) => (
                  <MenuItem key={col.field} value={col.field}>
                    {col.headerName}
                  </MenuItem>
                ))}
              </Select>
            </>
          )}
        </Box>
      </Box>

      <Box style={{ display: "flex", flexDirection: "row", gap: "25px", alignItems: "center" }}>
        <Button
          variant="contained"
          onClick={handleGroup}
          disabled={!aggColumn}
        >
          Group
        </Button>

        <Select onChange={handleAggOperatorChange} value={aggOperator}>
          <MenuItem key="count" value="count">COUNT</MenuItem>
          <MenuItem key="sum" value="sum">SUM</MenuItem>
          <MenuItem key="min" value="min">MIN</MenuItem>
          <MenuItem key="max" value="max">MAX</MenuItem>
          <MenuItem key="avg" value="avg">AVG</MenuItem>
        </Select>
      </Box>

      {groupedRows.length > 0 && (
        <Box mt={3} mb={3} gap={1} style={{ display: "flex", flexDirection: "column", alignItems: "center"}}>
          <Typography variant="h6">Results</Typography>
          <TableDataGrid apiRef={apiRefGrouped} columns={groupedColumns} rows={groupedRows} pageSizeOptions={[10]} rowSelection={false} />
          <Box mt={2} mb={1} style={{ display: "flex", flexDirection: "row", gap: '15px', alignItems: 'center' }}>
            <Typography>Rename Columns</Typography>
            {groupedColumns.map((col, index) => (
              <TextField
                key={col.field}
                label={col.field}
                variant="outlined"
                value={col.headerName}
                onChange={(e) => {
                  const newColumns = [...groupedColumns];
                  newColumns[index].headerName = e.target.value;
                  setGroupedColumns(newColumns);
                }}
              />
            ))}
          </Box>
          <Box mt={2} style={{ display: "flex", flexDirection: "row", gap: '25px', alignItems: 'center' }}>
            <Typography>Select Portfolio</Typography>
            <Select
              onChange={handleSaveToPortfolioChange}
              value={curSaveToPortfolio}
              required
            >
                {portfolios.map(({name, id}) => (<MenuItem value={id}>{name}</MenuItem>))}
            </Select>
            <TextField
              label="Table Name"
              variant="outlined"
              required
              value={saveToTableName}
              onChange={(e) => setSaveToTableName(e.target.value)}
              style={{ marginTop: "10px", marginBottom: "20px" }}
            />
          </Box>
          <Button variant="contained" onClick={handleCreateTable} disabled={!curSaveToPortfolio || !saveToTableName}>
            Save Table
          </Button>
        </Box>
      )}
    </Box>
  );
}
