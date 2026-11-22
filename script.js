"use strict";

const WORD_BANK = [
  { answer: "CPU", clue: "Executa instruções e coordena operações fundamentais do computador." },
  { answer: "ULA", clue: "Realiza cálculos aritméticos e operações lógicas dentro do processador." },
  { answer: "UC", clue: "Orienta a ordem das etapas para que cada comando seja realizado corretamente." },
  { answer: "REGISTRADORES", clue: "Pequenas áreas internas que guardam temporariamente valores usados pelo processador." },
  { answer: "RAM", clue: "Armazenamento temporário utilizado por aplicativos enquanto estão em execução." },
  { answer: "ROM", clue: "Guarda instruções permanentes, preservadas mesmo quando falta energia." },
  { answer: "EEPROM", clue: "Componente não volátil cujos conteúdos podem ser apagados e regravados eletricamente." },
  { answer: "FLASH", clue: "Tecnologia não volátil que permite apagar e gravar informações em blocos." },
  { answer: "CACHE", clue: "Mantém cópias de informações frequentes para reduzir o tempo de acesso." },
  { answer: "MEMORIADEMASSA", clue: "Guarda arquivos por longos períodos, mesmo após o desligamento do equipamento." },
  { answer: "DMA", clue: "Permite que periféricos transfiram informações sem depender continuamente do processador." },
  { answer: "ADDRESSBUS", clue: "Conjunto de linhas que indica a localização usada numa operação." },
  { answer: "DATABUS", clue: "Canal que transporta valores entre componentes durante o funcionamento do sistema." },
  { answer: "MICROCONTROLADOR", clue: "Circuito integrado que reúne processamento, armazenamento e interfaces para tarefas específicas." },
  { answer: "DUALCORE", clue: "Arquitetura de processador que possui duas unidades de execução." },
  { answer: "QUADCORE", clue: "Arquitetura de processador que possui quatro unidades de execução." }
];

// Ordem de montagem: a N-ésima palavra certa instala a N-ésima peça.
const CAR_PARTS = [
  { id: "chassi", name: "Chassi" },
  { id: "motor", name: "Motor" },
  { id: "escapamento", name: "Escapamento" },
  { id: "roda-traseira", name: "Roda traseira" },
  { id: "roda-dianteira", name: "Roda dianteira" },
  { id: "carroceria", name: "Carroceria" },
  { id: "cabine", name: "Cabine" },
  { id: "vidros", name: "Vidros" },
  { id: "farois", name: "Faróis" },
  { id: "lanternas", name: "Lanternas" },
  { id: "aerofolio", name: "Aerofólio" },
  { id: "pintura", name: "Pintura" }
];

const WORDS_PER_GAME = CAR_PARTS.length;
const MAX_GENERATION_ATTEMPTS = 160;
const elements = {
  board: document.querySelector("#crossword"),
  across: document.querySelector("#across-clues"),
  down: document.querySelector("#down-clues"),
  nickname: document.querySelector("#nickname"),
  player: document.querySelector("#player-display"),
  total: document.querySelector("#word-total"),
  score: document.querySelector("#score"),
  status: document.querySelector("#game-status"),
  feedback: document.querySelector("#feedback"),
  clueCount: document.querySelector("#clue-count"),
  check: document.querySelector("#check-button"),
  reset: document.querySelector("#reset-button"),
  newGame: document.querySelector("#new-button"),
  car: document.querySelector("#car-svg"),
  partsList: document.querySelector("#parts-list"),
  partsCount: document.querySelector("#parts-count"),
  buildFill: document.querySelector("#build-fill"),
  buildProgress: document.querySelector("#build-progress"),
  buildBadge: document.querySelector("#build-badge"),
  toast: document.querySelector("#part-toast")
};

let currentWords = [];
let gridData = new Map();
let activeWordId = null;
let wordStates = new Map();
let cellInputs = new Map();
let gridBounds = { minRow: 0, minCol: 0, rows: 0, cols: 0 };
let installedParts = 0;
let toastTimer = null;

function shuffle(items) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }
  return shuffled;
}

function cellKey(row, col) {
  return `${row},${col}`;
}

function getWordCells(word) {
  return Array.from(word.answer, (letter, index) => ({
    row: word.row + (word.direction === "down" ? index : 0),
    col: word.col + (word.direction === "across" ? index : 0),
    letter
  }));
}

