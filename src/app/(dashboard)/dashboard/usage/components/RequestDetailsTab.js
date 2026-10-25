"use client";

import { useState, useEffect, useCallback } from "react";
import Card from "@/shared/components/Card";
import Button from "@/shared/components/Button";
import Drawer from "@/shared/components/Drawer";
import Pagination from "@/shared/components/Pagination";
import { cn } from "@/shared/utils/cn";
import { AI_PROVIDERS, getProviderByAlias } from "@/shared/constants/providers";

const INP = "h-8 px-2 rounded border border-black/10 dark:border-white/10 bg-surface w-full min-w-0 text-xs text-text-main focus:outline-none focus:ring-1 focus:ring-primary/20";

let _pnCache, _pnNodes;
async function fetchProviderNames() {
  if (_pnCache && _pnNodes) return { _pnCache, _pnNodes };
  const { nodes = [] } = await (await fetch("/api/provider-nodes")).json();
  _pnNodes = Object.fromEntries(nodes.map((n) => [n.id, n.name]));
  _pnCache = { ...AI_PROVIDERS, ..._pnNodes };
  return { _pnCache, _pnNodes };
}
function pn(id, c) {
  if (!id || !c) return id ?? "";
  const v = c[id];
  if (typeof v === "string") return v;
  if (v?.name) return v.name;
  return (getProviderByAlias(id) || AI_PROVIDERS[id])?.name || id;
}
function cTok(t) { return t?.cached_tokens || t?.cache_read_input_tokens || 0; }
function ccTok(t) { return t?.cache_creation_input_tokens || 0; }
function iTok(t) { const p = t?.prompt_tokens || t?.input_tokens || 0, c = cTok(t); return p < c ? c : p; }
function fmt(n) { return n > 0 ? n.toLocaleString() : "\u2014"; }

function CollapsibleSection({ title, children, defaultOpen = false, icon }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-black/5 dark:border-white/5 rounded overflow-hidden">
      <button type="button" onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors">
        <span className="flex items-center gap-1.5 font-semibold text-text-main">
          {icon && <span className="material-symbols-outlined text-[16px] text-text-muted">{icon}</span>}{title}
        </span>
        <span className={cn("material-symbols-outlined text-[16px] text-text-muted transition-transform", open && "rotate-90")}>chevron_right</span>
      </button>
      {open && <div className="p-3 border-t border-black/5 dark:border-white/5">{children}</div>}
    </div>
  );
}

const FILTERS = [
  { key: "provider", label: "Provider", type: "select" },
  { key: "model", label: "Model", type: "search", ph: "model ID" },
  { key: "status", label: "Status", type: "select", opts: ["", "success", "error"] },
  { key: "startDate", label: "From", type: "datetime-local" },
  { key: "endDate", label: "To", type: "datetime-local" },
];

