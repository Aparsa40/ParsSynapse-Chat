import ModelManager from "./components/ModelManager";
import { getModels, getProviders, streamChat, type ModelDescriptor } from "./lib/api";
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
  Square,
  UserRound,
  Palette,
  PlugZap,
  SlidersHorizontal,
  Server,
  Wrench,
  RefreshCw,
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
        content: "سلام! من ParsSynapse هستم.\n\nرابط گفتگو به Backend محلی متصل است. پس از در دسترس قرار گرفتن Ollama و شناسایی یک مدل سازگار با گفتگو، می‌توانی مکالمه واقعی را شروع کنی.\n\nاز کجا شروع کنیم؟",
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

export default function App() {
  const [conversations, setConversations] = useState<Conversation[]>(starterConversations);
  const [activeId, setActiveId] = useState("welcome");
  const [input, setInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState("");
  const [models, setModels] = useState<ModelDescriptor[]>([]);
  const [providerStatus, setProviderStatus] = useState<"checking" | "connected" | "unavailable">("checking");
  const [backendError, setBackendError] = useState<string | null>(null);
  const [sendingByConversation, setSendingByConversation] = useState<Record<string, boolean>>({});
  const controllersRef = useRef<Map<string, AbortController>>(new Map());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [modelManagerOpen, setModelManagerOpen] = useState(false);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [settingsView, setSettingsView] = useState<"menu" | "profile" | "appearance" | "themes">("menu");
  const [connectorsOpen, setConnectorsOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [fontSize, setFontSize] = useState(13);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const activeConversation = conversations.find((item) => item.id === activeId);
  const messages = activeConversation?.messages ?? [];
  const hasMessages = messages.length > 0;
  const chatModels = models.filter((model) => model.chatSupported);
  const selectedModel = chatModels.find((model) => model.id === selectedModelId);
  const isThinking = Boolean(sendingByConversation[activeId]);

  const refreshModels = async (signal?: AbortSignal): Promise<string> => {
    try {
      const discoveredModels = await getModels(signal);
      if (signal?.aborted) return "بازخوانی لغو شد.";
      setModels(discoveredModels);
      setSelectedModelId((current) =>
        discoveredModels.some((model) => model.id === current && model.chatSupported)
          ? current
          : discoveredModels.find((model) => model.chatSupported)?.id ?? "",
      );
      setBackendError(null);
      return `فهرست مدل‌ها به‌روزرسانی شد؛ ${discoveredModels.length} مدل دریافت شد.`;
    } catch (error) {
      const message = error instanceof Error ? error.message : "بازخوانی مدل‌ها ناموفق بود.";
      setBackendError(message);
      return message;
    }
  };

  const refreshConnections = async (signal?: AbortSignal): Promise<string> => {
    try {
      const providers = await getProviders(signal);
      if (signal?.aborted) return "بازخوانی لغو شد.";
      setProviderStatus(
        providers.some((provider) => provider.id === "ollama" && provider.status === "connected")
          ? "connected"
          : "unavailable",
      );
      setBackendError(null);
      return `وضعیت اتصال‌ها به‌روزرسانی شد؛ ${providers.length} Provider شناسایی شد.`;
    } catch (error) {
      const message = error instanceof Error ? error.message : "بازخوانی اتصال‌ها ناموفق بود.";
      setProviderStatus("unavailable");
      setBackendError(message);
      return message;
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void Promise.all([refreshModels(controller.signal), refreshConnections(controller.signal)]);
    return () => controller.abort();
  }, []);

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

  const sendMessage = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const content = input.trim();
    if (!content || sendingByConversation[activeId]) return;
    if (!selectedModel) {
      setBackendError("مدل سازگار با گفتگو در دسترس نیست. وضعیت Ollama و فهرست مدل‌ها را بررسی کن.");
      return;
    }

    const conversationId = activeId;
    const userMessage: Message = { id: makeId(), role: "user", content };
    const assistantMessage: Message = { id: makeId(), role: "assistant", content: "" };
    const history = [...messages, userMessage];
    const controller = new AbortController();
    controllersRef.current.set(conversationId, controller);

    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === conversationId
          ? {
              ...conversation,
              title: conversation.messages.length === 0 ? content.slice(0, thirtyFive) : conversation.title,
              messages: [...conversation.messages, userMessage, assistantMessage],
            }
          : conversation,
      ),
    );
    setInput("");
    setBackendError(null);
    setSendingByConversation((current) => ({ ...current, [conversationId]: true }));

    try {
      await streamChat({
        model: selectedModel.id,
        messages: history.map((message) => ({ role: message.role, content: message.content })),
        signal: controller.signal,
        onDelta: (delta) => {
          setConversations((current) =>
            current.map((conversation) =>
              conversation.id === conversationId
                ? {
                    ...conversation,
                    messages: conversation.messages.map((message) =>
                      message.id === assistantMessage.id ? { ...message, content: message.content + delta } : message,
                    ),
                  }
                : conversation,
            ),
          );
        },
      });
    } catch (error) {
      const message = controller.signal.aborted
        ? "درخواست گفتگو متوقف شد."
        : error instanceof Error ? error.message : "در دریافت پاسخ از مدل خطایی رخ داد.";
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                messages: conversation.messages.map((item) =>
                  item.id === assistantMessage.id
                    ? { ...item, content: item.content ? `${item.content}\n\n${message}` : message }
                    : item,
                ),
              }
            : conversation,
        ),
      );
    } finally {
      controllersRef.current.delete(conversationId);
      setSendingByConversation((current) => ({ ...current, [conversationId]: false }));
    }
  };

  const stopActiveChat = () => {
    controllersRef.current.get(activeId)?.abort();
  };

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
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
    <div className={`app-shell ${theme === "light" ? "theme-light" : ""}`} dir="rtl" style={{ "--chat-font-size": `${fontSize}px` } as React.CSSProperties}>
      {sidebarOpen && <button className="mobile-backdrop" aria-label="بستن منو" onClick={() => setSidebarOpen(false)} />}

      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-top">
          <button className="brand-lockup" onClick={startNewChat} aria-label="شروع گفت‌وگوی جدید">
            <span className="brand-mark"><Sparkles size={19} /></span>
            <span className="brand-name">ParsSynapse</span>
          </button>
          <div className="sidebar-top-actions">
            <button className="icon-button sidebar-settings-trigger" title="تنظیمات" aria-label="تنظیمات" aria-expanded={settingsMenuOpen} onClick={() => { setSettingsMenuOpen((open) => !open); setSettingsView("menu"); }}>
              <Settings2 size={18} />
            </button>
            <button className="icon-button sidebar-collapse" title="بستن منو" onClick={() => setSidebarOpen(false)}>
              <PanelRightClose size={18} />
            </button>
          </div>
        </div>

        {settingsMenuOpen && (
          <div className="settings-popover" role="dialog" aria-label="تنظیمات فضای کاری">
            {settingsView === "menu" ? (
              <>
                <div className="settings-popover-heading">فضای شخصی</div>
                <button onClick={() => setSettingsView("profile")}><UserRound size={16} /><span>Profile</span></button>
                <button onClick={() => setSettingsView("appearance")}><SlidersHorizontal size={16} /><span>Appearance</span></button>
                <button onClick={() => setSettingsView("themes")}><Palette size={16} /><span>Themes</span></button>
                <button onClick={() => { setModelManagerOpen(true); setSettingsMenuOpen(false); }}><PlugZap size={16} /><span>Connections</span></button>
              </>
            ) : (
              <>
                <div className="settings-popover-subhead">
                  <button className="settings-back" onClick={() => setSettingsView("menu")}>‹ بازگشت</button>
                  <strong>{settingsView === "profile" ? "Profile" : settingsView === "appearance" ? "Appearance" : "Themes"}</strong>
                </div>
                {settingsView === "profile" && (
                  <div className="settings-profile">
                    <div className="avatar">P</div>
                    <div><strong>فضای کاری شخصی</strong><small>حساب محلی · نسخه آزمایشی</small></div>
                  </div>
                )}
                {settingsView === "appearance" && (
                  <div className="settings-controls">
                    <label>اندازه فونت گفتگو <strong>{fontSize}px</strong></label>
                    <input type="range" min="12" max="18" value={fontSize} onChange={(event) => setFontSize(Number(event.target.value))} />
                    <small>تغییر اندازه متن پیام‌های گفتگو</small>
                  </div>
                )}
                {settingsView === "themes" && (
                  <div className="settings-theme-options">
                    <button className={theme === "dark" ? "selected" : ""} onClick={() => setTheme("dark")}><span className="theme-swatch theme-swatch-dark" />تیره {theme === "dark" && <Check size={14} />}</button>
                    <button className={theme === "light" ? "selected" : ""} onClick={() => setTheme("light")}><span className="theme-swatch theme-swatch-light" />روشن {theme === "light" && <Check size={14} />}</button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

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
          <button className="profile-card profile-card-button" onClick={() => { setSettingsMenuOpen(true); setSettingsView("profile"); }}>
            <div className="avatar">P</div>
            <div className="profile-copy">
              <strong>فضای کاری شخصی</strong>
              <span>حساب محلی · نسخه آزمایشی</span>
            </div>
            <MoreHorizontal size={17} className="profile-menu" />
          </button>
          <div className="sidebar-version">ParsSynapse Chat <span>0.1.0</span></div>
        </div>
      </aside>

      {modelManagerOpen && <ModelManager onClose={() => setModelManagerOpen(false)} onRefreshModels={() => refreshModels()} onRefreshConnections={() => refreshConnections()} />}

      <main className="main-panel">
        <header className="topbar">
          <div className="topbar-start">
            <button className="icon-button mobile-menu" aria-label="باز کردن منو" onClick={() => setSidebarOpen(true)}>
              <Menu size={19} />
            </button>
            <div className="chat-context-title">{activeConversation?.title ?? "گفت‌وگوی جدید"}</div>
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
                <div className="composer-menu-wrap">
                  <button type="button" className="composer-tool" title="Connectorها و ابزارها" aria-label="Connectorها و ابزارها" aria-expanded={connectorsOpen} onClick={() => { setConnectorsOpen((open) => !open); setModelMenuOpen(false); }}>
                    <Plus size={18} />
                  </button>
                  {connectorsOpen && (
                    <div className="composer-popover connector-popover">
                      <strong>ابزارها و Connectorها</strong>
                      <div><PlugZap size={15} /><span>GitHub</span><small>در انتظار اتصال Backend</small></div>
                      <div><Wrench size={15} /><span>Local Workspace</span><small>MCP · در انتظار اتصال</small></div>
                      <div><Server size={15} /><span>MCP Tools</span><small>مدیریت از Connections</small></div>
                    </div>
                  )}
                </div>
                <div className="composer-menu-wrap">
                  <button type="button" className="composer-mode active-model-trigger" title="انتخاب مدل و Adapter" aria-expanded={modelMenuOpen} onClick={() => { setModelMenuOpen((open) => !open); setConnectorsOpen(false); }}>
                    <span className="adapter-status-dot" />
                    <span>{selectedModel?.providerId === "ollama" ? "Ollama" : selectedModel?.providerId ?? "بدون Adapter"}</span>
                    <span className="composer-model-name">{selectedModel?.name ?? "مدلی انتخاب نشده"}</span>
                    <ChevronDown size={13} />
                  </button>
                  {modelMenuOpen && (
                    <div className="composer-popover model-menu composer-model-menu">
                      <strong>انتخاب مدل گفتگو</strong>
                      {chatModels.length === 0 ? <small>مدل سازگار با گفتگو در دسترس نیست.</small> : chatModels.map((model) => (
                        <button key={model.id} onClick={() => { setSelectedModelId(model.id); setModelMenuOpen(false); }}>
                          <span>{model.name}</span><small>{model.providerId}</small>
                          {selectedModelId === model.id && <Check size={14} />}
                        </button>
                      ))}
                      <button type="button" onClick={() => void refreshModels()}><RefreshCw size={13} /><span>بازخوانی فهرست مدل‌ها</span></button>
                    </div>
                  )}
                </div>
              </div>
              <div className="composer-actions">
                <button type="button" className="icon-button voice-button" title="ورودی صوتی (به‌زودی)" disabled>
                  <AudioLines size={18} />
                </button>
                <button
                  type={isThinking ? "button" : "submit"}
                  onClick={isThinking ? stopActiveChat : undefined}
                  className="send-button"
                  disabled={!isThinking && (!input.trim() || !selectedModel)}
                  aria-label={isThinking ? "توقف پاسخ" : "ارسال پیام"}
                  title={isThinking ? "توقف پاسخ" : "ارسال پیام"}
                >
                  {isThinking ? <Square size={15} /> : input.trim() ? <ArrowUp size={19} /> : <ArrowDown size={18} />}
                </button>
              </div>
            </div>
          </form>
          {backendError && <p className="disclaimer" role="status">{backendError}</p>}
          <p className="disclaimer">ParsSynapse ممکن است اشتباه کند. پاسخ‌های مهم را بررسی کن.</p>
        </footer>
      </main>
    </div>
  );
}

const thirtyFive = 35;