function getCandidatePlacements(grid, placedWords, answer) {
  const candidates = new Map();

  for (const placedWord of placedWords) {
    const perpendicularDirection = placedWord.direction === "across" ? "down" : "across";
    for (let newIndex = 0; newIndex < answer.length; newIndex += 1) {
      for (let oldIndex = 0; oldIndex < placedWord.answer.length; oldIndex += 1) {
        if (answer[newIndex] !== placedWord.answer[oldIndex]) continue;

        const row = placedWord.row + (placedWord.direction === "down" ? oldIndex : 0) - (perpendicularDirection === "down" ? newIndex : 0);
        const col = placedWord.col + (placedWord.direction === "across" ? oldIndex : 0) - (perpendicularDirection === "across" ? newIndex : 0);
        const candidate = { row, col, direction: perpendicularDirection, crossings: 0 };
        let valid = true;

        for (let index = 0; index < answer.length; index += 1) {
          const cellRow = row + (perpendicularDirection === "down" ? index : 0);
          const cellCol = col + (perpendicularDirection === "across" ? index : 0);
          const key = cellKey(cellRow, cellCol);
          const existingLetter = grid.get(key);
          if (existingLetter && existingLetter !== answer[index]) {
            valid = false;
            break;
          }
          if (existingLetter === answer[index]) {
            candidate.crossings += 1;
          } else if (perpendicularDirection === "down") {
            if (grid.has(cellKey(cellRow, cellCol - 1)) || grid.has(cellKey(cellRow, cellCol + 1))) valid = false;
          } else if (grid.has(cellKey(cellRow - 1, cellCol)) || grid.has(cellKey(cellRow + 1, cellCol))) {
            valid = false;
          }
          if (!valid) break;
        }

        const beforeRow = row - (perpendicularDirection === "down" ? 1 : 0);
        const beforeCol = col - (perpendicularDirection === "across" ? 1 : 0);
        const afterRow = row + (perpendicularDirection === "down" ? answer.length : 0);
        const afterCol = col + (perpendicularDirection === "across" ? answer.length : 0);
        if (grid.has(cellKey(beforeRow, beforeCol)) || grid.has(cellKey(afterRow, afterCol))) valid = false;
        if (!valid || candidate.crossings === 0) continue;

        const key = `${row},${col},${perpendicularDirection}`;
        const previous = candidates.get(key);
        if (!previous || candidate.crossings > previous.crossings) candidates.set(key, candidate);
      }
    }
  }
  return [...candidates.values()];
}

function placeWord(grid, word) {
  for (const cell of getWordCells(word)) grid.set(cellKey(cell.row, cell.col), cell.letter);
}

function buildRandomPuzzle() {
  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const selectedWords = shuffle(WORD_BANK).slice(0, WORDS_PER_GAME);
    selectedWords.sort((first, second) => second.answer.length - first.answer.length);

    const firstWord = {
      ...selectedWords[0],
      row: 0,
      col: 0,
      direction: "across"
    };
    const placedWords = [firstWord];
    const grid = new Map();
    placeWord(grid, firstWord);
    const remainingWords = selectedWords.slice(1);
    let failed = false;

    while (remainingWords.length > 0) {
      const options = [];
      remainingWords.forEach((word, wordIndex) => {
        getCandidatePlacements(grid, placedWords, word.answer).forEach((placement) => {
          options.push({ ...placement, wordIndex, word });
        });
      });

      if (options.length === 0) {
        failed = true;
        break;
      }

      options.sort((first, second) => second.crossings - first.crossings);
      const topOptions = options.slice(0, Math.min(10, options.length));
      const selected = topOptions[Math.floor(Math.random() * topOptions.length)];
      const placedWord = {
        ...selected.word,
        row: selected.row,
        col: selected.col,
        direction: selected.direction
      };
      placeWord(grid, placedWord);
      placedWords.push(placedWord);
      remainingWords.splice(selected.wordIndex, 1);
    }

    if (!failed && placedWords.length === WORDS_PER_GAME) {
      return { words: assignClueNumbers(placedWords), grid };
    }
  }

  throw new Error("Não foi possível montar a grade. Tente iniciar uma nova partida.");
}

function assignClueNumbers(words) {
  const starts = new Map();
  for (const word of words) {
    const key = cellKey(word.row, word.col);
    if (!starts.has(key)) starts.set(key, {});
    starts.get(key)[word.direction] = true;
  }
  const orderedStarts = [...starts.keys()].map((key) => {
    const [row, col] = key.split(",").map(Number);
    return { key, row, col };
  }).sort((first, second) => first.row - second.row || first.col - second.col);

  const numbers = new Map();
  orderedStarts.forEach((start, index) => numbers.set(start.key, index + 1));
  return words.map((word, index) => ({
    ...word,
    id: `${word.direction}-${index}`,
    number: numbers.get(cellKey(word.row, word.col))
  })).sort((first, second) => first.number - second.number || first.direction.localeCompare(second.direction));
}

