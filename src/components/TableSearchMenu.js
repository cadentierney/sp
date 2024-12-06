"use client";

import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  MenuItem,
  Menu,
} from "@mui/material";
import { supabaseClient } from "../utils/supabase/client";
import { useRouter } from "next/navigation";
import { ArrowDropDown } from "@mui/icons-material";
import { TextField, IconButton } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";

export default function TableSearchMenu({ user, setCurTable, setCurColumns, setCurRows, children }) {
  const [errorMessage, setErrorMessage] = useState();
  const [curPortfolio, setCurPortfolio] = useState();
  const [portfolios, setPortfolios] = useState();
  const [tables, setTables] = useState();
  const [filteredTables, setFilteredTables] = useState();
  const [anchorEl, setAnchorEl] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const router = useRouter();

  useEffect(() => {
    async function getUserData() {
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: tablesData, error: tablesError } = await supabaseClient
        .from("tables")
        .select();

      if (tablesError) {
        setErrorMessage(tablesError);
        return;
      }

      const userTables = tablesData.map((table) => {
        const uniqueTableName = table.name;
        const tableNameWithoutUUID = uniqueTableName.substring(
          0,
          uniqueTableName.lastIndexOf("_")
        );
        return { id: table.id, name: tableNameWithoutUUID, uniqueName: uniqueTableName, portfolio: table.portfolio };
      });

      setTables(userTables);

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

      setCurPortfolio(userPortfolios[0].id);
      setPortfolios(userPortfolios);
    }

    getUserData();
  }, []);

  const handleCurTableChange = async (event) => {
    const uniqueTableName = event.target.value;
    setCurTable(uniqueTableName.substring(0, uniqueTableName.lastIndexOf("_")));
    const {data, keysHasAllNumbers} = await getTableData(uniqueTableName);
    const cols = Object.keys(data[0]);
    const tableCols = cols.filter(columnName => columnName !== 'id').map(columnName => ({
      field: columnName,
      headerName: columnName,
      type: keysHasAllNumbers[columnName] ? 'number' : 'string',
      width: 150,
      headerAlign: 'center',
      align: 'center',
    }));
    setCurColumns(tableCols);
    setCurRows(data);
  };

  const getTableData = async (tableName) => {
    const { data, error } = await supabaseClient.from(tableName).select();
    if (error) {
      setErrorMessage(error);
      return [];
    }

    // Convert number strings to numbers
    const keysHasAllNumbers = {};
    data.forEach((row) => {
      Object.keys(row).forEach((key) => {
      if (!isNaN(row[key])) {
        row[key] = Number(row[key]);

        // Keep track if the value for this column is all numbers
        if (keysHasAllNumbers[key] !== false) {
          keysHasAllNumbers[key] = true;
        }
      } else {
        keysHasAllNumbers[key] = false;
      }
      });
    });

    return {data, keysHasAllNumbers};
  };

  const handleSearch = async () => {
    const tablesInPortfolio = tables.filter(({ portfolio }) => portfolio === curPortfolio);
    const matchingTables = {};

    for (const { uniqueName, name } of tablesInPortfolio) {
      const { data } = await getTableData(uniqueName);
      const matchedRows = data.filter(row =>
        Object.values(row).some(value => value.toString().toLowerCase().includes(searchQuery.toLowerCase()))
      ).map(({id, ...rest}) => rest);

      if (matchedRows.length > 0) {
        matchingTables[uniqueName] = matchedRows;
      }
    }

    setFilteredTables(matchingTables);
  };

  return (
    <Box>
      {errorMessage && (
        <Grid item>
          <Alert severity="error">{errorMessage}</Alert>
        </Grid>
      )}

      <Button
        variant="contained"
        onClick={(e) => setAnchorEl(e.currentTarget)}
        endIcon={<ArrowDropDown />}
      >
        {children}
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <Box sx={{ display: "flex", flexDirection: "column", width: 400 }}>
          <Box sx={{ display: "flex", alignItems: "center", p: 1 }}>
            <TextField
              fullWidth
              size="small"
              variant="outlined"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <IconButton onClick={handleSearch}>
              <SearchIcon />
            </IconButton>
          </Box>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', my: 1 }} />
          <Box sx={{ display: "flex", flexDirection: "row", height: 300 }}>
            <Box sx={{ overflowY: "scroll", width: "50%" }}>
              {portfolios?.map(({ id, name }) => (
                <MenuItem
                  key={id}
                  onClick={() => {
                    setCurPortfolio(id);
                    setFilteredTables(null); // Clear search filter
                  }}
                  selected={curPortfolio === id}
                >
                  {name}
                </MenuItem>
              ))}
            </Box>
            <Box sx={{ overflowY: "scroll", width: "50%" }}>
              {tables?.filter(({ portfolio }) => portfolio === curPortfolio)
                .filter(({ uniqueName }) => filteredTables ? filteredTables.hasOwnProperty(uniqueName) : true) // Filter tables by search
                .map(({ id, uniqueName, name }) => (
                  <Box key={id}>
                    <MenuItem
                      onClick={() => {
                        handleCurTableChange({ target: { value: uniqueName } });
                        setAnchorEl(null);
                      }}
                    >
                      {name}
                    </MenuItem>
                    {filteredTables && filteredTables[uniqueName] && (
                      <Box sx={{ backgroundColor: 'grey.200', p: 1, mt: 1, fontSize: 12 }}>
                        <pre>{JSON.stringify(filteredTables[uniqueName], null, 2)}</pre>
                      </Box>
                    )}
                  </Box>
                ))}
            </Box>
          </Box>
        </Box>
      </Menu>
    </Box>
  );
}
