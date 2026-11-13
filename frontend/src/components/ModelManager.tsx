import { useMemo, useState, type FormEvent } from "react";
import { Check, ChevronDown, Cpu, Plus, Server, ShieldCheck, X } from "lucide-react";
import {
  modelProviderPresets,
  type McpServerProfile,
  type ModelConnectionProfile,
  type ModelConnectionType,
  type McpTransport,
} from "../types/providers";

type Props = { onClose: () => void };



export default function ModelManager({ onClose }: Props) {
  const [activeTab, setActiveTab] = useState<"models" | "mcp">("models");
  const [connectionType, setConnectionType] = useState<ModelConnectionType>("api");
  const [providerId, setProviderId] = useState("openrouter");
  const [profileName, setProfileName] = useState("");
  const [endpoint, setEndpoint] = useState("https://openrouter.ai/api/v1");
  const [model, setModel] = useState("");
  const [profiles, setProfiles] = useState<ModelConnectionProfile[]>([]);
  const [mcpServers, setMcpServers] = useState<McpServerProfile[]>([]);
  const [serverName, setServerName] = useState("");
  const [transport, setTransport] = useState<McpTransport>("stdio");
  const [commandOrUrl, setCommandOrUrl] = useState("");

  const availablePresets = useMemo(
    () => modelProviderPresets.filter((item) => item.connectionType === connectionType),
    [connectionType],
  );

  const selectedPreset = modelProviderPresets.find((item) => item.id === providerId);

  const chooseType = (nextType: ModelConnectionType) => {
    const firstPreset = modelProviderPresets.find((item) => item.connectionType === nextType);
    setConnectionType(nextType);
    if (firstPreset) {
      setProviderId(firstPreset.id);
      setEndpoint(firstPreset.endpoint);
      setModel(firstPreset.defaultModel);
    }
  };

  const chooseProvider = (nextId: string) => {
    const preset = modelProviderPresets.find((item) => item.id === nextId);
    if (!preset) return;
    setProviderId(nextId);
    setEndpoint(preset.endpoint);
    setModel(preset.defaultModel);
  };

  const addModelProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profileName.trim() || !endpoint.trim() || !model.trim()) return;
    setProfiles((current) => [
      ...current,
      {
        id: globalThis.crypto?.randomUUID?.() ?? `profile-${Date.now()}`,
        name: profileName.trim(),
        providerId,
        connectionType,
        endpoint: endpoint.trim(),
        model: model.trim(),
      },
    ]);
    setProfileName("");
  };

  const addMcpServer = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!serverName.trim() || !commandOrUrl.trim()) return;
    setMcpServers((current) => [
      ...current,
      {
        id: globalThis.crypto?.randomUUID?.() ?? `mcp-${Date.now()}`,
        name: serverName.trim(),
        transport,
        commandOrUrl: commandOrUrl.trim(),
        enabled: false,
      },
    ]);
    setServerName("");
    setCommandOrUrl("");
  };

  const toggleMcpServer = (id: string) => {
    setMcpServers((current) =>
      current.map((server) => server.id === id ? { ...server, enabled: !server.enabled } : server),
    );
  };

  return (
    <div className="manager-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="model-manager" role="dialog" aria-modal="true" aria-labelledby="manager-title" dir="rtl">
        <header className="manager-header">
          <div className="manager-heading">
            <span className="manager-heading-icon"><Cpu size={19} /></span>
            <div>
              <h2 id="manager-title">مدیریت اتصال‌ها</h2>
              <p>مدل‌ها، سرویس‌های محلی و ابزارهای MCP را مدیریت کن</p>
            </div>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="بستن"><X size={19} /></button>
        </header>

        <nav className="manager-tabs" aria-label="بخش‌های مدیریت اتصال">
          <button className={activeTab === "models" ? "manager-tab active" : "manager-tab"} onClick={() => setActiveTab("models")}>
            <Cpu size={15} /> مدل‌ها و Providerها
          </button>
          <button className={activeTab === "mcp" ? "manager-tab active" : "manager-tab"} onClick={() => setActiveTab("mcp")}>
            <Server size={15} /> سرورهای MCP
          </button>
        </nav>

        {activeTab === "models" ? (
          <div className="manager-content">
            <div className="manager-section-title">
              <div><h3>اتصال مدل جدید</h3><p>روش اتصال را انتخاب و مشخصات سرویس را وارد کن.</p></div>
            </div>
            <div className="connection-type-switch">
              <button className={connectionType === "api" ? "selected" : ""} onClick={() => chooseType("api")}>API Provider</button>
              <button className={connectionType === "local" ? "selected" : ""} onClick={() => chooseType("local")}>مدل محلی</button>
            </div>
            <form className="manager-form" onSubmit={addModelProfile}>
              <label>ارائه‌دهنده
                <span className="select-wrap">
                  <select value={providerId} onChange={(event) => chooseProvider(event.target.value)}>
                    {availablePresets.map((preset) => <option key={preset.id} value={preset.id}>{preset.name}</option>)}
                  </select>
                  <ChevronDown size={15} />
                </span>
              </label>
              <p className="field-hint">{selectedPreset?.description}</p>
              <label>نام نمایشی اتصال
                <input value={profileName} onChange={(event) => setProfileName(event.target.value)} placeholder="مثلاً OpenRouter - Free Models" required />
              </label>
              <label>آدرس Endpoint
                <input value={endpoint} onChange={(event) => setEndpoint(event.target.value)} placeholder="https://... یا http://127.0.0.1:11434" dir="ltr" required />
              </label>
              <label>شناسه مدل
                <input value={model} onChange={(event) => setModel(event.target.value)} placeholder="مثلاً qwen3:14b یا provider/model" dir="ltr" required />
              </label>
              <div className="manager-security-note"><ShieldCheck size={16} /><span>کلید API در مرورگر ذخیره نمی‌شود. مدیریت امن Secretها و تست اتصال در Backend پیاده‌سازی خواهد شد.</span></div>
              <button className="manager-primary-button" type="submit"><Plus size={16} /> افزودن پیکربندی مدل</button>
            </form>

            <div className="manager-list-heading"><h3>پیکربندی‌های فعلی</h3><span>{profiles.length} مورد</span></div>
            {profiles.length === 0 ? (
              <div className="manager-empty">
                <Cpu size={22} />
                <strong>هنوز پیکربندی مدلی ثبت نشده است</strong>
                <span>مدل‌های نصب‌شده Ollama پس از پیاده‌سازی Backend به‌صورت پویا شناسایی می‌شوند.</span>
              </div>
            ) : (
              <div className="connection-list">
                {profiles.map((profile) => (
                  <article className="connection-item" key={profile.id}>
                    <span className="connection-item-icon"><Cpu size={17} /></span>
                    <div className="connection-item-copy">
                      <strong>{profile.name}</strong>
                      <small dir="ltr">{profile.model} · {profile.endpoint}</small>
                    </div>
                    <span className="connection-draft">پیکربندی محلی</span>
                  </article>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="manager-content">
            <div className="manager-section-title">
              <div><h3>اتصال به MCP Server</h3><p>MCP ابزارها و منابع را در اختیار Agent قرار می‌دهد؛ خودش Provider تولید متن نیست.</p></div>
            </div>
            <form className="manager-form" onSubmit={addMcpServer}>
              <label>نام سرور
                <input value={serverName} onChange={(event) => setServerName(event.target.value)} placeholder="مثلاً Local Workspace MCP" required />
              </label>
              <label>نوع Transport
                <span className="select-wrap">
                  <select value={transport} onChange={(event) => setTransport(event.target.value as McpTransport)}>
                    <option value="stdio">STDIO (فرایند محلی)</option>
                    <option value="streamable-http">Streamable HTTP</option>
                  </select>
                  <ChevronDown size={15} />
                </span>
              </label>
              <label>{transport === "stdio" ? "Command" : "Server URL"}
                <input value={commandOrUrl} onChange={(event) => setCommandOrUrl(event.target.value)} placeholder={transport === "stdio" ? "مثلاً node ./server.js" : "http://127.0.0.1:3001/mcp"} dir="ltr" required />
              </label>
              <div className="manager-security-note"><ShieldCheck size={16} /><span>اتصال مستقیم از مرورگر انجام نمی‌شود. Backend نقش MCP Client را خواهد داشت و مجوزهای هر سرور را کنترل می‌کند.</span></div>
              <button className="manager-primary-button" type="submit"><Plus size={16} /> افزودن سرور MCP</button>
            </form>
            <div className="manager-list-heading"><h3>سرورهای ثبت‌شده</h3><span>{mcpServers.length} مورد</span></div>
            {mcpServers.length === 0 ? (
              <div className="manager-empty"><Server size={22} /><strong>هنوز سروری ثبت نشده است</strong><span>مشخصات یک MCP Server را وارد کن تا به فهرست پیکربندی‌ها اضافه شود.</span></div>
            ) : (
              <div className="connection-list">
                {mcpServers.map((server) => (
                  <article className="connection-item" key={server.id}>
                    <span className="connection-item-icon"><Server size={17} /></span>
                    <div className="connection-item-copy">
                      <strong>{server.name}</strong>
                      <small dir="ltr">{server.transport} · {server.commandOrUrl}</small>
                    </div>
                    <button className={server.enabled ? "mcp-toggle enabled" : "mcp-toggle"} onClick={() => toggleMcpServer(server.id)}>
                      {server.enabled ? <><Check size={13} /> فعال</> : "غیرفعال"}
                    </button>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
        <footer className="manager-footer">
          <span>این نسخه فقط پیکربندی‌ها را در حافظه رابط نگه می‌دارد؛ اتصال واقعی در مرحله Backend فعال می‌شود.</span>
          <button onClick={onClose}>بستن</button>
        </footer>
      </section>
    </div>
  );
}
