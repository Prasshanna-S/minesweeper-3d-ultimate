const express = require('express');
const app = express();
const PORT = 3000;

const gridWidth = 10, gridHeight = 10;
const mineProbability = 0.2;
const grid = [];

for (let i = 0; i < gridWidth; i++) {
    grid[i] = [];
    for (let j = 0; j < gridHeight; j++) {
        grid[i][j] = { isMine: Math.random() < mineProbability, revealed: false };
    }
}

function countAdjacentMines(x, y) {
    let count = 0;
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < gridWidth && ny >= 0 && ny < gridHeight && grid[nx][ny].isMine) {
                count++;
            }
        }
    }
    return count;
}

app.use(express.static('public'));

app.get('/checkTile', (req, res) => {
    const x = parseInt(req.query.x);
    const y = parseInt(req.query.y);
    let revealed = [];
    revealAdjacentZero(x, y, revealed);
    res.json({
        revealedTiles: revealed,
        gameOver: grid[x][y].isMine
    });
});

function revealAdjacentZero(x, y, revealed) {
    const queue = [{ x, y }];
    while (queue.length > 0) {
        const { x, y } = queue.shift();
        if (!grid[x][y].revealed) {
            grid[x][y].revealed = true;
            revealed.push({ x, y, isMine: grid[x][y].isMine, adjacentMines: countAdjacentMines(x, y) });
            if (revealed[revealed.length - 1].adjacentMines === 0) {
                for (let dx = -1; dx <= 1; dx++) {
                    for (let dy = -1; dy <= 1; dy++) {
                        const nx = x + dx, ny = y + dy;
                        if (nx >= 0 && nx < gridWidth && ny >= 0 && ny < gridHeight && !grid[nx][ny].revealed) {
                            queue.push({ x: nx, y: ny });
                        }
                    }
                }
            }
        }
    }
}

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
});
