/** Home Energy Self-Assessment — shared data and PDF builder.
 *  Content is taken from "Assessment Sheet (Costumer).docx" (Luminex Energy Solutions). */

export interface AppEntry {
  name: string;
  have: boolean;
  qty: string;
  hours: string;
  periods: string[];
  old: boolean;
  /** true for rows the visitor typed themselves into the blank rows */
  extra?: boolean;
}

export interface AssessmentData {
  name: string;
  phone: string;
  location: string;
  people: string;
  bedrooms: string;
  spend: string;
  meter: string;
  backup: string[];
  outage: string;
  help: string[];
  apps: AppEntry[];
  habits: string[];
  bills: { month: string; amount: string; units: string }[];
  notes: string;
  date: string;
  receivedBy: string;
  receivedDate: string;
  ref: string;
}

export const ASSESSMENT = {
  brand: "Luminex Energy Solutions",
  brandLine: "Solar PV  ·  Electrical Installations  ·  Air-Conditioning  ·  Energy Audits",
  site: "www.luminexenergysolutions.com",
  intro:
    "Please tick every appliance you have in your home, write how many you have and roughly how many hours a day they are used, and tick the times of day you usually use them. Add anything that is not listed in the blank rows. It takes about 10 minutes. Your answers help Luminex estimate your electricity use and suggest ways to save, or the right solar system, before we visit.",
  thanks:
    "Thank you. Return this form to Luminex Energy Solutions, or send a clear photo of it to us on WhatsApp.",
  periods: [
    ["M", "Morning", "6 am to 12 noon"],
    ["A", "Afternoon", "12 noon to 6 pm"],
    ["E", "Evening", "6 pm to 10 pm"],
    ["N", "Night", "10 pm to 6 am"],
  ] as const,
  meter: ["Prepaid", "Postpaid"],
  backup: ["Inverter and batteries", "Generator", "Solar system", "None"],
  outage: ["Almost every day", "Every week", "Rarely"],
  helpWith: ["Lower electricity bills", "Backup power", "A solar system", "AC or wiring work"],
  habits: [
    "Lights or fans are often left on in empty rooms.",
    "Air conditioners are set below 24 °C.",
    "Air conditioners have not been serviced in the last 6 months.",
    "TVs, decoders and chargers stay switched on at the wall overnight.",
    "A fridge or freezer door seal is torn, or the door does not close well.",
    "A fridge or freezer stands next to the cooker or in direct sun.",
    "The water heater stays on all day.",
    "Outdoor security lights stay on during the day.",
    "Clothes are ironed a few at a time on most days.",
  ],
  categories: [
    {
      name: "Lighting",
      items: [
        "Filament (yellow, old-type) bulbs",
        "Energy-saving (CFL, twisted) bulbs",
        "LED bulbs",
        "Fluorescent tubes (long white tubes)",
        "LED tubes",
        "Security or outdoor flood lights",
        "Chandeliers or decorative lights",
      ],
    },
    {
      name: "Cooling and comfort",
      items: [
        "Ceiling fans",
        "Standing, table or wall fans",
        "Air conditioner, 1 to 1.5 hp",
        "Air conditioner, 2 hp or bigger",
        "Air cooler",
      ],
    },
    {
      name: "Kitchen and refrigeration",
      items: [
        "Refrigerator (single door)",
        "Fridge-freezer (double door)",
        "Chest or deep freezer",
        "Water dispenser (hot and cold)",
        "Microwave",
        "Electric kettle",
        "Electric cooker or hot plate",
        "Electric oven",
        "Rice cooker",
        "Blender",
        "Toaster or sandwich maker",
      ],
    },
    {
      name: "Entertainment, phones and computers",
      items: [
        "TV, up to 32 inch",
        "TV, 40 inch or bigger",
        "Satellite decoder (DStv, GOtv and similar)",
        "Sound system or home theatre",
        "Desktop computer with monitor",
        "Laptop",
        "Wi-Fi router",
        "Phone chargers",
        "Printer",
        "Gaming console",
      ],
    },
    {
      name: "Laundry, water and cleaning",
      items: ["Electric iron", "Washing machine", "Water heater (geyser)", "Water pump (borehole or tank)", "Vacuum cleaner"],
    },
    {
      name: "Other",
      items: ["Hair dryer or hair clipper", "CCTV cameras and recorder", "Electric gate motor", "Electric sewing machine"],
    },
  ],
};

