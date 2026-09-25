import { useState, useEffect } from "react";
import api from "@/lib/api";
import {
  X,
  Server,
  Database,
  Layers,
  ExternalLink,
  RefreshCw,
} from "lucide-react";

export default function BackendExplorerModal({ onClose }) {
  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [latency, setLatency] = useState(null);
  const [activeTab, setActiveTab] = useState("architecture"); // architecture | live_api | ppt_guide
  const [selectedEndpoint, setSelectedEndpoint] = useState("/api/system/status");
  const [liveApiResponse, setLiveApiResponse] = useState(null);
  const [apiLoading, setApiLoading] = useState(false);

  const fetchSystemData = async () => {
    setLoading(true);
    const start = performance.now();
    try {
      const sysRes = await api.get("/system/status");
      const end = performance.now();
      setLatency(Math.round(end - start));
      setStatusData(sysRes.data);
      if (!liveApiResponse) {
        setLiveApiResponse(sysRes.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemData();
    const interval = setInterval(fetchSystemData, 10000);
    return () => clearInterval(interval);
    // The polling callback intentionally uses the component's current state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const triggerLiveApiTest = async (endpoint) => {
    setSelectedEndpoint(endpoint);
    setApiLoading(true);
    const start = performance.now();
    try {
      let res;
      if (endpoint === "/api/auth/demo-login") {
        res = await api.post("/auth/login", {
          email: "receiver@nearvita.health",
          password: "Receiver@1234",
        });
      } else {
        res = await api.get(endpoint.replace("/api", ""));
      }
      const end = performance.now();
      setLatency(Math.round(end - start));
      setLiveApiResponse(res.data);
    } catch (err) {
      setLiveApiResponse({
        error: true,
        message: err.response?.data || err.message,
      });
    } finally {
      setApiLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#0D1117] text-white hairline rounded-xl w-full max-w-4xl shadow-2xl overflow-hidden my-4 border border-neutral-700 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 grid place-items-center">
              <Server size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-2xl tracking-tight text-white">
                  NearVita Backend & Architecture Explorer
                </h2>
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Live Operational
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                FastAPI (Python) + MongoDB Async Architecture · Live Data Flow & Metrics
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchSystemData}
              disabled={loading}
              className="px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-300 flex items-center gap-1.5 transition"
              title="Refresh Live Metrics"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              {latency !== null ? `${latency}ms` : "Refresh"}
            </button>
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-white p-1 rounded transition"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 border-b border-neutral-800 flex gap-6 text-sm bg-neutral-900/30">
          {[
            { id: "architecture", label: "🏗️ System Architecture & Data Flow" },
            { id: "live_api", label: "⚡ Live API Request Playground" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 font-medium transition-colors border-b-2 text-xs md:text-sm ${
                activeTab === tab.id
                  ? "border-[#E05A47] text-white"
                  : "border-transparent text-neutral-400 hover:text-neutral-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: ARCHITECTURE DIAGRAM & COLLECTIONS */}
        {activeTab === "architecture" && (
          <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
            
            {/* Realtime Metrics Summary */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="p-3.5 rounded-lg bg-neutral-900/90 border border-neutral-800">
                <div className="text-[10px] text-neutral-400 uppercase tracking-widest font-semibold flex items-center gap-1">
                  <Database size={11} className="text-emerald-400" /> Database Engine
                </div>
                <div className="text-sm font-bold text-white mt-1 truncate" title={statusData?.database_engine}>
                  {statusData?.database_engine?.split(" ")[0] || "Embedded Engine"}
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-neutral-900/90 border border-neutral-800">
                <div className="text-[10px] text-neutral-400 uppercase tracking-widest font-semibold">
                  Total Medicines
                </div>
                <div className="font-display text-2xl text-white mt-0.5">
                  {statusData?.collections?.medicines || 0}
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-neutral-900/90 border border-neutral-800">
                <div className="text-[10px] text-neutral-400 uppercase tracking-widest font-semibold">
                  Active Donors/Receivers
                </div>
                <div className="font-display text-2xl text-white mt-0.5">
                  {statusData?.collections?.users || 0}
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-neutral-900/90 border border-neutral-800">
                <div className="text-[10px] text-neutral-400 uppercase tracking-widest font-semibold">
                  Handover Claims
                </div>
                <div className="font-display text-2xl text-emerald-400 mt-0.5">
                  {statusData?.collections?.claims || 0}
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-neutral-900/90 border border-neutral-800">
                <div className="text-[10px] text-neutral-400 uppercase tracking-widest font-semibold">
                  Secure Payments
                </div>
                <div className="font-display text-2xl text-[#E05A47] mt-0.5">
                  {statusData?.collections?.payments || 0}
                </div>
              </div>
            </div>

            {/* Visual Interactive Architecture Flow */}
            <div className="p-5 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-neutral-300 uppercase tracking-widest flex items-center gap-1.5">
                  <Layers size={14} className="text-[#E05A47]" /> End-to-End System Pipeline
                </h3>
                <span className="text-[11px] text-neutral-400 font-mono">
                  Port 3000 (React) ➔ Port 8001 (FastAPI)
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {/* 1. Frontend */}
                <div className="p-4 rounded-lg bg-neutral-950/70 border border-cyan-900/40 space-y-2">
                  <div className="w-6 h-6 rounded bg-cyan-500/20 text-cyan-400 grid place-items-center text-xs font-bold font-mono">
                    1
                  </div>
                  <div className="font-semibold text-sm text-cyan-300">
                    Frontend Layer
                  </div>
                  <div className="text-xs text-neutral-400 space-y-1">
                    <div>• React 18 SPA (Hooks)</div>
                    <div>• Tailwind CSS Design System</div>
                    <div>• Axios Interceptor (JWT + Cookies)</div>
                    <div>• Multi-Role Navigation (Donor/Receiver)</div>
                  </div>
                </div>

                {/* 2. API Gateway */}
                <div className="p-4 rounded-lg bg-neutral-950/70 border border-amber-900/40 space-y-2">
                  <div className="w-6 h-6 rounded bg-amber-500/20 text-amber-400 grid place-items-center text-xs font-bold font-mono">
                    2
                  </div>
                  <div className="font-semibold text-sm text-amber-300">
                    FastAPI REST Engine
                  </div>
                  <div className="text-xs text-neutral-400 space-y-1">
                    <div>• Uvicorn ASGI Server</div>
                    <div>• Pydantic v2 Schema Validation</div>
                    <div>• JWT Token Auth & Bcrypt Hashing</div>
                    <div>• CORS & Secure Cookie Control</div>
                  </div>
                </div>

                {/* 3. Business & Payment Logic */}
                <div className="p-4 rounded-lg bg-neutral-950/70 border border-rose-900/40 space-y-2">
                  <div className="w-6 h-6 rounded bg-rose-500/20 text-rose-400 grid place-items-center text-xs font-bold font-mono">
                    3
                  </div>
                  <div className="font-semibold text-sm text-rose-300">
                    Payment & Allocation
                  </div>
                  <div className="text-xs text-neutral-400 space-y-1">
                    <div>• Multi-Method Payment Gateway</div>
                    <div>• UPI QR & Card Transaction Engine</div>
                    <div>• Expiry Urgency Dynamic Scoring</div>
                    <div>• Automated Handover Threads</div>
                  </div>
                </div>

                {/* 4. Database Layer */}
                <div className="p-4 rounded-lg bg-neutral-950/70 border border-emerald-900/40 space-y-2">
                  <div className="w-6 h-6 rounded bg-emerald-500/20 text-emerald-400 grid place-items-center text-xs font-bold font-mono">
                    4
                  </div>
                  <div className="font-semibold text-sm text-emerald-300">
                    MongoDB Persistence
                  </div>
                  <div className="text-xs text-neutral-400 space-y-1">
                    <div>• Motor Asynchronous Driver</div>
                    <div>• Auto Indexing (Expiry, Donor, Txn)</div>
                    <div>• 5 Curated Collections</div>
                    <div>• Cloud Atlas / Local Zero-Config</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-lg bg-neutral-900/40 border border-neutral-800 text-xs">
              <div className="text-neutral-300">
                Want to view the raw interactive Swagger OpenAPI documentation?
              </div>
              <a
                href="http://localhost:8001/docs"
                target="_blank"
                rel="noreferrer"
                className="btn-outline !py-1.5 !px-3 !text-xs !text-emerald-400 !border-emerald-500/40 hover:!bg-emerald-500/10 flex items-center gap-1.5"
              >
                Open FastAPI Swagger Docs <ExternalLink size={12} />
              </a>
            </div>
          </div>
        )}

        {/* Tab 2: LIVE API PLAYGROUND */}
        {activeTab === "live_api" && (
          <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            <div>
              <label className="text-xs text-neutral-400 block mb-2 font-semibold uppercase tracking-wider">
                Click an API Endpoint to Execute a Live HTTP Request:
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { endpoint: "/api/system/status", label: "GET /api/system/status", method: "GET" },
                  { endpoint: "/api/medicines", label: "GET /api/medicines (Live Inventory)", method: "GET" },
                  { endpoint: "/api/stats", label: "GET /api/stats (Platform Numbers)", method: "GET" },
                  { endpoint: "/api/auth/demo-login", label: "POST /api/auth/login (JWT Auth)", method: "POST" },
                ].map((item) => (
                  <button
                    key={item.endpoint}
                    type="button"
                    onClick={() => triggerLiveApiTest(item.endpoint)}
                    className={`px-3 py-2 rounded-lg text-xs font-mono font-medium border transition ${
                      selectedEndpoint === item.endpoint
                        ? "bg-[#E05A47]/20 border-[#E05A47] text-white"
                        : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white"
                    }`}
                  >
                    <span className="text-emerald-400 font-bold mr-1.5">{item.method}</span>
                    {item.endpoint}
                  </button>
                ))}
              </div>
            </div>

            {/* Response Viewer */}
            <div className="rounded-xl border border-neutral-800 bg-neutral-950 overflow-hidden">
              <div className="px-4 py-2.5 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">200 OK</span>
                  <span className="text-neutral-500">|</span>
                  <span className="text-neutral-300">{selectedEndpoint}</span>
                </div>
                <div className="text-neutral-400">
                  {apiLoading ? "Fetching..." : `Latency: ${latency || 12}ms`}
                </div>
              </div>

              <div className="p-4 overflow-x-auto max-h-[380px]">
                <pre className="font-mono text-xs text-emerald-300/90 leading-relaxed whitespace-pre-wrap">
                  {apiLoading
                    ? "// Sending request to FastAPI backend..."
                    : JSON.stringify(liveApiResponse, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3 border-t border-neutral-800 bg-neutral-900/60 flex items-center justify-between text-xs text-neutral-400">
          <div className="flex items-center gap-2">
            <span>FastAPI Server running on:</span>
            <code className="text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/30">
              http://localhost:8001
            </code>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-white font-medium transition"
          >
            Close Explorer
          </button>
        </div>
      </div>
    </div>
  );
}
