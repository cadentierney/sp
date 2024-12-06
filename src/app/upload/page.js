"use client";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Select,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import { supabaseClient } from "../../utils/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { useAuth } from "../../hooks/Auth";
import TableDataGrid, { getActiveRows } from "../../components/TableDataGrid";
import { gridVisibleColumnFieldsSelector, useGridApiRef } from "@mui/x-data-grid";

const getCSVData = (text) => {
  const rows = text.split(/\r?\n/);

  if (rows[0] == "" || rows.length < 2) {
    setErrorMessage("Files must have a row for column names and at least one data row");
    return;
  }

  // Split on commas that may have trailing spaces
  const data = rows.map(row => row.split(/,\s*/));
  return data.filter(row => row.length == data[0].length);
}

const getTSVData = (text) => {
  const rows = text.split(/\r?\n/);

  if (rows[0] == "" || rows.length < 2) {
    setErrorMessage("Files must have a row for column names and at least one data row");
    return;
  }

  const data = rows.map(row => row.split('\t'));
  return data.filter(row => row.length == data[0].length);
}

export default function Upload() {
  const [errorMessage, setErrorMessage] = useState();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [portfolios, setPortfolios] = useState();
  const [curPortfolio, setCurPortfolio] = useState();
  const [columns, setColumns] = useState();
  const [rows, setRows] = useState();

  const [tableName, setTableName] = useState("");
  const [tableNameError, setTableNameError] = useState(false);

  const { user, session } = useAuth();
  const router = useRouter();

  const searchParams = useSearchParams();
  const filename = searchParams.get('file');
  const ownerId = searchParams.get('user');

  const apiRef = useGridApiRef();

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, []);

  const handlePortfolioChange = (event) => {
    setCurPortfolio(event.target.value);
  }

  useEffect(() => {
    async function getFile() {
      // Get user portfolios
      let {data:portfoliosData, error:portfoliosError} = await supabaseClient
      .from('portfolios')
      .select()
      .eq('user', user.id);
      
      if (portfoliosError) {
        setErrorMessage(portfoliosError);
        setLoading(false);
        return;
      }

      if (portfoliosData.length == 0) {
        router.push("portfolios");
        return;
      }

      setCurPortfolio(portfoliosData[0].id);

      const userPortfolios = portfoliosData.map((portfolio) => {
        const portfolioName = portfolio.name;
        const portfolioId = portfolio.id;
        return {id: portfolioId, name: portfolioName};
      });

      setPortfolios(userPortfolios);
    

      if (!filename) {
        setLoading(false);
        return;
      }
  
      if (!user) {
        return;
      }
  
      const { data, error } = await supabaseClient.storage.from('documents').download(ownerId + '/' + filename);
      if (error) {
        console.error(error);
        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      const file = new File([data], filename, {type: data.type});
      buildTableData([file], false);

      const originalFileName = filename.split('-')[0];
      setTableName(originalFileName);

      setLoading(false);
    }

    getFile();
  }, []);

  const buildTableData = ((acceptedFiles, saveFile) => {
    acceptedFiles.forEach(async (file) => {
      const reader = new FileReader();
      reader.onabort = () => setErrorMessage("file reading was stopped")
      reader.onerror = () => setErrorMessage("file reading failed")
      reader.onload = () => {
        const text = reader.result;
        let data = [];

        if (file.type == "text/csv") {
          data = getCSVData(text);
        } else if (file.type == "text/tsv") {
          data = getTSVData(text);
        }

        if (!data) {
          return;
        }

        const [columnNames, ...rowData] = data;
        
        const columns = columnNames.map(name => {
          return {field: name, headerName: name, width: 150, headerAlign: 'center', align: 'center'}
        });

        const rows = rowData.map((row, rowIdx) => {
          let curRow = {};
          curRow['id'] = rowIdx;
          row.forEach((item, itemIdx) => {
            // Set column name as attribute name
            curRow[columnNames[itemIdx % columnNames.length]] = item;
          });

          return curRow;
        })
        
        setColumns(columns);
        setRows(rows);
      }

      reader.readAsText(file);

      if (errorMessage) {
        return;
      }

      if (!saveFile) {
        return;
      }

      // Upload files to server storage
      const [fileName, fileExt] = file.name.split('.');
      const uniqueFileName = fileName + '-' + Date.now() + '.' + fileExt;
      
      const { data, error } = await supabaseClient.storage
        .from('documents')
        .upload(user.id + '/' + uniqueFileName, file);
      
      if (error) {
        setErrorMessage(error.message);
        return;
      }

      // Upload file info to database
      const {data:fileData, error:fileError} = await supabaseClient
        .from('files')
        .insert({name: uniqueFileName, portfolio: curPortfolio});
    
      if (fileError) {
        setErrorMessage(fileError.message);
        return;
      }
    });
  });

  const onDrop = useCallback((acceptedFiles) => {
    setErrorMessage();
    buildTableData(acceptedFiles, true);
    
    // Close dialogue
    setIsDialogOpen(false);
  })

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: { "image/*": [".csv", ".tsv"] },
    maxFiles: 1
  });

  const handleDialogOpen = () => {
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
  };

  const handleCreateTable = async () => {
    if (tableName == "") {
      setTableNameError(true);
      return;
    }

    setErrorMessage();
    setTableNameError(false);

    // Only take in filtered rows/columns from the DataGrid
    const columnList = gridVisibleColumnFieldsSelector(apiRef);
    const rowsData = getActiveRows(apiRef, columnList);

    const tableData = {
      'tableName': tableName,
      'portfolio': curPortfolio,
      'columns': columnList,
      'rows': rowsData
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
    return (<Typography>Loading...</Typography>)
  }

  return (
    <Box display="flex" gap="20px" flexDirection='column' justifyContent="center" alignItems="center"
      style={{ paddingLeft: "100px", paddingRight: "100px", paddingTop: "20px" }}>

      {errorMessage ? (
        <Grid item>
          <Alert severity="error">{errorMessage}</Alert>
        </Grid>
      ) : null}

      <Box style={{ display: "flex", flexDirection: "row", gap: '25px', alignItems: 'center' }}>
        <Typography>Select Portfolio</Typography>
        <Select onChange={handlePortfolioChange} value={curPortfolio}>
          {portfolios.map(({name, id}) => (<MenuItem value={id}>{name}</MenuItem>))}
        </Select>
      </Box>

      <Button variant="contained"
        onClick={handleDialogOpen}>
        Upload File
      </Button>

      <Dialog
        open={isDialogOpen}
        onClose={handleDialogClose}
        aria-labelledby="responsive-dialog-title"
      >
        <DialogTitle id="responsive-dialog-title">
          {"Upload a File"}
        </DialogTitle>
        <DialogContent>
          <div
            {...getRootProps()}
            style={{
              border: "1px dashed gray",
              padding: "20px",
              cursor: "pointer",
            }}
          >
            <input {...getInputProps()} />
            <Typography variant="body1">
              Drag & drop a file here, or click to select one
            </Typography>
          </div>
        </DialogContent>
        <DialogActions>
          <Button
            autoFocus
            onClick={handleDialogClose}
            color="primary"
          >
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {columns ? (
        <>
        <TableDataGrid
          apiRef={apiRef}
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

        <TextField
              label="Table Name"
              variant="outlined"
              required
              error={tableNameError}
              helperText={tableNameError && "Required"}
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              style={{ marginTop: "10px", marginBottom: "20px" }}
            />
        
        <Button variant="contained"
          onClick={handleCreateTable}>
          Create Table
        </Button>
        </>
      ) : null}
      
    </Box>
  );
}