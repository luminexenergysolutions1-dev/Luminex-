import { defaultSiteData, defaultServices } from "@/lib/defaults";

export interface ChatbotFAQ {
  question: string;
  answer: string;
  keywords: string[];
  links?: { label: string; path: string }[];
}

export const chatbotFAQs: ChatbotFAQ[] = [
  {
    answer:
      "We are headquartered in Cape Coast, Central Region, Ghana, and serve customers nationwide including Accra, Kumasi, Sunyani, and Takoradi.",
    keywords: ["where", "area", "serve", "location", "headquarters", "based", "region"],
    links: [{ label: "Contact page", path: "/contact" }],
    question: "Which areas do you serve?",
  },
  {
    answer:
      "Luminex Energy Solutions is an officially registered business in Ghana, established in September 2026. We provide reliable power, safe electrical infrastructure, and premium air conditioning to homes, businesses, and institutions across the country.",
    keywords: ["who", "what", "company", "about", "established", "registered", "founded"],
    links: [{ label: "About page", path: "/about" }],
    question: "What is Luminex Energy Solutions?",
  },
  {
    answer:
      "We offer four core services: Solar Power, Electrical Works, Air Conditioning, and Energy Savings solutions. We are a one-stop team from the sun on your roof to the cool air in your room.",
    keywords: ["service", "services", "offer", "provide", "what"],
    links: [
      { label: "Services", path: "/services" },
      { label: "Solar Power", path: "/services/solar-power" },
      { label: "Electrical Works", path: "/services/electrical-works" },
      { label: "Air Conditioning", path: "/services/air-conditioning" },
      { label: "Energy Savings", path: "/services/energy-savings" },
    ],
    question: "What services do you offer?",
  },
  {
    answer:
      "Fill in the Request a Quote form, call us, or message us on WhatsApp. We will discuss your needs, arrange an assessment where required, and send a clear quotation.",
    keywords: ["quotation", "quote", "price", "cost", "estimate"],
    links: [
      { label: "Quote page", path: "/quote" },
      { label: "Contact page", path: "/contact" },
    ],
    question: "How do I get a quotation?",
  },
  {
    answer:
      "Yes. Because we handle solar, electrical, and AC work in-house, we can design a system where your cooling load is properly accounted for from the start.",
    keywords: ["solar", "ac", "air conditioning", "together", "combined"],
    links: [
      { label: "Solar Power", path: "/services/solar-power" },
      { label: "Air Conditioning", path: "/services/air-conditioning" },
    ],
    question: "Can you install solar and air conditioning together?",
  },
  {
    answer:
      "Yes. We service and repair existing solar, electrical, and AC systems after an initial inspection.",
    keywords: ["service", "repair", "maintain", "existing"],
    links: [{ label: "Services", path: "/services" }],
    question: "Do you offer servicing for systems you did not install?",
  },
  {
    answer:
      "We are headquartered in Cape Coast, serving Accra, Takoradi, Kumasi, Sunyani, and nationwide across Ghana.",
    keywords: ["phone", "call", "number", "contact"],
    links: [{ label: "Contact page", path: "/contact" }],
    question: "What is your phone number?",
  },
  {
    answer: "Our core services are Solar Power, Electrical Works, Air Conditioning, and Energy Savings.",
    keywords: ["four", "types", "list"],
    links: [{ label: "Services", path: "/services" }],
    question: "What are your four core services?",
  },
  {
    answer: "Our service areas include Accra, Cape Coast, Kumasi, Sunyani, and Takoradi.",
    keywords: ["ghana", "cities", "locations"],
    links: [{ label: "Contact page", path: "/contact" }],
    question: "Which cities do you serve in Ghana?",
  },
  {
    answer:
      "Fill in the quote request form on our Contact or Quote page, and our team will get back to you with a clear quotation.",
    keywords: ["contact", "message", "email", "reach", "get in touch"],
    links: [
      { label: "Contact page", path: "/contact" },
      { label: "Quote page", path: "/quote" },
    ],
    question: "How can I contact you?",
  },
];

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
  "Hello! I'm the Luminex assistant. I can answer questions about our services, projects, pricing, and contact information. How can I help you today?";
