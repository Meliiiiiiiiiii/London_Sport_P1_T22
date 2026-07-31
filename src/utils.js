export function haversine(lat1, lng1, lat2, lng2) {
  const R = 3958.8; // miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function timeSlotOf(timeStr) {
  if (!timeStr) return null;
  const hour = parseInt(timeStr.split(":")[0], 10);
  if (isNaN(hour)) return null;
  if (hour < 12) return "Morning";
  if (hour < 17) return "Afternoon";
  return "Evening";
}

export function isValidEmail(email) {
  // standard, practical email format check (not fully RFC-exhaustive, which is intentional -
  // overly strict regexes reject real addresses more often than they catch bad ones)
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}
