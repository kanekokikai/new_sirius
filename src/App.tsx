import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import FeaturePlaceholder from "./pages/FeaturePlaceholder";
import DispatchInstructionPage from "./pages/DispatchInstructionPage";
import OutboundRegisterPage from "./pages/OutboundRegisterPage";

const rawBaseUrl = import.meta.env.BASE_URL;
const routerBasename = rawBaseUrl === "/" ? "/" : rawBaseUrl.replace(/\/$/, "");

const App = () => (
  <BrowserRouter basename={routerBasename}>
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route
        path="/factory/outbound-register"
        element={
          <ProtectedRoute>
            <OutboundRegisterPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/feature/dispatch/:instructionKey"
        element={
          <ProtectedRoute>
            <DispatchInstructionPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/home"
        element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/feature/:featureKey"
        element={
          <ProtectedRoute>
            <FeaturePlaceholder />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<LoginPage />} />
    </Routes>
  </BrowserRouter>
);

export default App;

