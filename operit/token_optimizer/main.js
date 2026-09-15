// main.js — Token 优化器 Operit ToolPkg
// 统一 Tokenless(响应/编码/命令) + codex-tokens-compress(规约压缩) + dsh-token-saver(限流截断)

// ═════════════════════════════════════════
// 配置
// ═════════════════════════════════════════
var config = {
  enabled: true,
  features: {
    responseCompress: true,
    toonEncode: true,
    commandRewrite: true,
    specCompress: true,
    toolOutputTruncate: true,
    toolReadyCheck: true,
    injectDiscipline: true,
  },
  limits: {
    toolOutputTokens: 8000,
    responseTokens: 1500,
    specDocBytes: 8192,
    autoCompactTokens: 160000,
  },
  commandRewrite: {
    enabled: true,
    dryRun: false,
  },
  stats: {
    enabled: true,
  },
};

var STATS = {
  calls: 0,
  before: 0,
  after: 0,
  rewrites: 0,
  byCategory: {},
};

// ═════════════════════════════════════════
// 通用工具
// ═════════════════════════════════════════

function estimateTokens(text) {
  if (typeof text !== "string") return 0;
  return Math.ceil(Buffer.byteLength(text, "utf8") / 4);
}

function record(name, before, after) {
  if (!config.stats.enabled) return;
  STATS.calls += 1;
  STATS.before += before;
  STATS.after += after;
  var c = STATS.byCategory[name] || { before: 0, after: 0, saved: 0, hits: 0 };
  c.before += before;
  c.after += after;
  c.saved += before - after;
  c.hits += 1;
  STATS.byCategory[name] = c;
}

function getStats() {
  return {
    calls: STATS.calls,
    rewrites: STATS.rewrites,
    before: STATS.before,
    after: STATS.after,
    saved: STATS.before - STATS.after,
    savedPercent: STATS.before > 0 ? Math.round(((STATS.before - STATS.after) / STATS.before) * 100) : 0,
    byCategory: STATS.byCategory,
  };
}

function resetStats() {
  STATS.calls = 0;
  STATS.before = 0;
  STATS.after = 0;
  STATS.rewrites = 0;
  STATS.byCategory = {};
}

// ═════════════════════════════════════════
// 压缩核心（纯函数，可单测）
// ═════════════════════════════════════════

