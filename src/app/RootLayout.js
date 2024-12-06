"use client";
import React, { useState } from "react";
import { ThemeProvider } from "@mui/material/styles";
import theme from "../styles/theme";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import localFont from "next/font/local";
import Link from "next/link";
import {
  AppBar,
  CssBaseline,
  Box,
  Button,
  Container,
  Toolbar,
  Typography,
  Snackbar,
  Alert,
  IconButton,
  Menu,
  MenuItem,
} from "@mui/material";
import { useRouter } from "next/navigation";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import { useAuth } from "../hooks/Auth";
import { supabaseClient } from "../utils/supabase/client";

// Configure sans font
const sans = localFont({
  src: "../../public/fonts/PTSans-Regular.ttf",
  weight: "400",
  style: "normal",
});

export default function RootLayout({ children }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const isMenuOpen = Boolean(anchorEl);
  const [snackbar, setSnackbar] = useState({ open: false, message: "" });
  const router = useRouter();

  const { user } = useAuth();

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const renderMenu = () => (
    <Menu anchorEl={anchorEl} open={isMenuOpen} onClose={handleMenuClose}>
      {user ? (
        <div>
          <MenuItem
            onClick={() => {
              handleMenuClose();
              supabaseClient.auth.signOut();
              router.push("/login"); // Redirect to the home page after logout
              setSnackbar({ open: true, message: "Successfully logged out" }); 
            }}
          >
            Log Out
          </MenuItem>
        </div>
      ) : (
        <div>
          <MenuItem component={Link} href="/login" onClick={handleMenuClose}>
            Log In
          </MenuItem>
          <MenuItem component={Link} href="/signup" onClick={handleMenuClose}>
            Sign Up
          </MenuItem>
        </div>
      )}
    </Menu>
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline>
        <main className={sans.className}>
          <Box display="flex" flexDirection="column" minHeight="100vh">
            <AppBar position="static">
              <Container maxWidth="xl">
              <Toolbar
                disableGutters
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0 16px", // Add padding to the toolbar
                }}
              >
                <Button
                  component={Link}
                  href="/upload"
                  color="inherit"
                  sx={{ fontSize: "1.2rem", width: "45%" }}
                >
                  Upload
                </Button>
                <Button
                  component={Link}
                  href="/portfolios"
                  color="inherit"
                  sx={{ fontSize: "1.2rem", width: "45%" }}
                >
                  Portfolios
                </Button>
                <Button
                  component={Link}
                  href="/join"
                  color="inherit"
                  sx={{ fontSize: "1.2rem", width: "45%" }}
                >
                  Join
                </Button>
                <Button
                  component={Link}
                  href="/group"
                  color="inherit"
                  sx={{ fontSize: "1.2rem", width: "45%" }}
                >
                  Group
                </Button>
                <Box sx={{ flexGrow: 1 }} /> {/* Maintain space between buttons and profile icon */}
                <IconButton
                  color="inherit"
                  onClick={handleProfileMenuOpen}
                  sx={{
                    p: { xs: 0, sm: 1 },
                  }}
                >
                  <AccountCircleIcon fontSize="large" sx={{ color: "white" }} />
                  <ArrowDropDownIcon fontSize="large" sx={{ color: "white" }} />
                </IconButton>
              </Toolbar>
              </Container>
            </AppBar>
            {renderMenu()}
            {/* Main content area */}
            <Box component="main" sx={{ flexGrow: 1 }}>
              {children}
            </Box>

            </Box>
            <Snackbar
              open={snackbar.open}
              autoHideDuration={6000}
              onClose={() => setSnackbar({ ...snackbar, open: false })}
            >
              <Alert
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                severity="success"
                sx={{ width: "100%" }}
              >
                {snackbar.message}
              </Alert>
            </Snackbar>
        </main>
      </CssBaseline>
    </ThemeProvider>
  );
}
