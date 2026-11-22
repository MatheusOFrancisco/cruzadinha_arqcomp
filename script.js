const WORD_BANK = [
  { answer: "CPU", clue: "Primeiro dos três blocos de um computador: busca e executa as instruções do programa. No Arduino Uno, é o núcleo do chip, a 16 MHz." },
  { answer: "ULA", clue: "Parte da CPU que faz as contas (soma, subtração) e as operações lógicas, como AND, OR, XOR e NOT. Na analogia da cozinha, é quem cozinha." },
  { answer: "UC", clue: "Parte da CPU que lê cada instrução, descobre o que ela pede e envia as ordens para as outras partes. Na analogia da cozinha, é o chef." },
  { answer: "REGISTRADORES", clue: "Memórias minúsculas dentro da CPU, as mais rápidas do computador, que guardam o dado que está sendo usado agora. O acumulador e o PC são exemplos." },
  { answer: "RAM", clue: "Memória de trabalho e volátil: guarda os programas em execução e seus dados. No Arduino Uno tem 2 KB e guarda as variáveis." },
  { answer: "ROM", clue: "Memória não volátil que guarda o firmware de inicialização, como a BIOS ou a UEFI. Hoje, esse papel quase sempre é feito por memória Flash." },
  { answer: "EEPROM", clue: "Memória não volátil de 1 KB do Arduino Uno, onde o próprio programa pode guardar dados, como uma configuração, que sobrevivem ao desligamento." },
  { answer: "FLASH", clue: "Memória não volátil e regravável, da mesma tecnologia do pendrive. No Arduino Uno, tem 32 KB e guarda o programa." },
  { answer: "CACHE", clue: "Memória pequena e muito rápida dentro do processador, que guarda cópia do que a CPU usou há pouco. O ATmega328P do Arduino Uno não tem." },
  { answer: "MEMORIADEMASSA", clue: "Nível de baixo da hierarquia de memória (SSD ou HD): não volátil, guarda arquivos e programas instalados de forma permanente." },
  { answer: "DMA", clue: "Recurso em que um controlador copia dados entre um dispositivo e a RAM sem a CPU mover cada byte. O Arduino Uno do kit não tem." },
  { answer: "ADDRESSBUS", clue: "Barramento que responde à pergunta \"onde?\": sai da CPU com o número da posição de memória a acessar. Com 16 fios, alcança 65.536 posições." },
  { answer: "DATABUS", clue: "Barramento que responde à pergunta \"o quê?\": vai e volta com o valor lido ou escrito, e também leva as instruções até a CPU." },
  { answer: "MICROCONTROLADOR", clue: "Chip que reúne CPU, memória e entrada e saída, feito para uma tarefa específica. O ATmega328P, do Arduino Uno, é um." },
  { answer: "DUALCORE", clue: "Processador com dois núcleos de execução no mesmo chip." },
  { answer: "QUADCORE", clue: "Processador com quatro núcleos de execução no mesmo chip." }
];

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
  car: document.querySelector("#car-canvas"),
  partsList: document.querySelector("#parts-list"),
  partsCount: document.querySelector("#parts-count"),
  buildFill: document.querySelector("#build-fill"),
  buildBadge: document.querySelector("#build-badge"),
  toast: document.querySelector("#part-toast")
};

let currentWords = [];
let gridData = {};
let activeWordId = null;
let wordStates = {};
let cellInputs = {};
let cellWrappers = {};
let gridBounds = { minRow: 0, minCol: 0, rows: 0, cols: 0 };
let installedParts = 0;
let toastTimer = null;

function formatTwoDigits(value) {
  return value < 10 ? `0${value}` : `${value}`;
}

function shuffle(items) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    const temp = shuffled[index];
    shuffled[index] = shuffled[randomIndex];
    shuffled[randomIndex] = temp;
  }
  return shuffled;
}

function cellKey(row, col) {
  return `${row},${col}`;
}

function getWordCells(word) {
  const cells = [];
  for (let index = 0; index < word.answer.length; index += 1) {
    cells.push({
      row: word.row + (word.direction === "down" ? index : 0),
      col: word.col + (word.direction === "across" ? index : 0),
      letter: word.answer[index]
    });
  }
  return cells;
}

