import { defaultSiteData, defaultServices } from "@/lib/defaults";
import type { SiteData } from "@/lib/types";

export interface KnowledgeDocument {
  category: string;
  title: string;
  content: string;
  keywords: string[];
  links: { label: string; path: string }[];
}

const route = (path: string) => `/#/${path.replace(/^\/+/, "")}`;
const officialSite = "https://luminexenergysolutions.com/";
const companyLinks = [
  { label: "Official Luminex website", path: officialSite },
  { label: "About Luminex", path: route("about") },
  { label: "All services", path: route("services") },
  { label: "Projects", path: route("projects") },
  { label: "Contact", path: route("contact") },
  { label: "Request a quote", path: route("quote") },
  { label: "Home energy assessment", path: route("assessment") },
];

const serviceLinks = (slug: string) => [
  { label: "View service details", path: route(`services/${slug}`) },
  { label: "Request a quote", path: route("quote") },
];

function makeServiceDocument(service: SiteData["services"][number]): KnowledgeDocument {
  return {
    category: "Services",
    title: service.title,
    content: [
      service.overview,
      service.short_description,
      `What Luminex provides: ${service.provides.join("; ")}.`,
      `Published benefits: ${service.benefits.join("; ")}.`,
      `Typical applications: ${service.applications.join("; ")}.`,
      `Published process: ${service.process.join("; ")}.`,
      `Maintenance and support: ${service.maintenance}`,
      `Why choose Luminex: ${service.why_luminex}`,
    ].join("\n"),
    keywords: [
      service.title,
      service.slug,
      service.short_description,
      ...service.provides,
      ...service.applications,
      "service",
      "installation",
      "maintenance",
      "repair",
      ...(service.slug === "solar-power"
        ? ["solar panel", "PV", "photovoltaic", "inverter", "battery", "backup power"]
        : []),
      ...(service.slug === "electrical-works"
        ? ["electrician", "wiring", "rewiring", "socket", "electrical fault", "generator"]
        : []),
      ...(service.slug === "air-conditioning"
        ? ["AC", "air conditioner", "cooling", "servicing", "AC service", "gas top-up"]
        : []),
      ...(service.slug === "energy-savings"
        ? ["energy audit", "efficiency", "electricity bill", "energy assessment", "LED"]
        : []),
    ],
    links: serviceLinks(service.slug),
  };
}

