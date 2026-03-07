import React from "react";
import ReactDOM from "react-dom/client";
import { createTheme } from "@mui/material";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

export const theme = createTheme({
  palette: {
    mode: "dark",
    background: {
      default: "#1e1e1e",
      paper: "#252526",
    },
    text: {
      primary: "#cccccc",
      secondary: "#999999",
    },
    primary: {
      main: "#007acc", // VS Code Blue
    },
    error: {
      main: "#f48771",
    },
    success: {
      main: "#89d185",
    },
    warning: {
      main: "#cca700",
    },
  },
  shape: {
    borderRadius: 3,
  },
  typography: {
    fontFamily: '"SF Mono", "Monaco", "Menlo", "Ubuntu Mono", "Consolas", monospace',
    fontSize: 13,
    button: {
      textTransform: "none",
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          boxShadow: "none",
          "&:hover": {
            boxShadow: "none",
          },
        },
        containedPrimary: {
          backgroundColor: "#007acc",
          "&:hover": {
            backgroundColor: "#0062a3",
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          backgroundColor: "#252526",
          border: "1px solid #3e3e42",
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            backgroundColor: "#3c3c3c",
            "& fieldset": {
              borderColor: "#3e3e42",
            },
            "&:hover fieldset": {
              borderColor: "#505050",
            },
            "&.Mui-focused fieldset": {
              borderColor: "#007fd4",
              borderWidth: "1px",
            },
          },
          "& .MuiInputBase-input": {
            fontSize: "13px",
            padding: "8px 12px",
          },
          "& .MuiInputLabel-root": {
            fontSize: "13px",
            color: "#808080",
            "&.Mui-focused": {
              color: "#007fd4",
            },
          },
        },
      },
    },
  },
});
