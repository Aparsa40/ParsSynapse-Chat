import ModelManager from "./components/ModelManager";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import {
  ArrowDown,
  ArrowUp,
  AudioLines,
  Check,
  ChevronDown,
  Menu,
  MessageSquare,
  MoreHorizontal,
  PanelRightClose,
  Plus,
  Search,
  Settings2,
  Sparkles,
  SquarePen,
} from "lucide-react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type Conversation = {
  id: string;
  title: string;
  messages: Message[];
};

const starterConversations: Conversation[] = [
  {
    id: "welcome",
    title: "شروع کار با ParsSynapse",
    messages: [
      {
        id: "welcome-message",
        role: "assistant",
        content: "سلام! من ParsSynapse هستم.\n\nاین محیط برای گفتگو، آزمایش و مقایسه مدل‌های هوش مصنوعی ساخته می‌شود. فعلاً رابط چت در حالت نمایشی است؛ در مراحل بعدی به Backend و مدل‌های واقعی متصل می‌شویم.\n\nاز کجا شروع کنیم؟",
      },
    ],
  },
  { id: "ideas", title: "ایده‌های توسعه محصول", messages: [] },
  { id: "typescript", title: "پرسش‌های TypeScript", messages: [] },
];

const suggestions = [
  {
    icon: "✳",
    title: "ایده‌پردازی",
    description: "برای پروژه بعدی‌ام ایده بده",
  },
  {
    icon: "⌘",
    title: "برنامه‌نویسی",
    description: "در نوشتن کد TypeScript کمکم کن",
  },
  {
    icon: "◈",
    title: "یادگیری",
    description: "یک مفهوم فنی را ساده توضیح بده",
  },
  {
    icon: "⌁",
    title: "تحلیل و بررسی",
    description: "این مسئله را مرحله‌به‌مرحله تحلیل کن",
  },
];

function makeId() {
  return globalThis.crypto?.randomUUID?.() ?? `msg-${Date.now()}-${Math.random()}`;
}

function createDemoReply(prompt: string) {
  const normalized = prompt.toLowerCase();

  if (normalized.includes("سلام") || normalized.includes("hello")) {
    return "سلام! خوشحالم که اینجایی. چطور می‌تونم کمکت کنم؟";
  }

  if (normalized.includes("react") || normalized.includes("ری‌اکت")) {
    return "برای ساخت رابط‌های تعاملی، React به ما کمک می‌کند UI را به کامپوننت‌های مستقل تقسیم کنیم. در ParsSynapse هم همین رویکرد را دنبال می‌کنیم تا بخش‌هایی مثل Sidebar، MessageList و Composer مستقل و قابل توسعه باشند.\n\nتوجه: این پاسخ فعلاً نمونه نمایشی است و هنوز از مدل زبانی دریافت نمی‌شود.";
  }

  return "پیامت دریافت شد! رابط کاربری ParsSynapse Chat در حال حاضر به‌صورت نمایشی کار می‌کند. پس از پیاده‌سازی Backend، این قسمت پاسخ واقعی را از مدل انتخاب‌شده دریافت خواهد کرد.\n\nدر گام بعدی می‌توانیم تاریخچه مکالمات، انتخاب Provider و اتصال API را اضافه کنیم.";
}

