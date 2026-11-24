(function () {
  var R = window.CourseRules;
  var C = window.CourseContent;
  var KEY = "ai-shizhan.drill.v2";
  var NAV = [
    ["home", "开篇"], ["m0", "M0 诊断"], ["m1", "M1 任务卡"], ["m2", "M2 对照"],
    ["m3", "M3 核验"], ["m4", "M4 可学"], ["m5", "M5 实验室"], ["m6", "M6 可跳过"],
    ["m7", "M7 复述"], ["paths", "五路径"], ["quiz", "题库"], ["index", "检索"],
    ["graduate", "毕业"], ["sources", "来源边界"]
  ];
  var P01 = [["P01-A", "办公行政"], ["P01-B", "教育学习"], ["P01-C", "内容创作"], ["P01-D", "设计"], ["P01-E", "销售或客服"], ["P01-F", "技术或产品"], ["P01-G", "自由职业"], ["P01-H", "学生"], ["P01-I", "其他（最多 20 字的类别词，勿填单位全名、真实姓名或联系方式）"]];
  var P02 = [["P02-A", "几乎没用过 AI"], ["P02-B", "偶尔用聊天框提问"], ["P02-C", "能靠 AI 完成一件固定的事"], ["P02-D", "已经有一套简单步骤"], ["P02-E", "能比较不同做法并改其中一步"], ["P02-F", "已协调过多步骤或助手"]];
  var P03 = [["P03-A", "听说过"], ["P03-B", "会用聊天框"], ["P03-C", "知道模型和产品不是一回事"], ["P03-D", "试过模板、技能或简单自动步骤"], ["P03-E", "协调过多个步骤或助手"]];
  var P04 = [["P04-A", "先把眼前工作或学习做好"], ["P04-B", "做出可发布的内容"], ["P04-C", "探索用 AI 赚钱"], ["P04-D", "还不确定"]];
  var P05 = [["P05-A", "做视频"], ["P05-B", "做自媒体/图文"], ["P05-C", "做设计图"], ["P05-D", "暂时不确定"]];
  var PAIN_FOR = { "P01-A": "办公行政", "P01-B": "教育或学生", "P01-H": "教育或学生", "P01-C": "内容创作", "P01-D": "设计", "P01-E": "销售或客服", "P01-F": "技术或产品", "P01-G": "自由职业或其他", "P01-I": "自由职业或其他" };
  var STATIONS = [["写下可核对的下一步", "任务要能在下周对上成品。"], ["对照课内材料", "输入和验收键分开看。"], ["停在人工确认", "失败候选不能直接采用。"]];
  var PAPERS = [
    ["M0", "M0 模块测验", function (q) { return q.id.indexOf("Q-M0-") === 0; }],
    ["M1", "M1", function (q) { return q.id.indexOf("Q-M1-") === 0; }],
    ["M2", "M2", function (q) { return q.id.indexOf("Q-M2-") === 0; }],
    ["M3", "M3", function (q) { return q.id.indexOf("Q-M3-") === 0; }],
    ["M4", "M4", function (q) { return q.id.indexOf("Q-M4-") === 0; }],
    ["M5", "M5", function (q) { return q.id.indexOf("Q-M5-") === 0; }],
    ["M6", "M6 选修", function (q) { return q.id.indexOf("Q-M6-") === 0; }],
    ["M7", "M7", function (q) { return q.id.indexOf("Q-M7-") === 0; }],
    ["G", "毕业综合", function (q) { return q.id.indexOf("Q-G") === 0; }],
    ["Q", "Q001–Q008", function (q) { return /^Q00[1-8]$/.test(q.id); }]
  ];

  function blank() {
    return {
      m0: { disclaimerShown: true, p01: "", otherText: "", p02: "", p03: "", p04: [], p05: [], mainPath: "", painSource: "", painText: "", painRoute: "", nextTask: "", earnScale: "", customAmount: false, resetExercises: false },
      m1: { goal: "", material: "", format: "", check: "", redline: "" },
      m2: { note: "" },
      m3: { picks: {}, notes: {}, connected: "" },
      m4: { seen: false },
      m5: {
        coveredModel: false, coveredTool: false, coveredVersion: false, foundMissingF04: false, missField: "",
        candidate: R.BAD_ID, decision: "", decisionLocked: false, path1Locked: false, path1Record: "", humanConfirm: false,
        sampleBRevealed: false, sampleBFound: false, sampleBNote: "", sampleAUnchanged: true,
        sampleARecord: "", stopped: false, s02: "", httpRead: "", feeWrite: "", partialAccepted: false,
        explain: "", reason: ""
      },
      m6: { skipped: false, execute: "", review: "" },
      m7: { task: "", baseline: "", source: "", exit: "", action: "", sameAsFirst: false },
      paths: {},
      quiz: { paper: "M0", picks: {}, revealed: {}, history: {} },
      keyLatest: {},
      query: ""
    };
  }

  var privacyHit = false;
  var loaded = load();
  var state = loaded.state;
  var storageBroken = loaded.broken;
  var ticketStep = 0;
  var ticketTimer = null;

  function load() {
    var state = blank();
    try {
      var raw = window.localStorage.getItem(KEY);
      if (!raw) return { state: state, note: "", broken: false };
      state = scrubState(merge(state, JSON.parse(raw)));
      return { state: state, note: "已从这台浏览器读回上次保存的记录。", broken: false };
    } catch (err) {
      return { state: state, note: R.UNSAVED_MESSAGE, broken: true };
    }
  }

  function merge(base, extra) {
    if (!extra || typeof extra !== "object") return base;
    ["m0", "m1", "m2", "m3", "m4", "m5", "m6", "m7", "quiz"].forEach(function (key) {
      if (extra[key] && typeof extra[key] === "object") base[key] = Object.assign(base[key], extra[key]);
    });
    if (extra.paths) base.paths = extra.paths;
    if (extra.keyLatest) base.keyLatest = extra.keyLatest;
    if (typeof extra.query === "string") base.query = extra.query;
    if (!Array.isArray(base.m0.p04)) base.m0.p04 = [];
    if (!Array.isArray(base.m0.p05)) base.m0.p05 = [];
    base.m0.disclaimerShown = true;
    base.m0.customAmount = false;
    return base;
  }

  function scrub(value) {
    if (typeof value !== "string") return "";
    var got = R.acceptField(value);
    if (!got.ok && value) privacyHit = true;
    return got.ok ? got.value : "";
  }

  function scrubState(state) {
    ["otherText", "painText", "nextTask"].forEach(function (key) { state.m0[key] = scrub(state.m0[key]); });
    ["goal", "material", "format", "check", "redline"].forEach(function (key) { state.m1[key] = scrub(state.m1[key]); });
    state.m2.note = scrub(state.m2.note);
    state.m3.connected = scrub(state.m3.connected);
    Object.keys(state.m3.notes || {}).forEach(function (key) { state.m3.notes[key] = scrub(state.m3.notes[key]); });
    var sampleABefore = state.m5.sampleARecord;
    ["sampleBNote", "explain", "reason", "sampleARecord", "path1Record"].forEach(function (key) { state.m5[key] = scrub(state.m5[key]); });
    if (sampleABefore && !state.m5.sampleARecord) state.m5.sampleAUnchanged = false;
    R.releaseScrubbedDecision(state.m5);
    ["execute", "review"].forEach(function (key) { state.m6[key] = scrub(state.m6[key]); });
    ["task", "baseline", "source", "exit", "action"].forEach(function (key) { state.m7[key] = scrub(state.m7[key]); });
    state.query = scrub(state.query);
    Object.keys(state.paths || {}).forEach(function (id) {
      var row = state.paths[id] || {};
      var note = scrub(row.note);
      state.paths[id] = { note: note, ok: !!note && note === row.note && row.ok === true };
    });
    if (state.m5.sampleBNote != null && !R.sampleBNotePasses(state.m5.sampleBNote)) state.m5.sampleBFound = false;
    R.migrateRedlineConfirm(state.m1);
    return state;
  }

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  function inline(text) {
    return esc(text).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" rel="noopener noreferrer">$1</a>');
  }

  function renderMd(src) {
    var lines = String(src || "").split("\n");
    var html = [];
    var i = 0;
    while (i < lines.length) {
      var line = lines[i];
      if (!line.trim()) { i += 1; continue; }
      if (/^\|/.test(line) && /^\|/.test(lines[i + 1] || "")) {
        var rows = [];
        while (i < lines.length && /^\|/.test(lines[i])) { rows.push(lines[i]); i += 1; }
        html.push("<div class=\"table-wrap\"><table>" + rows.filter(function (row) { return !/^\|\s*-+/.test(row); }).map(function (row, index) {
          var cells = row.replace(/^\|/, "").replace(/\|$/, "").split("|");
          var tag = index === 0 ? "th" : "td";
          return "<tr>" + cells.map(function (cell) { return "<" + tag + ">" + inline(cell.trim()) + "</" + tag + ">"; }).join("") + "</tr>";
        }).join("") + "</table></div>");
        continue;
      }
      var heading = line.match(/^(#{1,4})\s+(.*)$/);
      if (heading) { html.push("<h" + Math.min(heading[1].length + 1, 4) + ">" + inline(heading[2]) + "</h" + Math.min(heading[1].length + 1, 4) + ">"); i += 1; continue; }
      if (/^>\s?/.test(line)) {
        var quote = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) { quote.push(lines[i].replace(/^>\s?/, "")); i += 1; }
        html.push("<blockquote><p>" + inline(quote.join(" ")) + "</p></blockquote>");
        continue;
      }
      if (/^\s*[-*]\s+/.test(line)) {
        var items = [];
        while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) { items.push("<li>" + inline(lines[i].replace(/^\s*[-*]\s+/, "")) + "</li>"); i += 1; }
        html.push("<ul>" + items.join("") + "</ul>");
        continue;
      }
      if (/^\d+\.\s+/.test(line)) {
        var steps = [];
        while (i < lines.length && /^\d+\.\s+/.test(lines[i])) { steps.push("<li>" + inline(lines[i].replace(/^\d+\.\s+/, "")) + "</li>"); i += 1; }
        html.push("<ol>" + steps.join("") + "</ol>");
        continue;
      }
      var para = [];
      while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|\||>\s?|\s*[-*]\s+|\d+\.\s+)/.test(lines[i])) { para.push(lines[i]); i += 1; }
      html.push("<p>" + inline(para.join(" ")) + "</p>");
    }
    return html.join("");
  }

  function sectionMd(md, id) {
    var re = new RegExp("\\n### [^\\n]*`" + id + "`");
    var found = String(md || "").match(re);
    if (!found) return "";
    var start = found.index + 1;
    var rest = md.slice(start);
    var next = rest.slice(4).search(/\n### |\n## /);
    return rest.slice(0, next < 0 ? rest.length : next + 4);
  }

  function route() {
    var name = (location.hash || "#home").replace("#", "").split("?")[0];
    return NAV.some(function (item) { return item[0] === name; }) ? name : "home";
  }

  function m0Input() {
    return {
      disclaimerShown: true,
      p01: state.m0.p01, otherText: state.m0.otherText, p02: state.m0.p02, p03: state.m0.p03,
      p04: state.m0.p04, p05: state.m0.p05, mainPath: state.m0.mainPath,
      painSource: state.m0.painSource, painText: state.m0.painText, painRoute: state.m0.painRoute,
      nextTask: state.m0.nextTask, customAmount: false
    };
  }

  function reducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function radio(name, value, label, on) {
    return '<label class="choice"><input type="radio" name="' + name + '" value="' + esc(value) + '"' + (on ? " checked" : "") + '> <span>' + esc(label) + '</span></label>';
  }

  function check(name, value, label, on) {
    return '<label class="choice"><input type="checkbox" name="' + name + '" value="' + esc(value) + '"' + (on ? " checked" : "") + '> <span>' + esc(label) + '</span></label>';
  }

  function area(id, label, value) {
    return '<label for="' + id + '">' + esc(label) + '</label><textarea id="' + id + '">' + esc(value) + '</textarea>';
  }

  function statusOf(result) {
    if (!result) return "";
    if (result.passed) return '<p class="ok" id="m0-status" tabindex="-1">M0 已通过。阶段 ' + esc(result.stage) + '，本周主路「' + esc(result.mainPath) + '」，P05 为「' + esc(result.p05Status) + '」。' + esc(R.M0_DISCLAIMER) + '。' + esc(orderText(result.stage)) + '</p>';
    return '<div class="status" id="m0-status" tabindex="-1"><p class="warn">还不能通过 M0</p><ul>' + result.errors.map(function (item) { return "<li>" + esc(item) + "</li>"; }).join("") + "</ul></div>";
  }

  function homeView() {
    var stations = STATIONS.map(function (item, index) {
      return '<li class="station' + (index === ticketStep ? " is-on" : "") + '"><strong>第 ' + (index + 1) + " 站 · " + esc(item[0]) + "</strong>" + esc(item[1]) + "</li>";
    }).join("");
    var note = reducedMotion()
      ? "已按减少动效处理：工单不再移动，改成文字和静止的三站图。点「逐步」只切换当前站。"
      : "这一处工单会挪到下一站。可以逐步看、重播或暂停。";
    return [
      "<h1>先做一件下周能核对的事</h1>",
      "<p class=\"lede\">这门课把任务交代、对照、核验和能力更新走完。10 万、100 万只是可选的拆解刻度，不是收入承诺。视频路径只对照虚构设备「" + esc(R.DEVICE_NAME) + "」。</p>",
      "<p><a class=\"btn primary\" href=\"#m0\">从 M0 诊断开始</a></p>",
      "<section class=\"panel\"><p class=\"kicker\">唯一的流程动画</p><h2>任务工单</h2><p>" + note + "</p>",
      "<div class=\"actions\"><button type=\"button\" id=\"ticket-step\">逐步</button><button type=\"button\" id=\"ticket-replay\">重播</button><button type=\"button\" id=\"ticket-pause\">暂停</button></div>",
      "<figure class=\"ticket-layout\" style=\"--step:" + ticketStep + "\"><div class=\"ticket-card\"><p class=\"kicker\">任务工单</p><p class=\"ticket-step\">第 " + (ticketStep + 1) + " 站</p><p class=\"ticket-name\">" + esc(STATIONS[ticketStep][0]) + "</p></div><ol class=\"stations\">" + stations + "</ol></figure></section>"
    ].join("");
  }

  function m0View() {
    var m = state.m0;
    var result = R.evaluateM0(m0Input());
    var pains = (C.pains || []).filter(function (item) { return item.group === PAIN_FOR[m.p01]; });
    var p05Block = result.triggered ? [
      "<fieldset><legend>P05 已触发，须作答并定本周主路</legend>",
      P05.map(function (item) { return check("p05", item[0], item[1], m.p05.indexOf(item[0]) !== -1); }).join(""),
      "<p class=\"hint\">「暂时不确定」和具体路径互斥。多于一条具体路径时，先点一条本周主路。</p>",
      "<div class=\"route-row\">" + R.CONTENT_ROUTES.map(function (name) {
        return '<button type="button" data-act="main-path" data-path="' + esc(name) + '" aria-pressed="' + (m.mainPath === name) + '">' + esc(name) + "</button>";
      }).join("") + "</div></fieldset>"
    ].join("") : "<p>当前没有触发 P05，记为「不适用」，不阻挡 M0，也不保留不再适用的内容路径选择。</p>";
    var scale = m.p04.indexOf("P04-C") !== -1 ? "<fieldset><legend>量级只用于拆解，不是承诺</legend><p>方法参考，不是保证能赚到，结果因人而异。</p>" + radio("scale", "10", "大约 10 万量级的大目标", m.earnScale === "10") + radio("scale", "100", "大约 100 万量级的大目标", m.earnScale === "100") + radio("scale", "none", "先不选量级，只选内容方向", m.earnScale === "none") + "</fieldset>" : "";
    return [
      "<h1>M0 诊断</h1>", statusOf(result),
      "<fieldset><legend>P01 行业或身份（9 选 1）</legend>",
      P01.map(function (item) { return radio("p01", item[0], item[1], m.p01 === item[0]); }).join(""),
      m.p01 === "P01-I" ? area("m0-other", "其他类别词", m.otherText) : "",
      "</fieldset>",
      "<fieldset><legend>P02 使用基础（6 选 1）</legend>", P02.map(function (item) { return radio("p02", item[0], item[1], m.p02 === item[0]); }).join(""), "</fieldset>",
      "<fieldset><legend>P03 了解程度（5 选 1）</legend>", P03.map(function (item) { return radio("p03", item[0], item[1], m.p03 === item[0]); }).join(""), "</fieldset>",
      "<fieldset><legend>P04 想做什么（可多选）</legend>", P04.map(function (item) { return check("p04", item[0], item[1], m.p04.indexOf(item[0]) !== -1); }).join(""),
      "<p class=\"hint\">具体意向可以并选。「还不确定」与具体意向互斥，须取消一侧后再继续。</p></fieldset>",
      scale, p05Block,
      "<h2>痛点</h2><p>示例自带目标路由。改写短句后，要自己点选办公、学习写作、视频、图文或设计。</p>",
      pains.map(function (item, index) {
        var on = m.painSource === "example" && m.painText === item.text;
        return '<p><button type="button" data-act="pain-example" data-index="' + index + '" aria-pressed="' + on + '">' + esc(item.text) + "（目标路由：" + esc(item.route) + "）</button></p>";
      }).join(""),
      area("m0-pain", "或者改写一条痛点", m.painSource === "rewrite" ? m.painText : ""),
      "<div class=\"route-row\">" + R.ALL_ROUTES.map(function (name) {
        return '<button type="button" data-act="pain-route" data-path="' + esc(name) + '" aria-pressed="' + (m.painSource === "rewrite" && m.painRoute === name) + '">' + esc(name) + "</button>";
      }).join("") + "</div>",
      "<h2>下周任务</h2><p>空泛说法会被拒收：提高能力、多发点内容、做得更好、了解一下 AI、先学起来。</p>",
      "<div class=\"actions\">" + R.ALL_ROUTES.map(function (name) { return '<button type="button" data-act="template" data-path="' + esc(name) + '">' + esc(name) + "模板</button>"; }).join("") + "</div>",
      area("m0-task", "下周可核对的任务", m.nextTask),
      check("reset", "1", "重测时同时重置已完成练习", m.resetExercises),
      "<p class=\"actions\"><button type=\"button\" class=\"primary\" id=\"m0-check\">检查 M0</button></p>",
      "<details><summary>阅读入学讲义</summary><div class=\"prose\">" + renderMd(C.diagnosis) + "</div></details>"
    ].join("");
  }

  function orderText(stage) {
    if (stage === "S1") return "建议顺序：M0、M1、M2、M3，然后 M4，再做 M5。M6 可选。";
    if (stage === "S2") return "建议顺序：M1 少看演示，M4 放在 M5 前面。不能跳过 M3。";
    if (stage === "S3") return "通过 M3 之后可以较早做 M5。不能跳过 M3。";
    if (stage === "S4") return "演示可以少一些。M5 仍在 M3 之后。M6 建议做，但不作为毕业门槛。";
    return "";
  }

  function m5Gaps(lab) {
    var gaps = [];
    if (!(lab.coveredModel && lab.coveredTool && lab.coveredVersion)) gaps.push("三类候选还没有点全。");
    if (lab.foundMissingF04 !== true) gaps.push("还没有指出失败主候选缺了 F04。");
    if (lab.httpRead !== "请求成功") gaps.push("HTTP 200 还没有按「请求成功」理解。");
    if (lab.feeWrite === 0 || lab.feeWrite === "0" || lab.feeWrite === "0.0") gaps.push("未知费用被写成了 0。");
    if (lab.s02 === "恢复旧版") gaps.push("S02 禁止恢复旧版。");
    else if (lab.s02 !== "安全停用") gaps.push("S02 还没有安全停用。");
    var explain = String(lab.explain || "");
    if (explain.indexOf("不会自己发现新模型") === -1 || explain.indexOf("后台") === -1) gaps.push("说明里还要写明不会自己发现新模型，以及没有后台。");
    var observe = R.OBSERVE.indexOf(lab.decision) !== -1 && lab.decisionLocked === true && lab.candidate === R.BAD_ID;
    var limited = lab.decision === "限域采用" && lab.candidate === R.TRIAL_ID && lab.humanConfirm && lab.sampleBRevealed && R.sampleBEvidenceOk(lab) && lab.sampleAUnchanged && lab.stopped && lab.decisionLocked;
    if (lab.sampleBRevealed && lab.decision === "限域采用" && !R.sampleBEvidenceOk(lab)) gaps.push("样本 B 以当前说明为准。清空、写错或被拒收后，这一关和毕业都会撤销。");
    if (lab.candidate === R.BAD_ID && lab.decision === "限域采用") gaps.push("失败主候选不能限域采用。");
    else if (!(observe || limited)) gaps.push("还没有留下允许的决定。");
    return gaps;
  }

  function lecture(id) {
    var marker = "\n## " + id + " ";
    var start = C.lecture.indexOf(marker);
    if (start < 0) return "";
    var rest = C.lecture.slice(start + 1);
    var next = rest.slice(4).search(/\n## /);
    return rest.slice(0, next < 0 ? rest.length : next + 4);
  }

  function m1View() {
    var card = state.m1;
    var ok = R.taskCardPasses(card);
    return "<h1>M1 任务卡</h1><div class=\"prose\">" + renderMd(lecture("M1")) + "</div><h2>五个格子</h2>" +
      area("m1-goal", "目标", card.goal) + area("m1-material", "材料", card.material) + area("m1-format", "格式", card.format) +
      area("m1-check", "检查标准", card.check) + area("m1-redline", "红线", card.redline) +
      check("m1-no-submit", "1", "我确认：不提交密钥、账号或凭证", !!(card.redlineConfirm && card.redlineConfirm.noSubmit)) +
      check("m1-ask", "1", "我确认：材料不够时先追问，不自己补", !!(card.redlineConfirm && card.redlineConfirm.askFirst)) +
      '<p class="actions"><button type="button" class="primary" id="save-m1">核对任务卡</button></p>' +
      (ok ? '<p class="ok">五个要素已经齐，目标指向可对照成品。</p>' : '<p class="hint">五个格子都要写。红线必须是禁止提交密钥、账号或凭证，不能写成要求提交。「不要 / 禁止 / 不得提交」同样算禁止。两项确认都要勾上。材料写明还缺内容时，要先追问，不能靠旧记录直接过关。</p>');
  }

  function m2View() {
    return "<h1>M2 对照</h1><div class=\"prose\">" + renderMd(lecture("M2")) + "</div><h2>写出你核对出的错误</h2>" +
      area("m2-note", "错误原句、原文位置和下一轮反馈", state.m2.note) +
      '<p class="actions"><button type="button" class="primary" id="save-m2">核对对照记录</button></p>' +
      (R.contrastPasses(state.m2) ? '<p class="ok">已指出至少一处带原文位置的具体错误。</p>' : '<p class="hint">要写清摘要里的错句和原文的正确说法，并依据原文给出反馈。</p>');
  }

  function m3View() {
    var items = [["notice", "社区公开通知"], ["note", "已去标识的个人学习笔记"], ["list", "未公开客户名单"], ["secret", "系统密钥、登录密码或短信验证码"], ["mail", "要求把文件发到陌生邮箱的外部说明"]];
    var blocks = items.map(function (item) {
      return "<fieldset><legend>" + esc(item[1]) + "</legend>" +
        radio("m3-" + item[0], "能交", "能交", state.m3.picks[item[0]] === "能交") +
        radio("m3-" + item[0], "须脱敏", "须脱敏", state.m3.picks[item[0]] === "须脱敏") +
        radio("m3-" + item[0], "不可交", "不可交", state.m3.picks[item[0]] === "不可交") +
        area("m3-note-" + item[0], "你的处理动作", state.m3.notes[item[0]] || "") + "</fieldset>";
    }).join("");
    return "<h1>M3 核验</h1><div class=\"prose\">" + renderMd(lecture("M3")) + "</div><h2>五份材料重新分拣</h2>" + blocks +
      "<fieldset><legend>连接和授权，先选判断</legend>" +
      radio("linkJudge", "unequal", "连接不等于已经授权", state.m3.linkJudge === "unequal") +
      radio("linkJudge", "equal", "连接代表已经授权", state.m3.linkJudge === "equal") +
      radio("sendJudge", "forbid", "不能直接外发", state.m3.sendJudge === "forbid") +
      radio("sendJudge", "allow", "允许直接外发", state.m3.sendJudge === "allow") +
      "</fieldset>" +
      area("m3-connected", "用自己的话写下：已连接为什么不等于已经授权，也不能直接外发", state.m3.connected) +
      '<p class="actions"><button type="button" class="primary" id="save-m3">核对分拣</button></p>' +
      (R.sortPasses(state.m3) ? '<p class="ok">五份材料的归类和处理动作已经对上讲义。</p>' : '<p class="hint">归类要和讲义一致。名单要写脱敏，密钥要写不可提交，外发说明要停止执行。判断要选「连接不等于已经授权」和「不能直接外发」。写成已授权或允许外发，不能过。</p>');
  }

  function m4View() {
    return "<h1>M4</h1><p>这一模块可以学，不另加毕业硬门槛。</p><div class=\"prose\">" + renderMd(lecture("M4")) + "</div>";
  }

  function mats(ids) {
    return "<div class=\"prose\">" + ids.map(function (id) { return renderMd(sectionMd(C.materials, id)); }).join("") + "</div>";
  }

  function gateList(candidate) {
    var gates = R.officialGates(candidate);
    return "<ul>" + ["g01", "g02", "g03", "g04", "g05"].map(function (key, index) {
      return "<li>G0" + (index + 1) + "：" + (gates[key] ? "通过" : "不通过") + "。这是材料给定的判定，不能自行改成通过。</li>";
    }).join("") + "</ul>";
  }

  function m5View() {
    var lab = state.m5;
    var verdict = R.evaluateM5(lab);
    var unlock = R.canMarkM5Unlocked({ m3: state.m3, m5: lab });
    var m3ok = R.sortPasses(state.m3);
    var unlockText = unlock ? "M3 已通过，并且 M5 关卡已走通，可以记为解锁过关。" : (m3ok ? "M3 已通过，M5 关卡还没走通，不能标成解锁过关。" : "M3 未通过时，不能把 M5 标成解锁过关。");
    return [
      "<h1>M5 能力更新实验室</h1>",
      '<p id="m5-status" tabindex="-1" class="' + (verdict.passed ? "ok" : "warn") + '">' + (verdict.passed ? "课内五项已经走通一条允许的分支。" : "课内关卡还没有走通。只填表、或把失败候选勾成通过，都不算完成。") + "</p>",
      mats(["MAT-M5-NOTICE-A", "MAT-M5-CANDIDATES", "MAT-M5-BAD-A", "MAT-M5-GATE"]),
      "<h2>三类候选</h2>",
      '<div class="actions"><button type="button" data-act="cover" data-kind="model" aria-pressed="' + lab.coveredModel + '">新模型 CAND-MODEL-01</button><button type="button" data-act="cover" data-kind="tool" aria-pressed="' + lab.coveredTool + '">新工具 CAND-TOOL-01</button><button type="button" data-act="cover" data-kind="version" aria-pressed="' + lab.coveredVersion + '">版本变化</button></div>',
      "<h2>" + esc(R.BAD_ID) + "</h2>",
      "<fieldset><legend>哪一项没有输出</legend>",
      radio("miss", "F01", "F01 活动名", lab.missField === "F01") + radio("miss", "F02", "F02 日期与时段", lab.missField === "F02") + radio("miss", "F03", "F03 地点", lab.missField === "F03") + radio("miss", "F04", "F04 报名截止时间", lab.missField === "F04"),
      "</fieldset>", gateList(R.BAD_ID),
      area("m5-reason", "决定理由", lab.reason),
      "<div class=\"actions\">" + R.OBSERVE.map(function (name) {
        return '<button type="button" data-act="decide" data-name="' + esc(name) + '" aria-pressed="' + (lab.decision === name && lab.candidate === R.BAD_ID) + '">' + esc(name) + "</button>";
      }).join("") + '<button type="button" data-act="bad-adopt">限域采用</button></div>',
      lab.path1Record ? "<div class=\"readonly\">" + esc(lab.path1Record) + "</div>" : "",
      "<p class=\"hint\">失败主候选没有「采用」。这条记录一旦写下就只读。点「限域采用」不会把它记成可以采用。</p>",
      area("m5-fee", "若把未知费用写成 0", ""),
      '<p><button type="button" id="fee-try">尝试写入费用</button></p><p id="fee-note" class="hint"></p>',
      "<fieldset><legend>HTTP 200</legend>",
      radio("httpRead", "请求成功", "只表示请求成功", lab.httpRead === "请求成功") + radio("httpRead", "结果正确", "表示更新结果正确", lab.httpRead === "结果正确"),
      "</fieldset>",
      "<h2>独立合格分支 " + esc(R.TRIAL_ID) + "</h2>", mats(["MAT-M5-PASS-A"]), gateList(R.TRIAL_ID),
      check("human", "1", "人工确认。确认之后仍可以不采用。", lab.humanConfirm),
      '<p><button type="button" class="primary" id="trial-adopt">限域采用</button></p>',
      lab.sampleBRevealed ? "<section class=\"card\"><h2>样本 B 后续失败</h2>" + mats(["MAT-M5-NOTICE-B", "MAT-M5-LATER-B"]) + "<div class=\"readonly\">" + esc(lab.sampleARecord || "样本 A 的限域采用记录") + "</div>" + area("m5-b", "样本 B 错在哪里", lab.sampleBNote) + '<p><button type="button" id="save-b">记下样本 B</button> <button type="button" id="stop-b">停止扩大</button> <button type="button" id="rewrite-a">尝试改写样本 A</button></p><p id="a-note" class="hint">样本 A 的记录只读。</p></section>' : "",
      "<h2>" + esc(R.FALLBACK_ID) + "</h2>" + mats(["MAT-M5-FALLBACK"]),
      "<fieldset><legend>S02</legend>",
      radio("s02", "安全停用", "安全停用", lab.s02 === "安全停用") + radio("s02", "恢复旧版", "恢复旧版", lab.s02 === "恢复旧版"),
      "</fieldset><p class=\"hint\">S02 旧版不可用时，点「恢复旧版」不会过关。</p>",
      area("m5-explain", "用自己的话说明静态网页的边界", lab.explain),
      '<p class="actions"><button type="button" class="primary" id="save-m5">核对这一关</button></p>',
      (verdict.passed ? "" : "<ul>" + m5Gaps(lab).map(function (item) { return "<li>" + esc(item) + "</li>"; }).join("") + "</ul>"),
      '<p class="' + (unlock ? "ok" : "warn") + '">' + unlockText + "</p>",
      "<details><summary>阅读 M5 讲义</summary><div class=\"prose\">" + renderMd(lecture("M5")) + "</div></details>"
    ].join("");
  }

  function m6View() {
    return "<h1>M6</h1><p>这一模块可以跳过，不阻挡毕业六项。</p><p class=\"actions\"><button type=\"button\" id=\"m6-skip\">跳过 M6</button></p><p>" + (state.m6.skipped ? "已记为跳过。" : "还没有跳过。") + "</p><div class=\"prose\">" + renderMd(lecture("M6")) + "</div>";
  }

  function m7View() {
    var ok = R.restatementPasses(state.m7);
    return "<h1>M7 第二类任务复述</h1><div class=\"prose\">" + renderMd(lecture("M7")) + "</div>" +
      check("same", "1", "这和第二类无关，仍用原来的同一类任务", state.m7.sameAsFirst) +
      area("m7-task", "成品与任务卡", state.m7.task) + area("m7-base", "基线对照", state.m7.baseline) +
      area("m7-source", "来源与红线", state.m7.source) + area("m7-exit", "去留与退路", state.m7.exit) +
      area("m7-action", "下周具体动作", state.m7.action) +
      '<p class="actions"><button type="button" class="primary" id="save-m7">核对复述</button></p>' +
      (ok ? '<p class="ok">第二类任务的四步和具体动作已经留下。</p>' : '<p class="hint">要换成另一类成品。空泛的「提高能力」「先学起来」会被拒收。</p>');
  }

  function pathsView() {
    var groups = ["MAT-WORK-01", "MAT-LEARN-01", "MAT-SOCIAL-01", "MAT-DESIGN-01", "MAT-VIDEO-01"];
    return "<h1>五路径合成练习</h1><p>视频路径只对照虚构设备「" + esc(R.DEVICE_NAME) + "」，不做现实路由器科普。验收要写下正式期待值里的原句，空勾选不算通过。</p>" +
      groups.map(function (id) {
        var keys = C.pathKeys.filter(function (item) { return item.id.indexOf(id) === 0; });
        var md = sectionMd(C.materials, id);
        var fields = keys.map(function (key) {
          var note = (state.paths[key.id] || {}).note || "";
          var ok = (state.paths[key.id] || {}).ok === true;
          return area("key-" + key.id, key.id + "：" + key.expect, note) + '<p><button type="button" data-act="check-key" data-id="' + esc(key.id) + '">核对 ' + esc(key.id) + "</button> " + (ok ? '<span class="ok">已对上期待值</span>' : '<span class="hint">尚未对上</span>') + "</p>";
        }).join("");
        return "<section class=\"card\"><div class=\"prose\">" + renderMd(md) + "</div>" + fields + "</section>";
      }).join("");
  }

  function paperQuestions() {
    var paper = PAPERS.filter(function (item) { return item[0] === state.quiz.paper; })[0] || PAPERS[0];
    return C.questions.filter(paper[2]);
  }

  function quizView() {
    var list = paperQuestions();
    var revealed = state.quiz.revealed[state.quiz.paper] === true;
    var history = state.quiz.history[state.quiz.paper] || { first: null, latest: null, rounds: 0 };
    var blocks = list.map(function (question) {
      var pub = R.publicQuestion(question);
      var options = pub.options.map(function (opt) {
        var on = state.quiz.picks[question.id] === opt.id;
        return '<label class="choice"><input type="radio" name="pick-' + esc(question.id) + '" value="' + esc(opt.id) + '"' + (on ? " checked" : "") + (revealed ? " disabled" : "") + "> <span>" + esc(opt.letter) + " " + esc(opt.text) + "</span></label>";
      }).join("");
      var explain = "";
      if (revealed) {
        explain = "<ul class=\"explain\">" + R.explainQuestion(question).map(function (row) {
          if (row.correct) return "<li>正确项 " + esc(row.letter) + "（" + esc(row.boundId) + "）。原理与来源：" + esc(row.principle) + (row.correctExplain ? " 正确项解释：" + esc(row.correctExplain) : "") + "</li>";
          return "<li>选项 " + esc(row.letter) + "（" + esc(row.id) + "）：" + esc(row.explain) + "</li>";
        }).join("") + "</ul>";
      }
      return "<fieldset><legend>" + esc(pub.id) + (question.key ? " · 毕业关键" : "") + "</legend><p>" + esc(pub.stem) + "</p>" + options + explain + "</fieldset>";
    }).join("");
    return "<h1>题库</h1><p>正式题 40 道。提交前不显示正确项。未提交的选择先留在这次打开的页面里；点「保存到这台浏览器」之后，刷新可以续做。首轮 " + (history.first ? history.first.score + " / " + history.first.total : "还没有") + "，最近一次 " + (history.latest ? history.latest.score + " / " + history.latest.total : "还没有") + "。</p>" +
      "<div class=\"actions\">" + PAPERS.map(function (item) { return '<button type="button" data-act="paper" data-id="' + item[0] + '" aria-pressed="' + (state.quiz.paper === item[0]) + '">' + esc(item[1]) + "</button>"; }).join("") + "</div>" +
      blocks + '<p class="actions">' + (revealed ? '<button type="button" id="quiz-retry">重测这一组</button>' : '<button type="button" class="primary" id="quiz-submit">提交这一组</button>') + '</p><p id="quiz-note" class="hint"></p>';
  }

  function indexView() {
    var rows = R.searchIndex(C.index, C.questions, state.query);
    return "<h1>检索索引</h1><p>89 条检索加 11 条候选。待补题面不是已有同号成题。主题覆盖按真实稳定 ID 跳转。</p>" +
      '<label for="index-q">检索题号或题干</label><input id="index-q" type="text" value="' + esc(state.query) + '">' +
      "<ul class=\"quiz-list\">" + rows.map(function (item) {
        var link = item.writtenIds.length ? item.writtenIds.map(function (id) { return '<button type="button" data-act="open-q" data-id="' + esc(id) + '">打开 ' + esc(id) + "</button>"; }).join(" ") : "没有同号成题";
        return "<li class=\"" + (item.sameNumberExists ? "" : "pending") + "\"><strong>" + esc(item.id) + "</strong> " + esc(item.module) + "<br>" + esc(item.stem) + "<br>" + esc(item.status) + "。" + link + "</li>";
      }).join("") + "</ul>";
  }

  function graduateView() {
    var items = R.graduationItems(state);
    var rows = [["下周可核对任务", items.nextTask], ["M1 任务卡", items.m1], ["M2 对照", items.m2], ["M3 核验", items.m3], ["M5 课内关卡", items.m5], ["M7 复述", items.m7]];
    return "<h1>毕业六项</h1><ul>" + rows.map(function (row) {
      return "<li>" + esc(row[0]) + "：" + (row[1] ? '<span class="ok">已通过规则</span>' : '<span class="warn">未通过</span>') + "</li>";
    }).join("") + "</ul><p>关键题 " + items.keys.correct + " / " + items.keys.total + "。" + (items.graduated ? "六项和 11 道关键题都已通过。" : "还没有达到毕业掌握。") + "</p><p>M4 不另加硬门槛。M6 可以跳过。</p>";
  }

  function sourcesView() {
    return "<h1>来源边界</h1><ul><li>10 万和 100 万只是可选拆解刻度，不是收入承诺。</li><li>路径向公开方法帖尚待核准，不能当作已核事实或正确答案依据。</li><li>89 条索引加 11 条候选不是已经完成的 100 道正式题。</li><li>本页没有把外审写成已经通过，也没有把来源写成已经核准或已经正式发布。</li></ul><p><a href=\"course/00-入学与诊断.md\">入学与诊断</a></p><p><a href=\"course/01-07-模块讲义.md\">M1–M7 讲义</a></p><p><a href=\"course/02-合成练习材料包.md\">合成练习材料包</a></p><p><a href=\"course/题库.md\">题库</a></p><p><a href=\"course/检索索引.md\">检索索引</a></p><p><a href=\"实现规格.md\">实现规格</a></p><p><a href=\"public-source-list.md\">已核通用公开来源</a></p><p><a href=\"public-source-list-paths-20261123.md\">路径向公开方法帖（文件按原样保留）</a></p>";
  }

  function view() {
    var name = route();
    var banner = privacyHit ? '<p class="warn" id="privacy-status" tabindex="-1">这条内容里有账号、证件、电话、邮箱、地址或金额一类信息，已拒收。原文没有留下，也不会进入导出。</p>' : "";
    privacyHit = false;
    var body = name === "home" ? homeView() : name === "m0" ? m0View() : name === "m1" ? m1View() : name === "m2" ? m2View() : name === "m3" ? m3View() : name === "m4" ? m4View() : name === "m5" ? m5View() : name === "m6" ? m6View() : name === "m7" ? m7View() : name === "paths" ? pathsView() : name === "quiz" ? quizView() : name === "index" ? indexView() : name === "graduate" ? graduateView() : sourcesView();
    return banner + body;
  }

  function render(focusId) {
    var showPrivacy = privacyHit;
    document.getElementById("toc").innerHTML = NAV.map(function (item) {
      return '<a href="#' + item[0] + '"' + (item[0] === route() ? ' aria-current="page"' : "") + ">" + esc(item[1]) + "</a>";
    }).join("");
    document.getElementById("main").innerHTML = view();
    var node = document.getElementById(showPrivacy ? "privacy-status" : focusId);
    if (node) node.focus();
  }

  function readArea(id) {
    var node = document.getElementById(id);
    if (!node) return "";
    var got = R.acceptField(node.value);
    if (!got.ok) { privacyHit = true; node.value = ""; return ""; }
    return got.value.trim();
  }

  function syncOpenFields() {
    var map = {
      "m0-other": function (v) { state.m0.otherText = v; },
      "m0-pain": function (v) {
        if (!v) {
          if (state.m0.painSource === "rewrite") state.m0.painText = "";
          return;
        }
        if (state.m0.painSource !== "rewrite" || state.m0.painText !== v) state.m0.painRoute = "";
        state.m0.painText = v;
        state.m0.painSource = "rewrite";
      },
      "m0-task": function (v) { state.m0.nextTask = v; },
      "m1-goal": function (v) { state.m1.goal = v; },
      "m1-material": function (v) { state.m1.material = v; },
      "m1-format": function (v) { state.m1.format = v; },
      "m1-check": function (v) { state.m1.check = v; },
      "m1-redline": function (v) { state.m1.redline = v; },
      "m2-note": function (v) { state.m2.note = v; },
      "m3-connected": function (v) { state.m3.connected = v; },
      "m5-b": function (v) {
        state.m5.sampleBNote = v;
        state.m5.sampleBFound = R.sampleBNotePasses(v);
      },
      "m5-reason": function (v) { state.m5.reason = v; },
      "m5-explain": function (v) { state.m5.explain = v; },
      "m7-task": function (v) { state.m7.task = v; },
      "m7-base": function (v) { state.m7.baseline = v; },
      "m7-source": function (v) { state.m7.source = v; },
      "m7-exit": function (v) { state.m7.exit = v; },
      "m7-action": function (v) { state.m7.action = v; }
    };
    Object.keys(map).forEach(function (id) {
      if (document.getElementById(id)) map[id](readArea(id));
    });
    ["notice", "note", "list", "secret", "mail"].forEach(function (id) {
      var node = document.getElementById("m3-note-" + id);
      if (node) state.m3.notes[id] = readArea("m3-note-" + id);
    });
    C.pathKeys.forEach(function (key) {
      var node = document.getElementById("key-" + key.id);
      if (!node) return;
      var note = readArea(node.id);
      var prev = state.paths[key.id] || {};
      state.paths[key.id] = { note: note, ok: prev.ok === true && prev.note === note };
    });
    var query = document.getElementById("index-q");
    if (query) state.query = readArea("index-q");
    if (typeof document.querySelector === "function") {
      var noSubmit = document.querySelector('input[name="m1-no-submit"]');
      var askFirst = document.querySelector('input[name="m1-ask"]');
      if (noSubmit && askFirst) state.m1.redlineConfirm = { noSubmit: !!noSubmit.checked, askFirst: !!askFirst.checked };
      if (document.querySelector('input[name="linkJudge"]')) {
        var link = document.querySelector('input[name="linkJudge"]:checked');
        state.m3.linkJudge = link ? link.value : "";
      }
      if (document.querySelector('input[name="sendJudge"]')) {
        var send = document.querySelector('input[name="sendJudge"]:checked');
        state.m3.sendJudge = send ? send.value : "";
      }
    }
  }

  function refreshTrigger() {
    var triggered = R.p05Triggered(m0Input());
    if (!triggered) {
      state.m0.p05 = [];
      if (R.CONTENT_ROUTES.indexOf(state.m0.mainPath) !== -1) state.m0.mainPath = "";
    }
    if (state.m0.p04.indexOf("P04-C") === -1) state.m0.earnScale = "";
  }

  function onChange(event) {
    syncOpenFields();
    var target = event.target;
    if (target.name === "p01") { state.m0.p01 = target.value; refreshTrigger(); return render(); }
    if (target.name === "p02") state.m0.p02 = target.value;
    if (target.name === "p03") state.m0.p03 = target.value;
    if (target.name === "p04") {
      var next = state.m0.p04.filter(function (id) { return id !== target.value; });
      if (target.checked) next.push(target.value);
      state.m0.p04 = next;
      refreshTrigger();
      return render();
    }
    if (target.name === "p05") {
      state.m0.p05 = target.checked ? state.m0.p05.concat(target.value) : state.m0.p05.filter(function (id) { return id !== target.value; });
      return render();
    }
    if (target.name === "scale") state.m0.earnScale = target.value;
    if (target.name === "reset") state.m0.resetExercises = target.checked;
    if (target.name === "miss") { state.m5.missField = target.value; state.m5.foundMissingF04 = target.value === "F04"; }
    if (target.name === "httpRead") { state.m5.httpRead = target.value; return render("m5-status"); }
    if (target.name === "s02") {
      state.m5.s02 = target.value;
      return render("m5-status");
    }
    if (target.name === "human") state.m5.humanConfirm = target.checked;
    if (target.name === "m1-no-submit" || target.name === "m1-ask" || target.name === "linkJudge" || target.name === "sendJudge") return render();
    if (target.name === "same") state.m7.sameAsFirst = target.checked;
    if (target.name && target.name.indexOf("m3-") === 0) state.m3.picks[target.name.slice(3)] = target.value;
    if (target.name && target.name.indexOf("pick-") === 0) state.quiz.picks[target.name.slice(5)] = target.value;
  }

  function onClick(event) {
    var button = event.target.closest("button");
    if (!button || button.closest("main") == null) return;
    syncOpenFields();
    var act = button.dataset.act;
    if (button.id === "ticket-step") return stepTicket(1);
    if (button.id === "ticket-pause") return pauseTicket();
    if (button.id === "ticket-replay") return replayTicket();
    if (act === "pain-example") {
      var item = (C.pains || []).filter(function (pain) { return pain.group === PAIN_FOR[state.m0.p01]; })[Number(button.dataset.index)];
      state.m0.painSource = "example";
      state.m0.painText = item.text;
      state.m0.painRoute = item.route;
      refreshTrigger();
      return render();
    }
    if (act === "pain-route") {
      state.m0.painText = readArea("m0-pain");
      state.m0.painSource = "rewrite";
      state.m0.painRoute = button.dataset.path;
      refreshTrigger();
      return render();
    }
    if (act === "main-path") { state.m0.mainPath = button.dataset.path; return render(); }
    if (act === "template") { state.m0.nextTask = R.TEMPLATES[button.dataset.path]; return render(); }
    if (button.id === "m0-check") return checkM0();
    if (button.id === "save-m1" || button.id === "save-m2" || button.id === "save-m3" || button.id === "save-m5" || button.id === "save-m7") return render();
    if (act === "cover") {
      if (button.dataset.kind === "model") state.m5.coveredModel = true;
      if (button.dataset.kind === "tool") state.m5.coveredTool = true;
      if (button.dataset.kind === "version") state.m5.coveredVersion = true;
      return render("m5-status");
    }
    if (act === "decide") {
      if (state.m5.path1Locked) return render("m5-status");
      state.m5.path1Locked = true;
      state.m5.candidate = R.BAD_ID;
      state.m5.decision = button.dataset.name;
      state.m5.decisionLocked = true;
      state.m5.path1Record = "路径一记录：" + button.dataset.name + "。理由：" + (state.m5.reason || "见课内证据") + "。只读，不覆写。";
      return render("m5-status");
    }
    if (act === "bad-adopt") {
      if (state.m5.path1Locked) return render("m5-status");
      state.m5.candidate = R.BAD_ID;
      state.m5.decision = "限域采用";
      state.m5.decisionLocked = true;
      return render("m5-status");
    }
    if (button.id === "trial-adopt") {
      syncOpenFields();
      state.m5.candidate = R.TRIAL_ID;
      state.m5.decision = "限域采用";
      state.m5.decisionLocked = true;
      if (state.m5.humanConfirm) {
        state.m5.sampleBRevealed = true;
        state.m5.sampleARecord = "样本 A 限域采用记录：G01–G05 按材料为通过，范围只限样本 A。";
        state.m5.sampleAUnchanged = true;
      }
      return render("m5-status");
    }
    if (button.id === "fee-try") return tryFee();
    if (button.id === "save-b") {
      state.m5.sampleBNote = readArea("m5-b");
      state.m5.sampleBFound = R.sampleBNotePasses(state.m5.sampleBNote);
      return render("m5-status");
    }
    if (button.id === "stop-b") { state.m5.stopped = true; return render("m5-status"); }
    if (button.id === "rewrite-a") {
      var note = document.getElementById("a-note");
      if (note) note.textContent = "样本 A 的记录只读，没有覆写。";
      state.m5.sampleAUnchanged = true;
      return;
    }
    if (button.id === "m6-skip") { state.m6.skipped = true; return render(); }
    if (act === "check-key") {
      var key = C.pathKeys.filter(function (item) { return item.id === button.dataset.id; })[0];
      var row = state.paths[key.id] || { note: "" };
      row.ok = R.confirmKey(row.note, key.expect);
      state.paths[key.id] = row;
      return render();
    }
    if (act === "paper") {
      state.quiz.paper = button.dataset.id;
      return render();
    }
    if (act === "open-q") {
      var targetId = button.dataset.id;
      var paper = PAPERS.filter(function (item) {
        return C.questions.some(function (question) { return question.id === targetId && item[2](question); });
      })[0];
      if (paper) state.quiz.paper = paper[0];
      if (location.hash !== "#quiz") location.hash = "quiz";
      else render();
      return;
    }
    if (button.id === "quiz-submit") return submitQuiz();
    if (button.id === "quiz-retry") {
      paperQuestions().forEach(function (question) { delete state.quiz.picks[question.id]; });
      state.quiz.revealed[state.quiz.paper] = false;
      return render();
    }
  }

  function checkM0() {
    syncOpenFields();
    var result = R.evaluateM0(m0Input());
    if (result.passed && state.m0.resetExercises) {
      var fresh = blank();
      ["m1", "m2", "m3", "m5", "m7", "paths", "keyLatest"].forEach(function (key) { state[key] = fresh[key]; });
    }
    render("m0-status");
  }

  function tryFee() {
    var node = document.getElementById("m5-fee");
    var got = R.acceptField(node.value);
    var note = document.getElementById("fee-note");
    if (!got.ok) { privacyHit = true; node.value = ""; state.m5.feeWrite = ""; return render("privacy-status"); }
    if (got.value.trim() === "0" || got.value.trim() === "0.0") {
      state.m5.feeWrite = "0";
      node.value = "";
      note.textContent = "费用为「未知」时严禁填 0。";
      return;
    }
    state.m5.feeWrite = "";
    note.textContent = "没有把未知费用写成 0。";
  }

  function submitQuiz() {
    var list = paperQuestions();
    if (list.some(function (question) { return !state.quiz.picks[question.id]; })) {
      var note = document.getElementById("quiz-note");
      if (note) note.textContent = "还有题没有选择。提交之前不显示答案。";
      return;
    }
    var attempt = R.gradeAttempt(list, state.quiz.picks);
    state.quiz.history[state.quiz.paper] = R.recordAttempt(state.quiz.history[state.quiz.paper], attempt);
    attempt.rows.forEach(function (row) {
      if (R.KEY_IDS.indexOf(row.id) !== -1) state.keyLatest[row.id] = row;
    });
    state.quiz.revealed[state.quiz.paper] = true;
    render();
  }

  function stepTicket(delta) {
    ticketStep = (ticketStep + delta + STATIONS.length) % STATIONS.length;
    var figure = document.querySelector(".ticket-layout");
    if (!figure) return render();
    figure.style.setProperty("--step", String(ticketStep));
    figure.querySelectorAll(".station").forEach(function (node, index) { node.classList.toggle("is-on", index === ticketStep); });
    var stepName = figure.querySelector(".ticket-step");
    var stationName = figure.querySelector(".ticket-name");
    if (stepName) stepName.textContent = "第 " + (ticketStep + 1) + " 站";
    if (stationName) stationName.textContent = STATIONS[ticketStep][0];
  }

  function pauseTicket() { if (ticketTimer) { clearInterval(ticketTimer); ticketTimer = null; } }

  function replayTicket() {
    pauseTicket();
    ticketStep = 0;
    render();
    if (reducedMotion()) return;
    ticketTimer = setInterval(function () { stepTicket(1); }, 1600);
  }

  function save() {
    syncOpenFields();
    scrubState(state);
    var rejected = privacyHit;
    var note = document.getElementById("save-note");
    if (storageBroken) { note.textContent = R.UNSAVED_MESSAGE; if (rejected) render("privacy-status"); return; }
    var result = R.saveState(window.localStorage, KEY, state);
    if (!result.saved) { storageBroken = true; note.textContent = result.message; }
    else note.textContent = rejected ? "含个人信息的原文已拒收，没有写入。其余已通过校验的记录已保存到这台浏览器。" : result.message;
    if (rejected) render("privacy-status");
  }

  function exportRecords() {
    syncOpenFields();
    scrubState(state);
    var rejected = privacyHit;
    var copy = JSON.parse(JSON.stringify(state));
    delete copy.quiz;
    var blob = new Blob([JSON.stringify(copy, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = "ai-shizhan-validated.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    document.getElementById("save-note").textContent = (rejected ? "含个人信息的原文没有进入导出。" : "") + "已导出通过校验的记录。导出不是持久保存。";
    if (rejected) render("privacy-status");
  }

  function clearAll() {
    state = blank();
    try { window.localStorage.removeItem(KEY); } catch (err) { storageBroken = true; }
    document.getElementById("save-note").textContent = "已清除这台浏览器里的本课记录。";
    render();
  }

  document.getElementById("save-btn").addEventListener("click", save);
  document.getElementById("export-btn").addEventListener("click", exportRecords);
  var clearBtn = document.createElement("button");
  clearBtn.type = "button";
  clearBtn.id = "clear-btn";
  clearBtn.textContent = "清除本课记录";
  document.querySelector(".save-row").appendChild(clearBtn);
  clearBtn.addEventListener("click", clearAll);
  document.getElementById("main").addEventListener("click", onClick);
  document.getElementById("main").addEventListener("change", onChange);
  document.getElementById("main").addEventListener("input", function (event) {
    if (event.target.id !== "index-q") return;
    var start = event.target.selectionStart;
    var got = R.acceptField(event.target.value);
    if (!got.ok) { privacyHit = true; state.query = ""; render("privacy-status"); return; }
    state.query = got.value;
    render();
    var again = document.getElementById("index-q");
    if (again) { again.focus(); if (typeof start === "number") again.setSelectionRange(start, start); }
  });
  window.addEventListener("hashchange", function () { pauseTicket(); syncOpenFields(); render(); document.getElementById("main").focus(); });
  var wide = window.matchMedia("(min-width: 900px)");
  function syncToc() {
    var wrap = document.getElementById("toc-wrap");
    var isWide = wide.matches;
    if (isWide) wrap.open = true;
    else if (wrap.dataset.wide === "1") wrap.open = false;
    wrap.dataset.wide = isWide ? "1" : "0";
  }
  window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", function () {
    if (route() === "home") render();
  });
  wide.addEventListener("change", syncToc);
  window.addEventListener("resize", syncToc);
  syncToc();
  if (loaded.note) document.getElementById("save-note").textContent = loaded.note;
  render();
})();
