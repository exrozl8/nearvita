import { useState, useEffect } from "react";
import api, { formatApiErrorDetail } from "@/lib/api";
import { toast } from "sonner";
import {
  X,
  CreditCard,
  QrCode,
  Truck,
  CheckCircle2,
  Lock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Building2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function PaymentModal({ medicine, user, onClose, onPaid }) {
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);
  const [method, setMethod] = useState("upi"); // upi | card | cod | netbanking
  const [step, setStep] = useState("form"); // form | processing | success
  const [timeLeft, setTimeLeft] = useState(300); // 5 min countdown

  // Form fields
  const [payerName, setPayerName] = useState(user?.name || "");
  const [contactPhone, setContactPhone] = useState(user?.phone || "+91 98765 43210");
  const [deliveryAddress, setDeliveryAddress] = useState(
    user?.location || "Care India Foundation, #42 8th Main, Koramangala, Bengaluru"
  );
  const [upiId, setUpiId] = useState("");
  const [cardData, setCardData] = useState({
    number: "",
    name: user?.name || "",
    expiry: "",
    cvv: "",
  });
  const [selectedBank, setSelectedBank] = useState("HDFC Bank");
  const [receipt, setReceipt] = useState(null);

  // Price calculations
  const unitPrice = Number(medicine?.price || 0);
  const originalPrice = Number(medicine?.original_price || unitPrice * 3 || 0);
  const deliveryFee = Number(medicine?.delivery_fee || 0);
  const subtotal = unitPrice * qty;
  const totalAmount = subtotal + deliveryFee;
  const savings = originalPrice > 0 ? (originalPrice * qty) - subtotal : 0;

  // Countdown timer for QR
  useEffect(() => {
    if (step !== "form" || method !== "upi") return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [step, method]);

  const formatTimer = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleCardInput = (field, val) => {
    if (field === "number") {
      val = val.replace(/\D/g, "").slice(0, 16);
      val = val.replace(/(\d{4})(?=\d)/g, "$1 ");
    } else if (field === "expiry") {
      val = val.replace(/\D/g, "").slice(0, 4);
      if (val.length >= 3) {
        val = `${val.slice(0, 2)}/${val.slice(2)}`;
      }
    } else if (field === "cvv") {
      val = val.replace(/\D/g, "").slice(0, 3);
    }
    setCardData((prev) => ({ ...prev, [field]: val }));
  };

  const autofillTestCard = () => {
    setCardData({
      number: "4242 4242 4242 4242",
      name: user?.name || "Demo Verified Receiver",
      expiry: "12/28",
      cvv: "888",
    });
    toast.info("Test Visa card filled for demo!");
  };

  const handleProcessPayment = async () => {
    if (!deliveryAddress.trim()) {
      toast.error("Please enter delivery / pickup location");
      return;
    }

    setStep("processing");

    // Realistic multi-stage verification delay for presentation wow-factor
    setTimeout(async () => {
      try {
        const payload = {
          medicine_id: medicine.id,
          quantity: qty,
          payment_method: method,
          delivery_address: deliveryAddress,
          contact_phone: contactPhone,
          payer_name: payerName,
          upi_id: method === "upi" ? (upiId || "nearvita.user@okhdfcbank") : "",
          card_last4: method === "card" ? (cardData.number.slice(-4) || "4242") : "",
          notes: `Purchased via NearVita Checkout (${method.toUpperCase()})`,
        };

        const res = await api.post("/payments/checkout", payload);
        setReceipt({
          ...res.data.payment,
          claim_id: res.data.claim_id,
        });
        setStep("success");
        toast.success("Demo checkout recorded. Medicine successfully reserved.");
        if (onPaid) onPaid();
      } catch (err) {
        toast.error(formatApiErrorDetail(err.response?.data?.detail));
        setStep("form");
      }
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white hairline rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden my-6 border border-neutral-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-[#0D1117] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-[#E05A47] grid place-items-center text-white">
              <ShieldCheck size={16} />
            </div>
            <div>
              <h2 className="font-display text-xl leading-none">
                NearVita Demo Checkout
              </h2>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                No real payment is taken in this demo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-md transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* STEP 1: FORM */}
        {step === "form" && (
          <div className="p-6 space-y-6">
            
            {/* Medicine Brief */}
            <div className="p-4 bg-neutral-50 rounded-lg hairline flex items-start gap-4">
              <div className="w-16 h-16 rounded overflow-hidden bg-neutral-200 flex-shrink-0">
                {medicine.image_url ? (
                  <img
                    src={medicine.image_url}
                    alt={medicine.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full grid place-items-center font-display text-2xl text-neutral-400">
                    {medicine.name?.[0]}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="eyebrow">{medicine.category}</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    {medicine.is_free ? "Free Donation" : `₹${unitPrice} / unit`}
                  </span>
                </div>
                <h3 className="font-display text-xl text-[#0D1117] mt-0.5 truncate">
                  {medicine.name}
                </h3>
                <div className="text-xs text-neutral-500 mt-0.5">
                  {medicine.dosage && `${medicine.dosage} · `}
                  Expiry: {medicine.expiry_date}
                </div>
              </div>
            </div>

            {/* Quantity Selector & Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 hairline rounded-lg bg-white">
                <label className="eyebrow block mb-2">Quantity Required</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="w-9 h-9 border border-neutral-300 rounded font-mono text-lg font-bold hover:bg-neutral-100 transition"
                  >
                    -
                  </button>
                  <span className="font-display text-2xl w-12 text-center">
                    {qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.min(medicine.quantity || 10, q + 1))}
                    className="w-9 h-9 border border-neutral-300 rounded font-mono text-lg font-bold hover:bg-neutral-100 transition"
                  >
                    +
                  </button>
                  <span className="text-xs text-neutral-500 ml-2">
                    Max: {medicine.quantity} available
                  </span>
                </div>
              </div>

              {/* Order Summary box */}
              <div className="p-4 hairline rounded-lg bg-neutral-50 space-y-1.5 text-xs">
                <div className="flex justify-between text-neutral-600">
                  <span>Medicine Subtotal:</span>
                  <span className="font-semibold text-neutral-900">
                    {unitPrice === 0 ? "₹0.00 (Donation)" : `₹${subtotal.toFixed(2)}`}
                  </span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>Courier / Handover Handling:</span>
                  <span className="font-semibold text-neutral-900">
                    {deliveryFee === 0 ? "FREE" : `₹${deliveryFee.toFixed(2)}`}
                  </span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>NGO Healthcare Subsidy:</span>
                  <span className="font-semibold text-emerald-600">
                    -₹{savings > 0 ? savings.toFixed(2) : "0.00"}
                  </span>
                </div>
                <div className="pt-2 border-t border-neutral-200 flex justify-between text-sm font-bold text-[#0D1117]">
                  <span>Total Payable:</span>
                  <span className="text-base text-[#E05A47]">
                    ₹{totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="eyebrow block mb-2.5">
                Select Payment / Handover Method
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                  { id: "upi", label: "UPI / QR Code", icon: <QrCode size={16} /> },
                  { id: "card", label: "Credit / Debit Card", icon: <CreditCard size={16} /> },
                  { id: "netbanking", label: "Net Banking", icon: <Building2 size={16} /> },
                  { id: "cod", label: "Pay on Handover", icon: <Truck size={16} /> },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setMethod(item.id)}
                    className={`p-3 rounded-lg border text-left flex flex-col gap-1.5 transition-all ${
                      method === item.id
                        ? "border-[#E05A47] bg-[#E05A47]/5 text-[#E05A47] font-semibold ring-1 ring-[#E05A47]"
                        : "border-neutral-200 hover:border-neutral-300 text-neutral-700 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      {item.icon}
                      {method === item.id && (
                        <CheckCircle2 size={14} className="text-[#E05A47]" />
                      )}
                    </div>
                    <span className="text-xs">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Method Details */}
            {method === "upi" && (
              <div className="p-4 rounded-lg bg-orange-50/50 border border-orange-200/60 space-y-4">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  {/* Generated QR Code representation */}
                  <div className="w-36 h-36 bg-white p-2 rounded-lg border border-neutral-300 shadow-sm flex flex-col items-center justify-center relative flex-shrink-0">
                    <svg viewBox="0 0 100 100" className="w-28 h-28 text-neutral-900">
                      {/* Realistic styled SVG QR pattern */}
                      <rect x="5" y="5" width="26" height="26" fill="currentColor" rx="2" />
                      <rect x="9" y="9" width="18" height="18" fill="white" rx="1" />
                      <rect x="13" y="13" width="10" height="10" fill="currentColor" />

                      <rect x="69" y="5" width="26" height="26" fill="currentColor" rx="2" />
                      <rect x="73" y="9" width="18" height="18" fill="white" rx="1" />
                      <rect x="77" y="13" width="10" height="10" fill="currentColor" />

                      <rect x="5" y="69" width="26" height="26" fill="currentColor" rx="2" />
                      <rect x="9" y="73" width="18" height="18" fill="white" rx="1" />
                      <rect x="13" y="77" width="10" height="10" fill="currentColor" />

                      {/* Data Dots */}
                      <rect x="37" y="10" width="8" height="8" fill="currentColor" />
                      <rect x="50" y="14" width="6" height="6" fill="currentColor" />
                      <rect x="37" y="24" width="6" height="12" fill="currentColor" />
                      <rect x="50" y="28" width="12" height="6" fill="currentColor" />
                      <rect x="10" y="37" width="12" height="6" fill="currentColor" />
                      <rect x="28" y="42" width="6" height="10" fill="currentColor" />
                      <rect x="42" y="42" width="16" height="16" fill="#E05A47" rx="2" />
                      <rect x="65" y="37" width="10" height="8" fill="currentColor" />
                      <rect x="80" y="42" width="12" height="10" fill="currentColor" />
                      <rect x="38" y="68" width="10" height="8" fill="currentColor" />
                      <rect x="54" y="68" width="8" height="16" fill="currentColor" />
                      <rect x="68" y="68" width="14" height="6" fill="currentColor" />
                      <rect x="68" y="80" width="8" height="12" fill="currentColor" />
                      <rect x="82" y="82" width="10" height="10" fill="currentColor" />
                    </svg>
                    <div className="text-[10px] text-neutral-500 font-mono mt-1 font-semibold">
                      ₹{totalAmount.toFixed(2)} · Exp: {formatTimer(timeLeft)}
                    </div>
                  </div>

                  <div className="flex-1 space-y-3">
                    <div>
                      <div className="text-xs font-semibold text-neutral-800">
                        Scan with any UPI App
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        {["GPay", "PhonePe", "Paytm", "BHIM"].map((app) => (
                          <span
                            key={app}
                            className="px-2 py-0.5 rounded text-[10px] bg-white border border-neutral-300 font-medium text-neutral-700"
                          >
                            {app}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-neutral-600 block mb-1">
                        Or enter UPI ID / VPA:
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={upiId}
                          onChange={(e) => setUpiId(e.target.value)}
                          placeholder="e.g. yourname@okhdfcbank"
                          className="flex-1 h-9 px-3 border border-neutral-300 rounded text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setUpiId("nearvita.ngo@okhdfcbank");
                            toast.info("Sample VPA entered");
                          }}
                          className="px-3 py-1 bg-white border border-neutral-300 rounded text-xs font-medium hover:bg-neutral-100"
                        >
                          Use Demo ID
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {method === "card" && (
              <div className="p-4 rounded-lg bg-neutral-50 border border-neutral-200 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-neutral-700">
                    Card Details (Visa / MasterCard / RuPay)
                  </span>
                  <button
                    type="button"
                    onClick={autofillTestCard}
                    className="text-xs text-[#E05A47] font-semibold hover:underline inline-flex items-center gap-1"
                  >
                    <Sparkles size={12} /> ⚡ 1-Click Fill Test Card
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-medium text-neutral-600 block mb-1">
                      Card Number
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={cardData.number}
                        onChange={(e) => handleCardInput("number", e.target.value)}
                        placeholder="4242 4242 4242 4242"
                        className="w-full h-10 px-3 pl-9 border border-neutral-300 rounded text-sm font-mono"
                      />
                      <CreditCard
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-medium text-neutral-600 block mb-1">
                        Expiry (MM/YY)
                      </label>
                      <input
                        type="text"
                        value={cardData.expiry}
                        onChange={(e) => handleCardInput("expiry", e.target.value)}
                        placeholder="12/28"
                        className="w-full h-10 px-3 border border-neutral-300 rounded text-sm font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-neutral-600 block mb-1">
                        CVV / CVC
                      </label>
                      <input
                        type="password"
                        value={cardData.cvv}
                        onChange={(e) => handleCardInput("cvv", e.target.value)}
                        placeholder="•••"
                        className="w-full h-10 px-3 border border-neutral-300 rounded text-sm font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-neutral-600 block mb-1">
                      Cardholder Name
                    </label>
                    <input
                      type="text"
                      value={cardData.name}
                      onChange={(e) => handleCardInput("name", e.target.value)}
                      placeholder="Receiver / Organization Name"
                      className="w-full h-10 px-3 border border-neutral-300 rounded text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {method === "netbanking" && (
              <div className="p-4 rounded-lg bg-neutral-50 border border-neutral-200 space-y-3">
                <label className="text-xs font-semibold text-neutral-700 block">
                  Select Verified Bank
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {["HDFC Bank", "State Bank of India (SBI)", "ICICI Bank", "Axis Bank"].map((bank) => (
                    <button
                      key={bank}
                      type="button"
                      onClick={() => setSelectedBank(bank)}
                      className={`p-2.5 rounded border text-left text-xs transition-all ${
                        selectedBank === bank
                          ? "border-[#0D1117] bg-white font-semibold shadow-sm"
                          : "border-neutral-200 hover:bg-white text-neutral-600"
                      }`}
                    >
                      {bank}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {method === "cod" && (
              <div className="p-4 rounded-lg bg-amber-50/50 border border-amber-200/60 text-xs text-neutral-700 space-y-1">
                <div className="font-semibold text-amber-900 flex items-center gap-1.5">
                  <Truck size={14} /> Pay ₹{totalAmount.toFixed(2)} on Handover / Pickup
                </div>
                <p>
                  You can inspect the batch number, sealed packaging, and expiry date upon
                  arrival at {medicine.location} before completing handover.
                </p>
              </div>
            )}

            {/* Delivery / Pickup Address */}
            <div className="space-y-3 pt-2 border-t border-neutral-200">
              <div className="eyebrow">Delivery / Clinic Contact Details</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-neutral-600 block mb-1">
                    Contact Person / Organization
                  </label>
                  <input
                    type="text"
                    value={payerName}
                    onChange={(e) => setPayerName(e.target.value)}
                    className="w-full h-9 px-3 border border-neutral-300 rounded text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-neutral-600 block mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full h-9 px-3 border border-neutral-300 rounded text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-medium text-neutral-600 block mb-1">
                  Handover Address / Clinic Location
                </label>
                <textarea
                  rows={2}
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded text-xs"
                />
              </div>
            </div>

            {/* Action Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleProcessPayment}
                className="btn-primary w-full justify-center !py-3 !text-sm gap-2"
              >
                <Lock size={15} />
                {totalAmount === 0
                  ? "Confirm Free Reservation (₹0)"
                  : `Authorize & Pay ₹${totalAmount.toFixed(2)}`}
              </button>
              <div className="flex items-center justify-center gap-3 text-[11px] text-neutral-500 mt-2">
                <span>🔒 SSL 256-Bit Protection</span>
                <span>•</span>
                <span>🏥 Verified Medicine Protocol</span>
                <span>•</span>
                <span>Instant Donor Notification</span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: PROCESSING ANIMATION */}
        {step === "processing" && (
          <div className="p-12 text-center space-y-4">
            <div className="w-16 h-16 border-4 border-neutral-200 border-t-[#E05A47] rounded-full animate-spin mx-auto" />
            <h3 className="font-display text-2xl text-[#0D1117]">
              Processing Payment…
            </h3>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto">
              Connecting securely to payment gateway, reserving medicine inventory, and
              registering handover thread with {medicine.donor?.organization || "donor"}…
            </p>
          </div>
        )}

        {/* STEP 3: SUCCESS RECEIPT */}
        {step === "success" && receipt && (
          <div className="p-6 md:p-8 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full grid place-items-center mx-auto">
                <CheckCircle2 size={36} />
              </div>
              <h2 className="font-display text-3xl text-[#0D1117]">
                Payment & Reservation Confirmed!
              </h2>
              <p className="text-xs text-neutral-500">
                Official transaction receipt generated. The medicine is now reserved.
              </p>
            </div>

            {/* Receipt Card */}
            <div className="p-5 hairline bg-neutral-50 rounded-xl border border-neutral-300 space-y-3 font-mono text-xs">
              <div className="flex justify-between border-b border-dashed border-neutral-300 pb-2">
                <span className="text-neutral-500">Transaction ID:</span>
                <span className="font-bold text-[#0D1117]">{receipt.transaction_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Medicine:</span>
                <span className="font-semibold text-neutral-800">{receipt.medicine_name} (x{receipt.quantity})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Payment Method:</span>
                <span className="uppercase text-neutral-800 font-semibold">{receipt.method}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Receiver / Clinic:</span>
                <span className="text-neutral-800">{receipt.payer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Delivery To:</span>
                <span className="text-neutral-800 truncate max-w-[240px]">{receipt.delivery_address}</span>
              </div>
              <div className="flex justify-between border-t border-dashed border-neutral-300 pt-2 text-sm font-bold">
                <span>Amount Paid:</span>
                <span className="text-emerald-700">₹{Number(receipt.amount).toFixed(2)}</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate(`/claims/${receipt.claim_id}`);
                }}
                className="btn-primary flex-1 justify-center gap-1.5"
              >
                Open Claim & Handover Thread <ArrowRight size={15} />
              </button>
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="btn-outline flex-1 justify-center gap-1.5"
              >
                Print / Save Receipt
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