export const EMPTY_APP: Omit<AppEntry, "name"> = { have: false, qty: "", hours: "", periods: [], old: false };

export function emptyAssessment(): AssessmentData {
  return {
    name: "",
    phone: "",
    location: "",
    people: "",
    bedrooms: "",
    spend: "",
    meter: "",
    backup: [],
    outage: "",
    help: [],
    apps: [],
    habits: [],
    bills: [
      { month: "", amount: "", units: "" },
      { month: "", amount: "", units: "" },
      { month: "", amount: "", units: "" },
    ],
    notes: "",
    date: new Date().toISOString().slice(0, 10),
    receivedBy: "",
    receivedDate: "",
    ref: "",
  };
}

/** Extra blank rows shown at the end of the appliance section. */
export const EXTRA_ROW_COUNT = 6;
export const EXTRA_APPS: AppEntry[] = Array.from({ length: EXTRA_ROW_COUNT }, () => ({ name: "", ...EMPTY_APP, extra: true }));

/** All appliance rows on the form: the 42 from the document plus 6 blank rows. */
export function allRows(): (AppEntry & { listName?: string })[] {
  return [...ASSESSMENT.categories.flatMap((c) => c.items.map((name) => ({ ...EMPTY_APP, name }))), ...EXTRA_APPS];
}

/* ---------------- PDF ---------------- */

/** jsPDF's built-in fonts only support WinAnsi, so the Ghana cedi sign must be
 *  converted (it otherwise renders as a wrong glyph) and other unsupported
 *  characters are stripped. */
function txt(s: unknown) {
  return String(s == null ? "" : s)
    .replace(/GH\u20B5/g, "GHS")
    .replace(/\u20B5/g, "GHS")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2192\u27A1]/g, "->")
    .replace(/\u2026/g, "...")
    .replace(/[\u2014\u2013\u2015]/g, "-")
    .replace(/[\u00A0\u2009\u202F]/g, " ")
    .replace(/[^\x00-\xFF]/g, "");
}

function cleanApp(a: AppEntry): AppEntry {
  return {
    name: txt(a.name),
    have: !!a.have,
    qty: txt(a.qty),
    hours: txt(a.hours),
    periods: Array.isArray(a.periods) ? [...a.periods] : [],
    old: !!a.old,
  };
}

