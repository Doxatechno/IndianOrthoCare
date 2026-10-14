import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Outlet } from "react-router-dom";
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
import AdminLogin from "@/pages/AdminLogin";
import ResetPassword from "@/pages/ResetPassword";
import TechProtectedRoute from "@/components/TechProtectedRoute";
import AdminProtectedRoute from "@/components/AdminProtectedRoute";
import RaiseTicket from "@/pages/RaiseTicket";
import SalesOrders from "@/pages/SalesOrders";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

// The data layer is mounted only inside authenticated areas. It eagerly loads
// every business table, so wrapping the public routes in it made anonymous
// visitors (e.g. a customer scanning a QR label) fire a read at customers,
// equipment, tickets, amc_contracts, pm_schedules and technicians on page load.
function AdminLayout() {
  return (
    <DataProvider>
      <AppLayout>
        <Outlet />
      </AppLayout>
    </DataProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<AdminLogin />} />
            <Route path="/technician-login" element={<TechnicianLogin />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/raise-ticket/:equipmentId" element={<RaiseTicket />} />
            <Route path="/technician-portal" element={
              <TechProtectedRoute>
                <DataProvider>
                  <TechnicianPortal />
                </DataProvider>
              </TechProtectedRoute>
            } />
            <Route element={
              <AdminProtectedRoute>
                <AdminLayout />
              </AdminProtectedRoute>
            }>
              <Route path="/" element={<Dashboard />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/equipment" element={<EquipmentPage />} />
              <Route path="/tickets" element={<Tickets />} />
              <Route path="/amc" element={<AMCContracts />} />
              <Route path="/pm-schedules" element={<PMSchedules />} />
              <Route path="/technicians" element={<Technicians />} />
              <Route path="/sales-orders" element={<SalesOrders />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
