import { useEffect, useRef, useState } from "react";
import { Avatar, Icon, Loading, Mark, timeAgo, toast } from "../components/ui";
import { listMessages, myThread, sendMessage } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { Conversation, Message, Profile } from "../lib/types";
import { go } from "../router";
import { Gate } from "./Create";

/** Everyone's inbox is one conversation with the Vetta team. */
export default function Inbox() {
  const { user, loading } = useAuth();
  const [conv, setConv] = useState<Conversation | null>(null); const [err, setErr] = useState("");
  useEffect(() => { if (user && user.role !== "admin") myThread().then(setConv).catch((e) => setErr(e.message)); }, [user?.id]);
  if (loading) return <main id="main" className="page"><Loading /></main>;
  if (!user) return <Gate text="Log in to message the Vetta team." />;
  if (user.role === "admin") { go("admin"); return null; }
  return (
    <main id="main" className="page page--narrow inbox-one">
      <header className="inbox-head card card--print">
        <Mark size={44} />
        <div><h1 className="h2">Vetta team</h1><p className="muted">{user.role === "brand" ? "Ask about creators, campaigns or a brief you've sent. We handle every introduction." : "Questions about your entry, gigs or payouts. We usually reply within a working day."}</p></div>
      </header>
      {err && <p className="form-fail">{err}</p>}
      {conv ? <ThreadView conv={conv} me={user} people={{}} /> : !err && <Loading />}
    </main>
  );
}

export function ThreadView({ conv, me, people, teamView }: { conv: Conversation; me: Profile; people: Record<string, Profile>; teamView?: boolean }) {
  const [msgs, setMsgs] = useState<Message[]>([]); const [text, setText] = useState("");
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let live = true;
    const load = () => listMessages(conv.id).then((m) => live && setMsgs(m)).catch(() => {});
    load(); const t = setInterval(load, 4000);
    return () => { live = false; clearInterval(t); };
  }, [conv.id]);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [msgs.length]);
  const mine = (m: Message) => teamView ? m.sender_id !== conv.user_id : m.sender_id === me.id;
  return (
    <div className="thread thread--one">
      <div className="thread__msgs">
        {msgs.length === 0 && <p className="muted thread__hint">{teamView ? "No messages yet." : "Send us a message to start."}</p>}
        {msgs.map((m) => (
          <div key={m.id} className={`bubble ${mine(m) ? "bubble--me" : ""}`}>
            {!mine(m) && !teamView && <span className="bubble__who"><Mark size={14} /> Vetta team</span>}
            {teamView && !mine(m) && people[m.sender_id] && <span className="bubble__who"><Avatar p={people[m.sender_id]} size={14} /> {people[m.sender_id].display_name}</span>}
            <p>{m.body}</p><small>{timeAgo(m.created_at)}</small>
          </div>
        ))}
        <div ref={end} />
      </div>
      <form className="thread__compose" onSubmit={async (e) => { e.preventDefault(); const t = text; setText(""); try { await sendMessage(conv.id, t); setMsgs(await listMessages(conv.id)); } catch (x: any) { toast(x.message); setText(t); } }}>
        <input aria-label="Message" placeholder={teamView ? "Reply as Vetta" : "Message the Vetta team"} value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} />
        <button className="icon-btn icon-btn--brand" aria-label="Send" disabled={!text.trim()}><Icon name="send" size={20} /></button>
      </form>
    </div>
  );
}
