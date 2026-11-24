(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.CourseRules = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  var SAVE_LABEL = "保存到这台浏览器";
  var FORBIDDEN_SAVE_LABEL = "开启自动更新";
  var UNSAVED_MESSAGE = "未保存。这台浏览器没有留下这份进度。你可以导出已通过校验的记录；导出不是持久保存。";
  var DRILL_BADGE = "本地演练 / 预填教学数据";
  var M0_DISCLAIMER = "学习推荐，不是能力鉴定或职业认证";
  var P05_NA = "不适用";
  var BAD_ID = "CAND-VERSION-BAD";
  var TRIAL_ID = "CAND-VERSION-TRIAL";
  var FALLBACK_ID = "MAT-M5-FALLBACK";
  var DEVICE_NAME = "蓝鲸盒 X-0";
  var KEY_IDS = ["Q-M1-02", "Q-M3-01", "Q-M3-02", "Q-M5-04", "Q-M5-06", "Q-G04", "Q-G05", "Q-G06", "Q-G08", "Q-G10", "Q003"];
  var P02_STAGE = { "P02-A": 1, "P02-B": 1, "P02-C": 2, "P02-D": 2, "P02-E": 3, "P02-F": 4 };
  var P03_STAGE = { "P03-A": 1, "P03-B": 1, "P03-C": 2, "P03-D": 3, "P03-E": 4 };
  var VAGUE = ["提高能力", "多发点内容", "做得更好", "了解一下AI", "了解一下 AI", "先学起来"];
  var PRODUCTS = ["清单", "摘要", "笔记", "稿", "脚本", "说明", "提纲", "问答"];
  var CONTENT_ROUTES = ["视频", "图文", "设计"];
  var ALL_ROUTES = ["办公", "学习写作", "视频", "图文", "设计"];
  var OBSERVE = ["不采用", "拒绝", "继续观察"];
  var TEMPLATES = {
    "图文": "完成一篇可发稿，标题、正文与来源核对说明齐备。是否对外发布完全由你自己决定，发布与否不是过关条件，也不是收益指标。",
    "设计": "提交一份设计说明与尺寸清单，写清用途、尺寸、必须保留的文字以及来源或素材边界，可按需要附图。课内只验收说明和清单是否完整，不要求本课替你出图，也不要求交给真实客户。",
    "视频": "写好一条已核来源的口播或分镜脚本，能指出其中关键事实的出处；不要求在课内拍摄或发布成片。",
    "办公": "根据一份合成通知整理出活动清单或会议摘要，并对照原文逐项检查日期、地点与遗漏项。",
    "学习写作": "写一则带出处的讲解笔记，清楚标出哪一句来自原始材料、哪一句是自己的推断。"
  };
  var P05_ROUTE = { "P05-A": "视频", "P05-B": "图文", "P05-C": "设计" };
  var M3_ANSWER = {
    notice: "能交",
    note: "能交",
    list: "须脱敏",
    secret: "不可交",
    mail: "不可交"
  };

  function scanText(text) {
    return String(text == null ? "" : text).normalize("NFKC").replace(/[\u00A0\u3000]/g, " ");
  }

  function inspectText(text) {
    var value = scanText(text);
    var kinds = [];
    if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(value)) kinds.push("email");
    if (/(?<!\d)(?:\+?86[\s\-.]?)?1[3-9]\d(?:[\s.\-]*\d){8}(?!\d)/.test(value)) kinds.push("phone");
    if (/(?<!\d)0\d{2,3}(?:[\s\-]*\d){7,8}(?!\d)/.test(value)) kinds.push("phone");
    if (/[1-9]\d{5}(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx]/.test(value)) kinds.push("id");
    if (/(?<!\d)\d{16,19}(?!\d)/.test(value)) kinds.push("account");
    if (/(?:账号|帐号|账户|帐户|用户名|登录名)\s*[:=：]?\s*[A-Za-z0-9][A-Za-z0-9_-]{3,}/.test(value)) kinds.push("account");
    if (/\b(?:account|username)\b\s*[:=：]?\s*[A-Za-z0-9][A-Za-z0-9_-]{3,}/i.test(value)) kinds.push("account");
    if (/(?:¥|￥|\$|US\$)\s*\d+|\d+(?:\.\d+)?\s*(?:万元|元|美元|美金|块)|[1-9]\d*\s*万(?:元)?/.test(value)) kinds.push("money");
    if (/(?:USD|EUR|GBP|CNY|RMB|HKD|JPY|USDT)\s*\d+(?:\.\d+)?/i.test(value)) kinds.push("money");
    if (/\d+(?:\.\d+)?\s*(?:USD|EUR|GBP|CNY|RMB|HKD|JPY|USDT)\b/i.test(value)) kinds.push("money");
    if (/(?:人民币|美元|美金|欧元|英镑|港币|日元)\s*\d+(?:\.\d+)?/.test(value)) kinds.push("money");
    var addressText = value.replace(/缺省|微信号|手机号|账号|学号|编号|序号/g, "");
    var region = /(?:省|自治区|市|区|县)/.test(addressText);
    var detail = /(?:路|街|巷|号|栋|室|村|镇)/.test(addressText);
    if (region && detail) kinds.push("address");
    if (/(?:password|passwd|api[_-]?key|secret|token|bearer)\s*[:=：]\s*\S+/i.test(value)) kinds.push("secret");
    if (/(?:密码|密钥|口令|账号|帐户|账户)\s*[:=：]\s*\S+/.test(value)) kinds.push("secret");
    if (/(?:sk|pk|ak)-[A-Za-z0-9]{16,}/.test(value)) kinds.push("secret");
    if (/[A-Fa-f0-9]{32,}/.test(value)) kinds.push("secret");
    return { ok: kinds.length === 0, kinds: kinds };
  }

  function acceptField(text) {
    var check = inspectText(text);
    if (!check.ok) return { ok: false, kinds: check.kinds, value: "" };
    return { ok: true, kinds: [], value: String(text == null ? "" : text) };
  }

  function saveState(storage, key, state) {
    try {
      storage.setItem(key, JSON.stringify(state));
      if (storage.getItem(key) == null) return { ok: false, saved: false, message: UNSAVED_MESSAGE };
      return { ok: true, saved: true, message: "已保存到这台浏览器。" };
    } catch (err) {
      return { ok: false, saved: false, message: UNSAVED_MESSAGE };
    }
  }

  function fold(text) {
    return String(text == null ? "" : text).replace(/\s+/g, "");
  }

  function isVagueTask(text) {
    var raw = fold(text);
    if (!raw) return true;
    return VAGUE.some(function (phrase) { return raw.indexOf(fold(phrase)) !== -1; });
  }

  function hasProduct(text) {
    var raw = String(text || "");
    return PRODUCTS.some(function (word) { return raw.indexOf(word) !== -1; });
  }

  function stageOf(p02, p03) {
    var a = P02_STAGE[p02];
    var b = P03_STAGE[p03];
    if (!a || !b) return "";
    return "S" + Math.min(a, b);
  }

  function p05Triggered(src) {
    if (src.p01 === "P01-C" || src.p01 === "P01-D") return true;
    var p04 = src.p04 || [];
    if (p04.indexOf("P04-B") !== -1 || p04.indexOf("P04-C") !== -1) return true;
    if (CONTENT_ROUTES.indexOf(src.painRoute) !== -1) return true;
    return false;
  }

  function concreteP05(list) {
    return (list || []).filter(function (id) { return P05_ROUTE[id]; });
  }

  function evaluateM0(input) {
    var src = input || {};
    var errors = [];
    var p04 = src.p04 || [];
    var p05 = src.p05 || [];
    if (!src.disclaimerShown) errors.push("页面未展示学习推荐说明");
    if (!/^P01-[A-I]$/.test(src.p01 || "")) errors.push("P01 未提交");
    if (src.p01 === "P01-I") {
      var other = String(src.otherText || "").trim();
      if (!other) errors.push("选了其他，须填写不超过 20 字的类别词");
      else if ([].slice.call(other).length > 20) errors.push("其他行业类别词超过 20 字");
    }
    if (!P02_STAGE[src.p02]) errors.push("P02 未提交");
    if (!P03_STAGE[src.p03]) errors.push("P03 未提交");
    if (!p04.length) errors.push("P04 未提交");
    var unsure = p04.indexOf("P04-D") !== -1;
    var specific = p04.some(function (id) { return id !== "P04-D"; });
    if (unsure && specific) errors.push("P04「还不确定」与具体意向互斥");
    var triggered = p05Triggered(src);
    var chosen = concreteP05(p05);
    var p05Unsure = p05.indexOf("P05-D") !== -1;
    var p05Status = triggered ? "" : P05_NA;
    var mainPath = "";
    if (!triggered) {
      p05Status = P05_NA;
    } else if (!p05.length) {
      errors.push("P05 已触发，须作答并定本周主路");
    } else if (p05Unsure && chosen.length) {
      errors.push("P05「暂时不确定」与具体路径互斥");
    } else if (chosen.length > 1 && (!src.mainPath || chosen.map(function (id) { return P05_ROUTE[id]; }).indexOf(src.mainPath) === -1)) {
      errors.push("多选具体路径须先定一条本周主路");
    } else if (!chosen.length && p05Unsure && CONTENT_ROUTES.indexOf(src.mainPath) === -1) {
      errors.push("只选暂时不确定必须落地一条本周主路");
    } else if (chosen.length === 1) {
      mainPath = P05_ROUTE[chosen[0]];
      p05Status = mainPath;
    } else if (chosen.length > 1) {
      mainPath = src.mainPath;
      p05Status = mainPath;
    } else if (CONTENT_ROUTES.indexOf(src.mainPath) !== -1) {
      mainPath = src.mainPath;
      p05Status = mainPath;
    }
    if (src.painSource === "example") {
      if (!src.painText || ALL_ROUTES.indexOf(src.painRoute) === -1) errors.push("痛点示例须带目标路由");
    } else if (src.painSource === "rewrite") {
      if (!String(src.painText || "").trim()) errors.push("改写痛点不能为空");
      if (ALL_ROUTES.indexOf(src.painRoute) === -1) errors.push("改写短句须由学员显式点选路由");
    } else {
      errors.push("须点选或写出一条具体痛点");
    }
    var task = String(src.nextTask || "").trim();
    if (isVagueTask(task) || !hasProduct(task)) errors.push("空泛下周任务拒收");
    var earn = p04.indexOf("P04-C") !== -1;
    if (earn && CONTENT_ROUTES.indexOf(mainPath) === -1) errors.push("勾选赚钱后须下钻到一条内容路径");
    if (src.customAmount) errors.push("不设金额输入");
    var content = src.p01 === "P01-C" || src.p01 === "P01-D" || p04.indexOf("P04-B") !== -1 || chosen.length > 0 || CONTENT_ROUTES.indexOf(src.painRoute) !== -1;
    if (content && CONTENT_ROUTES.indexOf(mainPath) === -1 && triggered) errors.push("进入内容路径须选定本周主路径");
    var privacy = inspectText([src.otherText, src.painText, src.nextTask].join("\n"));
    if (!privacy.ok) errors.push("含有不能保存的个人信息");
    var stage = stageOf(src.p02, src.p03);
    var directions = [];
    if (!unsure || !specific) {
      if (!content && (p04.indexOf("P04-A") !== -1 || (unsure && !specific))) {
        directions.push(src.p01 === "P01-B" || src.p01 === "P01-H" ? "学习写作" : "办公");
      }
      if (src.painSource && !content && ALL_ROUTES.indexOf(src.painRoute) !== -1 && p04.indexOf("P04-A") === -1 && p04.indexOf("P04-B") === -1) {
        directions = [src.painRoute];
      }
      if (mainPath) directions = [mainPath];
    }
    if (!triggered) mainPath = directions[0] || "";
    return {
      passed: errors.length === 0,
      errors: errors,
      stage: stage,
      directions: errors.length ? [] : directions,
      mainPath: errors.length ? "" : (mainPath || directions[0] || ""),
      p05Status: p05Status,
      triggered: triggered,
      clearP05: !triggered,
      earn: earn && !errors.length
    };
  }

  function applyRetest(prev, nextResult, resetExercises) {
    var base = prev || {};
    var next = {
      recommendation: {
        stage: nextResult.stage,
        directions: nextResult.directions,
        mainPath: nextResult.mainPath,
        p05Status: nextResult.p05Status,
        earn: nextResult.earn
      },
      exercises: resetExercises ? {} : (base.exercises || {})
    };
    if (nextResult.clearP05) next.recommendation.p05 = [];
    return next;
  }

  function clearEarn(recommendation) {
    var copy = Object.assign({}, recommendation || {});
    copy.earn = false;
    copy.scale = "";
    return copy;
  }

  function redlinePasses(text) {
    var raw = String(text || "").replace(/\s+/g, "");
    if (!raw) return false;
    var names = /密钥|账号|帐号|账户|帐户|凭证|密码/.test(raw);
    if (!names || !/(?:不要|不得|不能|不可|不许|不准|严禁|禁止|绝不|决不|不)提交/.test(raw)) return false;
    var rest = raw.replace(/(?:不要|不得|不能|不可|不许|不准|严禁|禁止|绝不|决不|不)提交/g, "");
    if (/(?:必须|需要|应当|应该|一定要|请)提交/.test(rest)) return false;
    if (/提交(?:密钥|账号|帐号|账户|帐户|凭证|密码)/.test(rest)) return false;
    return true;
  }

  function redlineAsksFirst(card) {
    var src = card || {};
    return /追问|先问|问清楚|先向/.test([src.redline, src.material, src.goal, src.check].join(""));
  }

  function materialStatesGap(text) {
    return /还缺|缺少|缺了|未提供|没有提供|材料不足/.test(String(text || ""));
  }

  function migrateRedlineConfirm(card) {
    var src = card || {};
    if (src.redlineConfirm && typeof src.redlineConfirm === "object") return src;
    var proved = redlinePasses(src.redline) && redlineAsksFirst(src);
    src.redlineConfirm = proved ? { noSubmit: true, askFirst: true } : { noSubmit: false, askFirst: false };
    return src;
  }

  function taskCardPasses(card) {
    var src = card || {};
    var fields = [src.goal, src.material, src.format, src.check, src.redline];
    if (fields.some(function (item) { return !String(item || "").trim(); })) return false;
    if (fields.some(function (item) { return !inspectText(item).ok; })) return false;
    if (isVagueTask(src.goal) || !hasProduct(src.goal)) return false;
    if (fold(src.check).length < 8) return false;
    if (!redlinePasses(src.redline)) return false;
    if (src.redlineConfirm) {
      if (src.redlineConfirm.noSubmit !== true || src.redlineConfirm.askFirst !== true) return false;
    } else if (materialStatesGap(src.material) && !redlineAsksFirst(src)) return false;
    return true;
  }

  function contrastPasses(record) {
    var text = fold(record && record.note);
    if (!text || !inspectText(record.note).ok) return false;
    var pairs = [
      [/周三/, /周四/],
      [/二楼/, /三楼/],
      [/无需提前报名/, /登记|限20人|限 20 人/]
    ];
    var hit = pairs.some(function (pair) { return pair[0].test(record.note) && pair[1].test(record.note); });
    if (!hit) return false;
    if (/改准确一点|你写错了/.test(record.note) && !/原文/.test(record.note)) return false;
    return /原文/.test(record.note);
  }

  function sortPasses(record) {
    var src = record || {};
    var picks = src.picks || {};
    var notes = src.notes || {};
    var ids = Object.keys(M3_ANSWER);
    if (!ids.every(function (id) { return picks[id] === M3_ANSWER[id]; })) return false;
    if (!ids.every(function (id) { return String(notes[id] || "").trim() && inspectText(notes[id]).ok; })) return false;
    if (!/脱敏/.test(notes.list || "")) return false;
    if (!/不可/.test(notes.secret || "")) return false;
    if (!/停止|不执行|待分析|不外发/.test(notes.mail || "")) return false;
    if (!connectionJudgment(src.connected)) return false;
    if (typeof src.linkJudge === "string" && src.linkJudge !== "unequal") return false;
    if (typeof src.sendJudge === "string" && src.sendJudge !== "forbid") return false;
    return true;
  }

  function connectionJudgment(text) {
    var raw = String(text || "").replace(/\s+/g, "");
    if (!/已连接/.test(raw) || !inspectText(text).ok) return false;
    var denyRes = [
      /不(?:等于|代表).{0,8}(?:已经|已)?授权(?:外发)?/g,
      /(?:不能|不可以|不允许|不得).{0,4}(?:直接)?外发/g,
      /(?:尚未|还未|没有|并未)授权/g
    ];
    var affirmRe = /代表(?:已经|已)?授权|等于(?:已经|已)?授权|允许(?:直接)?外发|(?:就|即)?可以(?:直接)?外发|就能(?:直接)?外发|即可(?:直接)?外发/;
    var clauses = raw.split(/[，。；;！!？?]/).filter(Boolean);
    var denies = false;
    var affirms = false;
    clauses.forEach(function (clause) {
      var denied = denyRes.some(function (re) { re.lastIndex = 0; return re.test(clause); });
      if (denied) denies = true;
      var rest = clause;
      denyRes.forEach(function (re) { re.lastIndex = 0; rest = rest.replace(re, ""); });
      if (affirmRe.test(rest)) affirms = true;
    });
    return denies && !affirms;
  }

  function restatementPasses(record) {
    var src = record || {};
    var parts = [src.task, src.baseline, src.source, src.exit, src.action];
    if (parts.some(function (item) { return !String(item || "").trim() || !inspectText(item).ok; })) return false;
    if (isVagueTask(src.task) || !hasProduct(src.task)) return false;
    if (isVagueTask(src.action)) return false;
    if (src.sameAsFirst === true) return false;
    return true;
  }

  function confirmKey(note, expect) {
    var text = fold(note);
    if (!text || !inspectText(note).ok) return false;
    var quotes = [];
    var re = /「([^」]+)」/g;
    var found;
    while ((found = re.exec(String(expect || "")))) quotes.push(fold(found[1]));
    if (quotes.length) return quotes.every(function (quote) { return text.indexOf(quote) !== -1; });
    var flat = fold(expect).slice(0, 12);
    return flat.length >= 8 && text.indexOf(flat) !== -1;
  }

  function officialGates(candidateId) {
    var pass = candidateId === TRIAL_ID;
    return { g01: pass, g02: pass, g03: pass, g04: pass, g05: pass };
  }

  function sampleBNotePasses(text) {
    var raw = String(text || "");
    return /一楼公告栏/.test(raw) && /缺失|未输出|F04|报名截止/.test(raw) && inspectText(raw).ok;
  }

  function releaseScrubbedDecision(lab) {
    var src = lab || {};
    if (OBSERVE.indexOf(src.decision) === -1 || src.decisionLocked !== true) return false;
    if (String(src.path1Record || "").trim()) return false;
    src.decisionLocked = false;
    src.path1Locked = false;
    src.decision = "";
    return true;
  }

  function sampleBEvidenceOk(lab) {
    var src = lab || {};
    if (src.sampleBFound !== true) return false;
    if (src.sampleBNote == null) return true;
    return sampleBNotePasses(src.sampleBNote);
  }

  function explainPasses(text) {
    var raw = String(text || "");
    return raw.indexOf("不会自己发现新模型") !== -1 && raw.indexOf("后台") !== -1 && inspectText(raw).ok;
  }

  function evaluateM5(lab) {
    var src = lab || {};
    var gates = officialGates(src.candidate);
    var allGates = src.candidate === TRIAL_ID && gates.g01 && gates.g02 && gates.g03 && gates.g04 && gates.g05;
    var covered = src.coveredModel && src.coveredTool && src.coveredVersion;
    var feeBad = src.feeWrite === 0 || src.feeWrite === "0" || src.feeWrite === "0.0";
    var httpOk = src.httpRead === "请求成功";
    var s02ok = src.s02 === "安全停用";
    var observe = OBSERVE.indexOf(src.decision) !== -1 && src.decisionLocked === true;
    var limited = src.decision === "限域采用" && src.candidate === TRIAL_ID && allGates && src.humanConfirm === true && src.sampleBRevealed === true && sampleBEvidenceOk(src) && src.sampleAUnchanged === true && src.stopped === true && src.decisionLocked === true;
    var badAdopt = src.candidate === BAD_ID && (src.decision === "限域采用" || src.decision === "采用" || src.decision === "部分采用");
    var passed = covered && src.foundMissingF04 === true && httpOk && !feeBad && src.partialAccepted !== true && s02ok && explainPasses(src.explain) && !badAdopt && (observe || limited);
    if (src.s02 === "恢复旧版") passed = false;
    return {
      passed: passed,
      gates: gates,
      limited: limited,
      observe: observe,
      partialOffered: false
    };
  }

  function canMarkM5Unlocked(state) {
    return sortPasses(state && state.m3) && evaluateM5(state && state.m5).passed;
  }

  function keyMastery(latest) {
    var map = latest || {};
    var correct = KEY_IDS.filter(function (id) { return map[id] && map[id].correct === true; }).length;
    return { correct: correct, total: KEY_IDS.length, passed: correct === KEY_IDS.length };
  }

  function graduationItems(state) {
    var src = state || {};
    var keys = keyMastery(src.keyLatest);
    var items = {
      nextTask: evaluateM0(src.m0 || {}).passed,
      m1: taskCardPasses(src.m1),
      m2: contrastPasses(src.m2),
      m3: sortPasses(src.m3),
      m5: canMarkM5Unlocked(src),
      m7: restatementPasses(src.m7)
    };
    items.sixDone = items.nextTask && items.m1 && items.m2 && items.m3 && items.m5 && items.m7;
    items.keys = keys;
    items.graduated = items.sixDone && keys.passed;
    items.m4Required = false;
    items.m6Required = false;
    return items;
  }

  function publicQuestion(question) {
    return {
      id: question.id,
      stem: question.stem,
      options: (question.options || []).map(function (opt) {
        return { id: opt.id, letter: opt.letter, text: opt.text };
      })
    };
  }

  function explainQuestion(question) {
    var correctId = question.correctId;
    return (question.options || []).map(function (opt) {
      if (opt.id === correctId) {
        return {
          id: opt.id,
          letter: opt.letter,
          correct: true,
          principle: question.principle || "",
          correctExplain: question.correctExplain || "",
          boundId: correctId
        };
      }
      return {
        id: opt.id,
        letter: opt.letter,
        correct: false,
        explain: (question.wrong && question.wrong[opt.id]) || opt.explain || ""
      };
    });
  }

  function gradeAttempt(questions, answers) {
    var list = questions || [];
    var picked = answers || {};
    var rows = list.map(function (question) {
      return { id: question.id, picked: picked[question.id] || null, correct: picked[question.id] === question.correctId, key: question.key === true };
    });
    var keys = list.filter(function (question) { return question.key === true; });
    var keyCorrect = keys.filter(function (question) { return picked[question.id] === question.correctId; }).length;
    return {
      rows: rows,
      score: rows.filter(function (row) { return row.correct; }).length,
      total: rows.length,
      keyCorrect: keyCorrect,
      keyTotal: keys.length,
      mastery: false
    };
  }

  function recordAttempt(history, attempt) {
    var prev = history || {};
    return { first: prev.first || attempt, latest: attempt, rounds: (prev.rounds || 0) + 1 };
  }

  function searchIndex(index, questions, query) {
    var q = String(query || "").trim();
    var rows = (index || []).filter(function (item) {
      if (!q) return true;
      return [item.id, item.stem, item.module, item.status, item.note].join(" ").indexOf(q) !== -1;
    });
    return rows.map(function (item) {
      var linked = [];
      if (item.status === "已重写题干并写入题库") linked = [item.id];
      var cover = item.status.match(/主题已覆盖，对应测验\s*(.+)/);
      if (cover) {
        linked = cover[1].split("、").map(function (id) { return id.trim(); }).filter(Boolean);
      }
      var written = (questions || []).filter(function (question) { return linked.indexOf(question.id) !== -1; }).map(function (question) { return question.id; });
      return {
        id: item.id,
        module: item.module,
        stem: item.stem,
        status: item.status,
        note: item.note,
        linkedIds: linked,
        writtenIds: written,
        sameNumberExists: item.status === "已重写题干并写入题库"
      };
    });
  }

  return {
    SAVE_LABEL: SAVE_LABEL,
    FORBIDDEN_SAVE_LABEL: FORBIDDEN_SAVE_LABEL,
    UNSAVED_MESSAGE: UNSAVED_MESSAGE,
    DRILL_BADGE: DRILL_BADGE,
    M0_DISCLAIMER: M0_DISCLAIMER,
    P05_NA: P05_NA,
    BAD_ID: BAD_ID,
    TRIAL_ID: TRIAL_ID,
    FALLBACK_ID: FALLBACK_ID,
    DEVICE_NAME: DEVICE_NAME,
    KEY_IDS: KEY_IDS,
    TEMPLATES: TEMPLATES,
    P05_ROUTE: P05_ROUTE,
    M3_ANSWER: M3_ANSWER,
    CONTENT_ROUTES: CONTENT_ROUTES,
    ALL_ROUTES: ALL_ROUTES,
    OBSERVE: OBSERVE,
    inspectText: inspectText,
    acceptField: acceptField,
    saveState: saveState,
    isVagueTask: isVagueTask,
    hasProduct: hasProduct,
    stageOf: stageOf,
    p05Triggered: p05Triggered,
    evaluateM0: evaluateM0,
    applyRetest: applyRetest,
    clearEarn: clearEarn,
    taskCardPasses: taskCardPasses,
    contrastPasses: contrastPasses,
    sortPasses: sortPasses,
    restatementPasses: restatementPasses,
    confirmKey: confirmKey,
    sampleBNotePasses: sampleBNotePasses,
    sampleBEvidenceOk: sampleBEvidenceOk,
    connectionJudgment: connectionJudgment,
    redlinePasses: redlinePasses,
    redlineAsksFirst: redlineAsksFirst,
    migrateRedlineConfirm: migrateRedlineConfirm,
    releaseScrubbedDecision: releaseScrubbedDecision,
    officialGates: officialGates,
    evaluateM5: evaluateM5,
    canMarkM5Unlocked: canMarkM5Unlocked,
    keyMastery: keyMastery,
    graduationItems: graduationItems,
    publicQuestion: publicQuestion,
    explainQuestion: explainQuestion,
    gradeAttempt: gradeAttempt,
    recordAttempt: recordAttempt,
    searchIndex: searchIndex
  };
});
