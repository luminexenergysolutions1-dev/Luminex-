import { useEffect, useState, type ReactNode } from "react";
import { listMedia, uploadMedia } from "@/lib/api";
import type { MediaItem } from "@/lib/types";
import { isVideoUrl, isImageUrl } from "@/utils/media";
import { UPLOAD_ACCEPT_ATTRIBUTE, formatFileSize, videoCompatibilityNote, videoTypeFromUrl } from "@/utils/media";
import { cn } from "@/utils/cn";

export { isVideoUrl, isImageUrl };

export const inputCls =
  "w-full rounded-lg border border-charcoal/12 bg-white px-3.5 min-h-[44px] text-sm text-charcoal focus:border-energy focus:ring-2 focus:ring-energy/20 outline-none";

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-charcoal mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-xs text-charcoal/50 mt-1">{hint}</span>}
    </label>
  );
}

export function TextInput({ value, onChange, label, hint, type = "text", placeholder }: { value: string; onChange: (v: string) => void; label: string; hint?: string; type?: string; placeholder?: string }) {
  return (
    <Field label={label} hint={hint}>
      <input type={type} className={inputCls} value={value ?? ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}

export function TextArea({ value, onChange, label, hint, rows = 4 }: { value: string; onChange: (v: string) => void; label: string; hint?: string; rows?: number }) {
  return (
    <Field label={label} hint={hint}>
      <textarea rows={rows} className={cn(inputCls, "py-2.5")} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}

/** Multi-line list editor: one item per line */
export function ListInput({ value, onChange, label, hint }: { value: string[]; onChange: (v: string[]) => void; label: string; hint?: string }) {
  const [text, setText] = useState((value ?? []).join("\n"));
  useEffect(() => setText((value ?? []).join("\n")), [value]);
  return (
    <Field label={label} hint={hint ?? "One item per line"}>
      <textarea
        rows={Math.max(3, (value ?? []).length + 1)}
        className={cn(inputCls, "py-2.5")}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => onChange(text.split("\n").map((s) => s.trim()).filter(Boolean))}
      />
    </Field>
  );
}

export function PairListInput({ value, onChange, label }: { value: { title: string; body: string }[]; onChange: (v: { title: string; body: string }[]) => void; label: string }) {
  const update = (i: number, k: "title" | "body", v: string) => {
    const next = value.map((it, idx) => (idx === i ? { ...it, [k]: v } : it));
    onChange(next);
  };
  return (
    <div>
      <span className="block text-sm font-semibold text-charcoal mb-2">{label}</span>
      <div className="space-y-3">
        {value.map((it, i) => (
          <div key={i} className="rounded-lg border border-charcoal/10 p-3 grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
            <input className={inputCls} value={it.title} placeholder="Title" onChange={(e) => update(i, "title", e.target.value)} />
            <input className={inputCls} value={it.body} placeholder="Description" onChange={(e) => update(i, "body", e.target.value)} />
            <button type="button" onClick={() => onChange(value.filter((_, idx) => idx !== i))} className="min-h-[44px] px-3 text-sm text-red-600 hover:bg-red-50 rounded-lg">Remove</button>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => onChange([...value, { title: "", body: "" }])} className="mt-2 text-sm font-semibold text-energy min-h-[44px]">+ Add item</button>
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="inline-flex items-center gap-3 cursor-pointer min-h-[44px]">
      <span
        role="switch"
        aria-checked={checked}
        tabIndex={0}
        onKeyDown={(e) => e.key === " " && onChange(!checked)}
        onClick={() => onChange(!checked)}
        className={cn("relative h-6 w-11 rounded-full transition", checked ? "bg-fresh" : "bg-charcoal/20")}
      >
        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition", checked ? "left-[22px]" : "left-0.5")} />
      </span>
      <span className="text-sm font-medium">{label}</span>
    </label>
  );
}

/** Image/video picker: URL input + upload + choose from media library. Supports video files. */
export function ImageInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");
  const [progress, setProgress] = useState(0);
  const [previewSrc, setPreviewSrc] = useState("");
  const [previewName, setPreviewName] = useState("");
  const video = isVideoUrl(value);
  const currentVideoType = videoTypeFromUrl(value);
  const compat = currentVideoType ? videoCompatibilityNote(currentVideoType) : null;

  const load = async () => {
    try {
      setItems(await listMedia());
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  useEffect(() => {
    return () => {
      if (previewSrc) URL.revokeObjectURL(previewSrc);
    };
  }, [previewSrc]);

  const onUpload = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true);
    setErr("");
    setNote("");
    setPreviewSrc(URL.createObjectURL(f));
    setPreviewName(f.name);
    setProgress(0);
    try {
      const m = await uploadMedia(f, {
        onProgress: (p) => setProgress(p.percent),
      });
      onChange(m.url);
      setNote(`${f.name} uploaded (${formatFileSize(f.size)}).`);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <span className="block text-sm font-semibold text-charcoal mb-1.5">{label}</span>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="h-24 w-36 shrink-0 overflow-hidden rounded-lg bg-soft ring-1 ring-charcoal/10 relative">
          {previewSrc ? (
            isVideoUrl(previewName) ? (
              <video src={previewSrc} className="h-full w-full object-cover" controls playsInline preload="metadata" />
            ) : (
              <img src={previewSrc} alt="" className="h-full w-full object-cover" />
            )
          ) : video ? (
            <video src={value} className="h-full w-full object-cover" muted playsInline preload="metadata" />
          ) : (
            value && <img src={value} alt="" className="h-full w-full object-cover" />
          )}
          {video && !previewSrc && (
            <span className="absolute inset-0 grid place-items-center text-white pointer-events-none">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="drop-shadow"><path d="M8 5v14l11-7z" /></svg>
            </span>
          )}
        </div>
        <div className="flex-1 space-y-2">
          <input className={inputCls} value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder="Image URL or video URL" />
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex items-center min-h-[40px] px-3 rounded-lg bg-soft text-sm font-semibold cursor-pointer hover:bg-ice">
              {busy ? "Uploading…" : video || value ? "Upload another" : "Upload image or video"}
              <input type="file" accept={UPLOAD_ACCEPT_ATTRIBUTE} className="sr-only" onChange={(e) => onUpload(e.target.files?.[0])} />
            </label>
            <button type="button" onClick={() => { setOpen((o) => !o); if (!open) load(); }} className="min-h-[40px] px-3 rounded-lg bg-soft text-sm font-semibold hover:bg-ice">
              {open ? "Close library" : "Choose from library"}
            </button>
          </div>
          <p className="text-xs text-charcoal/50">
            Images up to 5MB · videos (MP4, M4V, MOV, WebM, MKV, AVI, MPEG, 3GP, WMV, FLV) up to 50MB · PDF up to 5MB. Files are checked by content, not just by name, and large videos upload in resumable chunks.
          </p>
          {busy && (
            <div className="h-1.5 w-full rounded-full bg-soft overflow-hidden">
              <div className="h-full bg-energy transition-all" style={{ width: `${progress}%` }} />
            </div>
          )}
          {note && <p className="text-xs text-green-700">{note}</p>}
          {compat && <p className="text-xs text-amber-700">{compat}</p>}
          {err && <p className="text-xs text-red-600">{err}</p>}
        </div>
      </div>
      {open && (
        <div className="mt-3 grid grid-cols-3 sm:grid-cols-5 gap-2 max-h-56 overflow-y-auto rounded-lg border border-charcoal/10 p-2">
          {items.length === 0 && <p className="col-span-full text-xs text-charcoal/50 p-2">No images or videos in the library yet.</p>}
          {items.map((m) => {
            const v = isVideoUrl(m.url);
            return (
              <button key={m.name} type="button" onClick={() => { onChange(m.url); setOpen(false); }} className={cn("relative aspect-square overflow-hidden rounded-md ring-2", value === m.url ? "ring-energy" : "ring-transparent hover:ring-charcoal/20")}>
                {v ? (
                  <>
                    <video src={m.url} className="h-full w-full object-cover" muted playsInline preload="metadata" />
                    <span className="absolute inset-0 grid place-items-center text-white bg-charcoal/25">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                    </span>
                  </>
                ) : (
                  <img src={m.url} alt={m.name} className="h-full w-full object-cover" loading="lazy" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function SaveBar({ saving, saved, error, onSave }: { saving: boolean; saved: boolean; error: string; onSave: () => void }) {
  return (
    <div className="sticky bottom-0 -mx-4 sm:-mx-6 mt-8 flex items-center justify-between gap-3 border-t border-charcoal/8 bg-white/95 backdrop-blur px-4 sm:px-6 py-3">
      <p className={cn("text-sm", error ? "text-red-600" : "text-fresh")}>{error || (saved ? "Saved — changes are live on the website." : "")}</p>
      <button onClick={onSave} disabled={saving} className="min-h-[44px] rounded-lg bg-charcoal px-5 text-sm font-semibold text-white hover:bg-[#1c2733] disabled:opacity-50">
        {saving ? "Saving…" : "Save changes"}
      </button>
    </div>
  );
}

export function Card({ title, children, actions }: { title?: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="rounded-2xl bg-white ring-1 ring-charcoal/6 p-4 sm:p-6">
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 mb-5">
          {title && <h2 className="text-lg font-bold">{title}</h2>}
          {actions}
        </div>
      )}
      <div className="space-y-5">{children}</div>
    </section>
  );
}

/** Hook: edit a settings section and save it */
export function useSettingForm<T>(initial: T, save: (v: T) => Promise<void>, onSaved?: () => Promise<void>) {
  const [form, setForm] = useState<T>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => setForm(initial), [initial]);
  const set = <K extends keyof T>(k: K) => (v: T[K]) => setForm((f) => ({ ...f, [k]: v }));
  const onSave = async () => {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      await save(form);
      await onSaved?.();
      setSaved(true);
    } catch (e) {
      setError((e as Error).message || "Could not save.");
    } finally {
      setSaving(false);
    }
  };
  return { form, set, setForm, saving, saved, error, onSave };
}
