import React, { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { verifyEsewaPayment } from "../services/api";
import { LoaderCircle } from "lucide-react";
import toast from "react-hot-toast";

export default function PaymentCallback() {
  const location = useLocation();
  const navigate = useNavigate();
  const [statusText, setStatusText] = useState("Verifying payment...");
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const queryParams = new URLSearchParams(location.search);
    const dataParam = queryParams.get("data");

    if (!dataParam) {
      toast.error("Invalid payment response missing data parameter.");
      navigate("/my-trips");
      return;
    }

    const verify = async () => {
      try {
        const result = await verifyEsewaPayment(dataParam);
        toast.success("Payment verified and successful!");
        navigate("/guides", {
          state: {
            selectedGuideId: result.booking.guide,
            confirmedBooking: result.booking,
            paymentSuccess: true,
          },
        });
      } catch (err) {
        const msg = err.response?.data?.error || "Payment verification failed.";
        toast.error(msg);
        navigate("/my-trips");
      }
    };
    verify();
  }, [location.search, navigate]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)' }}>
      <LoaderCircle size={48} className="spin" style={{ color: 'var(--green)' }} />
      <h2 style={{ marginTop: '20px', color: 'var(--text-main)', fontSize: '1.5rem', fontWeight: '500' }}>{statusText}</h2>
      <p style={{ color: 'var(--text-light)', marginTop: '8px' }}>Please do not close or refresh this page.</p>
    </div>
  );
}
