import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { getShellModeFromLocation } from "./lib/shell-mode";
import "./index.css";

const shellMode = getShellModeFromLocation();
document.documentElement.dataset.shell = shellMode;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App shellMode={shellMode} />
  </React.StrictMode>
);
