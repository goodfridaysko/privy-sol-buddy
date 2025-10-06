import { createRoot } from "react-dom/client";
import './polyfills'; // Load browser polyfills for Buffer and process
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
