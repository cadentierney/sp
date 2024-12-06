"use client";
import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Divider,
  Grid,
  IconButton,
  Link,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Select,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { Delete, Description, FolderCopy, LibraryAdd, PersonAdd, TableChart, TableView } from '@mui/icons-material'
import { supabaseClient } from "../../utils/supabase/client";
import { useRouter } from "next/navigation";
import { useAuth } from "../../hooks/Auth";

export default function Portfolios() {
  const [errorMessage, setErrorMessage] = useState();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [portfolios, setPortfolios] = useState();
  const [tables, setTables] = useState();
  const [files, setFiles] = useState();
  const [curPortfolio, setCurPortfolio] = useState();
  const [newPortfolioName, setNewPortfolioName] = useState("");
  const [portfolioNameError, setPortfolioNameError] = useState(false);
  const [shareTableDialogueOpen, setShareTableDialogueOpen] = useState(false);
  const [shareFileDialogueOpen, setShareFileDialogueOpen] = useState(false);
  const [copyTableDialogueOpen, setCopyTableDialogueOpen] = useState(false);
  const [copyFileDialogueOpen, setCopyFileDialogueOpen] = useState(false);
  const [sharedTableId, setSharedTableId] = useState("");
  const [sharedFileId, setSharedFileId] = useState("");
  const [sharedEmail, setSharedEmail] = useState("");
  const [copiedTableName, setCopiedTableName] = useState("");
  const [copiedFileName, setCopiedFileName] = useState("");
  const [curDestPortfolio, setCurDestPortfolio] = useState();
  const SHARED_PORTFOLIO_NUMBER = -1;

  const { user, session } = useAuth();
  const router = useRouter();

  useEffect(() => {
    async function getUserData() {
      if (!user) {
        router.push('/login');
        return;
      }

      // Get a list of all file ids shared with the user.
      const {data:sharedFilesData, error:sharedFilesError} = await supabaseClient
      .from('shared_files')
      .select()
      .eq('user', user.id);

      if (sharedFilesError) {
        setErrorMessage(sharedFilesError);
        setLoading(false);
        return;
      }

      const sharedFileIds = sharedFilesData.map((sharedFileRow) => {
        return sharedFileRow.file;
      });

      // Get a list of user files and shared files
      const {data:filesData, error:filesError} = await supabaseClient
        .from('files')
        .select()
        .or(`user.eq.${user.id},id.in.(${sharedFileIds.join(',')})`);
      
      if (filesError) {
        setErrorMessage(filesError);
        setLoading(false);
        return;
      }

      const userFiles = filesData.map((file) => {
        // Strip off the timestamp
        const [fileNameWithTime, ext] = file.name.split('.');
        const fileNameWithoutTime = fileNameWithTime.substring(0, fileNameWithTime.lastIndexOf('-'));
        const newFileName = fileNameWithoutTime + '.' + ext;

        const formattedDate = new Date(file.created_at).toLocaleDateString('en-us', { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" })
        let portfolioId = file.portfolio;

        // Use special portfolio value for shared files
        if (file.user != user.id) {
          portfolioId = SHARED_PORTFOLIO_NUMBER;
        }

        return {id: file.id, name: newFileName, date: formattedDate, rawName: file.name, portfolio: portfolioId, user: file.user};
      });

      setFiles(userFiles);



      // Get a list of all table ids shared with the user.
      const {data:sharedTablesData, error:sharedTablesError} = await supabaseClient
      .from('shared_tables')
      .select()
      .eq('user', user.id);

      if (sharedTablesError) {
        setErrorMessage(sharedTablesError);
        setLoading(false);
        return;
      }

      const sharedTableIds = sharedTablesData.map((sharedTableRow) => {
        return sharedTableRow.table;
      });

      // Get user tables
      const {data:tablesData, error:tablesError} = await supabaseClient
        .from('tables')
        .select()
        .or(`user.eq.${user.id},id.in.(${sharedTableIds.join(',')})`);
      
      if (tablesError) {
        setErrorMessage(tablesError);
        setLoading(false);
        return;
      }

      const userTables = tablesData.map((table) => {
        const uniqueTableName = table.name;
        const tableNameWithoutUUID = uniqueTableName.substring(0, uniqueTableName.lastIndexOf('_'));
        let portfolioId = table.portfolio;

        // Use special portfolio value for shared tables
        if (table.user != user.id) {
          portfolioId = SHARED_PORTFOLIO_NUMBER;
        }

        return {id: table.id, name: tableNameWithoutUUID, uniqueName: uniqueTableName, portfolio: portfolioId};
      });

      setTables(userTables);

      
      // Get user portfolios
      const {data:portfoliosData, error:portfoliosError} = await supabaseClient
        .from('portfolios')
        .select()
        .eq('user', user.id);
      
      if (portfoliosError) {
        setErrorMessage(portfoliosError);
        setLoading(false);
        return;
      }

      let userPortfolios = portfoliosData.map((portfolio) => {
        const portfolioName = portfolio.name;
        const portfolioId = portfolio.id;
        return {id: portfolioId, name: portfolioName};
      });

      userPortfolios.push({id: SHARED_PORTFOLIO_NUMBER, name: "Shared With Me"});

      setCurPortfolio(userPortfolios[0].id);

      setPortfolios(userPortfolios);

      setLoading(false);
    }

    getUserData();
  }, []);

  const handleCreatePortfolio = async () => {
    if (newPortfolioName == "") {
      setPortfolioNameError(true);
      return;
    }

    setErrorMessage();
    setPortfolioNameError(false);

    const {data:newPortfolioData, error:portfolioInsertError} = await supabaseClient
    .from('portfolios')
    .insert({name: newPortfolioName});

    if (portfolioInsertError) {
      setErrorMessage(portfolioInsertError.message);
      return;
    }

    // Get the new portfolio's assigned id
    const {data:newPortfolioId, error:newPortfolioIdError} = await supabaseClient
    .from('portfolios')
    .select('id')
    .eq('name', newPortfolioName)
    .limit(1)
    .single();

    if (newPortfolioIdError) {
      setErrorMessage(newPortfolioIdError.message);
      return;
    }

    const portfolioId = newPortfolioId.id;

    // Add the new portfolio to the portfolio list and set it as the current portfolio.
    setPortfolios([...portfolios, {name: newPortfolioName, id: portfolioId}]);
    setCurPortfolio(portfolioId);
  }

  const handleDeletePortfolio = async () => {
    await fetch(`/api/portfolio/${curPortfolio}`, { method: "delete", headers: {
      "Authorization": "Bearer " + session.access_token
    }}).catch((err) => {
      console.error(err);
      setErrorMessage(err.error);
      return;
    });

    const newPortfolios = portfolios.filter(({id}) => id != curPortfolio)
    setPortfolios(newPortfolios);
    if (newPortfolios.length > 0) {
      setCurPortfolio(newPortfolios[0].id);
    } else {
      setCurPortfolio();
    }
  }

  const handleTabChange = (event, newTab) => {
    setTab(newTab);
  };

  const handlePortfolioChange = (event) => {
    setCurPortfolio(event.target.value);
  }

  // Table sharing
  const handleOpenShareTableDialogue = (tableId) => {
    setSharedTableId(tableId);
    setShareTableDialogueOpen(true);
  }

  const handleCloseShareTableDialogue = () => {
    setShareTableDialogueOpen(false);
  }

  // File sharing
  const handleOpenShareFileDialogue = (fileId) => {
    setSharedFileId(fileId);
    setShareFileDialogueOpen(true);
  }

  const handleCloseShareFileDialogue = () => {
    setShareFileDialogueOpen(false);
  }

  // Table copying
  const handleOpenCopyTableDialogue = (tableName) => {
    setCopiedTableName(tableName);

    // Set default value in the selection box
    const destPortfolios = portfolios.filter(({id}) => id != curPortfolio && id != SHARED_PORTFOLIO_NUMBER);
    if (destPortfolios.length != 0) {
      setCurDestPortfolio(destPortfolios[0].id);
    }

    setCopyTableDialogueOpen(true);
  }

  const handleCloseCopyTableDialogue = () => {
    setCopyTableDialogueOpen(false);
  }

  // File copying
  const handleOpenCopyFileDialogue = (rawFileName) => {
    setCopiedFileName(rawFileName);

    // Set default value in the selection box
    const destPortfolios = portfolios.filter(({id}) => id != curPortfolio && id != SHARED_PORTFOLIO_NUMBER);
    if (destPortfolios.length != 0) {
      setCurDestPortfolio(destPortfolios[0].id);
    }

    setCopyFileDialogueOpen(true);
  }

  const handleCloseCopyFileDialogue = () => {
    setCopyFileDialogueOpen(false);
  }

  const handleDestPortfolioChange = (event) => {
    setCurDestPortfolio(event.target.value);
  }

  const handleShareTable = async () => {
    if (sharedEmail == "") return;

    await fetch(`/api/table/share`, { method: "put", body: JSON.stringify({tableId: sharedTableId, email: sharedEmail}), headers: {
      "Authorization": "Bearer " + session.access_token
    }}).catch((err) => {
      console.error(err);
      setErrorMessage(err.error);
      return;
    });

    handleCloseShareTableDialogue();
  }

  const handleShareFile = async () => {
    if (sharedEmail == "") return;

    await fetch(`/api/file/share`, { method: "put", body: JSON.stringify({fileId: sharedFileId, email: sharedEmail}), headers: {
      "Authorization": "Bearer " + session.access_token
    }}).catch((err) => {
      console.error(err);
      setErrorMessage(err.error);
      return;
    });

    handleCloseShareFileDialogue();
  }

  const handleCopyTable = async () => {
    // Don't copy table if it already exists in destination
    const tableAlreadyCopied = tables.find(table => table.uniqueName == copiedTableName && table.portfolio == curDestPortfolio) != null;
    if (tableAlreadyCopied) {
      handleCloseCopyTableDialogue();
      return;
    }

    await fetch(`/api/table/copy`, { method: "put", body: JSON.stringify({tableName: copiedTableName, portfolio: curDestPortfolio}), headers: {
      "Authorization": "Bearer " + session.access_token
    }}).catch((err) => {
      console.error(err);
      setErrorMessage(err.error);
      return;
    });

    // Add copied table to state
    const originalTable = tables.find(table => table.uniqueName == copiedTableName);
    const copiedTable = {...originalTable, portfolio: curDestPortfolio};
    setTables([...tables, copiedTable]);
    handleCloseCopyTableDialogue();
  }

  const handleRemoveTable = async (tableName) => {
    await fetch(`/api/table/remove`, { method: "put", body: JSON.stringify({tableName: tableName, portfolio: curPortfolio}), headers: {
      "Authorization": "Bearer " + session.access_token
    }}).catch((err) => {
      console.error(err);
      setErrorMessage(err.error);
      return;
    });

    // Remove table from state
    setTables(tables.filter(table => !(table.uniqueName == tableName && table.portfolio == curPortfolio)));
  }

  const handleCopyFile = async () => {
    // Don't copy file if it already exists in destination
    const fileAlreadyCopied = files.find(file => file.rawName == copiedFileName && file.portfolio == curDestPortfolio) != null;
    if (fileAlreadyCopied) {
      handleCloseCopyFileDialogue();
      return;
    }

    await fetch(`/api/file/copy`, { method: "put", body: JSON.stringify({rawFileName: copiedFileName, portfolio: curDestPortfolio}), headers: {
      "Authorization": "Bearer " + session.access_token
    }}).catch((err) => {
      console.error(err);
      setErrorMessage(err.error);
      return;
    });

    // Add copied file to state
    const originalFile = files.find(file => file.rawName == copiedFileName);
    const copiedFile = {...originalFile, portfolio: curDestPortfolio};
    setFiles([...files, copiedFile]);
    handleCloseCopyFileDialogue();
  }

  const handleRemoveFile = async (rawFileName) => {
    await fetch(`/api/file/remove`, { method: "put", body: JSON.stringify({rawFileName: rawFileName, portfolio: curPortfolio}), headers: {
      "Authorization": "Bearer " + session.access_token
    }}).catch((err) => {
      console.error(err);
      setErrorMessage(err.error);
      return;
    });

    // Remove file from state
    setFiles(files.filter(file => !(file.rawName == rawFileName && file.portfolio == curPortfolio)));
  }

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

      <Box style={{ display: "flex", flexDirection: "row", gap: '25px', alignItems: 'center' }}>
        {portfolios.length > 0 ? (
          <>
          <Typography>Select Portfolio</Typography>
          <Select onChange={handlePortfolioChange} value={curPortfolio}>
            {portfolios.map(({name, id}) => (<MenuItem value={id}>{name}</MenuItem>))}
          </Select>

          <Typography>Or</Typography>
          </>
        ) : null}

        <TextField
          label="New Portfolio Name"
          variant="outlined"
          required
          error={portfolioNameError}
          helperText={portfolioNameError && "Required"}
          value={newPortfolioName}
          onChange={(e) => setNewPortfolioName(e.target.value)}
        />
        
        <Button variant="contained"
          onClick={handleCreatePortfolio}>
          Create Portfolio
        </Button>
      </Box>

      {portfolios.length > 0 ? (
        <Tabs value={tab} onChange={handleTabChange}>
          <Tab icon={<TableChart />} label="tables" />
          <Tab icon={<Description />} label="files" />
        </Tabs>
      ) : null}

      {tab == 0 && !loading && (
        <>
        <List>
          {tables.filter(({portfolio}) => portfolio == curPortfolio).map(({id, name, uniqueName}, idx) => {
            return (
              <>
              <ListItem
                key={uniqueName}
              >
                <ListItemText primary={name} secondary={`Owner: ${curPortfolio != SHARED_PORTFOLIO_NUMBER ? "Me" : "Other"}`} />
                <ListItemIcon>
                  <Tooltip title="View table" sx={{marginLeft: 3}}>
                    <IconButton component={Link} href={`/table/${uniqueName}`} edge="end">
                      <TableView />
                    </IconButton>
                  </Tooltip>
                </ListItemIcon>

                {portfolios.filter(({id}) => id != curPortfolio && id != SHARED_PORTFOLIO_NUMBER).length != 0 && (
                <ListItemIcon>
                  <Tooltip title="Copy table to another portfolio" sx={{marginLeft: 2}}>
                    <IconButton onClick={() => handleOpenCopyTableDialogue(uniqueName)} edge="end">
                      <FolderCopy />
                    </IconButton>
                  </Tooltip>
                </ListItemIcon>
                )}

                {curPortfolio != SHARED_PORTFOLIO_NUMBER && (
                <>
                <ListItemIcon>
                  <Tooltip title="Share table" sx={{marginLeft: 1}}>
                  <IconButton onClick={() => handleOpenShareTableDialogue(id)} edge="end">
                      <PersonAdd />
                    </IconButton>
                  </Tooltip>
                </ListItemIcon>

                <ListItemIcon>
                  <Tooltip title="Remove table from portfolio">
                  <IconButton onClick={() => handleRemoveTable(uniqueName)} edge="end">
                      <Delete />
                    </IconButton>
                  </Tooltip>
                </ListItemIcon>
                </>
                )}
              </ListItem>
              {idx < tables.length - 1 && <Divider />}
              </>
            );
          })}
        </List>

        <Dialog
          open={shareTableDialogueOpen}
          onClose={handleCloseShareTableDialogue}
        >
          <DialogTitle>Share Table</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Enter the email address of the person you want to share the table with.
            </DialogContentText>
            <TextField
              autoFocus
              required
              value={sharedEmail}
              onChange={(e) => setSharedEmail(e.target.value)}
              margin="dense"
              label="Email Address"
              type="email"
              fullWidth
              variant="standard"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseShareTableDialogue}>Cancel</Button>
            <Button onClick={handleShareTable}>Share</Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={copyTableDialogueOpen}
          onClose={handleCloseCopyTableDialogue}
        >
          <DialogTitle>Copy Table</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Select the portfolio you would like to copy this table into.
            </DialogContentText>
            <Select onChange={handleDestPortfolioChange} value={curDestPortfolio} sx={{marginTop: 1}}>
              {portfolios.filter(({id}) => id != curPortfolio && id != SHARED_PORTFOLIO_NUMBER)
                .map(({name, id}) => (<MenuItem value={id}>{name}</MenuItem>))}
            </Select>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseCopyTableDialogue}>Cancel</Button>
            <Button onClick={handleCopyTable}>Copy</Button>
          </DialogActions>
        </Dialog>
        </>
      )}

      {tab == 1 && !loading && (
        <>
        <List>
          {files.filter(({portfolio}) => portfolio == curPortfolio).map((file, idx) => {
            return (
              <>
              <ListItem
                key={file.id}
              >
                <ListItemText primary={file.name} secondary={file.date} />
                <ListItemIcon sx={{marginLeft: 3}}>
                  <Tooltip title="Add to a table">
                  <IconButton component={Link} href={`/upload?file=${file.rawName}&user=${file.user}`} edge="end">
                      <LibraryAdd />
                    </IconButton>
                  </Tooltip>
                </ListItemIcon>

                <ListItemIcon>
                  <Tooltip title="Copy file to another portfolio">
                  <IconButton onClick={() => handleOpenCopyFileDialogue(file.rawName)} edge="end">
                      <FolderCopy />
                    </IconButton>
                  </Tooltip>
                </ListItemIcon>

                {curPortfolio != SHARED_PORTFOLIO_NUMBER && (
                <>
                <ListItemIcon>
                  <Tooltip title="Share file">
                  <IconButton onClick={() => handleOpenShareFileDialogue(file.id)} edge="end">
                      <PersonAdd />
                    </IconButton>
                  </Tooltip>
                </ListItemIcon>

                <ListItemIcon>
                  <Tooltip title="Remove file from portfolio">
                  <IconButton onClick={() => handleRemoveFile(file.rawName)} edge="end">
                      <Delete />
                    </IconButton>
                  </Tooltip>
                </ListItemIcon>
                </>
                )}
              </ListItem>
              {idx < files.length - 1 && <Divider />}
              </>
            );
          })}
        </List>

        <Dialog
          open={shareFileDialogueOpen}
          onClose={handleCloseShareFileDialogue}
        >
          <DialogTitle>Share File</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Enter the email address of the person you want to share the file with.
            </DialogContentText>
            <TextField
              autoFocus
              required
              value={sharedEmail}
              onChange={(e) => setSharedEmail(e.target.value)}
              margin="dense"
              label="Email Address"
              type="email"
              fullWidth
              variant="standard"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseShareFileDialogue}>Cancel</Button>
            <Button onClick={handleShareFile}>Share</Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={copyFileDialogueOpen}
          onClose={handleCloseCopyFileDialogue}
        >
          <DialogTitle>Copy File</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Select the portfolio to copy the file to.
            </DialogContentText>
            <Select onChange={handleDestPortfolioChange} value={curDestPortfolio} sx={{marginTop: 1}}>
              {portfolios.filter(({id}) => id != curPortfolio && id != SHARED_PORTFOLIO_NUMBER)
                .map(({name, id}) => (<MenuItem value={id}>{name}</MenuItem>))}
            </Select>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseCopyFileDialogue}>Cancel</Button>
            <Button onClick={handleCopyFile}>Copy</Button>
          </DialogActions>
        </Dialog>
        </>
      )}

      {curPortfolio && curPortfolio != SHARED_PORTFOLIO_NUMBER ? (
        <Button
          variant="contained"
          color="error"
          onClick={handleDeletePortfolio}
          sx={{
            position: 'fixed',
            bottom: 30
          }}
        >
          Delete Portfolio
        </Button>
      ) : null}

    </Box>
  );
}