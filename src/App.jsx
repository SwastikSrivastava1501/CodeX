import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Package, Truck, ScanLine, Tag, CheckCircle2, AlertTriangle, Lightbulb,
  MessageSquareText, Copy, Check, Code2, Clock, Cpu, Loader2, Sparkles,
  ListChecks, Award, ChevronRight, RotateCcw, X, PackageSearch
} from 'lucide-react';

/* ---------------------------------- THEME ---------------------------------- */

const C = {
  bg: '#0A0E14',
  bgGrid: '#0D131B',
  panel: '#111823',
  panelAlt: '#0D1420',
  panel2: '#161F2C',
  border: '#212C3B',
  borderLight: '#2A374A',
  amber: '#FFA41C',
  amberDim: '#8A5C10',
  amberGlow: 'rgba(255,164,28,0.12)',
  teal: '#12D6B3',
  tealDim: '#0B4A3F',
  red: '#FF5D6C',
  redDim: '#5A1F26',
  text: '#E7EDF3',
  textMuted: '#8996A6',
  textFaint: '#4C5A6E',
};

const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700;800&display=swap');
`;

/* ------------------------------- SAMPLE DATA -------------------------------- */

const SAMPLE_SNIPPETS = [
  {
    name: 'Two Sum',
    lang: 'python',
    code: `def two_sum(nums, target):
    seen = {}
    for i, n in enumerate(nums):
        complement = target - n
        if complement in seen:
            return [seen[complement], i]
        seen[n] = i
    return []`,
  },
  {
    name: 'LRU Cache',
    lang: 'python',
    code: `class LRUCache:
    def __init__(self, capacity):
        self.cache = {}
        self.capacity = capacity
        self.order = []

    def get(self, key):
        if key not in self.cache:
            return -1
        self.order.remove(key)
        self.order.append(key)
        return self.cache[key]

    def put(self, key, value):
        if key in self.cache:
            self.order.remove(key)
        elif len(self.cache) >= self.capacity:
            oldest = self.order.pop(0)
            del self.cache[oldest]
        self.cache[key] = value
        self.order.append(key)`,
  },
  {
    name: 'Merge Intervals',
    lang: 'python',
    code: `def merge(intervals):
    intervals.sort(key=lambda x: x[0])
    merged = []
    for interval in intervals:
        if not merged or merged[-1][1] < interval[0]:
            merged.append(interval)
        else:
            merged[-1][1] = max(merged[-1][1], interval[1])
    return merged`,
  },
  {
    name: 'Level Order Traversal',
    lang: 'python',
    code: `def level_order(root):
    if not root:
        return []
    result = []
    queue = [root]
    while queue:
        level = []
        next_queue = []
        for node in queue:
            level.append(node.val)
            if node.left: next_queue.append(node.left)
            if node.right: next_queue.append(node.right)
        result.append(level)
        queue = next_queue
    return result`,
  },
];

const LANGUAGES = ['Python', 'Java', 'JavaScript', 'TypeScript', 'C++', 'Go', 'C#'];

const STAGES = [
  { key: 'received', label: 'Received', icon: Package },
  { key: 'scanning', label: 'Scanning', icon: ScanLine },
  { key: 'sorting', label: 'Sorting', icon: PackageSearch },
  { key: 'labeling', label: 'Labeling', icon: Tag },
  { key: 'shipped', label: 'Shipped', icon: Truck },
];

const WEIGHT_TIERS = [
  { label: 'Envelope', desc: 'O(1) · O(log n)', color: C.teal },
  { label: 'Small Package', desc: 'O(n)', color: '#7BE0CB' },
  { label: 'Standard Box', desc: 'O(n log n)', color: C.amber },
  { label: 'Freight Pallet', desc: 'O(n\u00B2)', color: '#FF8A3D' },
  { label: 'Overweight \u2014 Hazmat', desc: 'O(2\u207F) \u00B7 O(n!)', color: C.red },
];

function tierFromComplexity(str) {
  if (!str) return 1;
  const s = str.toLowerCase().replace(/\s/g, '');
  if (s.includes('n!') || s.includes('2^n') || s.includes('2\u207F') || s.includes('exponential') || s.includes('factorial')) return 4;
  if (s.includes('n^2') || s.includes('n\u00B2') || s.includes('n*n') || s.includes('quadratic')) return 3;
  if (s.includes('nlogn') || s.includes('nlog(n)')) return 2;
  if (s.includes('logn') || s.replace(/[()]/g, '') === 'o1') return 0;
  return 1;
}

const DIFFICULTY_COLOR = {
  Easy: C.teal,
  Medium: C.amber,
  Hard: C.red,
};

/* --------------------------------- HELPERS ---------------------------------- */

function detectLanguage(code) {
  if (/def\s+\w+\(.*\):/.test(code) || /:\n\s{4}/.test(code)) return 'Python';
  if (/public\s+(static\s+)?(class|void|int|String)/.test(code)) return 'Java';
  if (/#include\s*</.test(code)) return 'C++';
  if (/func\s+\w+\(/.test(code) && /package\s+main/.test(code)) return 'Go';
  if (/:\s*(string|number|boolean)\b/.test(code)) return 'TypeScript';
  if (/=>|const |let |function /.test(code)) return 'JavaScript';
  return 'Python';
}

async function callClaude(code, language) {
  const prompt = `You are CodeX, a senior Amazon bar-raiser code reviewer. Analyze the following ${language} code as if prepping a candidate for an Amazon SDE/SWE interview.

