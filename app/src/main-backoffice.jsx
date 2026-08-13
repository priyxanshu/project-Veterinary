import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./backoffice.css";
import MPSVCBackOffice from "./MPSVCBackOffice.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <MPSVCBackOffice />
  </StrictMode>
);