function calculateBounds(grid) {
  const coordinates = [...grid.keys()].map((key) => key.split(",").map(Number));
  const rows = coordinates.map(([row]) => row);
  const cols = coordinates.map(([, col]) => col);
  const minRow = Math.min(...rows);
  const maxRow = Math.max(...rows);
  const minCol = Math.min(...cols);
  const maxCol = Math.max(...cols);
  return { minRow, minCol, rows: maxRow - minRow + 1, cols: maxCol - minCol + 1 };
}

function createBoard() {
  elements.board.replaceChildren();
  cellInputs = new Map();
  gridBounds = calculateBounds(gridData);
  elements.board.style.gridTemplateColumns = `repeat(${gridBounds.cols}, var(--cell))`;
  elements.board.style.gridTemplateRows = `repeat(${gridBounds.rows}, var(--cell))`;

  for (let row = 0; row < gridBounds.rows; row += 1) {
    for (let col = 0; col < gridBounds.cols; col += 1) {
      const absoluteRow = row + gridBounds.minRow;
      const absoluteCol = col + gridBounds.minCol;
      const key = cellKey(absoluteRow, absoluteCol);
      const cell = document.createElement("input");
      cell.className = "cell";
      cell.type = "text";
      cell.maxLength = 1;
      cell.autocomplete = "off";
      cell.spellcheck = false;
      cell.dataset.row = absoluteRow;
      cell.dataset.col = absoluteCol;
      cell.setAttribute("aria-label", `Linha ${row + 1}, coluna ${col + 1}`);

      const wrapper = document.createElement("div");
      wrapper.className = "cell-wrap";
      if (gridData.has(key)) {
        cell.setAttribute("aria-label", `Casa editável, linha ${row + 1}, coluna ${col + 1}`);
        cellInputs.set(key, cell);
        cell.addEventListener("input", handleCellInput);
        cell.addEventListener("keydown", handleCellKeydown);
        cell.addEventListener("focus", () => updateActiveWordFromCell(absoluteRow, absoluteCol));
      } else {
        cell.classList.add("blocked");
        cell.tabIndex = -1;
        cell.disabled = true;
        cell.setAttribute("aria-hidden", "true");
      }
      wrapper.append(cell);
      elements.board.append(wrapper);
    }
  }
  markNumberedCells();
}

function markNumberedCells() {
  for (const word of currentWords) {
    const startInput = cellInputs.get(cellKey(word.row, word.col));
    if (startInput) {
      startInput.dataset.number = word.number;
      startInput.title = `Pista ${word.number}`;
      const numberLabel = document.createElement("span");
      numberLabel.className = "cell-number";
      numberLabel.textContent = word.number;
      startInput.parentElement.append(numberLabel);
    }
  }
}

function renderClues() {
  elements.across.replaceChildren();
  elements.down.replaceChildren();
  const acrossWords = currentWords.filter((word) => word.direction === "across");
  const downWords = currentWords.filter((word) => word.direction === "down");

  for (const word of acrossWords) elements.across.append(createClueItem(word));
  for (const word of downWords) elements.down.append(createClueItem(word));
  elements.clueCount.textContent = String(currentWords.length).padStart(2, "0");
}

function createClueItem(word) {
  const item = document.createElement("li");
  const button = document.createElement("button");
  button.type = "button";
  button.className = "clue-button";
  button.dataset.wordId = word.id;
  const number = document.createElement("span");
  number.className = "clue-number";
  number.textContent = `${word.number}.`;
  const clue = document.createElement("span");
  clue.className = "clue-text";
  clue.textContent = word.clue;
  button.append(number, clue);
  button.addEventListener("click", () => selectWord(word.id, true));
  item.append(button);
  return item;
}

function selectWord(wordId, focusStart = false) {
  const word = currentWords.find((item) => item.id === wordId);
  if (!word) return;
  activeWordId = wordId;
  document.querySelectorAll(".clue-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.wordId === wordId);
  });
  document.querySelectorAll(".cell").forEach((cell) => {
    cell.classList.remove("active-word", "active-start");
  });
  const cells = getWordCells(word);
  cells.forEach((cell, index) => {
    const input = cellInputs.get(cellKey(cell.row, cell.col));
    if (input) {
      input.classList.add("active-word");
      if (index === 0) input.classList.add("active-start");
    }
  });
  if (focusStart) {
    const firstEmpty = cells.find((cell) => !cellInputs.get(cellKey(cell.row, cell.col)).value);
    const target = firstEmpty || cells[0];
    cellInputs.get(cellKey(target.row, target.col))?.focus();
  }
}

