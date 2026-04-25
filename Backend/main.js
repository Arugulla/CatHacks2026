// main.js
import { startGame, handleKeyPress } from "./gameLogic.js";

// UI elements
const text = document.getElementById("text");
const startBtn = document.getElementById("startBtn");

// Start button
startBtn.addEventListener("click", () => {
    startGame({
        onWord: (word) => {
            text.innerText = word;
        },
        onDraw: () => {
            text.innerText = "DRAW!";
        },
        onResult: (winner, info) => {
            text.innerText = `${winner} wins! (${info})`;
        }
    });
});

// Keyboard input
document.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() === "a") handleKeyPress("A");
    if (e.key.toLowerCase() === "l") handleKeyPress("L");
});