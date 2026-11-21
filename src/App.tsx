import { useEffect } from "react";
import { A, Toaster } from "./components/ui";
import { Shell } from "./components/Shell";
import { useRoute } from "./router";
import { config } from "./config";
import Feed from "./pages/Feed";
import Explore from "./pages/Explore";
import ProfilePage from "./pages/Profile";
import { Login, Signup } from "./pages/Auth";
import { Enter, Upload } from "./pages/Create";
import { Me, Settings } from "./pages/Account";
import { CampaignNew, Earn } from "./pages/Earn";
import Learn from "./pages/Learn";
import Inbox from "./pages/Inbox";
import { About, BriefPage, Brands, Terms } from "./pages/Info";
import Admin from "./pages/Admin";

const TITLES: Record<string, string> = {
  home: "Vetta", explore: "Explore — Vetta", u: "Vetta", me: "Profile — Vetta", settings: "Settings — Vetta", upload: "Upload — Vetta",
  enter: `Enter ${config.drop} — Vetta`, earn: "Earn Now — Vetta", campaign: "Post a campaign — Vetta", learn: "Learn — Vetta", inbox: "Inbox — Vetta", brands: "For brands — Vetta", brief: "Send a brief — Vetta",
  login: "Log in — Vetta", signup: "Join Vetta", admin: "Admin — Vetta", about: "About — Vetta", terms: "Terms — Vetta",
};

export default function App() {
  const r = useRoute();
  const page = r.page === "creators" || r.page === "c" ? (r.page === "c" ? "u" : "explore") : r.page === "apply" ? "enter" : r.page === "clips" || r.page === "tasks" ? "earn" : r.page;
  useEffect(() => { document.title = page === "u" && r.arg ? `@${r.arg} — Vetta` : TITLES[page] ?? "Vetta"; }, [page, r.arg]);

  let view;
  switch (page) {
    case "home": view = <Feed />; break;
    case "explore": view = <Explore niche={r.arg} />; break;
    case "u": view = <ProfilePage handle={r.arg} />; break;
    case "me": view = <Me />; break;
    case "settings": view = <Settings />; break;
    case "upload": view = <Upload />; break;
    case "enter": view = <Enter />; break;
    case "earn": view = <Earn />; break;
    case "campaign": view = <CampaignNew />; break;
    case "learn": view = <Learn />; break;
    case "inbox": view = <Inbox />; break;
    case "brands": view = <Brands />; break;
    case "brief": view = <BriefPage />; break;
    case "login": view = <Login />; break;
    case "signup": view = <Signup role={r.arg} />; break;
    case "admin": view = <Admin />; break;
    case "about": view = <About />; break;
    case "terms": view = <Terms />; break;
    default: view = <main id="main" className="page empty-state"><h1 className="h2">This page doesn't exist.</h1><A page="home" className="btn btn--brand">Go to For You</A></main>;
  }
  return (
    <>
      <a className="skip" href="#main" onClick={(e) => { e.preventDefault(); const m = document.getElementById("main"); if (m) { m.setAttribute("tabindex", "-1"); m.focus(); } }}>Skip to content</a>
      <Shell page={page} immersive={page === "home"}>{view}</Shell>
      <Toaster />
    </>
  );
}
