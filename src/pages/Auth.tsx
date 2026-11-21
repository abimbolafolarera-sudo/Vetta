import { useState } from "react";
import { A, Field, Icon, Logo } from "../components/ui";
import { DEMO, DEMO_ACCOUNTS, resetPassword, signIn, signUp } from "../lib/api";
import { go } from "../router";

export function Login() {
  const [email, setEmail] = useState(""); const [pw, setPw] = useState("");
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setBusy(true);
    try { await signIn(email, pw); go("home"); } catch (x: any) { setErr(x.message); } finally { setBusy(false); }
  }
  return (
    <main id="main" className="auth">
      <div className="auth__card">
        <Logo draw />
        <h1 className="h1">Log in</h1>
        <form onSubmit={submit} noValidate>
          <Field label="Email" id="le"><input id="le" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></Field>
          <Field label="Password" id="lp"><input id="lp" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" /></Field>
          {err && <p className="form-fail" role="alert">{err}</p>}
          {msg && <p className="ok" role="status">{msg}</p>}
          <button className="btn btn--brand btn--block" disabled={busy}>{busy ? "Logging in…" : "Log in"}</button>
        </form>
        <button className="link-btn" onClick={async () => {
          if (!email) { setErr("Type your email first, then tap Forgot password."); return; }
          try { await resetPassword(email); setMsg("Check your email for a reset link."); } catch (x: any) { setErr(x.message); }
        }}>Forgot password?</button>
        <div className="auth__new"><p>New to Vetta?</p><A page="signup" arg="creator" className="btn btn--soft btn--block">Sign up as a creator</A><A page="signup" arg="brand" className="btn btn--soft btn--block">Sign up as a brand</A></div>
        {DEMO && (
          <div className="demo-accts">
            <p><b>Preview accounts</b> (password: demo)</p>
            {DEMO_ACCOUNTS.map((a) => (
              <button key={a.email} className="chip" onClick={async () => { setErr(""); try { await signIn(a.email, "demo"); go("home"); } catch (x: any) { setErr(x.message); } }}>{a.label}</button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

export function Signup({ role: initial }: { role?: string }) {
  const [role, setRole] = useState<"creator" | "brand" | "">(initial === "brand" || initial === "creator" ? initial : "");
  const [f, setF] = useState({ display_name: "", company: "", email: "", password: "", agree: false });
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false); const [confirm, setConfirm] = useState(false);

  if (confirm) return (
    <main id="main" className="auth"><div className="auth__card">
      <span className="done-box__i"><Icon name="check" /></span>
      <h1 className="h2">Check your email</h1>
      <p className="muted">We sent a confirmation link to {f.email}. Open it to finish creating your account.</p>
    </div></main>
  );

  if (!role) return (
    <main id="main" className="auth">
      <div className="auth__card auth__card--wide">
        <Logo draw />
        <h1 className="h1">Join Vetta</h1>
        <div className="role-pick">
          <button onClick={() => setRole("creator")}><Icon name="star" size={28} /><b>I'm a creator</b><span>Enter Drops, build your profile, take paid Tasks.</span></button>
          <button onClick={() => setRole("brand")}><Icon name="brands" size={28} /><b>I'm a brand</b><span>Find vetted creators, shortlist, message and brief them.</span></button>
        </div>
        <p className="auth__alt">Already have an account? <A page="login">Log in</A></p>
      </div>
    </main>
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    if (!f.display_name.trim()) return setErr(role === "brand" ? "Add your name." : "Add the name you create under.");
    if (role === "brand" && !f.company.trim()) return setErr("Add your company or brand name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) return setErr("Add a valid email address.");
    if (!f.agree) return setErr("Agree to the terms to continue.");
    setBusy(true);
    try {
      const r = await signUp({ email: f.email, password: f.password, role: role as "creator" | "brand", display_name: role === "brand" ? f.company : f.display_name, company: role === "brand" ? f.company : undefined });
      if (r === "confirm") setConfirm(true); else go(role === "creator" ? "enter" : "explore");
    } catch (x: any) { setErr(x.message); } finally { setBusy(false); }
  }

  return (
    <main id="main" className="auth">
      <div className="auth__card">
        <button className="link-btn back-btn" onClick={() => setRole("")}><Icon name="back" size={18} /> Back</button>
        <h1 className="h1">{role === "brand" ? "Brand account" : "Creator account"}</h1>
        <p className="muted">{role === "brand" ? "Free. Browse, shortlist, message and brief vetted creators." : "Free. Your profile stays private until you're vetted."}</p>
        <form onSubmit={submit} noValidate>
          {role === "brand" ? (
            <>
              <Field label="Company or brand" id="sc"><input id="sc" value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} autoComplete="organization" /></Field>
              <Field label="Your name" id="sn"><input id="sn" value={f.display_name} onChange={(e) => setF({ ...f, display_name: e.target.value })} autoComplete="name" /></Field>
            </>
          ) : (
            <Field label="Creator name" id="sn" hint="How brands will see you. You can change it later."><input id="sn" value={f.display_name} onChange={(e) => setF({ ...f, display_name: e.target.value })} autoComplete="nickname" /></Field>
          )}
          <Field label={role === "brand" ? "Work email" : "Email"} id="se"><input id="se" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoComplete="email" /></Field>
          <Field label="Password" id="sp" hint="At least 8 characters."><input id="sp" type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} autoComplete="new-password" /></Field>
          <label className="check"><input type="checkbox" checked={f.agree} onChange={(e) => setF({ ...f, agree: e.target.checked })} /><span>I agree to the <A page="terms">terms and privacy notice</A>.</span></label>
          {err && <p className="form-fail" role="alert">{err}</p>}
          <button className="btn btn--brand btn--block" disabled={busy}>{busy ? "Creating…" : "Create account"}</button>
        </form>
        <p className="auth__alt">Already have an account? <A page="login">Log in</A></p>
      </div>
    </main>
  );
}
