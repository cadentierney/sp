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
  Menu,
} from "@mui/material";
import {
  useGridApiRef,
  gridVisibleColumnFieldsSelector,
  gridFilteredSortedRowEntriesSelector
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

  const [curTableLeft, setCurTableLeft] = useState();
  const [curTableRight, setCurTableRight] = useState();
  const [columnsLeft, setColumnsLeft] = useState();
  const [columnsRight, setColumnsRight] = useState();
  const [rowsLeft, setRowsLeft] = useState();
  const [rowsRight, setRowsRight] = useState();

  const [joinColumnLeft, setJoinColumnLeft] = useState("");
  const [joinColumnRight, setJoinColumnRight] = useState("");
  const [joinedRows, setJoinedRows] = useState([]);
  const [joinedColumns, setJoinedColumns] = useState([]);

  const [saveToTableName, setSaveToTableName] = useState("");

  const { user, session } = useAuth();
  const router = useRouter();

  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const apiRefLeft = useGridApiRef();
  const apiRefRight = useGridApiRef();
  const apiRefJoined = useGridApiRef();

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

  const handleSaveToPortfolioChange = (event) => {
    setCurSaveToPortfolio(event.target.value);
  }

  const handleJoin = (joinType) => {
    if (!joinColumnLeft || !joinColumnRight) return;

    const activeColumnsLeft = gridVisibleColumnFieldsSelector(apiRefLeft);
    const activeRowsLeft = getActiveRows(apiRefLeft, activeColumnsLeft);
    const activeColumnsObjLeft = columnsLeft.filter(col => activeColumnsLeft.includes(col.field));

    const activeColumnsRight = gridVisibleColumnFieldsSelector(apiRefRight);
    const activeRowsRight = getActiveRows(apiRefRight, activeColumnsRight);
    const activeColumnsObjRight = columnsRight.filter(col => activeColumnsRight.includes(col.field));

    // Create a map of the left table rows using the join column
    const joinMap = new Map();
    activeRowsLeft.forEach((row) => joinMap.set(row[joinColumnLeft], row));

    let result;
    if (joinType === "inner") {
      result = activeRowsRight
        .filter((row) => joinMap.has(row[joinColumnRight])) // Inner join logic
        .map((row, index) => {
          const leftRow = joinMap.get(row[joinColumnRight]);

          const mergedRow = {
            [joinColumnLeft]: leftRow[joinColumnLeft],
            ...Object.fromEntries(
              Object.entries(leftRow)
                .filter(([key]) => key !== joinColumnLeft && !key.endsWith(".id") && key != "id")
                .map(([key, value]) => [`${key}`, value])
            ),
            ...Object.fromEntries(
              Object.entries(row)
                .filter(([key]) => key !== joinColumnRight && !key.endsWith(".id") && key != "id")
                .map(([key, value]) => [`${key}`, value])
            ),
            id: `joined_${leftRow.id}_${row.id}_${index}`,
          };

          return mergedRow;
        });
    } else if (joinType === "left") {
      result = activeRowsLeft.map((leftRow, index) => {
        const rightRow = activeRowsRight.find((row) => row[joinColumnRight] === leftRow[joinColumnLeft]) || {};

        const mergedRow = {
          [joinColumnLeft]: leftRow[joinColumnLeft],
          ...Object.fromEntries(
            Object.entries(leftRow)
              .filter(([key]) => key !== joinColumnLeft && !key.endsWith(".id") && key != "id")
              .map(([key, value]) => [`${key}`, value])
          ),
          ...Object.fromEntries(
            activeColumnsObjRight
              .filter((col) => col.field !== joinColumnRight)
              .map((col) => [col.field, rightRow[col.field] || null])
          ),
          id: `joined_${leftRow.id}_${rightRow.id || 'null'}_${index}`,
        };

        return mergedRow;
      });
    } else if (joinType === "right") {
      result = activeRowsRight.map((rightRow, index) => {
        const leftRow = activeRowsLeft.find((row) => row[joinColumnLeft] === rightRow[joinColumnRight]) || {};

        const mergedRow = {
          [joinColumnRight]: rightRow[joinColumnRight],
          ...Object.fromEntries(
            activeColumnsObjLeft
              .filter((col) => col.field !== joinColumnLeft)
              .map((col) => [col.field, leftRow[col.field] || null])
          ),
          ...Object.fromEntries(
            Object.entries(rightRow)
              .filter(([key]) => key !== joinColumnRight && !key.endsWith(".id") && key != "id")
              .map(([key, value]) => [`${key}`, value])
          ),
          id: `joined_${leftRow.id || 'null'}_${rightRow.id}_${index}`,
        };

        return mergedRow;
      });
    }

    // Define merged columns by using the actual table names without suffixes as prefixes
    const mergedColumns = [
      { field: joinColumnLeft, headerName: joinColumnLeft, width: 150, headerAlign: 'center', align: 'center' }, // Join column without prefix
      ...activeColumnsObjLeft
        .filter((col) => col.field !== joinColumnLeft) // Exclude join column from left
        .map((col) => ({
          ...col,
          field: `${col.field}`,
          headerName: `${col.headerName}`,
        })),
      ...activeColumnsObjRight
        .filter((col) => col.field !== joinColumnRight) // Exclude join column from right
        .map((col) => ({
          ...col,
          field: `${col.field}`,
          headerName: `${col.headerName}`,
        })),
    ];

    // Update the state with joined rows and columns
    setJoinedRows(result);
    setJoinedColumns(mergedColumns);
  };

  const handleJoinColumnLeftChange = (event) => {
    const selectedColumn = event.target.value;
    setJoinColumnLeft(selectedColumn);
  
    // Automatically select the join column for the right table if it exists
    if (columnsRight && columnsRight.some(col => col.field === selectedColumn)) {
      setJoinColumnRight(selectedColumn);
    }
  };
  
  const handleCreateTable = async () => {
    // Require portfolio and table name
    if (!curSaveToPortfolio || !saveToTableName) {
      return;
    }

    const activeColumns = gridVisibleColumnFieldsSelector(apiRefJoined);
    const activeRows = getActiveRows(apiRefJoined, activeColumns);

    // Remove id
    const rowData = activeRows.map(row => {
      const { id, ...rest } = row; // Destructure to remove 'id'
      // Rename the row attributes if the column headers have been renamed
      const renamedRow = {};
      Object.entries(rest).forEach(([key, value]) => {
        const newColumn = joinedColumns.find(col => col.field === key);
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

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <Box display="flex" gap="20px" flexDirection="column" justifyContent="center" alignItems="center" style={{ paddingLeft: "100px", paddingRight: "100px", paddingTop: "20px" }}>
      {errorMessage && (
        <Grid item>
          <Alert severity="error">{errorMessage}</Alert>
        </Grid>
      )}

      <Box style={{ display: "flex", flexDirection: "row", gap: "250px", alignItems: "center" }}>
        <TableSearchMenu
          user={user}
          setCurTable={setCurTableLeft}
          setCurColumns={setColumnsLeft}
          setCurRows={setRowsLeft}
        >
          Select Left Table
        </TableSearchMenu>

        <TableSearchMenu
          user={user}
          setCurTable={setCurTableRight}
          setCurColumns={setColumnsRight}
          setCurRows={setRowsRight}
        >
          Select Right Table
        </TableSearchMenu>
      </Box>

      <Box style={{ display: "flex", flexDirection: "row", gap: "250px", alignItems: "center" }}>
        <Box style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <Typography fontSize={25}>{curTableLeft}</Typography>
          {columnsLeft && (
            <>
              <TableDataGrid apiRef={apiRefLeft} tableName={curTableLeft} columns={columnsLeft} rows={rowsLeft} pageSizeOptions={[10]} rowSelection={false} style={{marginBottom: "15px"}} />
              <Typography>Select Join Column</Typography>
              <Select onChange={handleJoinColumnLeftChange} value={joinColumnLeft}>
                {columnsLeft.map((col) => (
                  <MenuItem key={col.field} value={col.field}>
                    {col.headerName}
                  </MenuItem>
                ))}
              </Select>
            </>
          )}
        </Box>

        <Box style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <Typography fontSize={25}>{curTableRight}</Typography>
          {columnsRight && (
            <>
              <TableDataGrid apiRef={apiRefRight} tableName={curTableRight} columns={columnsRight} rows={rowsRight} pageSizeOptions={[10]} rowSelection={false} style={{marginBottom: "15px"}} />
              <Typography>Select Join Column</Typography>
              <Select onChange={(e) => setJoinColumnRight(e.target.value)} value={joinColumnRight}>
                {columnsRight.map((col) => (
                  <MenuItem key={col.field} value={col.field}>
                    {col.headerName}
                  </MenuItem>
                ))}
              </Select>
            </>
          )}
        </Box>
      </Box>

      <Box>
        <Button
          variant="contained"
          onClick={handleClick}
          disabled={!joinColumnLeft || !joinColumnRight}
        >
          Join Tables
        </Button>
        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
        >
          <MenuItem onClick={() => { handleJoin("inner"); handleClose(); }}>Inner Join</MenuItem>
          <MenuItem onClick={() => { handleJoin("left"); handleClose(); }}>Left Outer Join</MenuItem>
          <MenuItem onClick={() => { handleJoin("right"); handleClose(); }}>Right Outer Join</MenuItem>
        </Menu>
      </Box>

      {joinedRows.length > 0 && (
        <Box mt={3} mb={3} gap={1} style={{ display: "flex", flexDirection: "column", alignItems: "center"}}>
          <Typography variant="h6">Results</Typography>
          <TableDataGrid apiRef={apiRefJoined} columns={joinedColumns} rows={joinedRows} pageSizeOptions={[10]} rowSelection={false} />
          <Box mt={2} mb={1} style={{ display: "flex", flexDirection: "row", gap: '15px', alignItems: 'center' }}>
            <Typography>Rename Columns</Typography>
            {joinedColumns.map((col, index) => (
              <TextField
                key={col.field}
                label={col.field}
                variant="outlined"
                value={col.headerName}
                onChange={(e) => {
                  const newColumns = [...joinedColumns];
                  newColumns[index].headerName = e.target.value;
                  setJoinedColumns(newColumns);
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
