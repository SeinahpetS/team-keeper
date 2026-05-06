
/* ---------- Your contributions ---------- */

function VideoThumb({ url }: { url: string }) {
  return (
    <video
      src={url}
      className="absolute inset-0 h-full w-full object-cover"
      muted
      playsInline
      preload="metadata"
      onLoadedMetadata={(e) => { try { (e.currentTarget as HTMLVideoElement).currentTime = 0.1; } catch { /* ignore */ } }}
    />
  );
}

function YourContributions({
  clips, events, roster, locked, onOpen,
}: {
  clips: MyClip[];
  events: EventRow[];
  roster: RosterRow[];
  locked: boolean;
  onOpen: (id: string) => void;
}) {
  const eventName = (id: string | null) => events.find((e) => e.id === id)?.name ?? "Unassigned";
  const playerLabel = (ids: string[] | null) => {
    if (!ids || ids.length === 0) return null;
    const names = ids
      .map((i) => roster.find((r) => r.id === i)?.player_name)
      .filter(Boolean) as string[];
    if (names.length === 0) return null;
    if (names.length <= 2) return names.join(", ");
    return `${names.slice(0, 2).join(", ")} +${names.length - 2}`;
  };
  return (
    <div className="mt-8">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs" style={{ color: "#4DBF78", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" }}>
          Your contributions
        </p>
        {locked && (
          <span className="flex items-center gap-1 text-[10px]" style={{ color: "#F0C84A", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            <Lock className="h-3 w-3" /> Compile locked
          </span>
        )}
      </div>

      {clips.length === 0 ? (
        <div className="rounded-xl px-4 py-8 text-center" style={{ background: "#0F2E1A", border: "1px dashed #1E6B3D" }}>
          <p className="text-sm" style={{ color: "#A8DBBA", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            No clips yet — be the first to contribute
          </p>
        </div>
      ) : (
        <div className="-mx-5 overflow-x-auto px-5 pb-2">
          <div className="flex gap-3" style={{ width: "max-content" }}>
            {clips.map((c) => {
              const tags: string[] = [];
              if (c.vibe) tags.push(c.vibe);
              if (c.content_type) tags.push(c.content_type === "broll" ? (c.broll_type ?? "B-roll") : "Play");
              const players = playerLabel(c.player_tags);
              if (players) tags.push(players);
              return (
                <button
                  key={c.id}
                  onClick={() => onOpen(c.id)}
                  className="flex w-[180px] shrink-0 flex-col overflow-hidden rounded-xl text-left"
                  style={{ background: "#0F2E1A", border: "1.5px solid #1E6B3D" }}
                >
                  <div className="relative aspect-video w-full overflow-hidden" style={{ background: "#000" }}>
                    <VideoThumb url={c.file_url} />
                    {locked && (
                      <div className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full" style={{ background: "rgba(0,0,0,0.65)", color: "#F0C84A" }}>
                        <Lock className="h-3 w-3" />
                      </div>
                    )}
                    {c.flagged_for_trim_review && (
                      <div className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px]" style={{ background: "rgba(0,0,0,0.65)", color: "#F0C84A", fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                        <Flag className="h-2.5 w-2.5" /> Flagged
                      </div>
                    )}
                  </div>
                  <div className="p-2.5">
                    <p className="truncate text-xs" style={{ color: "#F0C84A", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                      {eventName(c.event_id)}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {tags.map((t, i) => (
                        <span key={i} className="rounded-full px-1.5 py-0.5 text-[9px]" style={{ background: "#144D2E", color: "#A8DBBA", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", border: "1px solid #1E6B3D" }}>
                          {t}
                        </span>
                      ))}
                      {tags.length === 0 && (
                        <span className="text-[10px]" style={{ color: "#4DBF78", fontFamily: "'Inter', sans-serif" }}>No tags</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ClipDetailOverlay({
  clip, mode, setMode, events, roster, locked, onClose, onSaved,
}: {
  clip: MyClip;
  mode: "preview" | "edit" | "trim";
  setMode: (m: "preview" | "edit" | "trim") => void;
  events: EventRow[];
  roster: RosterRow[];
  locked: boolean;
  onClose: () => void;
  onSaved: (c: Partial<MyClip> & { id: string }) => void;
}) {
  const [vibe, setVibe] = useState<string | null>(clip.vibe);
  const [contentType, setContentType] = useState<string>(clip.content_type ?? "play");
  const [brollType, setBrollType] = useState<string | null>(clip.broll_type);
  const [eventId, setEventId] = useState<string | null>(clip.event_id);
  const [playerIds, setPlayerIds] = useState<string[]>(clip.player_tags ?? []);
  const [flagged, setFlagged] = useState<boolean>(!!clip.flagged_for_trim_review);
  const [saving, setSaving] = useState(false);

  const vibes = contentType === "play" ? PLAY_VIBES : BROLL_VIBES;
  const togglePlayer = (id: string) =>
    setPlayerIds(playerIds.includes(id) ? playerIds.filter((x) => x !== id) : [...playerIds, id]);

  const save = async () => {
    setSaving(true);
    const patch = {
      vibe,
      content_type: contentType,
      broll_type: contentType === "broll" ? brollType : null,
      event_id: eventId,
      player_tags: playerIds,
    };
    const { error } = await supabase.from("clips").update(patch).eq("id", clip.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    onSaved({ id: clip.id, ...patch });
    toast.success("Tags updated");
    setMode("preview");
  };

  const flagTrim = async () => {
    const { error } = await supabase.from("clips").update({ flagged_for_trim_review: true }).eq("id", clip.id);
    if (error) { toast.error(error.message); return; }
    setFlagged(true);
    onSaved({ id: clip.id, flagged_for_trim_review: true });
    toast.message("Flagged for admin review.");
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "#0A2517" }}>
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <button onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: "#144D2E", border: "1px solid #1E6B3D", color: "#A8DBBA" }}>
          <X className="h-4 w-4" />
        </button>
        {locked && (
          <span className="flex items-center gap-1 text-[10px]" style={{ color: "#F0C84A", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            <Lock className="h-3 w-3" /> Locked for compile
          </span>
        )}
      </div>

      <div className="mx-5 overflow-hidden rounded-xl" style={{ background: "#000", aspectRatio: "16 / 9" }}>
        <video src={clip.file_url} className="h-full w-full object-contain" autoPlay loop muted playsInline />
      </div>

      <div className="mt-4 flex gap-2 px-5">
        <button
          onClick={() => setMode("preview")}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border-2 py-2.5 text-xs"
          style={{ background: mode === "preview" ? "#D4A017" : "transparent", borderColor: mode === "preview" ? "#D4A017" : "#1E6B3D", color: mode === "preview" ? "#2C1A00" : "#A8DBBA", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}
        >
          <Play className="h-3.5 w-3.5" /> Preview
        </button>
        <button
          onClick={() => !locked && setMode("edit")}
          disabled={locked}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border-2 py-2.5 text-xs disabled:opacity-50"
          style={{ background: mode === "edit" ? "#D4A017" : "transparent", borderColor: mode === "edit" ? "#D4A017" : "#1E6B3D", color: mode === "edit" ? "#2C1A00" : "#A8DBBA", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}
        >
          <Pencil className="h-3.5 w-3.5" /> Edit tags
        </button>
        <button
          onClick={() => setMode("trim")}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border-2 py-2.5 text-xs"
          style={{ background: mode === "trim" ? "#D4A017" : "transparent", borderColor: mode === "trim" ? "#D4A017" : "#1E6B3D", color: mode === "trim" ? "#2C1A00" : "#A8DBBA", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}
        >
          <Scissors className="h-3.5 w-3.5" /> View trim
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6 pt-4">
        {mode === "preview" && (
          <div className="space-y-2 text-sm" style={{ color: "#A8DBBA", fontFamily: "'Inter', sans-serif" }}>
            <p><span style={{ color: "#4DBF78" }}>Event:</span> {events.find((e) => e.id === clip.event_id)?.name ?? "Unassigned"}</p>
            <p><span style={{ color: "#4DBF78" }}>Type:</span> {clip.content_type === "broll" ? (clip.broll_type ?? "B-roll") : "Play"}</p>
            <p><span style={{ color: "#4DBF78" }}>Vibe:</span> {clip.vibe ?? "—"}</p>
            {clip.player_tags && clip.player_tags.length > 0 && (
              <p><span style={{ color: "#4DBF78" }}>Players:</span> {clip.player_tags.map((id) => roster.find((r) => r.id === id)?.player_name).filter(Boolean).join(", ")}</p>
            )}
          </div>
        )}

        {mode === "edit" && !locked && (
          <div className="space-y-5">
            <div>
              <p className="text-xs" style={{ color: "#4DBF78", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>Event</p>
              <div className="mt-2 space-y-2">
                {events.map((e) => {
                  const on = eventId === e.id;
                  return (
                    <button key={e.id} onClick={() => setEventId(on ? null : e.id)}
                      className="flex w-full items-center justify-between rounded-xl border-2 px-3 py-2.5 text-left text-sm"
                      style={{ background: on ? "#D4A017" : "#144D2E", borderColor: on ? "#D4A017" : "#1E6B3D", color: on ? "#2C1A00" : "#A8DBBA", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                      <span>{e.name}</span>
                      {on && <Check className="h-4 w-4" />}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="text-xs" style={{ color: "#4DBF78", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>Content type</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(["play", "broll"] as const).map((k) => {
                  const on = contentType === k;
                  return (
                    <button key={k} onClick={() => setContentType(k)}
                      className="rounded-xl border-2 py-2.5 text-sm"
                      style={{ background: on ? "#D4A017" : "#144D2E", borderColor: on ? "#D4A017" : "#1E6B3D", color: on ? "#2C1A00" : "#A8DBBA", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                      {k === "play" ? "Play" : "B-roll"}
                    </button>
                  );
                })}
              </div>
            </div>
            {contentType === "broll" && (
              <div>
                <p className="text-xs" style={{ color: "#4DBF78", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>B-roll type</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {BROLL_TYPES.map((t) => {
                    const on = brollType === t;
                    return (
                      <button key={t} onClick={() => setBrollType(on ? null : t)}
                        className="rounded-xl border-2 py-2.5 text-sm"
                        style={{ background: on ? "#D4A017" : "#144D2E", borderColor: on ? "#D4A017" : "#1E6B3D", color: on ? "#2C1A00" : "#A8DBBA", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {contentType === "play" && (
              <div>
                <p className="text-xs" style={{ color: "#4DBF78", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>Players</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {roster.length === 0 && <p className="text-sm" style={{ color: "#A8DBBA" }}>No active roster.</p>}
                  {roster.map((p) => {
                    const on = playerIds.includes(p.id);
                    return (
                      <button key={p.id} onClick={() => togglePlayer(p.id)}
                        className="rounded-full border-2 px-3 py-1.5 text-xs"
                        style={{ background: on ? "#D4A017" : "#144D2E", borderColor: on ? "#D4A017" : "#1E6B3D", color: on ? "#2C1A00" : "#A8DBBA", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                        {p.jersey_number ? `#${p.jersey_number} ` : ""}{p.player_name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <div>
              <p className="text-xs" style={{ color: "#4DBF78", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>Vibe</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {vibes.map((v) => {
                  const on = vibe === v;
                  return (
                    <button key={v} onClick={() => setVibe(on ? null : v)}
                      className="rounded-xl border-2 py-2.5 text-sm"
                      style={{ background: on ? "#D4A017" : "#144D2E", borderColor: on ? "#D4A017" : "#1E6B3D", color: on ? "#2C1A00" : "#A8DBBA", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                      {v}
                    </button>
                  );
                })}
              </div>
            </div>
            <PrimaryBtn onClick={save} disabled={saving}>{saving ? "Saving..." : "Save changes"}</PrimaryBtn>
          </div>
        )}

        {mode === "edit" && locked && (
          <p className="text-sm" style={{ color: "#A8DBBA" }}>This clip is locked because the admin started a compile. Tags can no longer be edited.</p>
        )}

        {mode === "trim" && (
          <div className="space-y-3">
            <p className="text-xs" style={{ color: "#4DBF78", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>
              AI trimmed version
            </p>
            <p className="text-sm" style={{ color: "#A8DBBA", fontFamily: "'Inter', sans-serif" }}>
              {flagged ? "You've already flagged this clip for review." : "We trimmed your clip to the key moment. Confirm or flag for review."}
            </p>
            {!flagged && (
              <div className="flex gap-2">
                <button onClick={() => { setFlagged(true); toast.success("Trim confirmed"); }}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm"
                  style={{ background: "#D4A017", color: "#2C1A00", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  <Check className="h-4 w-4" /> Looks good
                </button>
                <button onClick={flagTrim}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm"
                  style={{ borderColor: "#1E6B3D", color: "#A8DBBA", background: "transparent", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  <Flag className="h-4 w-4" /> Flag for review
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