function getCandidatePlacements(grid, placedWords, answer) {
  const candidates = {};

  for (const placedWord of placedWords) {
    const perpendicularDirection = placedWord.direction === "across" ? "down" : "across";
    for (let newIndex = 0; newIndex < answer.length; newIndex += 1) {
      for (let oldIndex = 0; oldIndex < placedWord.answer.length; oldIndex += 1) {
        if (answer[newIndex] !== placedWord.answer[oldIndex]) {
          continue;
        }

        const row = placedWord.row + (placedWord.direction === "down" ? oldIndex : 0) - (perpendicularDirection === "down" ? newIndex : 0);
        const col = placedWord.col + (placedWord.direction === "across" ? oldIndex : 0) - (perpendicularDirection === "across" ? newIndex : 0);
        const candidate = { row: row, col: col, direction: perpendicularDirection, crossings: 0 };
        let valid = true;

        for (let index = 0; index < answer.length; index += 1) {
          const cellRow = row + (perpendicularDirection === "down" ? index : 0);
          const cellCol = col + (perpendicularDirection === "across" ? index : 0);
          const key = cellKey(cellRow, cellCol);
          const existingLetter = grid[key];

          if (existingLetter && existingLetter !== answer[index]) {
            valid = false;
            break;
          }

          if (existingLetter === answer[index]) {
            candidate.crossings += 1;
          } else if (perpendicularDirection === "down") {
            if (grid[cellKey(cellRow, cellCol - 1)] || grid[cellKey(cellRow, cellCol + 1)]) {
              valid = false;
            }
          } else if (grid[cellKey(cellRow - 1, cellCol)] || grid[cellKey(cellRow + 1, cellCol)]) {
            valid = false;
          }

          if (!valid) {
            break;
          }
        }

        const beforeRow = row - (perpendicularDirection === "down" ? 1 : 0);
        const beforeCol = col - (perpendicularDirection === "across" ? 1 : 0);
        const afterRow = row + (perpendicularDirection === "down" ? answer.length : 0);
        const afterCol = col + (perpendicularDirection === "across" ? answer.length : 0);

        if (grid[cellKey(beforeRow, beforeCol)] || grid[cellKey(afterRow, afterCol)]) {
          valid = false;
        }

        if (!valid || candidate.crossings === 0) {
          continue;
        }

        const key = `${row},${col},${perpendicularDirection}`;
        const previous = candidates[key];
        if (!previous || candidate.crossings > previous.crossings) {
          candidates[key] = candidate;
        }
      }
    }
  }

  return Object.values(candidates);
}

function placeWord(grid, word) {
  const cells = getWordCells(word);
  for (const cell of cells) {
    grid[cellKey(cell.row, cell.col)] = cell.letter;
  }
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
    const grid = {};
    placeWord(grid, firstWord);
    const remainingWords = selectedWords.slice(1);
    let failed = false;

    while (remainingWords.length > 0) {
      const options = [];
      remainingWords.forEach((word, wordIndex) => {
        const placements = getCandidatePlacements(grid, placedWords, word.answer);
        placements.forEach((placement) => {
          options.push({ ...placement, wordIndex: wordIndex, word: word });
        });
      });

      if (options.length === 0) {
        failed = true;
        break;
      }

      options.sort((first, second) => second.crossings - first.crossings);
      const topLimit = Math.min(10, options.length);
      const topOptions = options.slice(0, topLimit);
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
      return { words: assignClueNumbers(placedWords), grid: grid };
    }
  }

  throw new Error("Não foi possível montar a grade. Tente iniciar uma nova partida.");
}

function assignClueNumbers(words) {
  const starts = {};
  for (const word of words) {
    const key = cellKey(word.row, word.col);
    if (!starts[key]) {
      starts[key] = {};
    }
    starts[key][word.direction] = true;
  }

  const orderedStarts = Object.keys(starts).map((key) => {
    const parts = key.split(",");
    return { key: key, row: Number(parts[0]), col: Number(parts[1]) };
  }).sort((first, second) => first.row - second.row || first.col - second.col);

  const numbers = {};
  orderedStarts.forEach((start, index) => {
    numbers[start.key] = index + 1;
  });

  return words.map((word, index) => ({
    ...word,
    id: `${word.direction}-${index}`,
    number: numbers[cellKey(word.row, word.col)]
  })).sort((first, second) => {
    if (first.number !== second.number) {
      return first.number - second.number;
    }
    if (first.direction < second.direction) {
      return -1;
    }
    if (first.direction > second.direction) {
      return 1;
    }
    return 0;
  });
}

function calculateBounds(grid) {
  const keys = Object.keys(grid);
  const rows = [];
  const cols = [];

  for (const key of keys) {
    const parts = key.split(",");
    rows.push(Number(parts[0]));
    cols.push(Number(parts[1]));
  }

  const minRow = Math.min(...rows);
  const maxRow = Math.max(...rows);
  const minCol = Math.min(...cols);
  const maxCol = Math.max(...cols);

  return {
    minRow: minRow,
    minCol: minCol,
    rows: maxRow - minRow + 1,
    cols: maxCol - minCol + 1
  };
}

