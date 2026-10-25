
const stage = document.getElementById("game-stage");
const title = document.getElementById("game-title");
const totalWinsElement = document.getElementById("total-wins");
const scoreNote = document.getElementById("score-note");

let currentGame = "";
let totalWins = 0;
let gameFinished = false;

let board = [];
let currentPlayer = "X";

let rpsWins = 0;
let rpsLosses = 0;
let rpsDraws = 0;

let secretNumber = 0;
let attempts = 0;

// Load scores from server
async function loadScores() {
    try {
        const response = await fetch("/api/scores");
        if (!response.ok) throw new Error("Could not load scores");

        const data = await response.json();
        totalWins = Number(data.totalWins) || 0;
        totalWinsElement.textContent = totalWins;
        scoreNote.textContent = "Your scores are saved on the server.";
    } catch {
        totalWinsElement.textContent = totalWins;
        scoreNote.textContent = "Start the server to save scores.";
    }
}

// Save wins
async function saveWin(gameName) {
    try {
        const response = await fetch("/api/win", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ game: gameName })
        });

        if (!response.ok) throw new Error("Save failed");

        const data = await response.json();
        totalWins = Number(data.totalWins) || totalWins + 1;
        totalWinsElement.textContent = totalWins;
        scoreNote.textContent = "Win saved successfully! 🏆";
    } catch {
        scoreNote.textContent = "Could not save score. Check your server.";
    }
}

// Open selected game
function openGame(game) {
    currentGame = game;

    if (game === "tic") {
        title.innerHTML = 'Tic-Tac-Toe <span>Zone</span>';
        startTicTacToe();
    } else if (game === "rps") {
        title.innerHTML = 'Rock Paper <span>Scissors</span>';
        startRPS();
    } else if (game === "guess") {
        title.innerHTML = 'Number <span>Guessing</span>';
        startGuessing();
    }

    document.getElementById("play-area").scrollIntoView({
        behavior: "smooth"
    });
}

function resetGame() {
    if (currentGame) openGame(currentGame);
}

// GAME 1: TIC-TAC-TOE

function startTicTacToe() {
    board = Array(9).fill("");
    currentPlayer = "X";
    gameFinished = false;
    renderTicTacToe();
}

function renderTicTacToe() {
    stage.innerHTML = `
        <h3>⭕ Tic-Tac-Toe ❌</h3>
        <p id="tic-status">Player ${currentPlayer}'s turn</p>

        <div style="display:grid;grid-template-columns:repeat(3,70px);
                    gap:8px;justify-content:center;">
            ${board.map((cell, i) => `
                <button onclick="playTic(${i})"
                    style="width:70px;height:70px;font-size:27px;
                    background:#17172f;border:1px solid #a855f766;
                    color:${cell === 'X' ? '#38bdf8' : '#c084fc'};
                    border-radius:12px;"
                    ${cell || gameFinished ? "disabled" : ""}>
                    ${cell}
                </button>
            `).join("")}
        </div>

        <button onclick="startTicTacToe()">↻ New Game</button>
    `;
}

function playTic(index) {
    if (board[index] || gameFinished) return;

    board[index] = currentPlayer;

    const lines = [
        [0,1,2], [3,4,5], [6,7,8],
        [0,3,6], [1,4,7], [2,5,8],
        [0,4,8], [2,4,6]
    ];

    const won = lines.some(line =>
        line.every(i => board[i] === currentPlayer)
    );

    if (won) {
        gameFinished = true;
        renderTicTacToe();
        document.getElementById("tic-status").textContent =
            `🎉 Player ${currentPlayer} wins!`;
        saveWin("Tic-Tac-Toe");
        return;
    }

    if (board.every(cell => cell !== "")) {
        gameFinished = true;
        renderTicTacToe();
        document.getElementById("tic-status").textContent = "🤝 Draw!";
        return;
    }

    currentPlayer = currentPlayer === "X" ? "O" : "X";
    renderTicTacToe();
}

// GAME 2: ROCK PAPER SCISSORS

function startRPS() {
    rpsWins = 0;
    rpsLosses = 0;
    rpsDraws = 0;

    stage.innerHTML = `
        <h3>✊ Rock Paper Scissors</h3>
        <p>Choose your move!</p>

        <div style="display:flex;gap:12px;flex-wrap:wrap;
                    justify-content:center;">
            <button onclick="playRPS('Rock')">✊ Rock</button>
            <button onclick="playRPS('Paper')">✋ Paper</button>
            <button onclick="playRPS('Scissors')">✌️ Scissors</button>
        </div>

        <h3 id="rps-result">Ready to play?</h3>
        <p id="rps-score">You: 0 | Computer: 0 | Draws: 0</p>
        <button onclick="startRPS()">↻ Reset Game</button>
    `;
}

function playRPS(player) {
    const choices = ["Rock", "Paper", "Scissors"];
    const computer = choices[Math.floor(Math.random() * 3)];

    let result;

    if (player === computer) {
        result = "It's a draw! 🤝";
        rpsDraws++;
    } else if (
        (player === "Rock" && computer === "Scissors") ||
        (player === "Paper" && computer === "Rock") ||
        (player === "Scissors" && computer === "Paper")
    ) {
        result = "You win this round! 🎉";
        rpsWins++;
        saveWin("Rock Paper Scissors");
    } else {
        result = "Computer wins this round! 🤖";
        rpsLosses++;
    }

    document.getElementById("rps-result").textContent =
        `${player} vs ${computer} — ${result}`;

    document.getElementById("rps-score").textContent =
        `You: ${rpsWins} | Computer: ${rpsLosses} | Draws: ${rpsDraws}`;
}

// GAME 3: NUMBER GUESSING

function startGuessing() {
    secretNumber = Math.floor(Math.random() * 100) + 1;
    attempts = 0;
    gameFinished = false;

    stage.innerHTML = `
        <h3>🎯 Guess the Number</h3>
        <p>I'm thinking of a number between 1 and 100.</p>

        <form id="guess-form"
              style="display:flex;gap:10px;flex-wrap:wrap;
              justify-content:center;">
            <input id="guess-input" type="number"
                   min="1" max="100"
                   placeholder="Enter a number" required>
            <button type="submit">Guess!</button>
        </form>

        <p id="guess-message">Can you find the secret number?</p>
        <p id="guess-attempts">Attempts: 0</p>
        <button onclick="startGuessing()">↻ New Number</button>
    `;

    document.getElementById("guess-form")
        .addEventListener("submit", handleGuess);
}

function handleGuess(event) {
    event.preventDefault();
    if (gameFinished) return;

    const input = document.getElementById("guess-input");
    const guess = Number(input.value);
    const message = document.getElementById("guess-message");

    if (!Number.isInteger(guess) || guess < 1 || guess > 100) {
        message.textContent = "Enter a whole number from 1 to 100.";
        return;
    }

    attempts++;
    document.getElementById("guess-attempts").textContent =
        `Attempts: ${attempts}`;

    if (guess === secretNumber) {
        gameFinished = true;
        message.textContent =
            `🎉 Correct! You found ${secretNumber} in ${attempts} attempts!`;
        saveWin("Number Guessing");
        input.disabled = true;
    } else if (guess < secretNumber) {
        message.textContent = "📈 Too low! Try a higher number.";
    } else {
        message.textContent = "📉 Too high! Try a lower number.";
    }

    input.value = "";
    if (!gameFinished) input.focus();
}

loadScores();