export function createKnowledgeBase(data: SiteData): KnowledgeDocument[] {
  const links = (items: { label: string; path: string }[]) => items;
  const docs: KnowledgeDocument[] = [
    {
      category: "Company profile",
      title: data.contact.company_name,
      content: [
        data.homepage.hero_heading,
        data.homepage.hero_description,
        data.about.description,
        `Mission: ${data.about.mission}`,
        `Vision: ${data.about.vision}`,
        `Company values: ${data.about.values.map((v) => `${v.title}: ${v.body}`).join("; ")}.`,
        `Why customers choose Luminex: ${data.homepage.advantages.map((a) => `${a.title}: ${a.body}`).join("; ")}.`,
        `Company process: ${data.homepage.process_steps.map((s) => `${s.title}: ${s.body}`).join("; ")}.`,
        `Published assurances: ${data.homepage.trust_items.join("; ")}.`,
        `Energy assessment information: ${data.homepage.cta_body}`,
        `Official website: ${officialSite}`,
      ].join("\n"),
      keywords: [
        "company",
        "Luminex",
        "about",
        "background",
        "history",
        "mission",
        "vision",
        "values",
        "registered",
        "established",
        "September 2026",
        "headquartered",
        "why choose",
        "company profile",
        "warranty",
        "warranties",
      ],
      links: links(companyLinks),
    },
    {
      category: "Services",
      title: "Services overview",
      content: `${data.homepage.services_intro}\n${data.services
        .filter((service) => service.published)
        .map((service) => `${service.title}: ${service.short_description}`)
        .join("\n")}`,
      keywords: ["services", "what services", "offer", "solar", "electrical", "air conditioning", "energy savings"],
      links: [{ label: "All services", path: route("services") }],
    },
    {
      category: "Public projects",
      title: "Projects published for the public",
      content: data.projects.some((project) => project.published)
        ? data.projects
            .filter((project) => project.published)
            .map(
              (project) =>
                `${project.title} (${project.category}, ${project.location}): ${project.description}${project.details ? ` ${project.details}` : ""}`
            )
            .join("\n")
        : "There are currently no public project records published on the website. The Projects page says Luminex will share installations there as projects are completed.",
      keywords: ["projects", "portfolio", "completed work", "installations", "gallery", "project locations"],
      links: [{ label: "Projects page", path: route("projects") }],
    },
    {
      category: "Customer enquiries",
      title: "Quotes, consultations and preparing an enquiry",
      content:
        "Visitors can request a quotation online, by phone, or through WhatsApp. The quote form asks for a name, phone number, optional email, location, service required, property type, preferred contact method, project description, and optional image or file. Luminex discusses the requirements, arranges an assessment where required, and provides a quotation. The website states responses are handled Monday to Friday. No prices or guaranteed response times are published.",
      keywords: [
        "quote",
        "quotation",
        "consultation",
        "enquiry",
        "prepare",
        "what information",
        "request",
        "price",
        "cost",
        "response time",
        "assessment",
      ],
      links: [
        { label: "Request a quote", path: route("quote") },
        { label: "Contact Luminex", path: route("contact") },
      ],
    },
    {
      category: "Home Energy Self-Assessment",
      title: "How to complete the home energy assessment",
      content:
        "The assessment is intended to help Luminex estimate a household's electricity use and consider possible energy-saving measures or suitable solar options before a visit. Record each appliance you have, its quantity, approximate hours of use per day, all applicable use periods (morning, afternoon, evening and night), and whether it is older than five years. Also record household details, electricity meter and backup-power information, outage frequency, reasons for seeking help, the last three electricity bills or prepaid top-ups (month, amount and kWh if known), habits, and any additional notes. The form supports previewing and downloading a PDF.",
      keywords: [
        "assessment",
        "self assessment",
        "home energy",
        "appliances",
        "usage hours",
        "electricity bills",
        "prepaid",
        "backup power",
        "PDF",
        "preview",
        "download",
      ],
      links: [
        { label: "Open the assessment", path: route("assessment") },
        { label: "Request a quote", path: route("quote") },
      ],
    },
    {
      category: "Contact",
      title: "Verified contact details and next steps",
      content: [
        `${data.contact.company_name}.`,
        `Headquarters: ${data.contact.headquarters}.`,
        `Digital address: ${data.contact.digital_address}.`,
        `Phone numbers: ${data.contact.phones.join(", ")}.`,
        `WhatsApp: ${data.contact.whatsapp}.`,
        `Email: ${data.contact.email || "No email is configured in the site data"}.`,
        `Business hours: ${data.contact.business_hours}.`,
        `Service areas: ${data.contact.service_areas.join(", ")}.`,
      ].join("\n"),
      keywords: [
        "contact",
        "phone",
        "call",
        "number",
        "email",
        "whatsapp",
        "address",
        "digital address",
        "headquarters",
        "hours",
        "open",
        "service area",
        "location",
        ...data.contact.service_areas,
        ...data.contact.phones,
      ],
      links: [{ label: "Contact page", path: route("contact") }],
    },
    {
      category: "Official channels",
      title: "Luminex official social and communication channels",
      content: [
        `WhatsApp Channel: ${data.social.whatsapp_channel_url}`,
        `Facebook: ${data.social.facebook_label}, ${data.social.facebook_url}`,
        `Instagram: ${data.social.instagram_label}, ${data.social.instagram_url}`,
        `X: ${data.social.x_label}, ${data.social.x_url}`,
        `TikTok: ${data.social.tiktok_label}, ${data.social.tiktok_url}`,
      ].join("\n"),
      keywords: ["social media", "facebook", "instagram", "twitter", "X", "tiktok", "whatsapp channel", "follow"],
      links: [
        { label: "Official website", path: officialSite },
        { label: "Contact page", path: route("contact") },
      ],
    },
    ...data.services.filter((service) => service.published).map(makeServiceDocument),
    ...data.faqs
      .filter((faq) => faq.published)
      .map((faq) => ({
        category: "Frequently asked questions",
        title: faq.question,
        content: faq.answer,
        keywords: [faq.question, faq.answer],
        links: [{ label: "Contact Luminex", path: route("contact") }],
      })),
  ];
  return docs;
}

