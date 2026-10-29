import { BrowserRouter, Routes, Route } from "react-router-dom";
import "@/App.css";
import { Toaster } from "sonner";
import { AuthProvider } from "@/context/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProtectedRoute from "@/components/ProtectedRoute";
import Landing from "@/pages/Landing";
import Mission from "@/pages/Mission";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Browse from "@/pages/Browse";
import MedicineDetail from "@/pages/MedicineDetail";
import DonorDashboard from "@/pages/DonorDashboard";
import ReceiverDashboard from "@/pages/ReceiverDashboard";
import AdminDashboard from "@/pages/AdminDashboard";
import ClaimThread from "@/pages/ClaimThread";
import Terms from "@/pages/Terms";
import Privacy from "@/pages/Privacy";
import Disclaimer from "@/pages/Disclaimer";
import NotFound from "@/pages/NotFound";

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Header />
          <main>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/mission" element={<Mission />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/browse" element={<Browse />} />
              <Route path="/medicines/:id" element={<MedicineDetail />} />
              
              {/* Protected User Dashboards */}
              <Route path="/donor" element={<ProtectedRoute role="donor"><DonorDashboard /></ProtectedRoute>} />
              <Route path="/receiver" element={<ProtectedRoute role="receiver"><ReceiverDashboard /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
              <Route path="/claims/:id" element={<ProtectedRoute><ClaimThread /></ProtectedRoute>} />

              {/* Legal & Policy Pages */}
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/disclaimer" element={<Disclaimer />} />

              {/* Catch-all 404 Route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <Footer />
          <Toaster position="top-right" richColors />
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

export default App;