var ANSI_RE = /\x1b\[[0-9;]*m/g;

function stripAnsi(text) {
  if (typeof text !== "string") return text;
  return text.replace(ANSI_RE, "");
}

function compressWhitespace(text) {
  if (typeof text !== "string") return text;
  return text
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function cleanAiFlavor(text) {
  if (typeof text !== "string") return text;
  return text
    .replace(/作为AI助手[，,]?\s*/g, "")
    .replace(/作为人工智能[，,]?\s*/g, "")
    .replace(/综上所述[，,]?\s*/g, "")
    .replace(/根据我的知识库[，,]?\s*/g, "")
    .replace(/请注意[，,]?\s*/g, "")
    .replace(/首先[，,]?\s*其次[，,]?\s*最后[，,]?\s*/g, "")
    .replace(/希望以上信息对您有所帮助[。！]?\s*/g, "");
}

function dedupeConsecutiveLines(text) {
  var lines = String(text).split("\n");
  var out = [];
  for (var i = 0; i < lines.length; i++) {
    if (i > 0 && lines[i] === lines[i - 1]) continue;
    out.push(lines[i]);
  }
  return out.join("\n");
}

function middleTruncate(text, maxTokens) {
  if (typeof text !== "string") return text;
  var maxChars = maxTokens * 4;
  if (maxChars <= 0 || text.length <= maxChars) return text;
  var headChars = Math.floor(maxChars * 0.6);
  var tailChars = maxChars - headChars;
  var dropped = text.length - maxChars;
  return (
    text.slice(0, headChars) +
    "\n…[TokenOptimizer 省略 " + dropped + " 字符]…\n" +
    text.slice(text.length - tailChars)
  );
}

var NOISE_PATTERNS = [
  /^\s*\d+% .*$/,
  /^\s*[.o#\-=]{6,}\s*$/,
  /^\s*(npm|yarn|pnpm) (warn|notice) /i,
  /^\s*Downloading\s+/i,
  /^\s*Progress:\s+/i,
  /^\s*\d+ packages? are looking for funding/i,
  /^\s*Run `npm fund`/i,
];

function filterNoiseLines(text) {
  var lines = String(text).split("\n");
  var out = [];
  for (var i = 0; i < lines.length; i++) {
    var drop = false;
    for (var j = 0; j < NOISE_PATTERNS.length; j++) {
      if (NOISE_PATTERNS[j].test(lines[i])) { drop = true; break; }
    }
    if (!drop) out.push(lines[i]);
  }
  return out.join("\n");
}

function compressToolOutput(text, maxTokens) {
  if (typeof text !== "string" || text.length === 0) return text;
  var before = estimateTokens(text);
  var result = stripAnsi(text);
  result = filterNoiseLines(result);
  result = dedupeConsecutiveLines(result);
  result = compressWhitespace(result);
  result = middleTruncate(result, maxTokens || config.limits.toolOutputTokens);
  record("toolOutput", before, estimateTokens(result));
  return result;
}

function compressResponse(text, maxTokens) {
  if (typeof text !== "string" || text.length === 0) return text;
  var before = estimateTokens(text);
  var result = stripAnsi(text);
  result = cleanAiFlavor(result);
  result = compressWhitespace(result);
  result = middleTruncate(result, maxTokens || config.limits.responseTokens);
  record("response", before, estimateTokens(result));
  return result;
}

// ── TOON: 面向 token 的紧凑编码 ──

function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function isScalar(v) {
  return v === null || typeof v !== "object";
}

function toonScalar(v) {
  if (v === null) return "null";
  if (typeof v === "string") {
    return /[,\n"{}[\]]/.test(v) ? JSON.stringify(v) : v;
  }
  return String(v);
}

function toonUniformArray(arr) {
  if (arr.length === 0) return "[0]:";
  if (!arr.every(isPlainObject)) return null;
  var keys = Object.keys(arr[0]);
  for (var i = 1; i < arr.length; i++) {
    if (Object.keys(arr[i]).length !== keys.length) return null;
    for (var k = 0; k < keys.length; k++) {
      if (!(keys[k] in arr[i])) return null;
    }
  }
  var lines = ["[N=" + arr.length + "]{" + keys.join(",") + "}:"];
  for (var r = 0; r < arr.length; r++) {
    var row = [];
    for (var c = 0; c < keys.length; c++) {
      row.push(toonScalar(arr[r][keys[c]]));
    }
    lines.push("  " + row.join(","));
  }
  return lines.join("\n");
}

function toonEncode(value, indent) {
  indent = indent || "";
  if (isScalar(value)) return toonScalar(value);

  if (Array.isArray(value)) {
    if (value.every(isScalar)) {
      return "[" + value.length + "]: " + value.map(toonScalar).join(",");
    }
    var uniform = toonUniformArray(value);
    if (uniform) return uniform;
    return value.map(function(item, i) {
      return indent + "- " + toonEncode(item, indent + "  ");
    }).join("\n");
  }

  var lines = [];
  var keys = Object.keys(value);
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var val = value[key];
    if (isScalar(val)) {
      lines.push(indent + key + ": " + toonScalar(val));
    } else {
      lines.push(indent + key + ":");
      lines.push(toonEncode(val, indent + "  "));
    }
  }
  return lines.join("\n");
}

function compactEncode(value) {
  var jsonTokens = 0;
  var toonTokens = 0;
  try { jsonTokens = estimateTokens(JSON.stringify(value)); } catch (e) { return value; }
  var out;
  try { out = toonEncode(value); } catch (e) { return value; }
  toonTokens = estimateTokens(out);
  if (toonTokens >= jsonTokens) return JSON.stringify(value);
  record("toonEncode", jsonTokens, toonTokens);
  return out;
}

// ── 命令重写：降低输出噪音 ──

var COMMAND_RULES = [
  { match: /^git status(\s|$)/, to: function(c) { return /--short|--porcelain/.test(c) ? c : c + " --short --branch"; } },
  { match: /^git branch(\s|$)/, to: function(c) { return /--format|--list/.test(c) ? c : c + " --format='%(refname:short)'"; } },
  { match: /^git log(\s|$)/, to: function(c) { return /--oneline|--format/.test(c) ? c : c + " --oneline -20"; } },
  { match: /^git (diff|show)(\s|$)/, to: function(c) { return /--stat|--name-only|--no-pager/.test(c) ? c : "git --no-pager " + c.replace(/^git\s+/, ""); } },
  { match: /^npm (install|i|ci)(\s|$)/, to: function(c) { return /--no-audit|--loglevel/.test(c) ? c : c + " --no-audit --no-fund --loglevel=error"; } },
  { match: /^npm test(\s|$)/, to: function(c) { return /--silent/.test(c) ? c : c + " --silent"; } },
  { match: /^yarn (install|add|test)(\s|$)/, to: function(c) { return /--silent/.test(c) ? c : c + " --silent"; } },
  { match: /^pnpm (install|i|add)(\s|$)/, to: function(c) { return /--reporter/.test(c) ? c : c + " --reporter=silent"; } },
  { match: /^pip3? install(\s|$)/, to: function(c) { return /(^|\s)-q(\s|$)/.test(c) ? c : c + " -q"; } },
  { match: /^(apt|apt-get) (install|update|upgrade)(\s|$)/, to: function(c) { return /(^|\s)-q(\s|$)/.test(c) ? c : c + " -q"; } },
  { match: /^docker ps(\s|$)/, to: function(c) { return /--format/.test(c) ? c : c + " --format '{{.ID}}\\t{{.Names}}\\t{{.Status}}'"; } },
  { match: /^find(\s|$)/, to: function(c) { return /-not -path/.test(c) ? c : c + " -not -path '*/.git/*'"; } },
];

function rewriteCommand(cmd) {
  if (typeof cmd !== "string" || cmd.length === 0) return cmd;
  if (!config.commandRewrite.enabled) return cmd;
  for (var i = 0; i < COMMAND_RULES.length; i++) {
    if (COMMAND_RULES[i].match.test(cmd)) {
      var out = COMMAND_RULES[i].to(cmd);
      if (out && out !== cmd) STATS.rewrites += 1;
      return out;
    }
  }
  return cmd;
}

// ── 规约文档压缩（AGENTS.md / system prompt 片段）──

function isFillerLine(line) {
  if (!line) return true;
  if (/^<!--.*-->$/.test(line)) return true;
  if (/^(注意|备注|说明)[：:]\s*$/.test(line)) return true;
  if (/^[-*]\s*$/.test(line)) return true;
  return false;
}

function compressSpecDoc(text, maxBytes) {
  if (typeof text !== "string" || text.length === 0) return text;
  var before = estimateTokens(text);

  var lines = text.replace(/\r\n/g, "\n").split("\n");
  var seenBullets = Object.create(null);
  var kept = [];

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].replace(/[ \t]+$/, "");
    if (isFillerLine(line)) continue;

    var bullet = line.match(/^\s*[-*+]\s+(.*)$/);
    if (bullet) {
      var key = bullet[1].replace(/\s+/g, " ").toLowerCase();
      if (seenBullets[key]) continue;
      seenBullets[key] = true;
    }

    if (kept.length > 0 && line === kept[kept.length - 1]) continue;
    kept.push(line);
  }

  var result = [];
  for (var j = 0; j < kept.length; j++) {
    var cur = kept[j];
    var next = kept[j + 1];
    if (/^#{1,6}\s/.test(cur) && next && /^#{1,6}\s/.test(next)) continue;
    result.push(cur);
  }

  var out = compressWhitespace(result.join("\n"));
  var budget = maxBytes || config.limits.specDocBytes;
  if (Buffer.byteLength(out, "utf8") > budget) {
    var maxChars = Math.floor(budget / 2);
    out = out.slice(0, maxChars) + "\n…[规约已压缩截断]…";
  }

  record("specDoc", before, estimateTokens(out));
  return out;
}

// ═════════════════════════════════════════
// 纪律提示注入
// ═════════════════════════════════════════
var DISCIPLINE_PROMPT =
  "【Token 纪律】只输出必要内容：先结论后理由；不复述已知信息；工具输出只保留关键行；" +
  "长输出保留头尾、省略中间；结构化数据优先紧凑编码；不要每轮携带整段历史，只追加新内容以命中前缀缓存。";

// ═════════════════════════════════════════
// 钩子实现
// ═════════════════════════════════════════

function onSystemPromptCompose(event) {
  if (!config.enabled) return;

  var stage = event && event.stage ? event.stage : "";

  if ((stage === "compose_system_prompt_sections" || stage === "before_compose_system_prompt") &&
      config.features.specCompress && event && Array.isArray(event.sections)) {
    for (var i = 0; i < event.sections.length; i++) {
      var sec = event.sections[i];
      if (sec && typeof sec.content === "string") {
        sec.content = compressSpecDoc(sec.content, config.limits.specDocBytes);
      }
    }
    event.sections = event.sections;
    return { sections: event.sections };
  }

  return undefined;
}

function onMessageProcessing(params) {
  if (!config.enabled) return { matched: false };

  var content = "";
  if (params && typeof params.messageContent === "string") content = params.messageContent;
  if (!content || content.trim().length === 0) return { matched: false };

  var compressed = content;
  if (config.features.responseCompress) {
    compressed = compressResponse(compressed, config.limits.responseTokens);
  }

  return {
    matched: false,
    content: compressed,
    messageContent: compressed,
  };
}

function onToolResultProcessing(params) {
  if (!config.enabled || !config.features.toolOutputTruncate) return { matched: false };
  var out = params && typeof params.toolOutput === "string" ? params.toolOutput : "";
  if (!out) return { matched: false };
  var compressed = compressToolOutput(out, config.limits.toolOutputTokens);
  return { matched: false, toolOutput: compressed, content: compressed };
}

function onCommandProcessing(params) {
  if (!config.enabled || !config.features.commandRewrite) return { matched: false };
  var cmd = params && typeof params.command === "string" ? params.command : "";
  if (!cmd) return { matched: false };
  var rewritten = rewriteCommand(cmd);
  if (rewritten === cmd) return { matched: false };
  return { matched: false, command: rewritten, original: cmd };
}

function onToolReadyCheck(tools) {
  if (!config.enabled || !config.features.toolReadyCheck) return tools;
  if (!Array.isArray(tools)) return tools;
  return tools.map(function(t) {
    if (t && typeof t.description === "string" && t.description.length > 400) {
      t = Object.assign({}, t, { description: t.description.slice(0, 400) + "…" });
    }
    return t;
  });
}

// ═════════════════════════════════════════
// 注册入口
// ═════════════════════════════════════════

function tryRegister(api, method, id, fn) {
  if (typeof api[method] !== "function") return false;
  try {
    api[method]({ id: id, function: fn });
    return true;
  } catch (e) {
    console.error("[TokenOptimizer] register " + method + " failed: " + e);
    return false;
  }
}

function registerToolPkg() {
  if (typeof ToolPkg === "undefined") {
    console.error("[TokenOptimizer] ToolPkg not available");
    return false;
  }

  var registered = [];

  if (tryRegister(ToolPkg, "registerSystemPromptComposeHook", "token_optimizer_system_prompt", onSystemPromptCompose)) {
    registered.push("systemPrompt");
  }
  if (tryRegister(ToolPkg, "registerMessageProcessingPlugin", "token_optimizer_message", onMessageProcessing)) {
    registered.push("message");
  }
  if (tryRegister(ToolPkg, "registerToolResultProcessingHook", "token_optimizer_tool_result", onToolResultProcessing) ||
      tryRegister(ToolPkg, "registerToolResultProcessingPlugin", "token_optimizer_tool_result", onToolResultProcessing)) {
    registered.push("toolResult");
  }
  if (tryRegister(ToolPkg, "registerCommandProcessingHook", "token_optimizer_command", onCommandProcessing) ||
      tryRegister(ToolPkg, "registerCommandProcessingPlugin", "token_optimizer_command", onCommandProcessing)) {
    registered.push("command");
  }
  if (tryRegister(ToolPkg, "registerToolReadyCheckHook", "token_optimizer_tool_ready", onToolReadyCheck) ||
      tryRegister(ToolPkg, "registerToolReadyCheck", "token_optimizer_tool_ready", onToolReadyCheck)) {
    registered.push("toolReady");
  }

  console.log("[TokenOptimizer] registered hooks: " + (registered.join(", ") || "none (API 不匹配，仅纯函数可用)"));
  return registered.length > 0;
}

function configure(patch) {
  if (!patch || typeof patch !== "object") return config;
  if (patch.features) Object.assign(config.features, patch.features);
  if (patch.limits) Object.assign(config.limits, patch.limits);
  if (typeof patch.enabled === "boolean") config.enabled = patch.enabled;
  if (patch.commandRewrite) Object.assign(config.commandRewrite, patch.commandRewrite);
  return config;
}

// ═════════════════════════════════════════
// 导出
// ═════════════════════════════════════════
exports.registerToolPkg = registerToolPkg;
exports.onSystemPromptCompose = onSystemPromptCompose;
exports.onMessageProcessing = onMessageProcessing;
exports.onToolResultProcessing = onToolResultProcessing;
exports.onCommandProcessing = onCommandProcessing;
exports.onToolReadyCheck = onToolReadyCheck;
exports.configure = configure;
exports.getStats = getStats;
exports.resetStats = resetStats;
exports.estimateTokens = estimateTokens;
exports.stripAnsi = stripAnsi;
exports.compressWhitespace = compressWhitespace;
exports.cleanAiFlavor = cleanAiFlavor;
exports.middleTruncate = middleTruncate;
exports.compressToolOutput = compressToolOutput;
exports.compressResponse = compressResponse;
exports.compressSpecDoc = compressSpecDoc;
exports.rewriteCommand = rewriteCommand;
exports.toonEncode = toonEncode;
exports.compactEncode = compactEncode;
