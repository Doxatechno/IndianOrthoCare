import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "@/components/AppLayout";
import { DataProvider } from "@/context/DataContext";
import { AuthProvider } from "@/context/AuthContext";
import Dashboard from "@/pages/Dashboard";
import Customers from "@/pages/Customers";
import EquipmentPage from "@/pages/EquipmentPage";
import Tickets from "@/pages/Tickets";
import AMCContracts from "@/pages/AMCContracts";
import PMSchedules from "@/pages/PMSchedules";
import Technicians from "@/pages/Technicians";
import TechnicianPortal from "@/pages/TechnicianPortal";
import TechnicianLogin from "@/pages/TechnicianLogin";
import TechProtectedRoute from "@/components/TechProtectedRoute";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <DataProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/technician-login" element={<TechnicianLogin />} />
              <Route path="/technician-portal" element={
                <TechProtectedRoute>
                  <TechnicianPortal />
                </TechProtectedRoute>
              } />
              <Route path="*" element={
                <AppLayout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/customers" element={<Customers />} />
                    <Route path="/equipment" element={<EquipmentPage />} />
                    <Route path="/tickets" element={<Tickets />} />
                    <Route path="/amc" element={<AMCContracts />} />
                    <Route path="/pm-schedules" element={<PMSchedules />} />
                    <Route path="/technicians" element={<Technicians />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </AppLayout>
              } />
            </Routes>
          </BrowserRouter>
        </DataProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