function updateActiveWordFromCell(row, col) {
  const matchingWords = currentWords.filter((word) => getWordCells(word).some((cell) => cell.row === row && cell.col === col));
  if (matchingWords.length === 0) return;
  const preferredWord = matchingWords.find((word) => word.id === activeWordId) || matchingWords[0];
  selectWord(preferredWord.id, false);
}

function handleCellInput(event) {
  const input = event.currentTarget;
  const cleanValue = input.value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]/gi, "").toUpperCase().slice(-1);
  input.value = cleanValue;
  input.classList.remove("correct", "incorrect");
  if (cleanValue) focusNextCell(input, 1);
  updateScorePreview();
}

function handleCellKeydown(event) {
  const input = event.currentTarget;
  if (event.key === "Backspace" && input.value === "") {
    event.preventDefault();
    focusNextCell(input, -1);
  } else if (event.key === "ArrowRight" || event.key === "ArrowDown") {
    event.preventDefault();
    focusNextCell(input, 1);
  } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
    event.preventDefault();
    focusNextCell(input, -1);
  }
}

function focusNextCell(input, offset) {
  const word = currentWords.find((item) => item.id === activeWordId);
  if (!word) return;
  const cells = getWordCells(word);
  const currentIndex = cells.findIndex((cell) => cell.row === Number(input.dataset.row) && cell.col === Number(input.dataset.col));
  const nextCell = cells[currentIndex + offset];
  if (nextCell) cellInputs.get(cellKey(nextCell.row, nextCell.col))?.focus();
}

function getWordValue(word) {
  return getWordCells(word).map((cell) => cellInputs.get(cellKey(cell.row, cell.col))?.value || "").join("");
}

function checkAnswers() {
  let correctCount = 0;
  wordStates = new Map();
  for (const word of currentWords) {
    const value = getWordValue(word);
    const isComplete = value.length === word.answer.length;
    const isCorrect = isComplete && value === word.answer;
    wordStates.set(word.id, { isComplete, isCorrect });
    if (isCorrect) correctCount += 1;
  }

  updateCellStates();
  updateClueStates();
  elements.score.textContent = `${correctCount} / ${currentWords.length}`;
  const newParts = updateGarage(correctCount, { announce: true });
  const installedNames = newParts.map((part) => part.name).join(", ");
  if (correctCount === currentWords.length) {
    elements.status.textContent = "Concluído";
    elements.status.style.color = "var(--green)";
    elements.feedback.textContent = "Parabéns! Você completou todas as palavras e o carro está pronto para a estrada.";
  } else {
    elements.status.textContent = "Em andamento";
    elements.status.style.color = "var(--yellow)";
    elements.feedback.textContent = newParts.length > 0
      ? `Peça instalada: ${installedNames}. ${correctCount} de ${currentWords.length} palavras corretas.`
      : `${correctCount} de ${currentWords.length} palavras corretas. Continue tentando!`;
  }
}

function updateCellStates() {
  for (const [key, input] of cellInputs) {
    input.classList.remove("correct", "incorrect");
    const relatedWords = currentWords.filter((word) => getWordCells(word).some((cell) => cellKey(cell.row, cell.col) === key));
    const relatedStates = relatedWords.map((word) => wordStates.get(word.id));
    if (relatedStates.some((state) => state?.isComplete && !state.isCorrect)) input.classList.add("incorrect");
    else if (relatedStates.length > 0 && relatedStates.every((state) => state?.isCorrect)) input.classList.add("correct");
  }
}

function updateClueStates() {
  document.querySelectorAll(".clue-button").forEach((button) => {
    const state = wordStates.get(button.dataset.wordId);
    button.classList.toggle("solved", Boolean(state?.isCorrect));
  });
}

function updateScorePreview() {
  const filled = currentWords.filter((word) => getWordValue(word).length === word.answer.length).length;
  elements.status.textContent = filled > 0 ? "Em andamento" : "Aguardando";
  elements.status.style.color = filled > 0 ? "var(--yellow)" : "";
}

