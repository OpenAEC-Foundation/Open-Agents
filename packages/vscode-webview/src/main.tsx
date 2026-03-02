import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/montserrat";
import "@fontsource-variable/jetbrains-mono";
import { App } from "./App";

// Reuse the frontend's CSS (Tailwind + theme tokens)
import "@frontend/index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
