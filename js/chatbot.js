const CHATBOT_KNOWLEDGE = {
  company: {
    name: "Luminex Energy Solutions",
    tagline: "Reliable power. Smarter living. Built for Ghana.",
    description: "Luminex Energy Solutions helps homes and businesses plan, install and maintain solar power, electrical works, air conditioning and energy efficiency systems.",
    location: "Ghana, headquartered in Cape Coast",
    established: "September 2026",
  },
  services: [
    { id: "solar", title: "Solar Power", desc: "Solar system design, installation and maintenance for reliable, cost-conscious energy independence." },
    { id: "electrical", title: "Electrical Works", desc: "Safe electrical wiring, installations, upgrades, fault-finding and repairs for homes and businesses." },
    { id: "ac", title: "Air Conditioning", desc: "Air-conditioning supply, professional installation, servicing and repairs." },
    { id: "energy", title: "Energy Solutions", desc: "Practical energy-efficiency guidance and integrated systems designed around your needs." },
    { id: "utility", title: "Utility-Scale Solar PV Design", desc: "Large-scale solar PV system design, engineering and commissioning support for commercial and grid-scale installations." },
    { id: "consultancy", title: "Consultancy for Solar PV Projects", desc: "Independent solar PV consultancy, technical audits and project advisory for residential, commercial and utility-scale installations." },
  ],
  process: ["Listen & assess", "Plan & recommend", "Quote transparently", "Install & support"],
  faqs: [
    { q: "Which areas do you serve?", a: "We are headquartered in Cape Coast and serve Accra, Takoradi, and customers nationwide across Ghana." },
    { q: "How do I get a quotation?", a: "Fill in the Request a Quote form, call us, or message us via the chatbot. We will discuss your needs and send a clear quotation." },
    { q: "Can you install solar and air conditioning together?", a: "Yes. Because we handle solar, electrical and AC work in-house, we can design a system where your cooling load is properly accounted for from the start." },
    { q: "Do you offer servicing for systems you did not install?", a: "Yes. We service and repair existing solar, electrical and AC systems after an initial inspection." },
    { q: "Can you design large-scale solar projects?", a: "Yes, we offer Utility-Scale Solar PV Design for commercial and grid-scale installations." },
  ],
  contact: {
    phone_label: "Call us",
    phone: "Add your business phone",
    email: "info@luminexenergy.com",
    whatsapp: "https://wa.me/",
    service_areas: ["Accra", "Cape Coast", "Takoradi", "Kumasi", "Sunyani", "Nationwide"],
  },
  greeting: "Hello! Welcome to Luminex Energy Solutions. How can we help you today?",
  suggested: [
    "What services do you offer?",
    "Tell me about your solar projects.",
    "Can I request a quote?",
  ],
};

class LuminexChatbot {
  constructor() {
    this.isOpen = false;
    this.isMinimized = false;
    this.messages = [];
    this.create();
    this.bind();
    this.addMessage("bot", CHATBOT_KNOWLEDGE.greeting);
    this.showSuggested();
  }

  create() {
    const wrapper = document.createElement("div");
    wrapper.className = "chatbot-wrapper";
    wrapper.setAttribute("role", "region");
    wrapper.setAttribute("aria-label", "Luminex Assistant");
    wrapper.innerHTML =
      '<button class="chatbot-launcher" aria-label="Open Luminex Assistant" aria-haspopup="dialog" aria-expanded="false">'
        + '<svg class="chatbot-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>'
        + '<span class="chatbot-badge" aria-hidden="true"></span>'
      + '</button>'
      + '<div class="chatbot-window" role="dialog" aria-modal="false" aria-hidden="true" tabindex="-1">'
        + '<div class="chatbot-header">'
          + '<div class="chatbot-header-left">'
            + '<svg class="chatbot-logo" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>'
            + '<div class="chatbot-title">Luminex Assistant</div>'
          + '</div>'
          + '<div class="chatbot-window-controls">'
            + '<button class="chatbot-minimize" aria-label="Minimize chat">'
              + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"></path></svg>'
            + '</button>'
            + '<button class="chatbot-close" aria-label="Close chat">'
              + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"></path></svg>'
            + '</button>'
          + '</div>'
        + '</div>'
        + '<div class="chatbot-messages" role="log" aria-live="polite" aria-relevant="additions"></div>'
        + '<div class="chatbot-suggested" role="group" aria-label="Suggested questions"></div>'
        + '<form class="chatbot-input-form" autocomplete="off">'
          + '<input type="text" class="chatbot-input" placeholder="Ask a question..." aria-label="Type your message" />'
          + '<button type="submit" class="chatbot-send" aria-label="Send message">'
            + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13M22 2l-4 10-10 4-1 1-1 1-1-1 4-10L2 2z"></path></svg>'
          + '</button>'
        + '</form>'
      + '</div>';
    document.body.appendChild(wrapper);
    this.wrapper = wrapper;
    this.launcher = wrapper.querySelector(".chatbot-launcher");
    this.window = wrapper.querySelector(".chatbot-window");
    this.messagesEl = wrapper.querySelector(".chatbot-messages");
    this.suggestedEl = wrapper.querySelector(".chatbot-suggested");
    this.input = wrapper.querySelector(".chatbot-input");
    this.form = wrapper.querySelector(".chatbot-input-form");
    this.minimizeBtn = wrapper.querySelector(".chatbot-minimize");
  }

