const BAR_MIN = 0;
const BAR_MAX = 150;

const MOVES = [
  { id: "light_hit", label: "軽く叩く", type: "hit", delta: -3 },
  { id: "medium_hit", label: "普通に叩く", type: "hit", delta: -6 },
  { id: "heavy_hit", label: "強く叩く", type: "hit", delta: -9 },
  { id: "draw", label: "引き延ばす", type: "draw", delta: -15 },
  { id: "punch", label: "打ち抜く", type: "punch", delta: 2 },
  { id: "bend", label: "曲げる", type: "bend", delta: 7 },
  { id: "upset", label: "据え込む", type: "upset", delta: 13 },
  { id: "shrink", label: "縮める", type: "shrink", delta: 16 }
];

const TYPES = [
  ["", "指定なし"],
  ["hit", "叩く"],
  ["draw", "引き延ばす"],
  ["punch", "打ち抜く"],
  ["bend", "曲げる"],
  ["upset", "据え込む"],
  ["shrink", "縮める"]
];

const ORDERS = [
  ["any", "どこか"],
  ["last", "最後"],
  ["not_last", "最後以外"],
  ["second_last", "最後から2番目"],
  ["third_last", "最後から3番目"]
];

const form = document.querySelector("#calculator");
const currentInput = document.querySelector("#current");
const targetInput = document.querySelector("#target");
const rulesEl = document.querySelector("#rules");
const sequenceEl = document.querySelector("#sequence");
const messageEl = document.querySelector("#message");
const resultTitleEl = document.querySelector("#result-title");
const stepCountEl = document.querySelector("#step-count");
const currentMarker = document.querySelector("#current-marker");
const targetMarker = document.querySelector("#target-marker");
const movesEl = document.querySelector("#moves");

function makeOption([value, label]) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  return option;
}

function initRules() {
  for (let i = 0; i < 3; i += 1) {
    const row = document.createElement("div");
    row.className = "rule-row";

    const type = document.createElement("select");
    type.className = "rule-type";
    type.setAttribute("aria-label", `ルール${i + 1}の操作`);
    TYPES.forEach((item) => type.append(makeOption(item)));

    const order = document.createElement("select");
    order.className = "rule-order";
    order.setAttribute("aria-label", `ルール${i + 1}の位置`);
    ORDERS.forEach((item) => order.append(makeOption(item)));

    row.append(type, order);
    rulesEl.append(row);
  }
}

function initMoves() {
  MOVES.forEach((move) => {
    const card = document.createElement("div");
    card.className = "move-card";
    card.innerHTML = `<strong>${move.label}</strong><span>${move.delta > 0 ? "+" : ""}${move.delta}</span>`;
    movesEl.append(card);
  });
}

function clampBarValue(value) {
  const number = Number.parseInt(value, 10);
  if (Number.isNaN(number)) return 0;
  return Math.min(BAR_MAX, Math.max(BAR_MIN, number));
}

function updateMarkers() {
  const current = clampBarValue(currentInput.value);
  const target = clampBarValue(targetInput.value);
  currentMarker.style.left = `${(current / BAR_MAX) * 100}%`;
  targetMarker.style.left = `${(target / BAR_MAX) * 100}%`;
}

function readRules() {
  return [...rulesEl.querySelectorAll(".rule-row")]
    .map((row) => ({
      type: row.querySelector(".rule-type").value,
      order: row.querySelector(".rule-order").value
    }))
    .filter((rule) => rule.type);
}

function actionMatches(action, type) {
  return action && action.type === type;
}

function ruleSatisfied(rule, recent) {
  const last = recent[recent.length - 1];
  const second = recent[recent.length - 2];
  const third = recent[recent.length - 3];

  if (rule.order === "last") return actionMatches(last, rule.type);
  if (rule.order === "second_last") return actionMatches(second, rule.type);
  if (rule.order === "third_last") return actionMatches(third, rule.type);
  if (rule.order === "not_last") {
    return actionMatches(second, rule.type) || actionMatches(third, rule.type);
  }
  return [last, second, third].some((action) => actionMatches(action, rule.type));
}

function allRulesSatisfied(rules, recent) {
  return rules.every((rule) => ruleSatisfied(rule, recent));
}

function stateKey(position, recent) {
  return `${position}|${recent.map((move) => move.id).join(",")}`;
}

function findShortestPath(current, target, rules) {
  const start = { position: current, recent: [], path: [] };
  const queue = [start];
  const visited = new Set([stateKey(start.position, start.recent)]);

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const state = queue[cursor];

    if (state.position === target && allRulesSatisfied(rules, state.recent)) {
      return state.path;
    }

    for (const move of MOVES) {
      const nextPosition = state.position + move.delta;
      if (nextPosition < BAR_MIN || nextPosition > BAR_MAX) continue;

      const nextRecent = [...state.recent, move].slice(-3);
      const key = stateKey(nextPosition, nextRecent);
      if (visited.has(key)) continue;

      visited.add(key);
      queue.push({
        position: nextPosition,
        recent: nextRecent,
        path: [...state.path, move]
      });
    }
  }

  return null;
}

function renderResult(path, current, target, rules) {
  sequenceEl.replaceChildren();
  updateMarkers();

  if (!path) {
    resultTitleEl.textContent = "手順なし";
    stepCountEl.textContent = "0 手";
    messageEl.textContent = "0..150 の範囲を外れずに到達できる手順が見つかりませんでした。現在値、目標値、ルールを確認してください。";
    return;
  }

  let position = current;
  path.forEach((move, index) => {
    position += move.delta;
    const item = document.createElement("li");
    item.className = move.delta > 0 ? "positive" : "negative";
    item.innerHTML = `<span>${index + 1}. ${move.label}</span><span class="delta">${move.delta > 0 ? "+" : ""}${move.delta} / ${position}</span>`;
    sequenceEl.append(item);
  });

  resultTitleEl.textContent = `${current} から ${target} へ`;
  stepCountEl.textContent = `${path.length} 手`;
  messageEl.textContent = rules.length
    ? "表示された順に操作すると、最後の3手が指定ルールを満たします。"
    : "ルール指定なしの最短手順です。";
}

function calculate() {
  const current = clampBarValue(currentInput.value);
  const target = clampBarValue(targetInput.value);
  currentInput.value = current;
  targetInput.value = target;

  const rules = readRules();
  const path = findShortestPath(current, target, rules);
  renderResult(path, current, target, rules);
}

document.querySelector("#clear-rules").addEventListener("click", () => {
  rulesEl.querySelectorAll(".rule-type").forEach((select) => {
    select.value = "";
  });
  calculate();
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  calculate();
});

[currentInput, targetInput].forEach((input) => {
  input.addEventListener("input", updateMarkers);
});

rulesEl.addEventListener("change", calculate);

initRules();
initMoves();
calculate();
