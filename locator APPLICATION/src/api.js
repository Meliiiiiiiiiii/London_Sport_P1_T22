const API_URL = "https://c4tkoi5bqwa4toay4323uunop40wicgj.lambda-url.eu-north-1.on.aws/";

function mapItem(raw) {
  const price = typeof raw.price_gbp === "number" ? raw.price_gbp : 0;
  const free = price === 0 ? true : (typeof raw.is_free === "boolean" ? raw.is_free : false);
  return {
    id: raw.session_id,
    lat: raw.latitude,
    lng: raw.longitude,
    type: raw.activity_type || "Other / Unspecified",
    free,
    price,
    time: raw.start_time || null,
    name: raw.name || raw.location_name || "Activity",
    borough: raw.borough || "",
    locationName: raw.location_name || "",
    url: raw.url || null,
  };
}

export async function fetchActivities({ category, price } = {}) {
  const params = new URLSearchParams();
  if (category && category !== "All") params.set("category", category);
  if (price && price !== "All") params.set("price", price);
  params.set("limit", "3000");

  const res = await fetch(`${API_URL}?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to load activities");
  const data = await res.json();

  return (data.items || [])
    .filter((raw) => typeof raw.latitude === "number" && typeof raw.longitude === "number")
    .map(mapItem);
}

export async function fetchActivityById(id) {
  if (!id) return null;
  const params = new URLSearchParams();
  params.set("session_id", id);
  params.set("limit", "1");

  const res = await fetch(`${API_URL}?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to load activity");
  const data = await res.json();
  const items = (data.items || []).map(mapItem);
  return items.find((a) => a.id === id) || items[0] || null;
}