export function buildPdf(doc: any, raw: AssessmentData, blank: boolean) {
  const d: AssessmentData = {
    ...raw,
    name: txt(raw.name),
    phone: txt(raw.phone),
    location: txt(raw.location),
    people: txt(raw.people),
    bedrooms: txt(raw.bedrooms),
    spend: txt(raw.spend),
    meter: txt(raw.meter),
    backup: (raw.backup || []).map(txt),
    outage: txt(raw.outage),
    help: (raw.help || []).map(txt),
    habits: (raw.habits || []).map(txt),
    notes: txt(raw.notes),
    date: txt(raw.date),
    receivedBy: txt(raw.receivedBy),
    receivedDate: txt(raw.receivedDate),
    ref: txt(raw.ref),
    bills: (raw.bills || []).map((b) => ({ month: txt(b.month), amount: txt(b.amount), units: txt(b.units) })),
    apps: (blank ? [] : (raw.apps || []))
      .filter((a): a is AppEntry => !!a && (a.extra ? a.name !== "" : !!a.have || a.name !== ""))
      .map(cleanApp),
  };

  const PW = doc.internal.pageSize.getWidth();
  const PH = doc.internal.pageSize.getHeight();
  const ML = 40;
  const MR = PW - 40;
  const CONTENT_W = MR - ML;
  const TOP = 74;
  const BOTTOM = PH - 58;
  let y = TOP;
  let pageContext: (() => void) | null = null;

  const brandHeader = () => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(16, 24, 32);
    doc.text("LUMINX ENERGY SOLUTIONS", ML, 48);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(102, 113, 124);
    doc.text(txt(ASSESSMENT.brandLine), ML, 60);
    doc.text(txt(ASSESSMENT.site), ML, 70);
    doc.setDrawColor(233, 237, 240);
    doc.setLineWidth(0.7);
    doc.line(ML, 76, MR, 76);
    y = TOP;
  };
  brandHeader();

  const newPage = () => {
    doc.addPage();
    brandHeader();
    const redraw = pageContext;
    pageContext = null;
    if (redraw) redraw();
  };
  const space = (need: number) => {
    if (y + need > BOTTOM) newPage();
  };
  const line = (text: string, size = 9, style = "normal", color: number[] = [16, 24, 32], gap = 12) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.splitTextToSize(txt(text), CONTENT_W).forEach((w: string) => {
      space(size + 4);
      doc.text(w, ML, y);
      y += size + 3.5;
    });
    y += gap - size - 3.5 + 3;
  };
  const heading = (text: string) => {
    pageContext = null;
    const draw = () => {
      space(30);
      y += 8;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(8, 121, 201);
      doc.text(txt(text).toUpperCase(), ML, y);
      y += 8;
      doc.setDrawColor(245, 183, 47);
      doc.setLineWidth(2);
      doc.line(ML, y, ML + 44, y);
      doc.setDrawColor(233, 237, 240);
      doc.setLineWidth(0.7);
      y += 12;
    };
    draw();
    pageContext = draw;
  };
  const field = (label: string, value: string) => {
    label = txt(label);
    value = txt(value || "");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(102, 113, 124);
    const lw = doc.getTextWidth(label) + 8;
    const maxV = CONTENT_W - lw;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(16, 24, 32);
    const wrapped = doc.splitTextToSize(value, maxV);
    if (wrapped.length > 1) {
      space(wrapped.length * 13 + 6);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(102, 113, 124);
      doc.text(label, ML, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(16, 24, 32);
      wrapped.forEach((w: string) => {
        y += 12;
        doc.text(w, ML + lw, y);
      });
      y += 18;
    } else {
      space(20);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(102, 113, 124);
      doc.text(label, ML, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(16, 24, 32);
      doc.text(value, ML + lw, y);
      y += 18;
    }
  };
  const tick = (on: boolean, x: number, yy: number, s = 7) => {
    doc.setDrawColor(16, 24, 32);
    doc.setLineWidth(0.7);
    doc.rect(x, yy - s + 2, s, s);
    if (on) {
      doc.setLineWidth(1.1);
      doc.line(x + 1.3, yy - s / 2 + 2, x + s / 2, yy + 1);
      doc.line(x + s / 2, yy + 1, x + s - 1.3, yy - s / 2 + 1);
    }
  };
  const checkLine = (on: boolean, text: string, size = 9) => {
    space(size + 8);
    doc.setFontSize(size);
    tick(on, ML + 4, y - 0.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(16, 24, 32);
    const wrapped = doc.splitTextToSize(txt(text), CONTENT_W - 22);
    doc.text(wrapped[0], ML + 22, y);
    wrapped.slice(1).forEach((w: string) => {
      y += size + 3.5;
      doc.text(w, ML + 22, y);
    });
    y += size + 6;
  };

  /* Intro */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(16, 24, 32);
  doc.text("HOME ENERGY SELF-ASSESSMENT", ML, y);
  y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(102, 113, 124);
  doc.splitTextToSize(txt(ASSESSMENT.intro), CONTENT_W).forEach((w: string) => {
    doc.text(w, ML, y);
    y += 11;
  });
  y += 8;

  /* 1. About your home */
  heading("1. About your home");
  field("Name:", d.name);
  field("Phone or WhatsApp:", d.phone);
  field("Location (town and area):", d.location);
  field("Number of people living in the home:", d.people);
  field("Number of bedrooms:", d.bedrooms);
  field("Monthly electricity spend (GH₵):", d.spend);
  field(
    "Electricity meter:",
    blank ? "" : d.meter ? (d.meter === "Prepaid" ? "[ ] Postpaid    [X] Prepaid" : "[X] Postpaid    [ ] Prepaid") : "[ ] Prepaid    [ ] Postpaid"
  );
  space(46);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(102, 113, 124);
  doc.text("Backup power you have now:", ML, y);
  y += 14;
  ASSESSMENT.backup.forEach((b) => {
    tick(!blank && d.backup.includes(b), ML + 4, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(16, 24, 32);
    doc.text(txt(b), ML + 22, y);
    y += 16;
  });
  y += 6;
  space(58);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(102, 113, 124);
  doc.text("How often does the power go off?", ML, y);
  y += 14;
  ASSESSMENT.outage.forEach((o) => {
    tick(!blank && d.outage === o, ML + 4, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(16, 24, 32);
    doc.text(txt(o), ML + 22, y);
    y += 16;
  });
  y += 6;
  space(58);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(102, 113, 124);
  doc.text("What would you like help with?", ML, y);
  y += 14;
  ASSESSMENT.helpWith.forEach((h) => {
    tick(!blank && d.help.includes(h), ML + 4, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(16, 24, 32);
    doc.text(txt(h), ML + 22, y);
    y += 16;
  });
  y += 6;

  /* 2. Appliances */
  heading("2. Appliances in your home");
  line(
    ASSESSMENT.periods.map(([k, l, s]) => `${k} = ${l} (${s})`).join("    ·    ") + "    ·    >5 yrs = older than 5 years",
    7.5,
    "normal",
    [102, 113, 124],
    12
  );
  const cols = [ML + 20, ML + 20 + 176, ML + 20 + 216, ML + 20 + 262, ML + 20 + 318, ML + 20 + 424];
  const colW = 176;
  const tableHead = () => {
    space(34);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(102, 113, 124);
    doc.text("Have", cols[0], y);
    doc.text("Appliance", cols[1], y);
    doc.text("Qty", cols[2], y);
    doc.text("Hrs/day", cols[3], y);
    doc.text("Times of day", cols[4], y);
    doc.text(">5 yrs", cols[5], y);
    y += 6;
    doc.setDrawColor(220, 226, 231);
    doc.line(ML, y, MR, y);
    y += 11;
  };
  const appRow = (name: string, have: boolean, qty: string, hours: string, periods: string[], old: boolean) => {
    name = txt(name);
    qty = txt(qty || "");
    hours = txt(hours || "");
    const wrapped = doc.splitTextToSize(name, colW);
    const h = Math.max(15, wrapped.length * 10 + 5);
    space(h + 6);
    tick(have, cols[0] - 8, y - 1, 7);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(16, 24, 32);
    wrapped.forEach((w: string, i: number) => doc.text(w, cols[1], y + i * 10));
    doc.text(qty, cols[2], y);
    doc.text(hours, cols[3], y);
    doc.text(
      ASSESSMENT.periods.map(([k]) => `${periods.includes(k) ? "[X]" : "[ ]"}${k}`).join(" "),
      cols[4],
      y
    );
    tick(old, cols[5] - 8, y - 1, 7);
    y += h;
    doc.setDrawColor(240, 243, 245);
    doc.line(ML, y - 4, MR, y - 4);
  };
  const catHeader = (c: { name: string }) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(16, 24, 32);
    doc.text(txt(c.name), ML, y);
    y += 6;
    doc.setDrawColor(245, 183, 47);
    doc.setLineWidth(1.5);
    doc.line(ML, y, ML + 34, y);
    doc.setDrawColor(240, 243, 245);
    y += 10;
    tableHead();
  };
  ASSESSMENT.categories.forEach((c) => {
    pageContext = null;
    space(56);
    const draw = () => catHeader(c);
    pageContext = draw;
    catHeader(c);
    c.items.forEach((n) => {
      const a = d.apps.find((x) => x && x.name === n);
      appRow(n, !!(a && a.have), a ? a.qty : "", a ? a.hours : "", a ? a.periods : [], !!(a && a.old));
    });
    y += 6;
    pageContext = null;
  });
  /* Extra user rows */
  const extras = d.apps.filter((a) => !ASSESSMENT.categories.some((c) => c.items.includes(a.name)));
  if (blank || extras.length) {
    pageContext = null;
    space(56);
    const extraCat = { name: "Other appliances not listed above" };
    const draw = () => catHeader(extraCat);
    pageContext = draw;
    catHeader(extraCat);
    const rows = blank ? Array.from({ length: 6 }, () => ({ name: "", qty: "", hours: "", periods: [] as string[], old: false })) : extras;
    rows.forEach((a) => appRow(a.name, false, a.qty, a.hours, a.periods, a.old));
    y += 6;
    pageContext = null;
  }

  /* 3. Habits */
  heading("3. Your habits");
  ASSESSMENT.habits.forEach((h) => checkLine(!blank && d.habits.includes(h), h));

  /* 4. Bills */
  heading("4. Your last three electricity bills or prepaid top-ups");
  space(30);
  const bw = [CONTENT_W * 0.3, CONTENT_W * 0.35, CONTENT_W * 0.35];
  const bx = [ML, ML + bw[0], ML + bw[0] + bw[1]];
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(102, 113, 124);
  ["Month", "Amount paid (GHS)", "Units bought or used (kWh), if known"].forEach((t, i) => doc.text(t, bx[i], y));
  y += 6;
  doc.setDrawColor(220, 226, 231);
  doc.line(ML, y, MR, y);
  y += 14;
  d.bills.forEach((b) => {
    space(22);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(16, 24, 32);
    doc.text(b.month, bx[0], y);
    doc.text(b.amount, bx[1], y);
    doc.text(b.units, bx[2], y);
    y += 8;
    doc.setDrawColor(240, 243, 245);
    doc.line(ML, y, MR, y);
    y += 14;
  });

  /* 5. Anything else */
  heading("5. Anything else we should know?");
  if (d.notes) {
    space(doc.splitTextToSize(d.notes, CONTENT_W).length * 12 + 6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(16, 24, 32);
    doc.splitTextToSize(d.notes, CONTENT_W).forEach((w: string) => {
      doc.text(w, ML, y);
      y += 12;
    });
  } else {
    space(96);
    doc.setDrawColor(220, 226, 231);
    for (let i = 0; i < 6; i++) doc.line(ML, y + i * 16, MR, y + i * 16);
    y += 96 + 8;
  }

  /* 6. Confirmation — kept together on one page */
  pageContext = null;
  space(214);
  heading("6. Confirmation");
  pageContext = null;
  doc.setDrawColor(220, 226, 231);
  doc.line(ML, y + 20, ML + 250, y + 20);
  doc.line(ML + 300, y + 20, MR, y + 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(16, 24, 32);
  doc.text(d.name, ML, y + 16);
  doc.text(d.date, ML + 300, y + 16);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(102, 113, 124);
  doc.text("NAME AND SIGNATURE", ML, y + 34);
  doc.text("DATE", ML + 300, y + 34);
  y += 56;

  /* For Luminex use */
  space(60);
  doc.setFillColor(244, 246, 248);
  doc.rect(ML, y, CONTENT_W, 58, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(16, 24, 32);
  doc.text("For Luminex use:", ML + 12, y + 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Received by", ML + 12, y + 40);
  doc.text("Date", ML + 190, y + 40);
  doc.text("Ref.", ML + 330, y + 40);
  doc.setTextColor(16, 24, 32);
  doc.setFontSize(8.5);
  if (!blank) {
    doc.text(d.receivedBy, ML + 88, y + 32);
    doc.text(d.receivedDate, ML + 230, y + 32);
    doc.text(d.ref, ML + 358, y + 32);
  }
  doc.setDrawColor(200, 208, 214);
  doc.line(ML + 88, y + 35, ML + 185, y + 35);
  doc.line(ML + 230, y + 35, ML + 325, y + 35);
  doc.line(ML + 358, y + 35, MR - 12, y + 35);
  y += 70;

  /* Thank-you note */
  space(30);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8.5);
  doc.setTextColor(102, 113, 124);
  doc.splitTextToSize(txt(ASSESSMENT.thanks), CONTENT_W).forEach((w: string) => {
    doc.text(w, ML, y);
    y += 11;
  });

  /* Footers with page numbers */
  const pages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(154, 163, 171);
    doc.text(txt(ASSESSMENT.site), ML, PH - 26);
    doc.text("Luminex Energy Solutions - Home Energy Self-Assessment", ML, PH - 16);
    doc.text(`Page ${p} of ${pages}`, MR, PH - 26, { align: "right" });
    doc.setDrawColor(233, 237, 240);
    doc.line(ML, PH - 36, MR, PH - 36);
  }
  return doc;
}

export function htmlEscape(s: string) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}
