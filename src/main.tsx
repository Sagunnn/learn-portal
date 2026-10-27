import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import "@fontsource-variable/nunito";
import "@fontsource-variable/fredoka";
import "@fontsource/mukta/devanagari-400.css";
import "@fontsource/mukta/devanagari-600.css";
import "@fontsource/mukta/devanagari-700.css";
import "katex/dist/katex.min.css";
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