Respond with ONLY valid JSON \u2014 no markdown fences, no preamble, no trailing text \u2014 matching exactly this schema:

{
  "title": "short descriptive name of what the code does",
  "detectedLanguage": "${language}",
  "difficulty": "Easy" | "Medium" | "Hard",
  "overview": "2-3 sentence plain-English summary of what the code does and the approach/pattern used",
  "lineByLine": [ {"range": "e.g. lines 1-3", "explanation": "what this chunk does"} ],
  "timeComplexity": "Big-O string",
  "spaceComplexity": "Big-O string",
  "complexityExplanation": "1-2 sentences justifying the complexity",
  "edgeCases": ["edge case candidates should mention", "..."],
  "optimizations": ["possible improvement or alternative approach", "..."],
  "interviewFollowUps": ["a likely interviewer follow-up question", "..."],
  "leadershipPrincipleTip": "tie ONE specific Amazon Leadership Principle to how a candidate should narrate this solution in an interview"
}

Rules: lineByLine should have 4-7 logical chunks (not literally every line). edgeCases: 3-4 items. optimizations: 2-3 items. interviewFollowUps: 3 items. Keep every string concise (under 30 words).

Code:
\`\`\`${language}
${code}
\`\`\``;

  // In the Claude.ai artifact sandbox, requests to api.anthropic.com are proxied
  // and authenticated automatically. Outside that sandbox (e.g. this deployed
  // site), the browser CANNOT call api.anthropic.com directly - Anthropic's API
  // does not allow browser CORS requests, and embedding an API key in frontend
  // code would leak it. So this build calls YOUR OWN backend proxy instead.
  // Set VITE_CODEX_PROXY_URL to your deployed proxy (see cloudflare-worker/ in
  // the project root, or any backend that forwards to api.anthropic.com).
  const PROXY_URL = import.meta.env.VITE_CODEX_PROXY_URL || '/api/explain';

  const response = await fetch(PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }

  const data = await response.json();
  const textBlock = (data.content || []).find((b) => b.type === 'text');
  if (!textBlock || !textBlock.text) throw new Error('CodeX received an empty response from the scanner.');

  let cleaned = textBlock.text.trim().replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch (e2) { /* fall through */ }
    }
    throw new Error('CodeX could not parse the label. Try scanning again.');
  }
}

/* ---------------------------------- APP ------------------------------------- */

