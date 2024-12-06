"use client";
import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Grid,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { supabaseClient } from "../../../utils/supabase/client";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../hooks/Auth";
import TableDataGrid, { getActiveRows } from "../../../components/TableDataGrid";
import { LineChart, Line, XAxis, YAxis } from "recharts";
import { gridVisibleColumnFieldsSelector, useGridApiRef } from "@mui/x-data-grid";

export default function Table({ params }) {
  const [errorMessage, setErrorMessage] = useState();
  const [loading, setLoading] = useState(true);
  const [columns, setColumns] = useState();
  const [rows, setRows] = useState();
  const [ownerId, setOwnerId] = useState("");

  const [columnX, setColumnX] = useState();
  const [columnY, setColumnY] = useState();
  const [predictionRows, setPredictionRows] = useState();
  const [forecastEndDate, setForecastEndDate] = useState();

  const [portfolios, setPortfolios] = useState();
  const [curSaveToPortfolio, setCurSaveToPortfolio] = useState();
  const [saveToTableName, setSaveToTableName] = useState("");
  const apiRef = useGridApiRef();

  const { user, session } = useAuth();
  const router = useRouter();

  const tableName = params.id;
  const tableNameWithoutUUID = tableName.substring(0, tableName.lastIndexOf('_'));

  useEffect(() => {
    async function getUserData() {
      if (!user) {
        router.push('/login');
        return;
      }

      // Get portfolios
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

      // Get table owner
      const {data:tableMetadata, error:tableMetadataError} = await supabaseClient
      .from("tables")
      .select()
      .eq('name', tableName)
      .limit(1)
      .single();

      if (tableMetadataError) {
        setErrorMessage(tableMetadataError);
        setLoading(false);
        return;
      }

      setOwnerId(tableMetadata.user);

      // Get table data
      const {data, error} = await supabaseClient
        .from(tableName)
        .select();
      
      if (error) {
        setErrorMessage(error);
        setLoading(false);
        return;
      }

      if (data.length == 0) {
        return;
      }

      const cols = Object.keys(data[0]);
      const tableCols = cols.filter(columnName => columnName != 'id').map(columnName => {
        return {field: columnName, headerName: columnName, width: 150, headerAlign: 'center', align: 'center'};
      })
      setColumns(tableCols);

      setRows(data);

      setLoading(false);
    }

    getUserData();
  }, []);

  const handleDeleteTable = async () => {
    await fetch(`/api/table/${tableName}`, { method: "delete", headers: {
      "Authorization": "Bearer " + session.access_token
    }}).catch((err) => {
      console.error(err);
      setErrorMessage(err.error);
      return;
    });

    router.push('/portfolios');
  };

  const getPrediction = async () => {
    const features = rows.map((row) => {
      return [row[columnX], parseFloat(row[columnY])];
    });

    // Get forecast length in days from the highest date in the table
    const maxDate = Math.max(...features.map((row) => new Date(row[0])));
    const forecastLength = Math.floor((forecastEndDate - maxDate) / (1000 * 60 * 60 * 24));

    await fetch(`/api/predict`, { method: "post", body: JSON.stringify({
      "features": features,
      "forecastLength": forecastLength,
    })})
    .then(res => res.json())
    .then(data => {
      const res = data['prediction'];

      const newRows = res.map((row, index) => {
        return {
          id: index + 9999999,
          [columnX]: row[0],
          [columnY]: row[1].toFixed(2),
        }
      });

      setPredictionRows(newRows);
    })
    .catch((err) => {
      console.error(err);
      setErrorMessage(err.error);
      return;
    });
  };

  const handleSaveToPortfolioChange = (event) => {
    setCurSaveToPortfolio(event.target.value);
  };

  const handleCreateTable = async () => {
    // Require portfolio and table name
    if (!curSaveToPortfolio || !saveToTableName) {
      return;
    }

    const activeColumns = gridVisibleColumnFieldsSelector(apiRef);
    const activeRows = getActiveRows(apiRef, activeColumns);

    // Remove id
    const rowData = activeRows.map(row => {
      const { id, ...rest } = row; // Destructure to remove 'id'
      return rest;
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

  if (loading) {
    return <p>Loading...</p>
  }

  return (
    <Box display="flex" gap="20px" flexDirection='column' justifyContent="center" alignItems="center"
      style={{ paddingLeft: "100px", paddingRight: "100px", paddingTop: "20px" }}>

      {errorMessage ? (
        <Grid item>
          <Alert severity="error">{errorMessage}</Alert>
        </Grid>
      ) : null}

      <Typography fontSize={25}>
        {tableNameWithoutUUID} table
      </Typography>

      <TableDataGrid
        tableName={tableNameWithoutUUID}
        columns={columns}
        rows={rows}
        initialState={{
          pagination: {
            paginationModel: {
              pageSize: 10
            }
          }
        }}
        pageSizeOptions={[10]}
        rowSelection={false}
      />

      {user.id == ownerId && (
        <>
        <Box style={{ display: "flex", flexDirection: "row", gap: "50px", alignItems: "center" }}>
          <Box style={{ display: "flex", flexDirection: "row", gap: "10px", alignItems: "center" }}>
            <Typography>Select X column</Typography>
            <Select onChange={(e) => {setColumnX(e.target.value)}} value={columnX}>
              {columns.map((col) => (
                <MenuItem key={col.field} value={col.field}>
                  {col.headerName}
                </MenuItem>
              ))}
            </Select>
          </Box>

          <Box style={{ display: "flex", flexDirection: "row", gap: "10px", alignItems: "center" }}>
            <Typography>Select Y Column</Typography>
            <Select onChange={(e) => {setColumnY(e.target.value)}} value={columnY}>
              {columns.map((col) => (
                <MenuItem key={col.field} value={col.field}>
                  {col.headerName}
                </MenuItem>
              ))}
            </Select>
          </Box>

          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label="Forecast End Date"
              value={forecastEndDate}
              onChange={(date) => setForecastEndDate(date)}
            />
          </LocalizationProvider>
        </Box>

        <Button
          variant="contained"
          onClick={getPrediction}
          disabled={!columnX || !columnY}
        >
          Predict
        </Button>
        </>
      )}

      {predictionRows && (
        <>
        <Typography fontSize={25}>Forecast</Typography>
        <Box style={{ display: "flex", flexDirection: "row", gap: "10px", alignItems: "center" }}>
          <TableDataGrid
            apiRef={apiRef}
            tableName={tableNameWithoutUUID + "_forecast"}
            columns={columns}
            rows={[...rows, ...predictionRows]}
            rowSelection={false}
          />

          <LineChart width={600} height={300}
            data={[
              ...rows.map(row => ({
                ...row,
                [columnY + "r"]: parseFloat(row[columnY]) // Add the key for rows data
              })),
              ...predictionRows.map(row => ({
                ...row,
                [columnY + "p"]: parseFloat(row[columnY]) // Add the key for prediction data
              }))
            ]}
          >
            <XAxis dataKey={columnX} />
            <YAxis domain={["auto", "auto"]} />
            <Line type="monotone" dataKey={columnY+"r"} dot={false} isAnimationActive={false} stroke="#8884d8" />
            <Line type="monotone" dataKey={columnY+"p"} dot={false} isAnimationActive={false} stroke="#82ca9d" />
          </LineChart>
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
        </>
      )}
      
      {user.id == ownerId && (
        <Button
          variant="contained"
          color="error"
          onClick={handleDeleteTable}
          sx={{marginBottom: "20px", marginTop: "20px"}}
          // sx={{position: 'fixed', bottom: 30}}
        >
          Delete Table
        </Button>
      )}

    </Box>
  );
}