function createBoard() {
  elements.board.innerHTML = "";
  cellInputs = {};
  cellWrappers = {};
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
      cell.setAttribute("data-row", String(absoluteRow));
      cell.setAttribute("data-col", String(absoluteCol));

      const wrapper = document.createElement("div");
      wrapper.className = "cell-wrap";

      if (gridData[key]) {
        cellInputs[key] = cell;
        cellWrappers[key] = wrapper;
        cell.addEventListener("input", handleCellInput);
        cell.addEventListener("keydown", handleCellKeydown);
        cell.addEventListener("focus", () => updateActiveWordFromCell(absoluteRow, absoluteCol));
      } else {
        cell.classList.add("blocked");
        cell.disabled = true;
      }

      wrapper.append(cell);
      elements.board.append(wrapper);
    }
  }
  markNumberedCells();
}

function markNumberedCells() {
  for (const word of currentWords) {
    const key = cellKey(word.row, word.col);
    const startInput = cellInputs[key];
    const startWrapper = cellWrappers[key];
    if (startInput && startWrapper) {
      startInput.setAttribute("data-number", String(word.number));
      startInput.setAttribute("title", `Pista ${word.number}`);
      const numberLabel = document.createElement("span");
      numberLabel.className = "cell-number";
      numberLabel.textContent = String(word.number);
      startWrapper.append(numberLabel);
    }
  }
}

function renderClues() {
  elements.across.innerHTML = "";
  elements.down.innerHTML = "";

  const acrossWords = currentWords.filter((word) => word.direction === "across");
  const downWords = currentWords.filter((word) => word.direction === "down");

  for (const word of acrossWords) {
    elements.across.append(createClueItem(word));
  }
  for (const word of downWords) {
    elements.down.append(createClueItem(word));
  }

  elements.clueCount.textContent = formatTwoDigits(currentWords.length);
}

function createClueItem(word) {
  const item = document.createElement("li");
  const button = document.createElement("button");
  button.type = "button";
  button.className = "clue-button";
  button.setAttribute("data-word-id", word.id);

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
  if (!word) {
    return;
  }

  activeWordId = wordId;

  document.querySelectorAll(".clue-button").forEach((button) => {
    const btnWordId = button.getAttribute("data-word-id");
    button.classList.toggle("active", btnWordId === wordId);
  });

  document.querySelectorAll(".cell").forEach((cell) => {
    cell.classList.remove("active-word", "active-start");
  });

  const cells = getWordCells(word);
  cells.forEach((cell, index) => {
    const input = cellInputs[cellKey(cell.row, cell.col)];
    if (input) {
      input.classList.add("active-word");
      if (index === 0) {
        input.classList.add("active-start");
      }
    }
  });

  if (focusStart) {
    const firstEmpty = cells.find((cell) => {
      const inp = cellInputs[cellKey(cell.row, cell.col)];
      return inp && !inp.value;
    });
    const target = firstEmpty || cells[0];
    const targetInput = cellInputs[cellKey(target.row, target.col)];
    if (targetInput) {
      targetInput.focus();
    }
  }
}

function updateActiveWordFromCell(row, col) {
  const matchingWords = currentWords.filter((word) =>
    getWordCells(word).some((cell) => cell.row === row && cell.col === col)
  );
  if (matchingWords.length === 0) {
    return;
  }
  const preferredWord = matchingWords.find((word) => word.id === activeWordId) || matchingWords[0];
  selectWord(preferredWord.id, false);
}

function sanitizeLetter(raw) {
  const upper = raw.toUpperCase();
  const lastChar = upper.slice(-1);
  const accentMap = {
    "Á": "A", "À": "A", "Ã": "A", "Â": "A",
    "É": "E", "Ê": "E",
    "Í": "I",
    "Ó": "O", "Õ": "O", "Ô": "O",
    "Ú": "U",
    "Ç": "C"
  };
  const mapped = accentMap[lastChar] || lastChar;
  return mapped >= "A" && mapped <= "Z" ? mapped : "";
}

function handleCellInput(event) {
  const input = event.currentTarget;
  const cleanValue = sanitizeLetter(input.value);
  input.value = cleanValue;
  input.classList.remove("correct", "incorrect");

  if (cleanValue) {
    focusNextCell(input, 1);
  }
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
  if (!word) {
    return;
  }
  const cells = getWordCells(word);
  const rowAttr = Number(input.getAttribute("data-row"));
  const colAttr = Number(input.getAttribute("data-col"));
  const currentIndex = cells.findIndex((cell) => cell.row === rowAttr && cell.col === colAttr);
  const nextCell = cells[currentIndex + offset];

  if (nextCell) {
    const nextInput = cellInputs[cellKey(nextCell.row, nextCell.col)];
    if (nextInput) {
      nextInput.focus();
    }
  }
}