export default function App() {
  const [code, setCode] = useState(SAMPLE_SNIPPETS[0].code);
  const [language, setLanguage] = useState('Python');
  const [loading, setLoading] = useState(false);
  const [stageIdx, setStageIdx] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('overview');
  const [history, setHistory] = useState([]);
  const [copied, setCopied] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    return () => clearInterval(intervalRef.current);
  }, []);

  const runScan = useCallback(async () => {
    if (!code.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setStageIdx(0);
    setTab('overview');

    let idx = 0;
    intervalRef.current = setInterval(() => {
      idx = Math.min(idx + 1, STAGES.length - 2);
      setStageIdx(idx);
    }, 900);

    try {
      const data = await callClaude(code, language);
      clearInterval(intervalRef.current);
      setStageIdx(STAGES.length - 1);
      setTimeout(() => {
        setResult(data);
        setHistory((h) => [{ id: Date.now(), title: data.title || 'Untitled package', code, language, data }, ...h].slice(0, 8));
        setLoading(false);
      }, 400);
    } catch (e) {
      clearInterval(intervalRef.current);
      setError(e.message || 'Something jammed on the conveyor belt.');
      setLoading(false);
    }
  }, [code, language, loading]);

  const loadSample = (s) => {
    setCode(s.code);
    setLanguage(s.lang === 'python' ? 'Python' : s.lang);
    setResult(null);
    setError(null);
  };

  const loadHistory = (h) => {
    setCode(h.code);
    setLanguage(h.language);
    setResult(h.data);
    setError(null);
    setTab('overview');
  };

  const copySummary = async () => {
    if (!result) return;
    const lines = [
      `${result.title} (${result.difficulty})`,
      '',
      'OVERVIEW', result.overview, '',
      `TIME: ${result.timeComplexity}  |  SPACE: ${result.spaceComplexity}`,
      result.complexityExplanation, '',
      'EDGE CASES', ...(result.edgeCases || []).map((x) => `- ${x}`), '',
      'OPTIMIZATIONS', ...(result.optimizations || []).map((x) => `- ${x}`), '',
      'INTERVIEW FOLLOW-UPS', ...(result.interviewFollowUps || []).map((x) => `- ${x}`), '',
      'LEADERSHIP PRINCIPLE TIP', result.leadershipPrincipleTip,
    ].join('\n');
    try {
      await navigator.clipboard.writeText(lines);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (e) { /* clipboard unavailable */ }
  };

  const tier = result ? tierFromComplexity(result.timeComplexity) : 1;

  return (
    <div style={{ background: C.bg, minHeight: '100%', fontFamily: "'Inter', sans-serif", color: C.text }} className="w-full">
      <style>{FONTS}{`
        .cx-mono { font-family: 'JetBrains Mono', monospace; }
        .cx-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
        .cx-scroll::-webkit-scrollbar-thumb { background: ${C.borderLight}; border-radius: 4px; }
        .cx-scroll::-webkit-scrollbar-track { background: transparent; }
        @keyframes cx-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes cx-dash { to { stroke-dashoffset: -24; } }
        .cx-belt { stroke-dasharray: 4 4; animation: cx-dash 0.6s linear infinite; }
        textarea:focus { outline: none; }
        .cx-tab-btn { transition: color 0.15s ease, border-color 0.15s ease; }
      `}</style>

      {/* background grid texture */}
      <div style={{
        backgroundImage: `linear-gradient(${C.bgGrid} 1px, transparent 1px), linear-gradient(90deg, ${C.bgGrid} 1px, transparent 1px)`,
        backgroundSize: '28px 28px',
        minHeight: '100%',
      }} className="w-full">

        {/* HEADER */}
        <header style={{ borderBottom: `1px solid ${C.border}` }} className="px-5 sm:px-8 py-5 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div style={{ background: C.amber, boxShadow: `0 0 24px ${C.amberGlow}` }} className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
              <Package size={22} color={C.bg} strokeWidth={2.5} />
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <h1 className="cx-mono text-xl font-extrabold tracking-tight" style={{ color: C.text }}>CodeX</h1>
                <span className="cx-mono text-[10px] px-1.5 py-0.5 rounded" style={{ background: C.panel2, color: C.amber, border: `1px solid ${C.borderLight}` }}>FULFILLMENT ENGINE</span>
              </div>
              <p style={{ color: C.textMuted }} className="text-xs mt-0.5">Code explanation</p>
            </div>
          </div>
          <div className="flex items-center gap-2 cx-mono text-[11px]" style={{ color: C.textFaint }}>
            <Award size={14} color={C.amber} />
            <span>16 Leadership Principles \u00B7 Bar Raiser Mode</span>
          </div>
        </header>

        <main className="px-5 sm:px-8 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-7xl mx-auto">

          {/* LEFT: INTAKE */}
          <section style={{ background: C.panel, border: `1px solid ${C.border}` }} className="rounded-2xl p-5 flex flex-col gap-4 h-fit">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code2 size={16} color={C.amber} />
                <h2 className="text-sm font-bold tracking-wide">INTAKE MANIFEST</h2>
              </div>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                style={{ background: C.panel2, border: `1px solid ${C.borderLight}`, color: C.text }}
                className="cx-mono text-xs rounded-lg px-2.5 py-1.5"
              >
                {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>

            <div style={{ background: C.panelAlt, border: `1px solid ${C.border}` }} className="rounded-xl overflow-hidden">
              <div style={{ borderBottom: `1px solid ${C.border}`, background: C.panel2 }} className="px-3 py-1.5 flex items-center justify-between">
                <span className="cx-mono text-[10px]" style={{ color: C.textFaint }}>package_contents.{language.toLowerCase().slice(0, 2)}</span>
                <span className="cx-mono text-[10px]" style={{ color: C.textFaint }}>{code.split('\n').length} lines</span>
              </div>
              <textarea
                value={code}
                onChange={(e) => { setCode(e.target.value); setLanguage(detectLanguage(e.target.value)); }}
                spellCheck={false}
                className="cx-mono cx-scroll w-full text-[13px] leading-relaxed p-4 resize-none"
                style={{ background: 'transparent', color: C.text, height: '280px' }}
                placeholder="// Paste the code you want CodeX to inspect..."
              />
            </div>

            <div>
              <p style={{ color: C.textFaint }} className="cx-mono text-[10px] mb-2 tracking-wide">QUICK-LOAD SAMPLES</p>
              <div className="flex flex-wrap gap-2">
                {SAMPLE_SNIPPETS.map((s) => (
                  <button
                    key={s.name}
                    onClick={() => loadSample(s)}
                    style={{ background: C.panel2, border: `1px solid ${C.borderLight}`, color: C.textMuted }}
                    className="text-xs px-3 py-1.5 rounded-lg hover:brightness-125 transition"
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={runScan}
              disabled={loading || !code.trim()}
              style={{
                background: loading ? C.panel2 : C.amber,
                color: loading ? C.textMuted : C.bg,
                opacity: !code.trim() ? 0.5 : 1,
              }}
              className="cx-mono w-full rounded-xl py-3 font-bold text-sm flex items-center justify-center gap-2 transition hover:brightness-110 disabled:cursor-not-allowed"
            >
              {loading ? (<><Loader2 size={16} className="animate-spin" /> PROCESSING PACKAGE...</>) : (<><Truck size={16} /> SHIP FOR REVIEW</>)}
            </button>

            {error && (
              <div style={{ background: C.redDim, border: `1px solid ${C.red}` }} className="rounded-lg px-3 py-2.5 flex items-start gap-2 text-xs">
                <AlertTriangle size={15} color={C.red} className="shrink-0 mt-0.5" />
                <span style={{ color: '#FFD3D6' }}>{error}</span>
              </div>
            )}

            {/* CONVEYOR TRACKER */}
            {(loading || result) && (
              <div style={{ background: C.panelAlt, border: `1px solid ${C.border}` }} className="rounded-xl p-4">
                <ConveyorTracker activeIdx={result ? STAGES.length - 1 : stageIdx} done={!!result} />
              </div>
            )}

            {/* HISTORY RAIL */}
            {history.length > 0 && (
              <div>
                <p style={{ color: C.textFaint }} className="cx-mono text-[10px] mb-2 tracking-wide">RECENT SHIPMENTS</p>
                <div className="flex gap-2 overflow-x-auto cx-scroll pb-1">
                  {history.map((h) => (
                    <button
                      key={h.id}
                      onClick={() => loadHistory(h)}
                      style={{ background: C.panel2, border: `1px solid ${C.borderLight}` }}
                      className="shrink-0 rounded-lg px-3 py-2 text-left hover:brightness-125 transition min-w-[140px]"
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <Tag size={11} color={DIFFICULTY_COLOR[h.data.difficulty] || C.amber} />
                        <span className="text-[11px] font-semibold truncate" style={{ maxWidth: '100px' }}>{h.title}</span>
                      </div>
                      <span className="cx-mono text-[10px]" style={{ color: C.textFaint }}>{h.language} \u00B7 {h.data.timeComplexity}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* RIGHT: SHIPPING LABEL / RESULT */}
          <section style={{ background: C.panel, border: `1px solid ${C.border}` }} className="rounded-2xl p-5 min-h-[500px] flex flex-col">
            {!result && !loading && (
              <EmptyState />
            )}

            {loading && !result && (
              <div className="flex-1 flex flex-col items-center justify-center gap-3">
                <Loader2 size={28} className="animate-spin" color={C.amber} />
                <p className="cx-mono text-xs" style={{ color: C.textMuted }}>Running static analysis on your package...</p>
              </div>
            )}

            {result && (
              <div className="flex flex-col gap-4">
                {/* Label header */}
                <div style={{ borderBottom: `1px dashed ${C.borderLight}` }} className="pb-4 flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-extrabold tracking-tight">{result.title}</h3>
                      <span
                        className="cx-mono text-[10px] px-2 py-0.5 rounded-full font-bold"
                        style={{ background: `${DIFFICULTY_COLOR[result.difficulty] || C.amber}22`, color: DIFFICULTY_COLOR[result.difficulty] || C.amber, border: `1px solid ${DIFFICULTY_COLOR[result.difficulty] || C.amber}55` }}
                      >
                        {(result.difficulty || 'MEDIUM').toUpperCase()}
                      </span>
                    </div>
                    <p className="cx-mono text-[11px] mt-1" style={{ color: C.textFaint }}>{result.detectedLanguage} \u00B7 Ref# CX-{String(history.length + 1000)}</p>
                  </div>
                  <button onClick={copySummary} style={{ background: C.panel2, border: `1px solid ${C.borderLight}` }} className="shrink-0 rounded-lg p-2 hover:brightness-125 transition">
                    {copied ? <Check size={15} color={C.teal} /> : <Copy size={15} color={C.textMuted} />}
                  </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 overflow-x-auto cx-scroll" style={{ borderBottom: `1px solid ${C.border}` }}>
                  {[
                    { key: 'overview', label: 'Overview', icon: Sparkles },
                    { key: 'lines', label: 'Line-by-Line', icon: ListChecks },
                    { key: 'complexity', label: 'Complexity', icon: Cpu },
                    { key: 'edge', label: 'Edge Cases', icon: AlertTriangle },
                    { key: 'interview', label: 'Interview Prep', icon: MessageSquareText },
                  ].map((t) => {
                    const Icon = t.icon;
                    const active = tab === t.key;
                    return (
                      <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        className="cx-tab-btn cx-mono text-[11px] px-3 py-2.5 flex items-center gap-1.5 whitespace-nowrap border-b-2"
                        style={{ color: active ? C.amber : C.textFaint, borderColor: active ? C.amber : 'transparent' }}
                      >
                        <Icon size={13} /> {t.label}
                      </button>
                    );
                  })}
                </div>

                {/* Tab content */}
                <div className="min-h-[240px]">
                  {tab === 'overview' && (
                    <div className="flex flex-col gap-4">
                      <p className="text-sm leading-relaxed" style={{ color: C.text }}>{result.overview}</p>
                      <div style={{ background: C.panelAlt, border: `1px solid ${C.border}` }} className="rounded-xl p-4 flex items-start gap-3">
                        <Lightbulb size={17} color={C.amber} className="shrink-0 mt-0.5" />
                        <div>
                          <p className="cx-mono text-[10px] mb-1 tracking-wide" style={{ color: C.amber }}>OPTIMIZATION NOTES</p>
                          <ul className="text-sm flex flex-col gap-1.5" style={{ color: C.textMuted }}>
                            {(result.optimizations || []).map((o, i) => (
                              <li key={i} className="flex items-start gap-2"><ChevronRight size={13} className="shrink-0 mt-1" color={C.textFaint} /><span>{o}</span></li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {tab === 'lines' && (
                    <div className="flex flex-col gap-0">
                      {(result.lineByLine || []).map((l, i) => (
                        <div key={i} className="flex gap-3 relative pb-5">
                          <div className="flex flex-col items-center">
                            <div style={{ background: C.amber, color: C.bg }} className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 cx-mono">{i + 1}</div>
                            {i < (result.lineByLine.length - 1) && <div style={{ background: C.borderLight, flex: 1 }} className="w-px mt-1" />}
                          </div>
                          <div className="pb-1">
                            <p className="cx-mono text-[11px] mb-1" style={{ color: C.teal }}>{l.range}</p>
                            <p className="text-sm" style={{ color: C.textMuted }}>{l.explanation}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {tab === 'complexity' && (
                    <div className="flex flex-col gap-5">
                      <div className="grid grid-cols-2 gap-3">
                        <div style={{ background: C.panelAlt, border: `1px solid ${C.border}` }} className="rounded-xl p-4">
                          <div className="flex items-center gap-1.5 mb-1"><Clock size={13} color={C.amber} /><span className="cx-mono text-[10px]" style={{ color: C.textFaint }}>TIME</span></div>
                          <p className="cx-mono text-xl font-bold">{result.timeComplexity}</p>
                        </div>
                        <div style={{ background: C.panelAlt, border: `1px solid ${C.border}` }} className="rounded-xl p-4">
                          <div className="flex items-center gap-1.5 mb-1"><Cpu size={13} color={C.teal} /><span className="cx-mono text-[10px]" style={{ color: C.textFaint }}>SPACE</span></div>
                          <p className="cx-mono text-xl font-bold">{result.spaceComplexity}</p>
                        </div>
                      </div>

                      <div>
                        <p className="cx-mono text-[10px] mb-3 tracking-wide" style={{ color: C.textFaint }}>SHIPPING WEIGHT CLASS</p>
                        <WeightGauge tier={tier} />
                      </div>

                      <p className="text-sm leading-relaxed" style={{ color: C.textMuted }}>{result.complexityExplanation}</p>
                    </div>
                  )}

                  {tab === 'edge' && (
                    <div className="flex flex-col gap-2.5">
                      {(result.edgeCases || []).map((e, i) => (
                        <div key={i} style={{ background: C.panelAlt, border: `1px solid ${C.border}` }} className="rounded-lg p-3 flex items-start gap-2.5">
                          <AlertTriangle size={15} color={C.red} className="shrink-0 mt-0.5" />
                          <p className="text-sm" style={{ color: C.textMuted }}>{e}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {tab === 'interview' && (
                    <div className="flex flex-col gap-5">
                      <div>
                        <p className="cx-mono text-[10px] mb-2.5 tracking-wide" style={{ color: C.textFaint }}>LIKELY FOLLOW-UP QUESTIONS</p>
                        <div className="flex flex-col gap-2.5">
                          {(result.interviewFollowUps || []).map((q, i) => (
                            <div key={i} style={{ background: C.panelAlt, border: `1px solid ${C.border}` }} className="rounded-lg p-3 flex items-start gap-2.5">
                              <MessageSquareText size={15} color={C.amber} className="shrink-0 mt-0.5" />
                              <p className="text-sm" style={{ color: C.text }}>{q}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div style={{ background: `${C.amber}0F`, border: `1px solid ${C.amberDim}` }} className="rounded-xl p-4 flex items-start gap-3">
                        <Award size={18} color={C.amber} className="shrink-0 mt-0.5" />
                        <div>
                          <p className="cx-mono text-[10px] mb-1 tracking-wide" style={{ color: C.amber }}>LEADERSHIP PRINCIPLE TIE-IN</p>
                          <p className="text-sm" style={{ color: C.text }}>{result.leadershipPrincipleTip}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        </main>

        <footer className="px-5 sm:px-8 pb-8 pt-2 max-w-7xl mx-auto">
          <p className="cx-mono text-[10px] text-center" style={{ color: C.textFaint }}>CodeX inspects your code and generates explanations with AI \u2014 always verify complexity claims and edge cases yourself before an interview.</p>
        </footer>
      </div>
    </div>
  );
}

/* ------------------------------ SUBCOMPONENTS ------------------------------- */

function ConveyorTracker({ activeIdx, done }) {
  return (
    <div>
      <div className="flex items-center justify-between relative">
        <svg width="100%" height="2" className="absolute top-[13px] left-0" style={{ zIndex: 0 }}>
          <line x1="5%" y1="1" x2="95%" y2="1" stroke={C.borderLight} strokeWidth="2" className={!done ? 'cx-belt' : ''} />
        </svg>
        {STAGES.map((s, i) => {
          const Icon = s.icon;
          const active = i <= activeIdx;
          const current = i === activeIdx && !done;
          return (
            <div key={s.key} className="flex flex-col items-center gap-1.5 relative" style={{ zIndex: 1, flex: 1 }}>
              <div
                style={{
                  background: active ? (i === STAGES.length - 1 && done ? C.teal : C.amber) : C.panel2,
                  border: `2px solid ${active ? 'transparent' : C.borderLight}`,
                  animation: current ? 'cx-pulse 1s ease infinite' : 'none',
                }}
                className="w-7 h-7 rounded-full flex items-center justify-center"
              >
                <Icon size={13} color={active ? C.bg : C.textFaint} />
              </div>
              <span className="cx-mono text-[9px]" style={{ color: active ? C.text : C.textFaint }}>{s.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeightGauge({ tier }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex w-full h-2.5 rounded-full overflow-hidden" style={{ background: C.panel2 }}>
        {WEIGHT_TIERS.map((t, i) => (
          <div key={t.label} style={{ background: i <= tier ? t.color : C.panel2, flex: 1, opacity: i <= tier ? 1 : 0.3 }} className="h-full" />
        ))}
      </div>
      <div className="flex justify-between">
        {WEIGHT_TIERS.map((t, i) => (
          <div key={t.label} className="flex flex-col items-center" style={{ flex: 1 }}>
            <span className="cx-mono text-[9px] text-center" style={{ color: i === tier ? t.color : C.textFaint, fontWeight: i === tier ? 700 : 400 }}>{t.label}</span>
          </div>
        ))}
      </div>
      <div style={{ background: C.panelAlt, border: `1px solid ${C.border}` }} className="rounded-lg px-3 py-2 mt-1 self-start">
        <span className="cx-mono text-xs" style={{ color: WEIGHT_TIERS[tier].color }}>{WEIGHT_TIERS[tier].desc}</span>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 py-16">
      <div style={{ background: C.panelAlt, border: `1px dashed ${C.borderLight}` }} className="w-16 h-16 rounded-2xl flex items-center justify-center mb-1">
        <PackageSearch size={26} color={C.textFaint} />
      </div>
      <p className="text-sm font-semibold" style={{ color: C.textMuted }}>No package scanned yet</p>
      <p className="text-xs max-w-xs" style={{ color: C.textFaint }}>Paste code on the left, or load a sample, then hit <span className="cx-mono" style={{ color: C.amber }}>Ship for Review</span> to generate an interview-ready breakdown.</p>
    </div>
  );
}