function resetBoard() {
  for (const input of cellInputs.values()) {
    input.value = "";
    input.classList.remove("correct", "incorrect");
  }
  wordStates.clear();
  document.querySelectorAll(".clue-button").forEach((button) => button.classList.remove("solved"));
  elements.score.textContent = `0 / ${currentWords.length}`;
  elements.status.textContent = "Aguardando";
  elements.status.style.color = "";
  elements.feedback.textContent = "Tabuleiro limpo e carro desmontado. Boa sorte!";
  updateGarage(0);
  if (activeWordId) selectWord(activeWordId, false);
}

function renderPartsList() {
  elements.partsList.replaceChildren();
  for (const part of CAR_PARTS) {
    const item = document.createElement("li");
    item.dataset.part = part.id;
    const name = document.createElement("span");
    name.className = "part-name";
    name.textContent = part.name;
    const state = document.createElement("span");
    state.className = "part-state";
    state.setAttribute("aria-hidden", "true");
    const hidden = document.createElement("span");
    hidden.className = "sr-only";
    item.append(name, state, hidden);
    elements.partsList.append(item);
  }
}

function showToast(title, detail) {
  elements.toast.replaceChildren();
  const strong = document.createElement("strong");
  strong.textContent = title;
  const span = document.createElement("span");
  span.textContent = detail;
  elements.toast.append(strong, span);
  elements.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => elements.toast.classList.remove("show"), 2800);
}

// Instala as primeiras `count` peças. Devolve as peças recém-instaladas.
function updateGarage(count, { announce = false } = {}) {
  const previous = installedParts;
  installedParts = count;
  const newParts = [];

  CAR_PARTS.forEach((part, index) => {
    const installed = index < count;
    const group = elements.car.querySelector(`.part[data-part="${part.id}"]`);
    const item = elements.partsList.querySelector(`li[data-part="${part.id}"]`);
    if (group) {
      group.classList.toggle("installed", installed);
      group.classList.toggle("locked", !installed);
      group.classList.remove("fresh");
      if (installed && index >= previous && announce) {
        void group.getBoundingClientRect();
        group.classList.add("fresh");
        setTimeout(() => group.classList.remove("fresh"), 1000);
      }
    }
    if (item) {
      item.classList.toggle("installed", installed);
      item.querySelector(".part-state").textContent = installed ? "✓" : "";
      item.querySelector(".sr-only").textContent = installed ? "instalada" : "bloqueada";
    }
    if (installed && index >= previous) newParts.push(part);
  });

  const total = CAR_PARTS.length;
  elements.car.classList.toggle("painted", count >= total);
  elements.partsCount.textContent = `${count} / ${total}`;
  elements.buildFill.style.width = `${(count / total) * 100}%`;
  elements.buildProgress.setAttribute("aria-valuenow", String(count));
  elements.buildBadge.textContent = count === 0 ? "Garagem vazia" : count >= total ? "Pronto para a estrada" : "Em montagem";
  elements.buildBadge.classList.toggle("building", count > 0 && count < total);
  elements.buildBadge.classList.toggle("done", count >= total);

  if (!announce) {
    clearTimeout(toastTimer);
    elements.toast.classList.remove("show");
  } else if (count >= total && newParts.length > 0) {
    showToast("Carro completo!", "Pintura aplicada. Pé na estrada.");
  } else if (newParts.length === 1) {
    showToast("Peça instalada", newParts[0].name);
  } else if (newParts.length > 1) {
    showToast(`${newParts.length} peças instaladas`, newParts.map((part) => part.name).join(", "));
  }
  return newParts;
}

function startNewGame() {
  try {
    const puzzle = buildRandomPuzzle();
    currentWords = puzzle.words;
    gridData = puzzle.grid;
    wordStates = new Map();
    activeWordId = null;
    createBoard();
    renderClues();
    elements.total.textContent = String(currentWords.length).padStart(2, "0");
    elements.score.textContent = `0 / ${currentWords.length}`;
    elements.status.textContent = "Aguardando";
    elements.status.style.color = "";
    elements.feedback.textContent = "Nova grade gerada. Escolha uma pista para começar.";
    updateGarage(0);
    const firstWord = currentWords.find((word) => word.direction === "across") || currentWords[0];
    selectWord(firstWord.id, false);
  } catch (error) {
    elements.feedback.textContent = "Não foi possível gerar a grade. Atualize a página.";
    console.error(error);
  }
}

function updatePlayerName() {
  const nickname = elements.nickname.value.trim().toUpperCase();
  elements.player.textContent = nickname || "PILOTO 1";
}

elements.check.addEventListener("click", checkAnswers);
elements.reset.addEventListener("click", resetBoard);
elements.newGame.addEventListener("click", startNewGame);
elements.nickname.addEventListener("input", updatePlayerName);

renderPartsList();
startNewGame();
