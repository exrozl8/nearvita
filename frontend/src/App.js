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
import ClaimThread from "@/pages/ClaimThread";

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
              <Route path="/donor" element={<ProtectedRoute role="donor"><DonorDashboard /></ProtectedRoute>} />
              <Route path="/receiver" element={<ProtectedRoute role="receiver"><ReceiverDashboard /></ProtectedRoute>} />
              <Route path="/claims/:id" element={<ProtectedRoute><ClaimThread /></ProtectedRoute>} />
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