  bind() {
    this.launcher.addEventListener("click", () => this.open());
    this.window.addEventListener("click", (e) => {
      if (e.target.closest(".chatbot-close")) this.close();
      if (e.target.closest(".chatbot-minimize")) this.minimize();
    });
    this.form.addEventListener("submit", (e) => {
      e.preventDefault();
      const val = this.input.value.trim();
      if (val) {
        this.addMessage("user", val);
        this.input.value = "";
        this.handleUserMessage(val);
      }
    });
    this.input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        this.form.dispatchEvent(new Event("submit"));
      }
    });
  }

  open() {
    this.isOpen = true;
    this.isMinimized = false;
    this.launcher.setAttribute("aria-expanded", "true");
    this.window.style.display = "flex";
    this.window.setAttribute("aria-hidden", "false");
    this.suggestedEl.style.display = "flex";
    this.input.focus();
  }

  close() {
    this.isOpen = false;
    this.isMinimized = false;
    this.launcher.setAttribute("aria-expanded", "false");
    this.window.style.display = "none";
    this.window.setAttribute("aria-hidden", "true");
    this.suggestedEl.style.display = "none";
  }

  minimize() {
    this.isMinimized = true;
    this.suggestedEl.style.display = "none";
    this.window.classList.add("minimized");
    this.window.setAttribute("aria-hidden", "true");
  }

  addMessage(sender, text) {
    this.messages.push({ sender, text });
    const msg = document.createElement("div");
    msg.className = `message message-${sender}`;
    msg.setAttribute("role", sender === "bot" ? "status" : null);
    msg.innerHTML = `<div class="message-bubble">${this.escapeHtml(text)}</div>`;
    this.messagesEl.appendChild(msg);
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
    if (sender === "bot") {
      this.window.setAttribute("aria-hidden", "false");
    }
  }

  escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  showSuggested() {
    this.suggestedEl.innerHTML = CHATBOT_KNOWLEDGE.suggested
      .map((q) => `<button type="button" class="suggested-btn" data-q="${this.escapeHtml(q)}">${this.escapeHtml(q)}</button>`)
      .join("");
    this.suggestedEl
      .querySelectorAll(".suggested-btn")
      .forEach((btn) => btn.addEventListener("click", () => {
        const text = btn.getAttribute("data-q");
        this.input.value = text;
        this.form.dispatchEvent(new Event("submit"));
      }));
  }

  handleUserMessage(message) {
    const lower = message.toLowerCase();
    let response = "";

    if (lower.includes("service") || lower.includes("what do") || lower.includes("offer")) {
      response = `We offer six integrated services:\n\n${CHATBOT_KNOWLEDGE.services.map((s) => `• ${s.title}: ${s.desc}`).join("\n")}`;
    } else if (lower.includes("solar")) {
      response = CHATBOT_KNOWLEDGE.services.find((s) => s.id === "solar")
        ? `Solar Power - ${CHATBOT_KNOWLEDGE.services.find((s) => s.id === "solar").desc}\n\nWe design systems sized to your actual consumption. Ask about utility-scale projects too.`
        : "Yes, we design and install solar power systems for homes and businesses across Ghana.";
    } else if (lower.includes("utility") || lower.includes("large") || lower.includes("commercial") || lower.includes("grid")) {
      response = `Utility-Scale Solar PV Design - ${CHATBOT_KNOWLEDGE.services.find((s) => s.id === "utility").desc}\n\nWe provide feasibility studies, PV layout design, engineering for grid connection and commissioning supervision.`;
    } else if (lower.includes("consult")) {
      response = `Consultancy for Solar PV Projects - ${CHATBOT_KNOWLEDGE.services.find((s) => s.id === "consultancy").desc}\n\nWe offer technical audits, vendor selection, contract review and performance verification.`;
    } else if (lower.includes("electrical") || lower.includes("wiring") || lower.includes("install")) {
      response = CHATBOT_KNOWLEDGE.services.find((s) => s.id === "electrical")
        ? `Electrical Works - ${CHATBOT_KNOWLEDGE.services.find((s) => s.id === "electrical").desc}`
        : "We handle complete wiring for new buildings, rewiring, distribution boards, lighting design, fault finding and repairs.";
    } else if (lower.includes("cool") || lower.includes("ac") || lower.includes("air")) {
      response = CHATBOT_KNOWLEDGE.services.find((s) => s.id === "ac")
        ? `Air Conditioning - ${CHATBOT_KNOWLEDGE.services.find((s) => s.id === "ac").desc}`
        : "We supply, install, service and repair air-conditioning systems for homes and businesses.";
    } else if (lower.includes("energy") || lower.includes("efficien") || lower.includes("sav")) {
      response = CHATBOT_KNOWLEDGE.services.find((s) => s.id === "energy")
        ? `Energy Solutions - ${CHATBOT_KNOWLEDGE.services.find((s) => s.id === "energy").desc}`
        : "We provide energy assessments, LED conversions, smart controls and solar-readiness evaluations.";
    } else if (lower.includes("project") || lower.includes("work")) {
      response = "We have completed solar, electrical, air conditioning and energy-efficiency projects across Ghana. You can view our project gallery on the Projects page.";
    } else if (lower.includes("quote") || lower.includes("pric") || lower.includes("cost") || lower.includes("estimate")) {
      response = "To get a clear quotation, fill in the Request a Quote form or tell us your requirements here. We will review your enquiry and recommend the right solution.";
    } else if (lower.includes("contact") || lower.includes("phone") || lower.includes("call") || lower.includes("reach")) {
      response = `You can reach us by phone or email. We are based in Cape Coast and serve customers nationwide across Ghana.`;
    } else if (lower.includes("area") || lower.includes("serve") || lower.includes("location")) {
      response = `We serve: ${CHATBOT_KNOWLEDGE.contact.service_areas.join(", ")}.`;
    } else if (lower.includes("process") || lower.includes("how")) {
      response = `Our process:\n\n${CHATBOT_KNOWLEDGE.process.map((step, i) => `${i + 1}. ${step}`).join("\n")}\n\nWe keep you informed at each stage.`;
    } else if (lower.includes("faq") || lower.includes("question")) {
      response = CHATBOT_KNOWLEDGE.faqs.map((f) => `Q: ${f.q}\nA: ${f.a}`).join("\n\n");
    } else if (lower.includes("chatbot") || lower.includes("you") || lower.includes("who")) {
      response = "I'm the Luminex Assistant, powered by Luminex Energy Solutions. I can answer questions about our services, projects, quotes and more. How else can I help?";
    }

    if (!response) {
      response = "I'm not sure I have the right answer for that. You can contact us directly via the Contact page, or ask about our services, projects, quotes, or FAQs.";
    }

    setTimeout(() => {
      this.addMessage("bot", response);
      this.suggestedEl.style.display = "flex";
    }, 500);
  }
}

function initChatbot() {
  if (document.querySelector(".chatbot-wrapper")) return;
  window.luminexChatbot = new LuminexChatbot();
  document.addEventListener("click", function(e) {
    if (window.luminexChatbot && !window.luminexChatbot.wrapper.contains(e.target) && window.luminexChatbot.isOpen) {
      if (e.target !== window.luminexChatbot.launcher) {
        window.luminexChatbot.close();
      }
    }
  });
}

document.addEventListener("DOMContentLoaded", initChatbot);