const COLS = [
  { k: "ts", h: "Time", a: "left", c: "whitespace-nowrap", r: d => new Date(d.timestamp).toLocaleString() },
  { k: "model", h: "Model", a: "left", c: "max-w-[200px] truncate font-mono", r: d => d.model },
  { k: "prov", h: "Provider", a: "left", c: "max-w-[140px] truncate", r: (d, c) => pn(d.provider, c) },
  { k: "in", h: "In", a: "right", c: "font-mono", r: d => fmt(iTok(d.tokens)) },
  { k: "cache", h: "Cache", a: "right", c: "font-mono", r: d => fmt(cTok(d.tokens)) },
  { k: "cc", h: "Cr.", a: "right", c: "font-mono", r: d => fmt(ccTok(d.tokens)) },
  { k: "out", h: "Out", a: "right", c: "font-mono", r: d => fmt(d.tokens?.completion_tokens || 0) },
  { k: "lat", h: "Latency", a: "left", c: "", r: d => <span className="font-mono text-xs">{d.latency?.ttft || 0}/{d.latency?.total || 0}ms</span> },
  { k: "st", h: "Status", a: "center", c: "", r: d => <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded", d.status === "success" ? "bg-green-500/15 text-green-600" : "bg-red-500/15 text-red-600")}>{d.status}</span> },
  { k: "act", h: "", a: "center", c: "", r: () => null },
];

export default function RequestDetailsTab() {
  const [details, setDetails] = useState([]);
  const [pg, setPg] = useState({ page: 1, pageSize: 20, totalItems: 0, totalPages: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sel, setSel] = useState(null);
  const [drawer, setDrawer] = useState(false);
  const [providers, setProviders] = useState([]);
  const [pnCache, setPnCache] = useState(null);
  const [f, setF] = useState({ provider: "", model: "", status: "", startDate: "", endDate: "" });

  const loadProviders = useCallback(async () => {
    try {
      const d = await (await fetch("/api/usage/providers")).json();
      const c = await fetchProviderNames();
      setProviders(d.providers || []);
      setPnCache(c._pnCache);
    } catch {}
  }, []);

  const loadDetails = useCallback(async () => {
    try {
      const p = new URLSearchParams({ page: String(pg.page), pageSize: String(pg.pageSize) });
      for (const [k, v] of Object.entries(f)) if (v) p.append(k, v);
      const res = await fetch(`/api/usage/request-details?${p}`);
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed to fetch");
      setDetails(d.details || []);
      setPg(g => ({ ...g, ...d.pagination }));
      setError("");
    } catch (e) { setError(e.message || "Failed to fetch"); } finally { setLoading(false); }
  }, [pg.page, pg.pageSize, f]);

  useEffect(() => { let a = true; queueMicrotask(() => { if (a) void loadProviders(); }); return () => { a = false; }; }, [loadProviders]);
  useEffect(() => { let a = true; queueMicrotask(() => { if (a) void loadDetails(); }); return () => { a = false; }; }, [loadDetails]);

  const chgF = (k, v) => { setLoading(true); setF(p => ({ ...p, [k]: v })); setPg(p => ({ ...p, page: 1 })); };
  const clrF = () => { setLoading(true); setF({ provider: "", model: "", status: "", startDate: "", endDate: "" }); setPg(p => ({ ...p, page: 1 })); };
  const hasF = Object.values(f).some(Boolean);

  const rFilter = (d) => {
    if (d.type === "select") {
      const opts = d.key === "provider"
        ? [{ v: "", l: "All" }, ...providers.map(p => ({ v: p.id, l: p.name }))]
        : (d.opts || []).map(o => ({ v: o, l: o || "All" }));
      return <select value={f[d.key]} onChange={e => chgF(d.key, e.target.value)} className={cn(INP, "cursor-pointer")} style={{ colorScheme: "auto" }}>{opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}</select>;
    }
    if (d.type === "date") return <input type="date" value={f[d.key]} onChange={e => chgF(d.key, e.target.value)} className={INP} style={{ colorScheme: "auto" }} />;
    return <input type={d.type} value={f[d.key]} onChange={e => chgF(d.key, e.target.value)} placeholder={d.ph} className={INP} />;
  };

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {/* Filters — single row on lg, compact height */}
      <Card padding="sm">
        <div className="flex flex-wrap items-end gap-2">
          {FILTERS.map(d => (
            <div key={d.key} className="flex min-w-0 flex-col gap-1 flex-1 min-w-[120px]">
              <label className="text-[11px] font-medium text-text-muted">{d.label}</label>
              {rFilter(d)}
            </div>
          ))}
          <Button variant="ghost" size="sm" onClick={clrF} disabled={!hasF} className="h-8 shrink-0">Clear</Button>
        </div>
      </Card>

      {/* Table */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-xs">
            <thead>
              <tr className="border-b border-black/5 dark:border-white/5">
                {COLS.map(c => <th key={c.k} className={cn(`text-${c.a} px-3 py-2 font-semibold text-text-muted`)}>{c.h}</th>)}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={COLS.length} className="py-6 text-center text-text-muted">
                  <span className="material-symbols-outlined animate-spin text-[16px] align-middle mr-1">progress_activity</span>Loading...
                </td></tr>
              ) : error ? (
                <tr><td colSpan={COLS.length} role="alert" className="py-6 text-center text-error">{error}</td></tr>
              ) : !details.length ? (
                <tr><td colSpan={COLS.length} className="py-6 text-center text-text-muted">No request details match these filters</td></tr>
              ) : details.map((d, i) => (
                <tr key={`${d.id}-${i}`} className="border-b border-black/5 dark:border-white/5 last:border-b-0 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                  {COLS.map(c => (
                    <td key={c.k} className={cn(`px-3 py-1.5 text-${c.a} text-text-main`, c.c)}>
                      {c.k === "act"
                        ? <Button variant="ghost" size="sm" onClick={() => { setSel(d); setDrawer(true); }} className="h-6 text-[11px] px-2">Detail</Button>
                        : c.r(d, pnCache)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && details.length > 0 && (
          <div className="border-t border-black/5 dark:border-white/5">
            <Pagination currentPage={pg.page} pageSize={pg.pageSize} totalItems={pg.totalItems}
              onPageChange={p => { setLoading(true); setPg(g => ({ ...g, page: p })); }}
              onPageSizeChange={s => { setLoading(true); setPg(g => ({ ...g, pageSize: s, page: 1 })); }} />
          </div>
        )}
      </Card>

      <Drawer isOpen={drawer} onClose={() => setDrawer(false)} title="Request Details" width="lg">
        {sel && <DrawerContent d={sel} pnCache={pnCache} />}
      </Drawer>
    </div>
  );
}

function DrawerContent({ d, pnCache }) {
  const row = (l, v, cls) => <div className="flex gap-2 text-xs"><span className="text-text-muted shrink-0 w-24 text-right">{l}</span><span className={cn("text-text-main", cls)}>{v}</span></div>;
  return (
    <div className="space-y-4">
      {/* Summary grid */}
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {row("ID", d.id, "break-all font-mono")}
        {row("Time", new Date(d.timestamp).toLocaleString())}
        {row("Provider", pn(d.provider, pnCache), "font-medium")}
        {row("Model", d.model, "font-mono")}
        {row("Status", d.status, cn("font-medium", d.status === "success" ? "text-green-600" : "text-red-600"))}
        {row("Latency", <span className="font-mono">{d.latency?.ttft || 0}/{d.latency?.total || 0}ms</span>)}
        {row("In", fmt(iTok(d.tokens)), "font-mono")}
        {cTok(d.tokens) > 0 && row("Cache", fmt(cTok(d.tokens)), "font-mono")}
        {ccTok(d.tokens) > 0 && row("Cache Cr.", fmt(ccTok(d.tokens)), "font-mono")}
        {row("Out", fmt(d.tokens?.completion_tokens || 0), "font-mono")}
      </div>

      {d.pxpipe && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-text-main">
            <span className="material-symbols-outlined text-[16px]">compress</span>PxPipe
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded", d.pxpipe.applied ? "bg-green-500/15 text-green-600" : "bg-amber-500/15 text-amber-600")}>
              {d.pxpipe.applied ? "On" : "Off"}
            </span>
          </div>
          {d.pxpipe.applied ? (
            <div className="grid grid-cols-2 gap-1.5 text-xs sm:grid-cols-4">
              <div><span className="text-text-muted block text-[10px]">Original</span><span className="font-mono">{(d.pxpipe.tokensBeforeEst || 0).toLocaleString()}</span></div>
              <div><span className="text-text-muted block text-[10px]">Compressed</span><span className="font-mono">{(d.pxpipe.tokensAfterEst || 0).toLocaleString()}</span></div>
              <div><span className="text-text-muted block text-[10px]">Saved</span><span className="font-mono text-green-600">{d.pxpipe.savedPct || 0}%</span></div>
              <div><span className="text-text-muted block text-[10px]">Images</span><span className="font-mono">{d.pxpipe.imageCount || 0} ({d.pxpipe.durationMs || 0}ms)</span></div>
            </div>
          ) : <p className="text-xs text-text-muted">{d.pxpipe.reason}{d.pxpipe.detail ? ` \u2014 ${d.pxpipe.detail}` : ""}</p>}
        </div>
      )}

      <div className="space-y-2">
        <CollapsibleSection title="Client Request" defaultOpen icon="input">
          <pre className="max-h-[250px] overflow-auto rounded border border-black/5 bg-black/5 p-2 font-mono text-[11px] text-text-main dark:border-white/5 dark:bg-white/5">{JSON.stringify(d.request, null, 2)}</pre>
        </CollapsibleSection>
        {d.providerRequest && <CollapsibleSection title="Provider Request" icon="translate">
          <pre className="max-h-[250px] overflow-auto rounded border border-black/5 bg-black/5 p-2 font-mono text-[11px] text-text-main dark:border-white/5 dark:bg-white/5">{JSON.stringify(d.providerRequest, null, 2)}</pre>
        </CollapsibleSection>}
        {d.providerResponse && <CollapsibleSection title="Provider Response" icon="data_object">
          <pre className="max-h-[250px] overflow-auto rounded border border-black/5 bg-black/5 p-2 font-mono text-[11px] text-text-main dark:border-white/5 dark:bg-white/5">{typeof d.providerResponse === "object" ? JSON.stringify(d.providerResponse, null, 2) : d.providerResponse}</pre>
        </CollapsibleSection>}
        <CollapsibleSection title="Client Response" defaultOpen icon="output">
          {d.response?.thinking && (
            <div className="mb-3">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-text-muted mb-1">
                <span className="material-symbols-outlined text-[14px]">psychology</span>Thinking
              </div>
              <pre className="max-h-[150px] overflow-auto rounded border border-black/5 bg-black/5 p-2 font-mono text-[11px] text-text-muted dark:border-white/5 dark:bg-white/5">
                {typeof d.response.thinking === "string" ? d.response.thinking : JSON.stringify(d.response.thinking, null, 2)}
              </pre>
            </div>
          )}
          <pre className="max-h-[250px] overflow-auto rounded border border-black/5 bg-black/5 p-2 font-mono text-[11px] text-text-main dark:border-white/5 dark:bg-white/5">{JSON.stringify(d.response, null, 2)}</pre>
        </CollapsibleSection>
      </div>
    </div>
  );
}
