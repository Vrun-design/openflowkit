import { MarkerType as N } from "reactflow";
const B = { stroke: "#94a3b8", strokeWidth: 2 }, W = { fill: "#334155", fontWeight: 500, fontSize: 12 }, x = { fill: "#ffffff", stroke: "#cbd5e1", strokeWidth: 1 }, C = {
  type: "smoothstep",
  markerEnd: { type: N.ArrowClosed },
  animated: !0,
  style: B,
  labelStyle: W,
  labelBgStyle: x,
  labelBgPadding: [8, 4],
  labelBgBorderRadius: 4
}, v = (r, e, s, l) => ({
  id: l || `e-${r}-${e}-${Date.now()}`,
  source: r,
  target: e,
  label: s,
  ...C
}), O = {
  start: { color: "emerald", icon: "none", shape: "capsule" },
  end: { color: "red", icon: "none", shape: "capsule" },
  decision: { color: "amber", icon: "none", shape: "diamond" },
  custom: { color: "violet", icon: "none", shape: "rounded" },
  process: { color: "slate", icon: "none", shape: "rounded" }
}, P = (r) => {
  var e;
  return ((e = O[r]) == null ? void 0 : e.color) || "slate";
}, z = [
  { open: "([", close: "])", type: "start", shape: "capsule" },
  // stadium
  { open: "((", close: "))", type: "end", shape: "circle" },
  // double-circle
  { open: "{{", close: "}}", type: "custom", shape: "hexagon" },
  // hexagon
  { open: "[(", close: ")]", type: "process", shape: "cylinder" },
  // cylinder
  { open: "{", close: "}", type: "decision", shape: "diamond" },
  // rhombus
  { open: "[", close: "]", type: "process", shape: "rounded" },
  // rectangle
  { open: "(", close: ")", type: "process", shape: "rounded" },
  // rounded // Must be after (( and ([
  { open: ">", close: "]", type: "process", shape: "parallelogram" }
  // asymmetric
], G = [
  /^%%/,
  // comments
  /^class\s/i,
  /^click\s/i,
  // /^style\s/i, // We want to parse styles now
  /^direction\s/i,
  /^accTitle\s/i,
  /^accDescr\s/i
], F = /^linkStyle\s+([\d,\s]+)\s+(.+)$/i, Y = /^classDef\s+(\w+)\s+(.+)$/i, U = /^style\s+(\w+)\s+(.+)$/i;
function K(r) {
  const e = r.match(F);
  if (!e) return null;
  const s = e[1].split(",").map((i) => parseInt(i.trim(), 10)).filter((i) => !isNaN(i)), l = e[2].replace(/;$/, "").split(","), d = {};
  for (const i of l) {
    const [g, y] = i.split(":").map((p) => p.trim());
    g && y && (d[g] = y);
  }
  return { indices: s, style: d };
}
function Z(r) {
  let e = "", s = !1;
  for (let l = 0; l < r.length; l++) {
    const d = r[l];
    if (d === '"' && r[l - 1] !== "\\" && (s = !s), s && d === `
`) {
      e += "\\n";
      let i = l + 1;
      for (; i < r.length && (r[i] === " " || r[i] === "	"); )
        i++;
      l = i - 1;
    } else
      e += d;
  }
  return e;
}
function j(r) {
  let e = r;
  return e = e.replace(/==(?![>])\s*(.+?)\s*==>/g, " ==>|$1|"), e = e.replace(/--(?![>-])\s*(.+?)\s*-->/g, " -->|$1|"), e = e.replace(/-\.\s*(.+?)\s*\.->/g, " -.->|$1|"), e = e.replace(/--(?![>-])\s*(.+?)\s*---/g, " ---|$1|"), e;
}
function H(r) {
  const e = r.replace(/fa:fa-[\w-]+\s*/g, "").trim();
  if (e) return e;
  const s = r.match(/fa:fa-([\w-]+)/);
  return s ? s[1].replace(/-/g, " ") : r;
}
function Q(r, e) {
  const s = r.indexOf(e.open);
  if (s < 1 || s > 0 && r[s - 1] === e.open[0]) return null;
  const l = r.substring(0, s).trim();
  if (!/^[a-zA-Z0-9_][\w-]*$/.test(l)) return null;
  const d = r.substring(s + e.open.length), i = d.lastIndexOf(e.close);
  if (i < 0) return null;
  const g = d.substring(i + e.close.length).trim();
  let y = [];
  if (g.startsWith(":::"))
    y = g.substring(3).split(/,\s*/);
  else if (g)
    return null;
  let p = d.substring(0, i).trim();
  return (p.startsWith('"') && p.endsWith('"') || p.startsWith("'") && p.endsWith("'")) && (p = p.slice(1, -1)), p = p.replace(/\\n/g, `
`), p = H(p), p || (p = l), { id: l, label: p, type: e.type, shape: e.shape, classes: y.length ? y : void 0 };
}
function M(r) {
  const e = r.trim();
  if (!e) return null;
  for (const d of z) {
    const i = Q(e, d);
    if (i) return i;
  }
  let s = e, l = [];
  if (s.includes(":::")) {
    const d = s.split(":::");
    s = d[0], l = d[1].split(/,\s*/);
  }
  return /^[a-zA-Z0-9_][\w-]*$/.test(s) ? { id: s, label: s, type: "process", classes: l.length ? l : void 0 } : null;
}
const $ = [
  "===>",
  "-.->",
  "--->",
  "-->",
  "===",
  "---",
  "==>",
  "-.-",
  "--"
];
function I(r) {
  for (const e of $) {
    const s = r.indexOf(e);
    if (s >= 0)
      return {
        arrow: e,
        before: r.substring(0, s).trim(),
        after: r.substring(s + e.length).trim()
      };
  }
  return null;
}
function q(r) {
  const e = [];
  let s = r, l = null;
  for (; s.trim(); ) {
    const d = I(s);
    if (!d) break;
    const { arrow: i, before: g, after: y } = d, p = l || g;
    let m = "", E = y;
    const b = E.match(/^\|"?([^"|]*)"?\|\s*/);
    b && (m = b[1].trim(), E = E.substring(b[0].length));
    const L = I(E);
    let D;
    L ? (D = L.before, s = E) : (D = E, s = "");
    let k = p.trim(), t = D.trim();
    if (k.includes(":::") && (k = k.split(":::")[0]), t.includes(":::") && (t = t.split(":::")[0]), k && t && e.push({ sourceRaw: k, targetRaw: t, label: m, arrowType: i }), l = D.trim(), !L) break;
  }
  return e;
}
function A(r) {
  const e = {}, s = r.split(",");
  for (const l of s) {
    const [d, i] = l.split(":").map((g) => g.trim());
    d && i && (e[d] = i.replace(/;$/, ""));
  }
  return e;
}
const X = (r) => {
  var k;
  let e = r.replace(/\r\n/g, `
`);
  e = Z(e), e = j(e);
  const s = e.split(`
`), l = /* @__PURE__ */ new Map(), d = [], i = /* @__PURE__ */ new Map(), g = /* @__PURE__ */ new Map();
  let y = "TB", p = "unknown";
  const m = [];
  let E = 0;
  const b = (t, c = "process", o) => {
    let a = M(t), f = t;
    if (t === "[*]")
      f = `state_start_${E++}`, a = { id: f, label: "Start/End", type: "start", shape: "circle" };
    else if (!a)
      if (f = t.trim(), f.includes(":::")) {
        const R = f.split(":::");
        f = R[0], a = { id: f, label: f, type: "process", classes: R[1].split(/,\s*/) };
      } else
        a = { id: f, label: f, type: c };
    const h = l.get(a.id), S = m.length > 0 ? m[m.length - 1] : void 0;
    return h ? (a.label !== a.id && (h.label = a.label), a.type !== "process" && (h.type = a.type), a.shape && (h.shape = a.shape), a.classes && (h.classes = [...h.classes || [], ...a.classes]), !h.parentId && S && (h.parentId = S)) : l.set(a.id, { ...a, parentId: S }), o && l.has(a.id) && (l.get(a.id).label = o), a.id;
  };
  for (let t = 0; t < s.length; t++) {
    const c = s[t].trim();
    if (!c || G.some((n) => n.test(c))) continue;
    if (c.match(/^(?:flowchart|graph)\s+(TD|TB|LR|RL|BT)/i)) {
      p = "flowchart";
      const n = c.match(/^(?:flowchart|graph)\s+(TD|TB|LR|RL|BT)/i);
      n && (y = n[1].toUpperCase()), y === "TD" && (y = "TB");
      continue;
    }
    if (c.match(/^stateDiagram(?:-v2)?/i)) {
      p = "stateDiagram";
      const n = (k = s[t + 1]) == null ? void 0 : k.trim().match(/^direction\s+(LR|TB)/i);
      n && (y = n[1].toUpperCase());
      continue;
    }
    const o = c.match(/^subgraph\s+([\[\]\w\s"'-]+)/i), a = c.match(/^state\s+"([^"]+)"\s+as\s+(\w+)\s+\{/i) || c.match(/^state\s+(\w+)\s+\{/i);
    if (o) {
      let n = o[1].trim(), u = n, T = n;
      const w = n.match(/^(\w+)\s*\[(.+)\]$/);
      w ? (u = w[1], T = w[2]) : u = n.replace(/\s+/g, "_"), l.set(u, { id: u, label: T, type: "group", parentId: m[m.length - 1] }), m.push(u);
      continue;
    }
    if (a) {
      let n = a[2] || a[1], u = a[1];
      l.set(n, { id: n, label: u, type: "group", parentId: m[m.length - 1] }), m.push(n);
      continue;
    }
    if (c.match(/^end\s*$/i)) {
      m.pop();
      continue;
    }
    const f = c.match(Y);
    if (f) {
      const n = f[1], u = f[2];
      g.set(n, A(u));
      continue;
    }
    const h = c.match(U);
    if (h) {
      const n = h[1], u = h[2], T = A(u), w = l.get(n);
      if (w)
        w.styles = { ...w.styles, ...T };
      else {
        b(n);
        const _ = l.get(n);
        _ && (_.styles = T);
      }
      continue;
    }
    const S = K(c);
    if (S) {
      S.indices.forEach((n) => i.set(n, S.style));
      continue;
    }
    if ($.some((n) => c.includes(n))) {
      const n = q(c);
      for (const u of n) {
        const T = b(u.sourceRaw, p === "stateDiagram" ? "state" : "process"), w = b(u.targetRaw, p === "stateDiagram" ? "state" : "process");
        T && w && d.push({
          source: T,
          target: w,
          label: u.label,
          arrowType: u.arrowType
        });
      }
      continue;
    }
    if (p === "stateDiagram") {
      const n = c.match(/^state\s+"([^"]+)"\s+as\s+(\w+)/i);
      if (n) {
        b(n[2], "state", n[1]);
        continue;
      }
      const u = c.match(/^(\w+)\s*:\s*(.+)/);
      if (u) {
        b(u[1], "state", u[2]);
        continue;
      }
    }
    M(c) && b(c);
  }
  if (p === "unknown")
    return { nodes: [], edges: [], error: 'Missing chart type declaration. Start with "flowchart TD" or related.' };
  if (l.size === 0)
    return { nodes: [], edges: [], error: "No valid nodes found." };
  const L = Array.from(l.values()).map((t, c) => {
    let o = {
      id: t.id,
      type: t.type,
      position: { x: c % 4 * 200, y: Math.floor(c / 4) * 150 },
      // Initial positions, elk will layout
      data: {
        label: t.label,
        subLabel: "",
        color: P(t.type),
        ...t.shape ? { shape: t.shape } : {}
      }
    };
    return t.parentId && (o.parentNode = t.parentId, o.extent = "parent"), t.type === "group" && (o.className = "bg-slate-50/50 border-2 border-dashed border-slate-300 rounded-lg", o.style = { width: 600, height: 400 }), t.classes && t.classes.forEach((a) => {
      const f = g.get(a);
      f && (f.fill && (o.style = { ...o.style, backgroundColor: f.fill }), f.stroke && (o.style = { ...o.style, borderColor: f.stroke }), f.color && (o.style = { ...o.style, color: f.color }));
    }), t.styles && (t.styles.fill && (o.style = { ...o.style, backgroundColor: t.styles.fill }), t.styles.stroke && (o.style = { ...o.style, borderColor: t.styles.stroke }), t.styles.color && (o.style = { ...o.style, color: t.styles.color })), p === "stateDiagram" && (t.type === "start" && (o.style = { ...o.style, width: 20, height: 20, borderRadius: "50%", backgroundColor: "#000" }, o.data.label = ""), t.type === "state" && (o.data.shape = "rounded")), o;
  }), D = d.map((t, c) => {
    const o = v(t.source, t.target, t.label || void 0, `e-mermaid-${c}`);
    (t.arrowType.includes("-.") || t.arrowType.includes("-.-")) && (o.style = { ...o.style, strokeDasharray: "5 3" }), t.arrowType.includes("==") && (o.style = { ...o.style, strokeWidth: 4 }), t.arrowType.includes(">") || (o.markerEnd = void 0);
    const a = i.get(c);
    if (a) {
      const f = a.stroke;
      f && (o.style = { ...o.style, stroke: f });
      const h = a["stroke-width"];
      h && (o.style = { ...o.style, strokeWidth: parseInt(h, 10) || 2 });
    }
    return o;
  });
  return { nodes: L, edges: D, direction: y };
};
export {
  X as parseMermaid
};
