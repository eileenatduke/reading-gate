import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./styles/tokens.css";
import "./styles/app.css";
import { AuthProvider } from "./lib/auth.jsx";
import { ThemeProvider, bootstrapTheme } from "./lib/theme-context.jsx";
import App from "./App.jsx";

bootstrapTheme(); // apply saved theme before first paint

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
