const BAR_MIN = 0;
const BAR_MAX = 150;
const CALC_MAX = 200;

const MOVES = [
  { id: "light_hit", label: "軽く叩く", short: "叩", type: "hit", delta: -3, color: "cyan" },
  { id: "medium_hit", label: "普通に叩く", short: "叩", type: "hit", delta: -6, color: "blue" },
  { id: "heavy_hit", label: "強く叩く", short: "叩", type: "hit", delta: -9, color: "navy" },
  { id: "draw", label: "引き延ばす", short: "延", type: "draw", delta: -15, color: "green" },
  { id: "punch", label: "打ち抜く", short: "打", type: "punch", delta: 2, color: "yellow" },
  { id: "bend", label: "曲げる", short: "曲", type: "bend", delta: 7, color: "violet" },
  { id: "upset", label: "据え込む", short: "据", type: "upset", delta: 13, color: "tan" },
  { id: "shrink", label: "縮める", short: "縮", type: "shrink", delta: 16, color: "red" }
];

const RULE_ORDERS = ["last", "second_last", "third_last"];
const RULE_LABELS = ["最後", "最後から2番目", "最後から3番目"];
const PALETTE_MOVE_IDS = ["light_hit", "medium_hit", "punch", "bend", "heavy_hit", "draw", "upset", "shrink"];

const form = document.querySelector("#calculator");
const currentInput = document.querySelector("#current");
const targetInput = document.querySelector("#target");
const rulesEl = document.querySelector("#rules");
const sequenceEl = document.querySelector("#sequence");
const resultTitleEl = document.querySelector("#result-title");
const stepCountEl = document.querySelector("#step-count");
const currentMarker = document.querySelector("#current-marker");
const targetMarker = document.querySelector("#target-marker");
const rangeTrack = document.querySelector(".range-track");
const rangeWrap = document.querySelector(".range-wrap");
let activeRangeInput = null;
let activeRuleRow = null;
let barPixelStep = 3;

function initRangeTrack() {
  const stops = [];
  const majorTicks = [];

  for (let value = BAR_MIN; value < BAR_MAX; value += 1) {
    const start = value * barPixelStep;
    const end = (value + 1) * barPixelStep;
    const color = value % 10 === 0 ? "#2f2f2f" : value % 2 === 0 ? "#858585" : "#a9a9a9";
    stops.push(`${color} ${start}px ${end}px`);
  }

  for (let value = 20; value < BAR_MAX; value += 20) {
    const start = value * barPixelStep;
    const end = (value + 1) * barPixelStep;
    majorTicks.push(`linear-gradient(90deg, transparent ${start}px, #2f2f2f ${start}px ${end}px, transparent ${end}px)`);
  }

  rangeTrack.style.setProperty("--bar-stripes", `linear-gradient(90deg, ${stops.join(", ")})`);
  rangeTrack.style.setProperty("--major-ticks", majorTicks.join(", "));
}

function updateGaugeMetrics() {
  const availableWidth = rangeWrap.parentElement.clientWidth;
  const nextStep = Math.min(4, Math.max(1, Math.floor(availableWidth / BAR_MAX)));
  barPixelStep = nextStep;
  rangeWrap.style.setProperty("--bar-step", `${barPixelStep}px`);
  rangeWrap.style.setProperty("--bar-width", `${BAR_MAX * barPixelStep}px`);
  initRangeTrack();
  updateMarkers();
}

function initRules() {
  for (let i = 0; i < 3; i += 1) {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "rule-row";
    row.dataset.order = RULE_ORDERS[i];
    row.dataset.moveId = "";
    row.setAttribute("aria-label", `${RULE_LABELS[i]}の操作を選択`);

    const label = document.createElement("div");
    label.className = "rule-slot-label";
    label.textContent = RULE_LABELS[i];

    const icon = document.createElement("div");
    icon.className = "rule-slot-icon";
    icon.textContent = "未";

    row.append(label, icon);
    rulesEl.append(row);
  }

  setActiveRuleRow(rulesEl.querySelector(".rule-row"));
  rulesEl.after(createRulePalette());
}

