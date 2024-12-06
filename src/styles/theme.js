// theme.js
import { createTheme } from "@mui/material/styles";
import PTSans from '../../public/fonts/PTSans-Regular.ttf';

const theme = createTheme({
    palette: {
        type: 'light',
        primary: {
          main: '#154734',
          contrastText: 'rgba(255,255,255,0.87)',
        },
        secondary: {
          main: '#8ECDB5',
          contrastText: '#ffffff',
        },
        background: {
          default: '#eeeeee',
        },
        error: {
          main: '#FE5F55',
        },
        warning: {
          main: '#ff9800',
        },
        info: {
          main: '#2196f3',
        },
      },
      typography: {
        fontFamily: 'PT Sans',
        button: {
          fontWeight: 700,
        },
      },
      components: {
        MuiCssBaseline: {
            styleOverrides: `
            @font-face {
                font-family: 'PT Sans';
                src: url(${PTSans}) format('truetype');
                font-weight: normal;
                font-style: normal;
            }
            // ... other styles
            `,
        },
    },
});

export default theme;
