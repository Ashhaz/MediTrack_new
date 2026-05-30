/**
 * centralizes stock urgency logic for MediTrack
 */

export const getStockStatus = (stock, dosesPerDay) => {
  const s = Number(stock) || 0;
  const d = Number(dosesPerDay) || 1;
  const daysLeft = Math.floor(s / d);

  if (s <= 0) {
    return {
      status: "Out of Stock",
      daysLeft: 0,
      color: "rose-700",
      bg: "bg-rose-900/20",
      border: "border-rose-900/30",
      badgeText: "Out of Stock"
    };
  }

  if (daysLeft <= 1) {
    return {
      status: "Critical",
      daysLeft,
      color: "rose-500",
      bg: "bg-rose-500/10",
      border: "border-rose-500/20",
      badgeText: "Critical Stock"
    };
  }

  if (daysLeft <= 3) {
    return {
      status: "Danger",
      daysLeft,
      color: "orange-400",
      bg: "bg-orange-500/10",
      border: "border-orange-500/20",
      badgeText: "Refill Required"
    };
  }

  if (daysLeft <= 5) {
    return {
      status: "Warning",
      daysLeft,
      color: "amber-400",
      bg: "bg-amber-400/10",
      border: "border-amber-500/20",
      badgeText: "Refill Soon"
    };
  }

  return {
    status: "Healthy",
    daysLeft,
    color: "emerald-400",
    bg: "bg-emerald-400/10",
    border: "border-emerald-500/20",
    badgeText: "Stock Healthy"
  };
};