function createRulePalette() {
  const palette = document.createElement("div");
  palette.className = "rule-palette";
  palette.setAttribute("aria-label", "操作アイコン");

  PALETTE_MOVE_IDS.map((moveId) => MOVES.find((move) => move.id === moveId)).forEach((move) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "rule-palette-button";
    button.dataset.moveId = move.id;
    button.title = `${move.label} (${formatDelta(move.delta)})`;
    button.setAttribute("aria-label", `${move.label} ${formatDelta(move.delta)} を設定`);

    const image = document.createElement("img");
    image.src = imageSrcForMove(move);
    image.alt = "";
    image.draggable = false;

    const value = document.createElement("span");
    value.textContent = formatDelta(move.delta);

    button.append(image, value);
    palette.append(button);
  });

  return palette;
}

function imageSrcForMove(move) {
  return `images/${formatDelta(move.delta)}.png`;
}

function setActiveRuleRow(row) {
  if (!row) return;
  rulesEl.querySelectorAll(".rule-row").forEach((item) => item.classList.remove("active"));
  activeRuleRow = row;
  row.classList.add("active");
}

function setRuleMove(row, moveId) {
  const move = MOVES.find((item) => item.id === moveId);
  if (!move) return;

  row.dataset.moveId = move.id;
  row.setAttribute("aria-label", `${row.querySelector(".rule-slot-label").textContent}: ${move.label} ${formatDelta(move.delta)}`);

  const icon = row.querySelector(".rule-slot-icon");
  icon.replaceChildren();

  const image = document.createElement("img");
  image.src = imageSrcForMove(move);
  image.alt = move.label;
  image.draggable = false;

  const value = document.createElement("span");
  value.textContent = formatDelta(move.delta);

  icon.append(image, value);
  setActiveRuleRow(row.nextElementSibling || rulesEl.querySelector(".rule-row"));
  calculate();
}

function clearRuleMove(row) {
  row.dataset.moveId = "";
  row.setAttribute("aria-label", `${row.querySelector(".rule-slot-label").textContent}の操作を選択`);
  row.querySelector(".rule-slot-icon").textContent = "未";
}

function formatDelta(delta) {
  return `${delta > 0 ? "+" : ""}${delta}`;
}

function clampBarValue(value) {
  const number = Number.parseInt(value, 10);
  if (Number.isNaN(number)) return 0;
  return Math.min(BAR_MAX, Math.max(BAR_MIN, number));
}

function updateMarkers() {
  const current = clampBarValue(currentInput.value);
  const target = clampBarValue(targetInput.value);
  currentMarker.style.left = `${Math.min(current, BAR_MAX - 1) * barPixelStep}px`;
  targetMarker.style.left = `${Math.min(target, BAR_MAX - 1) * barPixelStep}px`;
  currentMarker.setAttribute("aria-valuenow", current);
  targetMarker.setAttribute("aria-valuenow", target);
}

function valueFromPointer(event) {
  const rect = rangeTrack.getBoundingClientRect();
  const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
  return Math.round(BAR_MIN + ratio * (BAR_MAX - BAR_MIN));
}

function nearestRangeInput(value) {
  const current = clampBarValue(currentInput.value);
  const target = clampBarValue(targetInput.value);
  return Math.abs(value - current) <= Math.abs(value - target) ? currentInput : targetInput;
}

function markerForInput(input) {
  return input === currentInput ? currentMarker : targetMarker;
}

function setActiveRangeInput(input) {
  [currentMarker, targetMarker].forEach((marker) => marker.classList.remove("active"));
  activeRangeInput = input;
  markerForInput(input).classList.add("active");
}

function updateActiveRangeValue(value) {
  if (!activeRangeInput) return;
  activeRangeInput.value = clampBarValue(value);
  calculate();
}

function beginRangeDrag(event, input) {
  event.preventDefault();
  setActiveRangeInput(input);
  rangeTrack.setPointerCapture(event.pointerId);
  updateActiveRangeValue(valueFromPointer(event));
}

function readRules() {
  return [...rulesEl.querySelectorAll(".rule-row")]
    .map((row) => ({
      moveId: row.dataset.moveId,
      order: row.dataset.order
    }))
    .filter((rule) => rule.moveId);
}

function actionMatches(action, moveId) {
  return action && action.id === moveId;
}

