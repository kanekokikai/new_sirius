import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./components/AppLayout";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import FeaturePlaceholder from "./pages/FeaturePlaceholder";
import DispatchInstructionPage from "./pages/DispatchInstructionPage";
import OutboundRegisterPage from "./pages/OutboundRegisterPage";
import InboundRegisterPage from "./pages/InboundRegisterPage";
import InboundOrderDetailPage from "./pages/InboundOrderDetailPage";
import InventoryCheckPage from "./pages/InventoryCheckPage";
import MoveOrderCreatePage from "./pages/MoveOrderCreatePage";

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
            <AppLayout>
              <OutboundRegisterPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/factory/inbound-register"
        element={
          <ProtectedRoute>
            <AppLayout>
              <InboundRegisterPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/feature/dispatch/:instructionKey"
        element={
          <ProtectedRoute>
            <AppLayout>
              <DispatchInstructionPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/home"
        element={
          <ProtectedRoute>
            <AppLayout>
              <HomePage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/feature/:featureKey"
        element={
          <ProtectedRoute>
            <AppLayout>
              <FeaturePlaceholder />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/orders/inbound-detail"
        element={
          <ProtectedRoute>
            <AppLayout>
              <InboundOrderDetailPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/orders/move-create"
        element={
          <ProtectedRoute>
            <AppLayout>
              <MoveOrderCreatePage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory/check"
        element={
          <ProtectedRoute>
            <AppLayout>
              <InventoryCheckPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<LoginPage />} />
    </Routes>
  </BrowserRouter>
);

export default App;

