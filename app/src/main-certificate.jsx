import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import CertificateManagementPrototype from "./CertificateManagementPrototype.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <CertificateManagementPrototype />
  </StrictMode>
);
