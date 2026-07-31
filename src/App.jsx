import { useState, useCallback, useEffect } from "react";
import TopNav from "./components/TopNav";
import MobileNav from "./components/MobileNav";
import SignInPage from "./pages/SignInPage";
import SignUpPage from "./pages/SignUpPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import MainPage from "./pages/MainPage";
import ResultsPage from "./pages/ResultsPage";
import DetailPage from "./pages/DetailPage";
import FavoritesPage from "./pages/FavoritesPage";
import HistoryPage from "./pages/HistoryPage";
import { DATA } from "./data";
import { C } from "./theme";
import { fetchActivityById } from "./api";

function loadFromStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [page, setPage] = useState("signin");
  const [user, setUser] = useState(() => loadFromStorage("ml_user", null));
  const [userLoc, setUserLoc] = useState(null);
  const [filters, setFilters] = useState({ category: "All", price: "All", distance: 3, timeSlot: "Any" });
  const [favorites, setFavorites] = useState(() => loadFromStorage("ml_favorites", []));
  const [history, setHistory] = useState(() => loadFromStorage("ml_history", []));
  const [selectedId, setSelectedId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [activityCache, setActivityCache] = useState({});
  const [activityLoadState, setActivityLoadState] = useState({});

  useEffect(() => {
    if (user) setPage("main");
  }, []);

  useEffect(() => {
    const idsToHydrate = new Set([...favorites, ...history.map((h) => h.id)]);
    idsToHydrate.forEach((id) => {
      if (!id) return;
      fetchActivityById(id)
        .then((activity) => {
          if (activity) setActivityCache((c) => ({ ...c, [id]: activity }));
        })
        .catch(() => {});
    });
  }, []);

  useEffect(() => {
    try { localStorage.setItem("ml_user", JSON.stringify(user)); } catch {}
  }, [user]);
  useEffect(() => {
    try { localStorage.setItem("ml_favorites", JSON.stringify(favorites)); } catch {}
  }, [favorites]);
  useEffect(() => {
    try { localStorage.setItem("ml_history", JSON.stringify(history)); } catch {}
  }, [history]);

  const goTo = useCallback((p) => { setPage(p); window.scrollTo?.(0, 0); }, []);

  const handleSignIn = (email, name) => {
    setUser({ email, name: name || email.split("@")[0] });
    goTo("main");
  };

  const handleSignOut = () => {
    setUser(null);
    goTo("signin");
  };

  const toggleFavorite = (activityOrId) => {
    if (!user) { goTo("signin"); return; }
    const id = typeof activityOrId === "object" ? activityOrId.id : activityOrId;
    if (typeof activityOrId === "object") {
      setActivityCache((c) => ({ ...c, [id]: activityOrId }));
    }
    setFavorites((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));
  };

  const openDetail = (activityOrId) => {
    let id, fullActivity;
    if (typeof activityOrId === "object" && activityOrId !== null) {
      fullActivity = activityOrId;
      id = activityOrId.id;
      setActivityCache((c) => ({ ...c, [id]: fullActivity }));
      setActivityLoadState((s) => ({ ...s, [id]: "ready" }));
    } else {
      id = activityOrId;
      if (!activityCache[id]) {
        setActivityLoadState((s) => ({ ...s, [id]: "loading" }));
        fetchActivityById(id)
          .then(function (activity) {
            if (activity) {
              setActivityCache((c) => ({ ...c, [id]: activity }));
              setActivityLoadState((s) => ({ ...s, [id]: "ready" }));
            } else {
              setActivityLoadState((s) => ({ ...s, [id]: "error" }));
            }
          })
          .catch(function () {
            setActivityLoadState((s) => ({ ...s, [id]: "error" }));
          });
      }
    }
    setSelectedId(id);
    if (user) {
      setHistory((h) => [{ id, viewedAt: Date.now() }, ...h.filter((e) => e.id !== id)].slice(0, 50));
    }
    goTo("detail");
  };

  const clearHistory = () => setHistory([]);

  const selectedActivity = activityCache[selectedId] || DATA.find((d) => d.id === selectedId);
  const selectedActivityState = activityCache[selectedId]
    ? "ready"
    : (activityLoadState[selectedId] || (selectedActivity ? "ready" : "loading"));

  return (
    <div style={{ background: C.bg, minHeight: "100vh" }}>
      {(page === "signin" || page === "signup" || page === "forgot") ? (
        page === "signin" ? <SignInPage goTo={goTo} onSignIn={handleSignIn} /> :
        page === "signup" ? <SignUpPage goTo={goTo} onSignIn={handleSignIn} /> :
        <ForgotPasswordPage goTo={goTo} />
      ) : (
        <>
          <TopNav goTo={goTo} user={user} onSignOut={handleSignOut} current={page} />
          {page === "main" && (
            <MainPage
              goTo={goTo} userLoc={userLoc} setUserLoc={setUserLoc}
              filters={filters} setFilters={setFilters}
              onSearch={() => goTo("results")}
            />
          )}
          {page === "results" && userLoc && (
            <ResultsPage
              goTo={goTo} userLoc={userLoc} setUserLoc={setUserLoc} filters={filters} setFilters={setFilters}
              favorites={favorites} toggleFavorite={toggleFavorite}
              onOpenDetail={openDetail} hoveredId={hoveredId} setHoveredId={setHoveredId}
            />
          )}
          {page === "detail" && (
            <DetailPage
              goTo={goTo} activity={selectedActivity} activityState={selectedActivityState}
              favorites={favorites} toggleFavorite={toggleFavorite} userLoc={userLoc}
              onOpenDetail={openDetail}
           />
          )}
          {page === "favorites" && (
            <FavoritesPage goTo={goTo} user={user} favorites={favorites} activityCache={activityCache} toggleFavorite={toggleFavorite} onOpenDetail={openDetail} />
          )}
          {page === "history" && (
            <HistoryPage goTo={goTo} user={user} history={history} favorites={favorites} toggleFavorite={toggleFavorite} onOpenDetail={openDetail} clearHistory={clearHistory} />
          )}
          <MobileNav goTo={goTo} current={page} user={user} />
        </>
      )}
    </div>
  );
}