import React, { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { LoaderCircle } from "lucide-react";
import toast from "react-hot-toast";

export default function PaymentCallback() {
  const location = useLocation();
  const [statusText, setStatusText] = useState("Verifying payment...");
  const [detailText, setDetailText] = useState("Please do not close or refresh this page.");
  const [countdown, setCountdown] = useState(null);
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const queryParams = new URLSearchParams(location.search);
    const callbackStatus = (queryParams.get("status") || "invalid").toLowerCase();
    const message = queryParams.get("message") || "";
    const bookingId = queryParams.get("booking_id");
    const guideId = queryParams.get("guide_id");
    const transactionUuid = queryParams.get("transaction_uuid");

    const statusCopy = {
      success: "Payment successful",
      failed: "Payment failed",
      cancelled: "Payment cancelled",
      invalid: "Payment could not be confirmed",
    };

    const detailCopy = {
      success: message || "Your eSewa payment was verified successfully.",
      failed: message || "The payment did not complete successfully.",
      cancelled: message || "The payment was cancelled or interrupted before completion.",
      invalid: message || "We could not confirm the sandbox payment response.",
    };

    setStatusText(statusCopy[callbackStatus] || statusCopy.invalid);
    setDetailText(detailCopy[callbackStatus] || detailCopy.invalid);

    const redirectToTrips = (payload) => {
      const target = new URL("/my-trips", window.location.origin);
      Object.entries(payload).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== "") {
          target.searchParams.set(key, String(value));
        }
      });
      window.location.replace(target.toString());
    };

    const resolveCallback = () => {
      if (callbackStatus === "success" && bookingId) {
        toast.success(detailCopy.success);
        redirectToTrips({
          paymentCallbackStatus: "success",
          paymentCallbackMessage: detailCopy.success,
          paymentBookingId: bookingId || "",
          paymentTransactionUuid: transactionUuid || "",
          selectedGuideId: guideId || "",
          paymentSuccess: "true",
        });
        return;
      }

      if (callbackStatus === "failed") {
        toast.error(detailCopy.failed);
      } else if (callbackStatus === "cancelled") {
        toast(detailCopy.cancelled);
      } else {
        toast.error(detailCopy.invalid);
      }

      redirectToTrips({
        paymentCallbackStatus: callbackStatus,
        paymentCallbackMessage: detailCopy[callbackStatus] || detailCopy.invalid,
        paymentBookingId: bookingId || "",
        paymentTransactionUuid: transactionUuid || "",
      });
    };

    const redirectDelay = callbackStatus === "success" ? 1500 : 800;
    if (callbackStatus === "success") {
      setCountdown(2);
      const interval = window.setInterval(() => {
        setCountdown((current) => {
          if (current === null || current <= 1) return 0;
          return current - 1;
        });
      }, 1000);

      const timer = window.setTimeout(() => {
        window.clearInterval(interval);
        resolveCallback();
      }, redirectDelay);

      return () => {
        window.clearInterval(interval);
        window.clearTimeout(timer);
      };
    }

    const timer = window.setTimeout(() => {
      resolveCallback();
    }, redirectDelay);

    return () => window.clearTimeout(timer);
  }, [location.search]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)' }}>
      <LoaderCircle size={48} className="spin" style={{ color: 'var(--green)' }} />
      <h2 style={{ marginTop: '20px', color: 'var(--text-main)', fontSize: '1.5rem', fontWeight: '500' }}>{statusText}</h2>
      <p style={{ color: 'var(--text-light)', marginTop: '8px' }}>{detailText}</p>
      {countdown !== null && countdown > 0 ? (
        <p style={{ color: 'var(--text-light)', marginTop: '8px' }}>
          Redirecting in {countdown} second{countdown === 1 ? "" : "s"}...
        </p>
      ) : null}
    </div>
  );
}
