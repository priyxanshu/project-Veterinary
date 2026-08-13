import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import MPSVCPrototype from "./MPSVCPrototype.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <MPSVCPrototype />
  </StrictMode>
);
