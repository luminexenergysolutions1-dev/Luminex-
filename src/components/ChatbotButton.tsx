import { useEffect, useRef, useState } from "react";
import { ChatIcon, CloseIcon } from "@/components/Icons";
import { chatbotFAQs, getServicesInfo, WELCOME_MESSAGE } from "@/lib/chatbotKnowledge";
import { useSite } from "@/context/SiteContext";

type Message = {
  id: number;
  text: string;
  isBot: boolean;
  links?: { label: string; path: string }[];
  timestamp: Date;
};

const KEY = "luminex_chat_open";

function findAnswer(query: string): { text: string; links?: { label: string; path: string }[] } {
  const lower = query.toLowerCase().trim();
  if (!lower) return { text: WELCOME_MESSAGE };

  let best: { score: number; item: (typeof chatbotFAQs)[0] } | null = null;
  for (const item of chatbotFAQs) {
    const allKeywords = [...item.keywords, ...item.question.toLowerCase().split(/\s+/)];
    let score = 0;
    for (const kw of allKeywords) {
      if (lower.includes(kw)) score += 1;
    }
    if (score > 0 && (!best || score > best.score)) best = { score, item };
  }

  if (best) {
    return { text: best.item.answer, links: best.item.links };
  }

  return {
    text: "I'm not certain about that. Let me connect you with our team for a precise answer.",
    links: [{ label: "Contact page", path: "/contact" }, { label: "Request a Quote", path: "/quote" }],
  };
}

function ChatbotButtonInner() {
  const { whatsappLink } = useSite();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(KEY) === "1") {
        return;
      }
    } catch {}
    const show = setTimeout(() => setOpen(true), 10000);
    return () => clearTimeout(show);
  }, []);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([
        {
          id: 1,
          isBot: true,
          text: WELCOME_MESSAGE,
          timestamp: new Date(),
        },
      ]);
    }
  }, [open, messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollTo({
      top: messagesEndRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isTyping]);

  const sendMessage = () => {
    if (!input.trim() || isTyping) return;
    const userText = input.trim();
    const userMsg: Message = {
      id: Date.now(),
      isBot: false,
      text: userText,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      const reply = findAnswer(userText);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          isBot: true,
          text: reply.text,
          links: reply.links,
          timestamp: new Date(),
        },
      ]);
      setIsTyping(false);
    }, 500);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleWhatsAppRedirect = (message: string) => {
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {}
    setOpen(false);
    setMinimized(false);
    const services = getServicesInfo();
    const fullMessage = `${message}\n\nFrom Luminex website chatbot. Services: ${services.map((s) => s.title).join(", ")}.`;
    window.open(whatsappLink(fullMessage), "_blank", "noopener,noreferrer");
  };

  if (!open) {
    return (
      <div className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-[max(1.25rem,env(safe-area-inset-right))] z-40 flex max-w-[calc(100vw-2.5rem)] flex-col items-end gap-3">
        <button
          onClick={() => {
            setOpen(true);
            try { sessionStorage.setItem(KEY, "1"); } catch {}
          }}
          aria-label="Open chatbot"
          className="relative grid h-14 w-14 place-items-center rounded-full bg-charcoal text-white shadow-[0_12px_30px_-8px_rgba(16,24,32,0.5)] transition-transform hover:scale-105 active:scale-95"
        >
          <span className="absolute inset-0 rounded-full bg-charcoal opacity-40 animate-ping [animation-duration:2.5s]" aria-hidden />
          <ChatIcon width={28} height={28} className="relative" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-[max(1.25rem,env(safe-area-inset-right))] z-40">
      <div className="relative flex flex-col w-[340px] max-w-[calc(100vw-2rem)] h-[520px] bg-white rounded-2xl shadow-premium ring-1 ring-charcoal/5 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between bg-charcoal text-white p-4 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <ChatIcon width={20} height={20} />
            <span>Luminex Assistant</span>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setMinimized(true)}
              aria-label="Minimize"
              className="grid h-7 w-7 place-items-center rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              <CloseIcon width={14} height={14} />
            </button>
            <button
              onClick={() => { setOpen(false); setMinimized(false); }}
              aria-label="Close"
              className="grid h-7 w-7 place-items-center rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors rotate-45"
            >
              <CloseIcon width={14} height={14} />
            </button>
          </div>
        </div>

        {/* Messages area */}
        <div ref={messagesEndRef} className="flex-1 overflow-y-auto py-3 px-4 space-y-3 no-scrollbar">
          {messages.map((msg) => (
            <div key={msg.id} className={`max-w-[85%] ${msg.isBot ? "self-start" : "self-end"}`}>
              <div
                className={`rounded-xl px-3.5 py-2.5 text-sm ${
                  msg.isBot
                    ? "bg-charcoal/5 text-charcoal rounded-bl-md"
                    : "bg-energy text-white rounded-br-md"
                }`}
              >
                <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                {msg.links && (
                  <div className="mt-2 flex flex-col gap-1">
                    {msg.links.map((link) => (
                      <a
                        key={link.path}
                        href={link.path}
                        className={`text-xs underline ${
                          msg.isBot ? "text-energy" : "text-white/90"
                        }`}
                      >
                        {link.label}
                      </a>
                    ))}
                  </div>
                )}
              </div>
              <p className={`text-[10px] text-charcoal/30 mt-1 ${msg.isBot ? "text-right" : "text-right"}`}>
                {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          ))}
          {isTyping && (
            <div className="flex items-center gap-1 text-charcoal/40">
              <span className="w-1.5 h-1.5 bg-charcoal/30 rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 bg-charcoal/30 rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 bg-charcoal/30 rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="p-3 border-t border-charcoal/5 flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            maxLength={500}
            className="flex-1 resize-none rounded-xl border border-charcoal/10 bg-charcoal/5 text-sm text-charcoal placeholder:text-charcoal/40 focus:outline-none focus:ring-2 focus:ring-energy/30 px-3 py-2"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isTyping}
            aria-label="Send message"
            className="grid h-9 w-9 place-items-center rounded-xl bg-energy text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-energy-dark transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2 21l21-9-21-9v7l15 2-15 2z" />
            </svg>
          </button>
        </div>

        {/* WhatsApp quick redirect */}
        <div className="px-3 pb-3 border-t border-charcoal/5 text-center">
          <button
            onClick={() => handleWhatsAppRedirect("Hi, I need assistance with Luminex services")}
            className="flex items-center justify-center gap-2 text-xs text-charcoal/60 hover:text-[#168a57] hover:bg-charcoal/5 rounded-lg py-2 w-full transition-colors"
          >
            <span className="text-[#168a57]">Need to speak with a human?</span>
            <span className="text-xs">Continue on WhatsApp</span>
          </button>
        </div>
      </div>

      {/* Minimized state */}
      {minimized && (
        <button
          onClick={() => setMinimized(false)}
          className="absolute bottom-16 right-0 bg-charcoal text-white rounded-full h-14 w-14 shadow-lg grid place-items-center"
        >
          <ChatIcon width={24} height={24} />
        </button>
      )}
    </div>
  );
}

export function ChatbotButton() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-[max(1.25rem,env(safe-area-inset-right))] z-40" />;
  }

  return <ChatbotButtonInner />;
}