function ruleSatisfied(rule, recent) {
  const last = recent[recent.length - 1];
  const second = recent[recent.length - 2];
  const third = recent[recent.length - 3];

  if (rule.order === "last") return actionMatches(last, rule.moveId);
  if (rule.order === "second_last") return actionMatches(second, rule.moveId);
  if (rule.order === "third_last") return actionMatches(third, rule.moveId);
  return false;
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
      if (nextPosition < BAR_MIN || nextPosition > CALC_MAX) continue;

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

function renderResult(path, current, target) {
  sequenceEl.replaceChildren();
  updateMarkers();

  if (!path) {
    resultTitleEl.textContent = "手順なし";
    stepCountEl.textContent = "0 手";
    return;
  }

  path.forEach((move, index) => {
    const item = document.createElement("li");
    item.className = move.delta > 0 ? "positive" : "negative";
    item.title = `${index + 1}. ${move.label} (${formatDelta(move.delta)})`;
    item.setAttribute("aria-label", `${index + 1}. ${move.label} ${formatDelta(move.delta)}`);

    const image = document.createElement("img");
    image.src = imageSrcForMove(move);
    image.alt = "";
    image.className = "step-image";
    image.draggable = false;

    const delta = document.createElement("span");
    delta.className = "step-delta";
    delta.textContent = formatDelta(move.delta);

    item.append(image, delta);
    sequenceEl.append(item);
  });

  resultTitleEl.textContent = `${current} から ${target} へ`;
  stepCountEl.textContent = `${path.length} 手`;
}

function calculate() {
  const current = clampBarValue(currentInput.value);
  const target = clampBarValue(targetInput.value);
  currentInput.value = current;
  targetInput.value = target;

  const rules = readRules();
  const path = findShortestPath(current, target, rules);
  renderResult(path, current, target);
}

document.querySelector("#clear-rules").addEventListener("click", () => {
  rulesEl.querySelectorAll(".rule-row").forEach(clearRuleMove);
  calculate();
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  calculate();
});

[currentInput, targetInput].forEach((input) => {
  input.addEventListener("input", calculate);
});

rulesEl.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) return;
  const row = event.target.closest(".rule-row");
  if (!row) return;
  setActiveRuleRow(row);
});

rulesEl.addEventListener("dblclick", (event) => {
  if (!(event.target instanceof Element)) return;
  const row = event.target.closest(".rule-row");
  if (!row) return;
  clearRuleMove(row);
  calculate();
});

document.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) return;
  const button = event.target.closest(".rule-palette-button");
  if (!button) return;
  setRuleMove(activeRuleRow || rulesEl.querySelector(".rule-row"), button.dataset.moveId);
});

currentMarker.addEventListener("pointerdown", (event) => {
  event.stopPropagation();
  beginRangeDrag(event, currentInput);
});

targetMarker.addEventListener("pointerdown", (event) => {
  event.stopPropagation();
  beginRangeDrag(event, targetInput);
});

rangeTrack.addEventListener("pointerdown", (event) => {
  const value = valueFromPointer(event);
  beginRangeDrag(event, nearestRangeInput(value));
});

rangeTrack.addEventListener("pointermove", (event) => {
  if (!activeRangeInput || !rangeTrack.hasPointerCapture(event.pointerId)) return;
  updateActiveRangeValue(valueFromPointer(event));
});

rangeTrack.addEventListener("pointerup", (event) => {
  if (rangeTrack.hasPointerCapture(event.pointerId)) {
    rangeTrack.releasePointerCapture(event.pointerId);
  }
  [currentMarker, targetMarker].forEach((marker) => marker.classList.remove("active"));
  activeRangeInput = null;
});

rangeTrack.addEventListener("pointercancel", () => {
  [currentMarker, targetMarker].forEach((marker) => marker.classList.remove("active"));
  activeRangeInput = null;
});

[currentMarker, targetMarker].forEach((marker) => {
  marker.addEventListener("keydown", (event) => {
    const input = marker === currentMarker ? currentInput : targetInput;
    const currentValue = clampBarValue(input.value);
    const step = event.shiftKey ? 10 : 1;
    let nextValue = currentValue;

    if (event.key === "ArrowLeft" || event.key === "ArrowDown") nextValue -= step;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") nextValue += step;
    if (event.key === "Home") nextValue = BAR_MIN;
    if (event.key === "End") nextValue = BAR_MAX;
    if (nextValue === currentValue) return;

    event.preventDefault();
    input.value = clampBarValue(nextValue);
    calculate();
  });
});

if ("ResizeObserver" in window) {
  new ResizeObserver(updateGaugeMetrics).observe(rangeWrap.parentElement);
} else {
  window.addEventListener("resize", updateGaugeMetrics);
}
initRules();
updateGaugeMetrics();
calculate();
