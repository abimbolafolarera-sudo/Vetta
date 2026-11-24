import React, { useEffect, useState } from "react";
import { A, Avatar, Icon, Logo, Sheet } from "./ui";
import { go } from "../router";
import { EARN, config } from "../config";
import { DEMO } from "../lib/api";
import { useAuth } from "../lib/auth";

type NavItem = { page: string; label: string; icon: string; show: boolean };

export function useNav(): NavItem[] {
  const { user } = useAuth();
  return [
    { page: "home", label: "For You", icon: "home", show: true },
    { page: "explore", label: "Explore", icon: "explore", show: true },
    { page: "earn", label: EARN.name, icon: "earn", show: true },
    { page: "learn", label: "Learn", icon: "learn", show: !user || user.role !== "brand" },
    { page: "inbox", label: "Message Vetta", icon: "inbox", show: !!user && user.role !== "admin" },
    { page: "brands", label: "For brands", icon: "brands", show: !user },
    { page: "me", label: user?.role === "brand" ? "Dashboard" : "Profile", icon: "user", show: !!user && user.role !== "admin" },
    { page: "about", label: "About", icon: "info", show: true },
    { page: "admin", label: "Admin", icon: "shield", show: user?.role === "admin" },
  ];
}

export function Shell({ page, children, immersive }: { page: string; children: React.ReactNode; immersive?: boolean }) {
  const { user } = useAuth();
  const nav = useNav().filter((n) => n.show);
  const [menu, setMenu] = useState(false); const [join, setJoin] = useState(false);
  useEffect(() => { setMenu(false); setJoin(false); }, [page]);
  const canBack = page !== "home";
  const back = () => { if (window.history.length > 1) window.history.back(); else go("home"); };
  const on = (p: string) => page === p || (p === "me" && (page === "u" && false));
  const plus = user?.role === "creator" ? { page: "upload", label: "Upload" } : user?.role === "brand" ? { page: "campaign", label: "Post a campaign" } : { page: "enter", label: `Enter ${config.drop}` };

  return (
    <div className={`shell ${immersive ? "shell--immersive" : ""} ${DEMO ? "has-flag" : ""}`}>
      {DEMO && <div className="flag">Preview mode: sample data on this device</div>}

      <aside className="side" aria-label="Main">
        <A page="home" className="side__logo" ariaLabel="Vetta home"><Logo /></A>
        {!user && (
          <div className="join-box">
            <p className="join-box__t">Join Vetta</p>
            <A page="signup" arg="creator" className="btn btn--brand btn--block"><Icon name="star" size={18} /> Sign up as a creator</A>
            <A page="signup" arg="brand" className="btn btn--ghost btn--block"><Icon name="brands" size={18} /> Sign up as a brand</A>
            <p className="join-box__login">Have an account? <A page="login">Log in</A></p>
          </div>
        )}
        <nav className="side__nav">
          {nav.map((n) => (
            <A key={n.page} page={n.page} className={`side__link ${on(n.page) ? "is-on" : ""}`} ariaCurrent={on(n.page)}>
              <Icon name={n.icon} /><span>{n.label}</span>
            </A>
          ))}
        </nav>
        {user && <A page={plus.page} className="btn btn--brand btn--block"><Icon name="plus" size={20} /> {plus.label}</A>}
        {user?.role === "creator" && <A page="enter" className="btn btn--ghost btn--block">Enter {config.drop}</A>}
        <div className="side__foot">
          {user && (
            <A page="settings" className="side__me">
              <Avatar p={user} size={32} /><span><b>{user.display_name}</b><small>@{user.handle}</small></span><Icon name="settings" size={18} />
            </A>
          )}
          {!user && <A page="settings" className={`side__link ${on("settings") ? "is-on" : ""}`}><Icon name="settings" /><span>Settings</span></A>}
          <div className="side__links"><A page="terms">Terms and privacy</A></div>
        </div>
      </aside>

      <header className="top">
        <span className="top__left">{canBack && <button className="icon-btn top__back" onClick={back} aria-label="Back"><Icon name="back" /></button>}<A page="home" ariaLabel="Vetta home"><Logo /></A></span>
        <div className="top__right">
          {!user && <button className="btn btn--brand btn--sm top__join" onClick={() => setJoin(true)}>Sign up</button>}
          {user && <A page="explore" className="icon-btn" ariaLabel="Search"><Icon name="search" /></A>}
          {user && <A page="inbox" className="icon-btn" ariaLabel="Inbox"><Icon name="inbox" /></A>}
          <button className="icon-btn" aria-label="Menu" aria-expanded={menu} onClick={() => setMenu(true)}><Icon name="menu" /></button>
        </div>
      </header>

      <div className="stage">
        {canBack && <div className="backbar"><button className="backbtn" onClick={back}><Icon name="back" size={18} /> Back</button></div>}
        {children}
      </div>

      <nav className="tabbar" aria-label="Main">
        <A page="home" className={`tab ${on("home") ? "is-on" : ""}`}><Icon name="home" /><span>Home</span></A>
        <A page="explore" className={`tab ${on("explore") ? "is-on" : ""}`}><Icon name="explore" /><span>Explore</span></A>
        {user ? <A page={plus.page} className="tab__plus" ariaLabel={plus.label}><Icon name="plus" size={24} /></A> : <button className="tab__plus" onClick={() => setJoin(true)} aria-label="Sign up"><Icon name="plus" size={24} /></button>}
        <A page="earn" className={`tab ${on("earn") ? "is-on" : ""}`}><Icon name="earn" /><span>{EARN.name}</span></A>
        <A page={user ? (user.role === "admin" ? "admin" : "me") : "login"} className={`tab ${on("me") || on("login") || on("admin") ? "is-on" : ""}`}><Icon name="user" /><span>{user ? (user.role === "brand" ? "Dashboard" : user.role === "admin" ? "Admin" : "Profile") : "Log in"}</span></A>
      </nav>

      <Sheet open={menu} onClose={() => setMenu(false)} title="Menu">
        <ul className="menu">
          {nav.map((n) => <li key={n.page}><A page={n.page} className={on(n.page) ? "is-on" : ""}><Icon name={n.icon} /> {n.label}</A></li>)}
          <li><A page="settings"><Icon name="settings" /> Settings</A></li>
          {!user && <><li><A page="signup" arg="creator"><Icon name="star" /> Sign up as a creator</A></li><li><A page="signup" arg="brand"><Icon name="brands" /> Sign up as a brand</A></li><li><A page="login"><Icon name="user" /> Log in</A></li></>}
          <li><A page="terms"><Icon name="flag" /> Terms and privacy</A></li>
        </ul>
      </Sheet>
      <Sheet open={join} onClose={() => setJoin(false)} title="Join Vetta">
        <div className="join-pick">
          <A page="signup" arg="creator"><Icon name="star" size={26} /><b>Sign up as a creator</b><span>Enter Drops, build your profile, earn from paid gigs.</span></A>
          <A page="signup" arg="brand"><Icon name="brands" size={26} /><b>Sign up as a brand</b><span>Find vetted creators, post campaigns, brief Vetta.</span></A>
        </div>
        <p className="join-box__login">Have an account? <A page="login">Log in</A></p>
      </Sheet>
    </div>
  );
}
