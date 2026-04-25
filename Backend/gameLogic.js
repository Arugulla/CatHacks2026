// This file will contain most of the logic and functions for the game
/*
Process looks something like this during play
play choose a time

announcer says the chosen time
we randomize the next number
while True:
    while choosen time != 0:
        next = setTimeout(getRandomNumber(0, choosenTime), delay());
        announce next number (next);
        choosenTime = next;
    announce draw
    check input()
    if no object in front:
        which ever input is faster wins
    else:
        slower one wins
*/

let gameStarted = false

const words = ["Ready", "Steady", "Wait...", "Hold it...", "Easy...", "Now..."];

let gameStarted = false;
let drawTime = 0;
let player1Time = null;
let player2Time = null;

let callbacks = {};

const words = [
    "Ready...",
    "Steady...",
    "Wait...",
    "Hold it...",
    "Easy...",
    "Now...",
    "DRAW?" // bait word
];

function getRandomDelay() {
    let rand = Math.random();
    if (rand < 0.2) return 0; 
    
    return Math.floor(Math.random() * 1000) + 200;
}

function getRandomWord() {
    return words[Math.floor(Math.random() * words.length)];
}

export function startGame(cb) {
    resetGame();
    callbacks = cb;
    gameStarted = true;

    announcerLoop(0);
}

function announcerLoop(step) {
    if (!gameStarted) return;

    let shouldDraw = Math.random() < 0.2 && step > 2;

    if (shouldDraw) {
        drawTime = Date.now();
        callbacks.onDraw();
        return;
    }

    let word = getRandomWord();
    callbacks.onWord(word);

    let delay = getRandomDelay();

    setTimeout(() => announcerLoop(step + 1), delay);
}

export function handleKeyPress(key) {
    if (!gameStarted) return;

    let now = Date.now();

    // pressed too early
    if (drawTime === 0) {
        let winner = key === "A" ? "Player 2" : "Player 1";
        endGame(winner, "Too early!");
        return;
    }

    let reaction = now - drawTime;

    if (key === "A" && player1Time === null) {
        player1Time = reaction;
    }

    if (key === "L" && player2Time === null) {
        player2Time = reaction;
    }

    checkWinner();
}

function checkWinner() {
    if (player1Time !== null && player2Time !== null) {
        if (player1Time < player2Time) {
            endGame("Player 1", player1Time);
        } else {
            endGame("Player 2", player2Time);
        }
    }
}

function endGame(winner, info) {
    gameStarted = false;
    callbacks.onResult(winner, info);
}

function resetGame() {
    drawTime = 0;
    player1Time = null;
    player2Time = null;
}
