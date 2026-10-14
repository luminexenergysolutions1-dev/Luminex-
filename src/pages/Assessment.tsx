import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { jsPDF } from "jspdf";
import { Button, Container, Reveal, SectionHeading } from "@/components/ui";
import {
  ASSESSMENT,
  buildPdf,
  emptyAssessment,
  htmlEscape,
  type AppEntry,
  type AssessmentData,
} from "@/lib/assessment";

const inputCls =
  "min-h-[44px] w-full rounded-xl border border-charcoal/15 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-energy/30";
const labelCls = "block text-sm font-semibold text-charcoal mb-1.5";
const cellInput = "min-h-[40px] w-20 rounded-lg border border-charcoal/15 px-2 py-1 text-sm bg-white focus:outline-none";

function ToggleGroup({
  legend,
  options,
  multiple,
  selected,
  onChange,
}: {
  legend: string;
  options: readonly string[];
  multiple: boolean;
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <fieldset>
      <legend className={labelCls}>{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = selected.includes(o);
          return (
            <button
              key={o}
              type="button"
              aria-pressed={on}
              onClick={() =>
                onChange(on ? selected.filter((v) => v !== o) : multiple ? [...selected, o] : [o])
              }
              className={`inline-flex min-h-[40px] items-center gap-2 rounded-xl border px-3 text-sm transition-colors ${
                on ? "border-energy bg-energy/10 font-semibold text-energy" : "border-charcoal/15 bg-white text-charcoal/75"
              }`}
            >
              <span className={`grid h-4 w-4 place-items-center border-2 ${on ? "border-energy bg-energy text-white" : "border-charcoal/30"}`}>
                {on && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 16.2l-3.5-3.5L4 14.2 9 19 20 8l-1.5-1.5z" />
                  </svg>
                )}
              </span>
              {o}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export default function Assessment() {
  const [data, setData] = useState<AssessmentData>(() => emptyAssessment());
  const [previewOpen, setPreviewOpen] = useState(false);
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null);
  const sigRef = useRef<HTMLCanvasElement | null>(null);

  const set = <K extends keyof AssessmentData>(k: K, v: AssessmentData[K]) => setData((d) => ({ ...d, [k]: v }));

  const rows = useMemo<AppEntry[]>(
    () => [
      ...ASSESSMENT.categories.flatMap((c) => c.items.map((name) => ({ name, have: false, qty: "", hours: "", periods: [], old: false }))),
      ...Array.from({ length: 6 }, () => ({ name: "", have: false, qty: "", hours: "", periods: [], old: false, extra: true })),
    ],
    []
  );

  const updateRow = (i: number, patch: Partial<AppEntry>) =>
    setData((d) => {
      const apps = d.apps.slice();
      apps[i] = { ...(apps[i] || rows[i]), ...patch };
      return { ...d, apps };
    });

  const validate = () => {
    const missing: string[] = [];
    if (!data.name.trim()) missing.push("your name");
    if (!data.phone.trim()) missing.push("your phone or WhatsApp number");
    if (!data.location.trim()) missing.push("your location (town and area)");
    if (!data.spend) missing.push("your monthly electricity spend");
    return missing;
  };

  const download = (blank: boolean) => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    buildPdf(doc, data, blank);
    doc.save(
      blank
        ? "Luminex-Home-Energy-Self-Assessment-Blank.pdf"
        : `Luminex-Home-Energy-Self-Assessment-${(data.name || "Completed").replace(/[^a-z0-9]+/gi, "-")}.pdf`
    );
    setNotice({ text: "Your PDF has been downloaded. Thank you!" });
  };

  const downloadCompleted = () => {
    const missing = validate();
    if (missing.length) {
      setNotice({ text: "Please complete " + missing.join(", ") + " before downloading.", error: true });
      return;
    }
    download(false);
  };

  const clearSignature = () => {
    const c = sigRef.current;
    const ctx = c?.getContext("2d");
    if (c && ctx) ctx.clearRect(0, 0, c.width, c.height);
  };

  /** Rows the visitor has actually recorded (an appliance ticked, or a typed name). */
  const filledApps = useMemo<AppEntry[]>(
    () =>
      rows
        .map((row, i) => data.apps[i] || row)
        .filter((a): a is AppEntry => !!a && (!!a.have || (!!a.extra && a.name.trim() !== ""))),
    [rows, data.apps]
  );

  const preview = (
    <div className="space-y-6 text-sm leading-relaxed">
      <div className="rounded-xl border border-charcoal/10 p-4">
        <p className="font-extrabold tracking-wider">LUMINEX ENERGY SOLUTIONS</p>
        <p className="text-xs text-charcoal/55">
          {ASSESSMENT.brandLine} · {ASSESSMENT.site}
        </p>
      </div>

      <div>
        <h3 className="mb-2 text-base font-bold">1. About your home</h3>
        <table className="w-full border-collapse">
          <tbody>
            {[
              ["Name", data.name],
              ["Phone or WhatsApp", data.phone],
              ["Location (town and area)", data.location],
              ["Number of people living in the home", data.people],
              ["Number of bedrooms", data.bedrooms],
              ["Monthly electricity spend (GH₵)", data.spend],
              ["Electricity meter", data.meter],
              ["Backup power you have now", data.backup.join(", ")],
              ["How often does the power go off?", data.outage],
              ["What would you like help with?", data.help.join(", ")],
            ].map(([k, v]) => (
              <tr key={k} className="border-t border-charcoal/10">
                <th className="w-52 py-1.5 pr-3 text-left align-top font-medium text-charcoal/55">{k}</th>
                <td className="py-1.5">{v ? htmlEscape(v) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h3 className="mb-2 text-base font-bold">2. Appliances in your home</h3>
        {filledApps.length === 0 ? (
          <p className="text-charcoal/45">No appliances recorded.</p>
        ) : (
          filledApps.map((a, i) => (
            <div key={a.name || i} className="flex flex-wrap items-baseline gap-x-2 gap-y-1 border-t border-charcoal/10 py-1.5">
              <span className="font-medium">{htmlEscape(a.name)}</span>
              <span className="text-charcoal/60">
                {a.have ? "☑" : "☐"} {a.qty || "—"} × {a.hours || "—"} h/day
              </span>
              <span className="text-charcoal/60">{a.periods.length ? a.periods.join(", ") : "—"}</span>
              {a.old && <span className="text-charcoal/60">· older than 5 years</span>}
            </div>
          ))
        )}
      </div>

      <div>
        <h3 className="mb-2 text-base font-bold">3. Your habits</h3>
        <ul className="space-y-1">
          {ASSESSMENT.habits.map((h) => (
            <li key={h}>{data.habits.includes(h) ? "☑" : "☐"} {h}</li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="mb-2 text-base font-bold">4. Your last three electricity bills or prepaid top-ups</h3>
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-left text-charcoal/55">
              <th className="py-1.5">Month</th>
              <th className="py-1.5">Amount paid (GH₵)</th>
              <th className="py-1.5">Units bought or used (kWh)</th>
            </tr>
          </thead>
          <tbody>
            {data.bills.map((b, i) => (
              <tr key={i} className="border-t border-charcoal/10">
                <td className="py-1.5">{htmlEscape(b.month) || "—"}</td>
                <td className="py-1.5">{htmlEscape(b.amount) || "—"}</td>
                <td className="py-1.5">{htmlEscape(b.units) || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h3 className="mb-2 text-base font-bold">5. Anything else we should know?</h3>
        <p className="whitespace-pre-wrap border-b border-charcoal/10 pb-2">{htmlEscape(data.notes) || "—"}</p>
      </div>

      <div>
        <h3 className="mb-2 text-base font-bold">6. Confirmation</h3>
        <table className="w-full border-collapse">
          <tbody>
            {[
              ["Name and signature", data.name],
              ["Date", data.date],
            ].map(([k, v]) => (
              <tr key={k} className="border-t border-charcoal/10">
                <th className="w-52 py-1.5 pr-3 text-left align-top font-medium text-charcoal/55">{k}</th>
                <td className="py-1.5">{htmlEscape(v) || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-charcoal/55">
          <strong>For Luminex use:</strong> Received by {htmlEscape(data.receivedBy) || "—"} · Date{" "}
          {htmlEscape(data.receivedDate) || "—"} · Ref. {htmlEscape(data.ref) || "—"}
        </p>
      </div>
      <p className="text-xs text-charcoal/55">{ASSESSMENT.thanks}</p>
    </div>
  );

  return (
    <>
      <section className="bg-charcoal py-14 text-white sm:py-20">
        <Container className="max-w-3xl text-center">
          <p className="text-xs font-semibold tracking-wider text-solar uppercase">{ASSESSMENT.brand}</p>
          <p className="mt-1 text-xs font-semibold text-solar">{ASSESSMENT.brandLine}</p>
          <p className="mt-1 text-xs text-white/50">{ASSESSMENT.site}</p>
          <h1 className="mt-4 text-3xl font-bold sm:text-4xl">Home Energy Self-Assessment</h1>
          <p className="mt-4 leading-relaxed text-white/70">{ASSESSMENT.intro}</p>
        </Container>
      </section>

      <section className="bg-soft py-12 sm:py-16">
        <Container className="max-w-3xl space-y-6">
          {/* 1 */}
          <Reveal className="rounded-2xl bg-white p-6 ring-1 ring-charcoal/6 sm:p-8">
            <SectionHeading eyebrow="Section 1" title="About your home" intro="Your details and how your home is supplied with electricity." />
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className={labelCls}>Name <span className="text-energy">*</span></span>
                <input className={inputCls} value={data.name} onChange={(e) => set("name", e.target.value)} autoComplete="name" />
              </label>
              <label className="block">
                <span className={labelCls}>Phone or WhatsApp <span className="text-energy">*</span></span>
                <input className={inputCls} value={data.phone} onChange={(e) => set("phone", e.target.value)} type="tel" inputMode="tel" autoComplete="tel" placeholder="e.g. 024 000 0000" />
              </label>
              <label className="block">
                <span className={labelCls}>Location (town and area) <span className="text-energy">*</span></span>
                <input className={inputCls} value={data.location} onChange={(e) => set("location", e.target.value)} placeholder="e.g. Cape Coast, Abura" />
              </label>
              <label className="block">
                <span className={labelCls}>Number of people living in the home</span>
                <input className={inputCls} value={data.people} onChange={(e) => set("people", e.target.value)} type="number" min={0} inputMode="numeric" />
              </label>
              <label className="block">
                <span className={labelCls}>Number of bedrooms</span>
                <input className={inputCls} value={data.bedrooms} onChange={(e) => set("bedrooms", e.target.value)} type="number" min={0} inputMode="numeric" />
              </label>
              <label className="block sm:col-span-2">
                <span className={labelCls}>Monthly electricity spend (GH₵) <span className="text-energy">*</span></span>
                <input className={inputCls} value={data.spend} onChange={(e) => set("spend", e.target.value)} type="number" min={0} step="0.01" inputMode="decimal" placeholder="e.g. 450" />
              </label>
              <ToggleGroup legend="Electricity meter" options={ASSESSMENT.meter} multiple={false} selected={[data.meter]} onChange={(v) => set("meter", v[0] || "")} />
              <ToggleGroup legend="How often does the power go off?" options={ASSESSMENT.outage} multiple={false} selected={[data.outage]} onChange={(v) => set("outage", v[0] || "")} />
              <div className="sm:col-span-2">
                <ToggleGroup legend="Backup power you have now" options={ASSESSMENT.backup} multiple selected={data.backup} onChange={(v) => set("backup", v)} />
              </div>
              <div className="sm:col-span-2">
                <ToggleGroup legend="What would you like help with?" options={ASSESSMENT.helpWith} multiple selected={data.help} onChange={(v) => set("help", v)} />
              </div>
            </div>
          </Reveal>

          {/* 2 */}
          <Reveal delay={80} className="rounded-2xl bg-white p-6 ring-1 ring-charcoal/6 sm:p-8">
            <SectionHeading
              eyebrow="Section 2"
              title="Appliances in your home"
              intro="Tick ✓ what you have, write how many and roughly how many hours a day they are used, and tick the times of day you usually use them. Add anything that is not listed in the blank rows at the end."
            />
            <p className="mt-1 text-xs text-charcoal/55">
              {ASSESSMENT.periods.map(([k, l, s]) => (
                <span key={k} className="mr-3">
                  <strong>{k}</strong> = {l} ({s})
                </span>
              ))}
            </p>
            <div className="mt-6 space-y-7">
              {ASSESSMENT.categories.map((c) => (
                <div key={c.name}>
                  <h3 className="border-b-2 border-solar pb-2 text-sm font-bold">{c.name}</h3>
                  <div className="mt-3 space-y-2">
                    {c.items.map((n) => {
                      const i = rows.findIndex((r) => r.name === n);
                      const app = data.apps[i] || rows[i];
                      return (
                        <div key={n} className="rounded-xl bg-soft p-3">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                            <label className="flex flex-1 min-w-[180px] items-center gap-2">
                              <input type="checkbox" className="h-4 w-4 accent-energy" checked={!!app.have} onChange={(e) => updateRow(i, { have: e.target.checked })} />
                              <span className="text-sm font-medium">{n}</span>
                            </label>
                            <label className="flex items-center gap-1.5 text-xs text-charcoal/60">
                              <span className="sr-only">How many {n}</span>
                          <input className={cellInput} inputMode="numeric" placeholder="Qty" value={app.qty} onChange={(e) => updateRow(i, { qty: e.target.value })} />
                            </label>
                            <label className="flex items-center gap-1.5 text-xs text-charcoal/60">
                              <span className="sr-only">Hours used per day for {n}</span>
                              <input className={cellInput} inputMode="decimal" placeholder="Hrs/day" value={app.hours} onChange={(e) => updateRow(i, { hours: e.target.value })} />
                            </label>
                            <div className="flex gap-1.5">
                              {ASSESSMENT.periods.map(([k, label]) => (
                                <button
                                  key={k}
                                  type="button"
                                  title={label}
                                  aria-label={label}
                                  onClick={() => updateRow(i, { periods: app.periods.includes(k) ? app.periods.filter((p) => p !== k) : [...app.periods, k] })}
                                  className={`h-8 w-8 rounded-lg border text-xs font-bold ${app.periods.includes(k) ? "border-energy bg-energy text-white" : "border-charcoal/15 bg-white"}`}
                                >
                                  {k}
                                </button>
                              ))}
                            </div>
                            <label className="flex items-center gap-1.5 text-xs text-charcoal/60">
                              <input type="checkbox" className="h-4 w-4 accent-energy" checked={!!app.old} onChange={(e) => updateRow(i, { old: e.target.checked })} />
                              Older than 5 years
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              <div>
                <h3 className="border-b-2 border-solar pb-2 text-sm font-bold">Other appliances not listed above</h3>
                <div className="mt-3 space-y-2">
                  {Array.from({ length: 6 }, (_, k) => {
                    const i = ASSESSMENT.categories.reduce((n, c) => n + c.items.length, 0) + k;
                    const app = data.apps[i] || rows[i];
                    return (
                      <div key={k} className="rounded-xl bg-soft p-3">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                          <input
                            className="min-w-[180px] flex-1 rounded-lg border border-charcoal/15 px-2 py-1.5 text-sm bg-white"
                            placeholder={`Appliance ${k + 1} name`}
                            value={app.name}
                            onChange={(e) => updateRow(i, { name: e.target.value, have: true })}
                          />
                          <input className={cellInput} inputMode="numeric" placeholder="Qty" value={app.qty} onChange={(e) => updateRow(i, { qty: e.target.value })} />
                          <input className={cellInput} inputMode="decimal" placeholder="Hrs/day" value={app.hours} onChange={(e) => updateRow(i, { hours: e.target.value })} />
                          <div className="flex gap-1.5">
                            {ASSESSMENT.periods.map(([pk, label]) => (
                              <button
                                key={pk}
                                type="button"
                                title={label}
                                aria-label={label}
                                onClick={() => updateRow(i, { periods: app.periods.includes(pk) ? app.periods.filter((p) => p !== pk) : [...app.periods, pk] })}
                                className={`h-8 w-8 rounded-lg border text-xs font-bold ${app.periods.includes(pk) ? "border-energy bg-energy text-white" : "border-charcoal/15 bg-white"}`}
                              >
                                {pk}
                              </button>
                            ))}
                          </div>
                          <label className="flex items-center gap-1.5 text-xs text-charcoal/60">
                            <input type="checkbox" className="h-4 w-4 accent-energy" checked={!!app.old} onChange={(e) => updateRow(i, { old: e.target.checked })} />
                            Older than 5 years
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </Reveal>

          {/* 3 */}
          <Reveal delay={140} className="rounded-2xl bg-white p-6 ring-1 ring-charcoal/6 sm:p-8">
            <SectionHeading eyebrow="Section 3" title="Your habits" intro="Tick ✓ if this happens in your home." />
            <div className="mt-5 space-y-2">
              {ASSESSMENT.habits.map((h) => (
                <label key={h} className="flex items-start gap-3 rounded-xl bg-soft p-3.5 text-sm">
                  <input type="checkbox" className="mt-0.5 h-4 w-4 accent-energy" checked={data.habits.includes(h)} onChange={(e) => set("habits", e.target.checked ? [...data.habits, h] : data.habits.filter((x) => x !== h))} />
                  <span>{h}</span>
                </label>
              ))}
            </div>
          </Reveal>

          {/* 4 */}
          <Reveal delay={180} className="rounded-2xl bg-white p-6 ring-1 ring-charcoal/6 sm:p-8">
            <SectionHeading eyebrow="Section 4" title="Your last three electricity bills or prepaid top-ups" intro="Fill in what you can. If you do not know the units, leave that column empty." />
            <div className="mt-5 overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="text-left text-charcoal/55">
                    <th className="py-2 pr-2">Month</th>
                    <th className="py-2 pr-2">Amount paid (GH₵)</th>
                    <th className="py-2">Units bought or used (kWh), if known</th>
                  </tr>
                </thead>
                <tbody>
                  {data.bills.map((b, i) => (
                    <tr key={i}>
                      <td className="py-1.5 pr-2"><input className={inputCls} value={b.month} onChange={(e) => set("bills", data.bills.map((x, j) => (j === i ? { ...x, month: e.target.value } : x)))} /></td>
                      <td className="py-1.5 pr-2"><input className={inputCls} inputMode="decimal" value={b.amount} onChange={(e) => set("bills", data.bills.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))} /></td>
                      <td className="py-1.5"><input className={inputCls} inputMode="decimal" value={b.units} onChange={(e) => set("bills", data.bills.map((x, j) => (j === i ? { ...x, units: e.target.value } : x)))} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>

          {/* 5 */}
          <Reveal delay={220} className="rounded-2xl bg-white p-6 ring-1 ring-charcoal/6 sm:p-8">
            <SectionHeading eyebrow="Section 5" title="Anything else we should know? (questions, problems, plans to add appliances)" />
            <label className="mt-5 block">
              <span className="sr-only">Anything else we should know</span>
              <textarea rows={6} className={inputCls} value={data.notes} onChange={(e) => set("notes", e.target.value)} />
            </label>
          </Reveal>

          {/* 6 */}
          <Reveal delay={260} className="rounded-2xl bg-white p-6 ring-1 ring-charcoal/6 sm:p-8">
            <SectionHeading eyebrow="Section 6" title="Confirmation" intro={ASSESSMENT.thanks} />
            <div className="mt-5 grid gap-5 sm:grid-cols-[1fr_200px]">
              <div>
                <span className={labelCls}>Name and signature</span>
                <canvas
                  ref={sigRef}
                  width={600}
                  height={150}
                  className="w-full touch-none rounded-xl border border-charcoal/15 bg-white"
                  style={{ height: 120 }}
                  aria-label="Signature area"
                />
                <div className="mt-2 flex items-center justify-between text-xs text-charcoal/45">
                  <span>Draw your signature above</span>
                  <button type="button" onClick={clearSignature} className="font-semibold text-energy">Clear</button>
                </div>
              </div>
              <label className="block">
                <span className={labelCls}>Date <span className="text-energy">*</span></span>
                <input className={inputCls} type="date" value={data.date} onChange={(e) => set("date", e.target.value)} />
              </label>
            </div>
            <div className="mt-6 rounded-xl bg-soft p-4">
              <p className="text-sm font-bold">For Luminex use:</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <label className="block"><span className="text-xs text-charcoal/55">Received by</span><input className={inputCls} value={data.receivedBy} onChange={(e) => set("receivedBy", e.target.value)} /></label>
                <label className="block"><span className="text-xs text-charcoal/55">Date</span><input className={inputCls} value={data.receivedDate} onChange={(e) => set("receivedDate", e.target.value)} /></label>
                <label className="block"><span className="text-xs text-charcoal/55">Ref.</span><input className={inputCls} value={data.ref} onChange={(e) => set("ref", e.target.value)} /></label>
              </div>
            </div>
            <p className="mt-5 text-sm text-charcoal/60">
              Want a quotation based on this assessment?{" "}
              <Link to="/quote" className="font-semibold text-energy">Request a quotation ↗</Link>
            </p>
          </Reveal>

          {notice && (
            <p className={`rounded-xl p-4 text-sm ${notice.error ? "bg-red-50 text-red-700" : "bg-fresh/10 text-fresh"}`} role="status">
              {notice.text}
            </p>
          )}

          <div className="flex flex-wrap justify-center gap-3">
            <Button onClick={() => setPreviewOpen(true)} variant="primary">Preview Form</Button>
            <Button onClick={() => download(true)} variant="outline">Download Blank PDF</Button>
            <Button onClick={downloadCompleted} variant="dark">Download PDF</Button>
          </div>
        </Container>
      </section>

      {previewOpen && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-charcoal/60 p-3 backdrop-blur-sm sm:items-center" onClick={() => setPreviewOpen(false)}>
          <div className="max-h-[92dvh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between border-b border-charcoal/10 pb-3">
              <h2 className="text-lg font-bold">Preview your assessment</h2>
              <button type="button" onClick={() => setPreviewOpen(false)} className="text-charcoal/50 hover:text-charcoal" aria-label="Close preview">✕</button>
            </div>
            {preview}
            <div className="mt-5 flex flex-wrap justify-end gap-3 border-t border-charcoal/10 pt-4">
              <Button onClick={() => download(true)} variant="outline">Download Blank PDF</Button>
              <Button
                onClick={() => {
                  setPreviewOpen(false);
                  downloadCompleted();
                }}
                variant="dark"
              >
                Download PDF
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
