const CATEGORY_KEYWORDS = {
  "Swimming": ["swim", "swimming", "pool"],
  "Gym / Fitness": ["gym", "fitness", "workout"],
  "Yoga, Pilates & Studio": ["yoga", "pilates", "studio"],
  "Group Exercise": ["group exercise", "class", "classes"],
  "Dance": ["dance", "dancing", "zumba"],
  "Racquet Sports": ["tennis", "badminton", "squash", "racquet", "table tennis"],
  "Team Sports": ["football", "basketball", "netball", "rugby", "team sport", "hockey", "cricket"],
  "Martial Arts": ["martial art", "boxing", "karate", "judo", "taekwondo", "kickbox"],
  "Bootcamp & Outdoor Fitness": ["bootcamp", "boot camp", "outdoor fitness", "outdoor"],
  "Walking / Running": ["run", "running", "jog", "jogging", "walk", "walking"],
  "Cycling": ["cycle", "cycling", "bike", "biking", "spin class"],
  "Personal Training": ["personal training", "pt session", "1-2-1", "one to one"],
  "Wellness & Facility Access": ["wellness", "spa", "sauna", "steam room", "relax"],
};

const TIME_KEYWORDS = {
  Morning: ["morning", "am", "early"],
  Afternoon: ["afternoon", "lunchtime", "midday"],
  Evening: ["evening", "night", "pm", "after work"],
};

export function parseSearchQuery(query, boroughCentroids = []) {
  const text = (query || "").toLowerCase();
  const result = { category: null, price: null, timeSlot: null, borough: null, matchedTerms: [] };

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => text.includes(kw))) {
      result.category = category;
      result.matchedTerms.push(category);
      break;
    }
  }

  if (/\bfree\b/.test(text)) {
    result.price = "Free";
    result.matchedTerms.push("Free");
  } else if (/\bpaid\b/.test(text)) {
    result.price = "Paid";
    result.matchedTerms.push("Paid");
  }

  for (const [slot, keywords] of Object.entries(TIME_KEYWORDS)) {
    if (keywords.some((kw) => text.includes(kw))) {
      result.timeSlot = slot;
      result.matchedTerms.push(slot);
      break;
    }
  }

  for (const b of boroughCentroids) {
    if (b.name && text.includes(b.name.toLowerCase())) {
      result.borough = b;
      result.matchedTerms.push(b.name);
      break;
    }
  }

  return result;
}