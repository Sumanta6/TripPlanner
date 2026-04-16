export function buildGuidePricingPreview(guide, tripStart, tripEnd) {
  if (!tripStart || !tripEnd) return null;

  const start = new Date(`${tripStart}T00:00:00`);
  const end = new Date(`${tripEnd}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return null;
  }

  const durationDays = Math.max(Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1, 1);
  const experienceYears = Number(guide?.experience_years || 0);
  const baseDailyRate = 120 + Math.round(experienceYears * 10);
  const guideServiceFee = baseDailyRate * durationDays;
  const platformFee = 25;
  const totalAmount = guideServiceFee + platformFee;

  return {
    currency: "USD",
    duration_days: durationDays,
    base_daily_rate: baseDailyRate,
    guide_service_fee: guideServiceFee,
    platform_fee: platformFee,
    total_amount: totalAmount,
  };
}

export function formatCurrency(amount, currency = "USD") {
  const numericAmount = Number(amount || 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(numericAmount);
}
