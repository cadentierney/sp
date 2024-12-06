"use client";
import { useState, useEffect } from "react";
import {
  Box,
  Grid,
  Button,
  TextField,
  Alert,
  Paper,
  Typography,
} from "@mui/material";
import { supabaseClient } from "../../utils/supabase/client";
import { useRouter } from "next/navigation";

export default function Signup() {
  const [formState, setFormState] = useState({ email: "", password: "", passwordConfirmation: "" });
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
  }, [])

  async function handleSignup(event) {
    event.preventDefault();
    let validForm = event.currentTarget.reportValidity();
    
    const data = new FormData(event.currentTarget);
    const email = data.get('email');
    const password = data.get('password');
    const passwordConfirmation = data.get('passwordConfirmation');

    if (password != passwordConfirmation) {
      setErrorMessage();
      setFormState({...formState, passwordConfirmation: { error: true, message: "Your passwords don't match." }});
    } else if (!validForm || password.length < 6) {
      setErrorMessage("Passwords must be at least 6 characters long");
      setFormState({...formState, passwordConfirmation: { error: false, message: "" }});
    } else {
        // Register user on backend
        const { error } = await supabaseClient.auth.signUp({
          email,
          password
        });

        if (error) {
          console.error(error);
          setErrorMessage(error.message);
          return false;
        }

        router.push('/portfolios');
    }

    return false;
  }

  function handleChange({ field, value }) {
    setFormState({ ...formState, [field]: value });
  }

  return (
    <>
      <Grid container component="main" sx={{ height: "100vh" }}>
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
              <strong>Sign Up for an account.</strong>
            </Typography>
            
            <form onSubmit={handleSignup}>
              {errorMessage && (
                <Alert severity="error">{errorMessage}</Alert>
              )}

              <TextField
                autoFocus
                margin="dense"
                id="email"
                label="Email Address"
                type="email"
                name="email"
                fullWidth
                value={formState.email}
                onChange={(e) =>
                  handleChange({ field: "email", value: e.target.value })
                }
                error={formState.email?.error}
              />
              <br />
              <TextField
                margin="dense"
                id="password"
                label="Password"
                type="password"
                name="password"
                fullWidth
                value={formState.password}
                onChange={(e) =>
                  handleChange({ field: "password", value: e.target.value })
                }
              />
              <br />
              <TextField
                margin="dense"
                id="passwordConfirmation"
                label="Password Confirmation"
                type="password"
                name="passwordConfirmation"
                fullWidth
                value={formState.passwordConfirmation}
                onChange={(e) =>
                  handleChange({ field: "passwordConfirmation", value: e.target.value })
                }
                error={formState.passwordConfirmation?.error}
                helperText={formState.passwordConfirmation?.message}
              />
              <br /><br />
              <Button
                type="submit"
                variant="contained"
                color="primary"
                style={{ marginTop: "20px" }}
              >
                Sign Up
              </Button>
            </form>
          </Box>
        </Grid>
        <Grid
          item
          xs={false}
          sm={4}
          md={7}
          sx={{
            backgroundImage: "url(https://images.unsplash.com/photo-1549472579-e133f59d8b23)",
            backgroundRepeat: "no-repeat",
            backgroundColor: (t) =>
              t.palette.mode === "light"
                ? t.palette.grey[50]
                : t.palette.grey[900],
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      </Grid>
    </>
  );
}