export default function App() {
  const [conversations, setConversations] = useState<Conversation[]>(starterConversations);
  const [activeId, setActiveId] = useState("welcome");
  const [input, setInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState("ParsSynapse Auto");
  const [isThinking, setIsThinking] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [modelManagerOpen, setModelManagerOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const activeConversation = conversations.find((item) => item.id === activeId);
  const messages = activeConversation?.messages ?? [];
  const hasMessages = messages.length > 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isThinking]);

  const startNewChat = () => {
    const id = makeId();
    setConversations((current) => [
      { id, title: "گفت‌وگوی جدید", messages: [] },
      ...current,
    ]);
    setActiveId(id);
    setInput("");
    setSidebarOpen(false);
    textareaRef.current?.focus();
  };

  const selectConversation = (id: string) => {
    setActiveId(id);
    setSidebarOpen(false);
  };

  const sendMessage = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const content = input.trim();
    if (!content || isThinking) return;

    const userMessage: Message = { id: makeId(), role: "user", content };
    const conversationId = activeId;

    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === conversationId
          ? {
              ...conversation,
              title: conversation.messages.length === 0
                ? content.slice(0,  thirtyFive)
                : conversation.title,
              messages: [...conversation.messages, userMessage],
            }
          : conversation,
      ),
    );

    setInput("");
    setIsThinking(true);

    // Temporary UI-only response. The real provider call will live in the backend.
    window.setTimeout(() => {
      const assistantMessage: Message = {
        id: makeId(),
        role: "assistant",
        content: createDemoReply(content),
      };

      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === conversationId
            ? { ...conversation, messages: [...conversation.messages, assistantMessage] }
            : conversation,
        ),
      );
      setIsThinking(false);
    }, 650);
  };

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const copyMessage = async (message: Message) => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedId(message.id);
      window.setTimeout(() => setCopiedId(null), 1400);
    } catch {
      setCopiedId(null);
    }
  };

  return (
    <div className="app-shell" dir="rtl">
      {sidebarOpen && <button className="mobile-backdrop" aria-label="بستن منو" onClick={() => setSidebarOpen(false)} />}

      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-top">
          <button className="brand-lockup" onClick={startNewChat} aria-label="شروع گفت‌وگوی جدید">
            <span className="brand-mark"><Sparkles size={19} /></span>
            <span className="brand-name">ParsSynapse</span>
          </button>
          <button className="icon-button sidebar-collapse" title="بستن منو" onClick={() => setSidebarOpen(false)}>
            <PanelRightClose size={18} />
          </button>
        </div>

        <button className="new-chat-button" onClick={startNewChat}>
          <SquarePen size={17} />
          <span>گفت‌وگوی جدید</span>
          <span className="shortcut">Ctrl K</span>
        </button>

        <button className="sidebar-search" onClick={() => document.getElementById("chat-input")?.focus()}>
          <Search size={16} />
          <span>جست‌وجو در گفتگوها</span>
          <span className="search-shortcut">⌘ K</span>
        </button>

        <div className="conversation-section">
          <p className="section-label">گفتگوهای اخیر</p>
          <div className="conversation-list">
            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                className={`conversation-item ${activeId === conversation.id ? "conversation-active" : ""}`}
                onClick={() => selectConversation(conversation.id)}
                title={conversation.title}
              >
                <MessageSquare size={15} />
                <span>{conversation.title}</span>
                {activeId === conversation.id && <MoreHorizontal size={16} className="conversation-more" />}
              </button>
            ))}
          </div>
        </div>

        <div className="sidebar-spacer" />
        <div className="sidebar-footer">
          <div className="profile-card">
            <div className="avatar">P</div>
            <div className="profile-copy">
              <strong>فضای کاری شخصی</strong>
              <span>نسخه آزمایشی</span>
            </div>
            <button className="icon-button profile-menu" aria-label="تنظیمات حساب"><Settings2 size={17} /></button>
          </div>
          <div className="sidebar-version">ParsSynapse Chat <span>0.1.0</span></div>
        </div>
      </aside>

      {modelManagerOpen && <ModelManager onClose={() => setModelManagerOpen(false)} />}

      <main className="main-panel">
        <header className="topbar">
          <div className="topbar-start">
            <button className="icon-button mobile-menu" aria-label="باز کردن منو" onClick={() => setSidebarOpen(true)}>
              <Menu size={19} />
            </button>
            <button className="icon-button model-settings-button" title="مدیریت اتصال‌ها" aria-label="مدیریت اتصال‌ها" onClick={() => setModelManagerOpen(true)}><Settings2 size={17} /></button>
            <div className="model-picker-wrap">
              <button className="model-picker" onClick={() => setModelMenuOpen((open) => !open)}>
                <span>{selectedModel}</span>
                <ChevronDown size={15} />
              </button>
              {modelMenuOpen && (
                <div className="model-menu">
                  <p>انتخاب مدل</p>
                  {["ParsSynapse Auto", "Qwen3 (بعداً)", "OpenRouter (بعداً)"].map((model) => (
                    <button key={model} onClick={() => { setSelectedModel(model); setModelMenuOpen(false); }}>
                      <span>{model}</span>
                      {selectedModel === model && <Check size={15} />}
                    </button>
                  ))}
                  <small>اتصال Provider در مرحله Backend فعال می‌شود.</small>
                </div>
              )}
            </div>
            <span className="environment-pill"><span /> محیط آزمایشی</span>
          </div>
          <div className="topbar-end">
            <button className="share-button" onClick={() => void navigator.clipboard?.writeText(window.location.href)}>
              اشتراک‌گذاری
            </button>
            <button className="icon-button topbar-more" aria-label="گزینه‌های بیشتر"><MoreHorizontal size={20} /></button>
          </div>
        </header>

        <section className={`chat-stage ${hasMessages ? "chat-stage-active" : ""}`}>
          {!hasMessages ? (
            <div className="welcome-view">
              <div className="welcome-orb"><Sparkles size={27} strokeWidth={1.6} /></div>
              <p className="eyebrow">فضای یکپارچه هوش مصنوعی</p>
              <h1>امروز چه چیزی <span>می‌سازیم؟</span></h1>
              <p className="welcome-description">ایده‌هایت را مطرح کن، کد بنویس، تحلیل کن و با مدل‌های هوش مصنوعی گفتگو کن.</p>

              <div className="suggestion-grid">
                {suggestions.map((suggestion) => (
                  <button key={suggestion.title} className="suggestion-card" onClick={() => setInput(suggestion.description)}>
                    <span className="suggestion-icon">{suggestion.icon}</span>
                    <span className="suggestion-copy">
                      <strong>{suggestion.title}</strong>
                      <small>{suggestion.description}</small>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="message-list">
              {messages.map((message) => (
                <article key={message.id} className={`message-row message-${message.role}`}>
                  {message.role === "assistant" ? (
                    <div className="assistant-avatar"><Sparkles size={16} /></div>
                  ) : (
                    <div className="user-avatar">شما</div>
                  )}
                  <div className="message-body">
                    <div className="message-author">{message.role === "assistant" ? "ParsSynapse" : "شما"}</div>
                    <div className="message-content">{message.content}</div>
                    {message.role === "assistant" && (
                      <div className="message-actions">
                        <button onClick={() => void copyMessage(message)} aria-label="کپی پیام">
                          {copiedId === message.id ? <Check size={14} /> : <span className="copy-glyph">▢</span>}
                          <span>{copiedId === message.id ? "کپی شد" : "کپی"}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              ))}
              {isThinking && (
                <div className="message-row message-assistant">
                  <div className="assistant-avatar"><Sparkles size={16} /></div>
                  <div className="message-body">
                    <div className="message-author">ParsSynapse</div>
                    <div className="typing-indicator"><span /><span /><span /></div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </section>

        <footer className="composer-area">
          <form className="composer" onSubmit={sendMessage}>
            <textarea
              id="chat-input"
              ref={textareaRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleComposerKeyDown}
              placeholder="پیامت را برای ParsSynapse بنویس..."
              rows={1}
              aria-label="متن پیام"
            />
            <div className="composer-toolbar">
              <div className="composer-tools">
                <button type="button" className="composer-tool" title="افزودن فایل (به‌زودی)" disabled>
                  <Plus size={18} />
                </button>
                <button type="button" className="composer-mode" title="حالت پاسخ‌دهی">
                  <Sparkles size={14} />
                  <span>پاسخ هوشمند</span>
                  <ChevronDown size={13} />
                </button>
              </div>
              <div className="composer-actions">
                <button type="button" className="icon-button voice-button" title="ورودی صوتی (به‌زودی)" disabled>
                  <AudioLines size={18} />
                </button>
                <button type="submit" className="send-button" disabled={!input.trim() || isThinking} aria-label="ارسال پیام">
                  {input.trim() ? <ArrowUp size={19} /> : <ArrowDown size={18} />}
                </button>
              </div>
            </div>
          </form>
          <p className="disclaimer">ParsSynapse ممکن است اشتباه کند. پاسخ‌های مهم را بررسی کن.</p>
        </footer>
      </main>
    </div>
  );
}

const thirtyFive = 35;
