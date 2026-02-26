import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { TooltipProvider } from "./components/ui/tooltip.jsx";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/react-query';
import { GoogleOAuthProvider } from '@react-oauth/google';
const GOOGLE_CLIENT_ID = "608495833099-9pkg110i5falr9620l274pto9anpsvne.apps.googleusercontent.com";


createRoot(document.getElementById("root")).render(
 <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
    <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </TooltipProvider>
    </QueryClientProvider>
    </GoogleOAuthProvider>
 
);