function getWordValue(word) {
  const cells = getWordCells(word);
  const letters = cells.map((cell) => {
    const input = cellInputs[cellKey(cell.row, cell.col)];
    return input ? input.value : "";
  });
  return letters.join("");
}

function checkAnswers() {
  let correctCount = 0;
  wordStates = {};

  for (const word of currentWords) {
    const value = getWordValue(word);
    const isComplete = value.length === word.answer.length;
    const isCorrect = isComplete && value === word.answer;
    wordStates[word.id] = { isComplete: isComplete, isCorrect: isCorrect };
    if (isCorrect) {
      correctCount += 1;
    }
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
  const entries = Object.entries(cellInputs);
  for (const [key, input] of entries) {
    input.classList.remove("correct", "incorrect");
    const relatedWords = currentWords.filter((word) =>
      getWordCells(word).some((cell) => cellKey(cell.row, cell.col) === key)
    );
    const relatedStates = relatedWords.map((word) => wordStates[word.id]);

    if (relatedStates.some((state) => state && state.isComplete && !state.isCorrect)) {
      input.classList.add("incorrect");
    } else if (relatedStates.length > 0 && relatedStates.every((state) => state && state.isCorrect)) {
      input.classList.add("correct");
    }
  }
}

function updateClueStates() {
  document.querySelectorAll(".clue-button").forEach((button) => {
    const wordId = button.getAttribute("data-word-id");
    const state = wordStates[wordId];
    button.classList.toggle("solved", Boolean(state && state.isCorrect));
  });
}

function updateScorePreview() {
  const filled = currentWords.filter((word) => getWordValue(word).length === word.answer.length).length;
  elements.status.textContent = filled > 0 ? "Em andamento" : "Aguardando";
  elements.status.style.color = filled > 0 ? "var(--yellow)" : "";
}

function resetBoard() {
  const inputs = Object.values(cellInputs);
  for (const input of inputs) {
    input.value = "";
    input.classList.remove("correct", "incorrect");
  }
  wordStates = {};
  document.querySelectorAll(".clue-button").forEach((button) => button.classList.remove("solved"));
  elements.score.textContent = `0 / ${currentWords.length}`;
  elements.status.textContent = "Aguardando";
  elements.status.style.color = "";
  elements.feedback.textContent = "Tabuleiro limpo e carro desmontado. Boa sorte!";
  updateGarage(0);
  if (activeWordId) {
    selectWord(activeWordId, false);
  }
}

function renderPartsList() {
  elements.partsList.innerHTML = "";
  CAR_PARTS.forEach((part, index) => {
    const item = document.createElement("li");
    item.setAttribute("data-part", part.id);

    const num = document.createElement("span");
    num.className = "part-index";
    num.textContent = formatTwoDigits(index + 1);

    const name = document.createElement("span");
    name.className = "part-name";
    name.textContent = part.name;

    const state = document.createElement("span");
    state.className = "part-state";

    const hidden = document.createElement("span");
    hidden.className = "sr-only";

    item.append(num, name, state, hidden);
    elements.partsList.append(item);
  });
}

function showToast(title, detail) {
  elements.toast.innerHTML = "";
  const strong = document.createElement("strong");
  strong.textContent = title;
  const span = document.createElement("span");
  span.textContent = detail;
  elements.toast.append(strong, span);
  elements.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => elements.toast.classList.remove("show"), 2800);
}

function updateGarage(count, { announce = false } = {}) {
  const previous = installedParts;
  installedParts = count;
  const newParts = [];

  CAR_PARTS.forEach((part, index) => {
    const installed = index < count;
    const group = elements.car.querySelector(`.car-part[data-part="${part.id}"]`);
    const item = elements.partsList.querySelector(`li[data-part="${part.id}"]`);

    if (group) {
      group.classList.toggle("installed", installed);
      group.classList.toggle("locked", !installed);
      group.classList.remove("fresh");
      if (installed && index >= previous && announce) {
        setTimeout(() => {
          group.classList.add("fresh");
        }, 10);
        setTimeout(() => group.classList.remove("fresh"), 1000);
      }
    }

    if (item) {
      item.classList.toggle("installed", installed);
      item.querySelector(".part-state").textContent = installed ? "✓" : "";
      item.querySelector(".sr-only").textContent = installed ? "instalada" : "bloqueada";
    }

    if (installed && index >= previous) {
      newParts.push(part);
    }
  });

  const total = CAR_PARTS.length;
  elements.car.classList.toggle("painted", count >= total);
  elements.partsCount.textContent = `${count} / ${total}`;
  elements.buildFill.style.width = `${(count / total) * 100}%`;
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
    wordStates = {};
    activeWordId = null;

    createBoard();
    renderClues();

    elements.total.textContent = formatTwoDigits(currentWords.length);
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