const STOP_WORDS = new Set([
  "a", "about", "an", "and", "are", "as", "at", "be", "can", "do", "does", "for",
  "from", "get", "how", "i", "in", "is", "it", "me", "my", "of", "on", "or", "please",
  "tell", "that", "the", "they", "this", "to", "what", "when", "where", "which", "who",
  "with", "you", "your",
]);

const words = (text: string) =>
  text
    .toLowerCase()
    .replace(/-/g, " ")
    .replace(/[^a-z0-9+@.\s-]/g, " ")
    .split(/\s+/)
    .map((word) => {
      if (word.endsWith("ies") && word.length > 4) return `${word.slice(0, -3)}y`;
      if (word.endsWith("s") && word.length > 3 && !word.endsWith("ss")) return word.slice(0, -1);
      return word;
    })
    .filter((word) => word.length > 1 && !STOP_WORDS.has(word));

function scoreDocument(query: string, document: KnowledgeDocument): number {
  const queryWords = [...new Set(words(query))];
  if (queryWords.length === 0) return 0;

  const titleWords = new Set(words(document.title));
  const keywordWords = new Set(words(document.keywords.join(" ")));
  const contentWords = new Set(words(document.content));
  let score = 0;

  for (const word of queryWords) {
    if (titleWords.has(word)) score += 4;
    if (keywordWords.has(word)) score += 3;
    if (contentWords.has(word)) score += 1;
  }

  const normalizedQuery = query.toLowerCase().replace(/-/g, " ").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  for (const keyword of document.keywords) {
    const phrase = keyword.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
    if (phrase.length > 3 && normalizedQuery.includes(phrase)) score += 5;
  }
  return score;
}

export function findKnowledgeAnswer(
  query: string,
  data: SiteData
): { text: string; links: { label: string; path: string }[] } {
  if (/^\s*(hi|hello|hey|good morning|good afternoon|good evening)\b/i.test(query)) {
    return {
      text: "Hello! I can help with Luminex's services, company information, projects, quotes, assessments and contact details. What would you like to know?",
      links: companyLinks,
    };
  }

  const knowledgeBase = createKnowledgeBase(data);
  const ranked = knowledgeBase
    .map((document) => ({ document, score: scoreDocument(query, document) }))
    .filter((result) => result.score >= 4)
    .sort((a, b) => b.score - a.score);

  if (ranked.length === 0) {
    return {
      text:
        "I couldn't find verified information about that in Luminex's published company information. I don't want to guess. The team can confirm it directly.",
      links: [
        { label: "Contact Luminex", path: route("contact") },
        { label: "Official company website", path: officialSite },
      ],
    };
  }

  const selected = ranked
    .slice(0, 2)
    .filter((result, index) => index === 0 || result.score >= ranked[0].score * 0.65);
  const text = selected
    .map(({ document }) => `${document.title}\n${document.content}`)
    .join("\n\n");
  const resultLinks = selected.flatMap(({ document }) => document.links);
  const uniqueLinks = [...new Map(resultLinks.map((link) => [link.path, link])).values()];
  return { text, links: uniqueLinks.slice(0, 7) };
}

export const getContactInfo = () => ({
  companyName: defaultSiteData.contact.company_name,
  phones: defaultSiteData.contact.phones,
  email: defaultSiteData.contact.email || "Not specified",
  headquarters: defaultSiteData.contact.headquarters,
  whatsapp: defaultSiteData.contact.whatsapp,
  digitalAddress: defaultSiteData.contact.digital_address,
  businessHours: defaultSiteData.contact.business_hours,
  serviceAreas: defaultSiteData.contact.service_areas,
  socialLinks: defaultSiteData.social,
});

export const getServicesInfo = () =>
  defaultServices.map((s) => ({
    title: s.title,
    short_description: s.short_description,
    slug: s.slug,
  }));

export const WELCOME_MESSAGE =
  "Hello! I'm the Luminex assistant. Ask me about the company, any service, public projects, quotations, the home energy assessment, or contact details. I use published Luminex information and will say when I can't verify an answer.";

export const WELCOME_LINKS = companyLinks;
