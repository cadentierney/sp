"use client";
import { useEffect, useState } from "react";
import {
  Box,
  Grid,
  Button,
  TextField,
  Alert,
  Paper,
  Typography,
  Link,
} from "@mui/material";
import { supabaseClient } from "../../utils/supabase/client";
import { useRouter } from "next/navigation";

export default function Login() {
  const [formValues, setFormValues] = useState({ email: "", password: "" });
  const [errorMessage, setErrorMessage] = useState();
  const [session, setSession] = useState();

  const router = useRouter();

  useEffect(() => {
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    supabaseClient.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  useEffect(() => {
    if (session) {
      router.push('/portfolios');
    }
  }, []);

  function reset() {
    setErrorMessage();
    setFormValues({ email: "", password: "" });
  }

  async function handleSignin(event) {
    event.preventDefault();
    const email = formValues.email;
    const password = formValues.password;

    const { error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      reset();
      console.error(error);
      setErrorMessage(error.message);
      return false;
    }

    router.push('/upload');
  }

  function handleChange({ field, value }) {
    setFormValues({ ...formValues, [field]: value });
  }

  return (
    <>
      <Grid container component="main" sx={{ height: "100vh" }}>
        <Grid
          item
          xs={false}
          sm={4}
          md={7}
          sx={{
            backgroundImage:
              "url(https://images.unsplash.com/photo-1549472579-e133f59d8b23)",
            backgroundRepeat: "no-repeat",
            backgroundColor: (t) =>
              t.palette.mode === "light"
                ? t.palette.grey[50]
                : t.palette.grey[900],
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <Grid item xs={12} sm={8} md={5} component={Paper} elevation={6} square>
          <Box
            sx={{
              width: 0.5,
              margin: "auto",
              textAlign: "center",
              height: "100vh",
            }}
          >
            <Typography variant="h5" pb={6} mt={4}>
              <strong>Log into your account.</strong>
            </Typography>
            <form>
              {errorMessage ? (
                <Alert severity="error">
                  There was an issue signing in! Check email and password.
                </Alert>
              ) : null}

              <TextField
                variant="outlined"
                autoFocus
                margin="dense"
                id="email"
                label="Email Address"
                type="email"
                fullWidth
                value={formValues.email}
                onChange={(e) =>
                  handleChange({ field: "email", value: e.target.value })
                }
                error={formValues.email?.error}
              />
              <br></br>
              <TextField
                variant="outlined"
                margin="dense"
                id="password"
                label="Password"
                type="password"
                fullWidth
                value={formValues.password}
                onChange={(e) =>
                  handleChange({ field: "password", value: e.target.value })
                }
              />
              <br></br>
              <br></br>
              <Typography variant="body2">
                Dont have an account? <Link href="/signup">Create one</Link>
              </Typography>
            </form>
            <Button
              variant="contained"
              color="primary"
              style={{ marginTop: "20px" }}
              onClick={(e) => handleSignin(e)}
            >
              Login
            </Button>
          </Box>
        </Grid>
      </Grid>
    </>
  );
}