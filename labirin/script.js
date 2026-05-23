const canvas = document.getElementById('maze-canvas');
const ctx = canvas.getContext('2d');
const widthInput = document.getElementById('maze-width');
const heightInput = document.getElementById('maze-height');
const mazeTypeInput = document.getElementById('maze-type');
const generateBtn = document.getElementById('generate-btn');
const statusMessage = document.getElementById('status-message');
const winModal = document.getElementById('win-modal');
const playAgainBtn = document.getElementById('play-again-btn');

let cols, rows;
let cellSize;
let cells = [];
let stack = [];
let playerPath = [];
let currentCell;

let playerLogicalPos = { x: 0, y: 0 }; // The cell the player is currently considered to be in or moving towards
let playerVisualPos = { x: 0, y: 0 }; // The pixel position of the player (0 to 1 ratio or just absolute pixels)
let targetLogicalPos = null;
let currentDirection = { dx: 0, dy: 0 };
let isMoving = false;
const MOVE_SPEED = 0.2; // Speed of movement (cells per frame)

let gameActive = false;

// Cell class
class Cell {
    constructor(i, j) {
        this.i = i;
        this.j = j;
        this.walls = { top: true, right: true, bottom: true, left: true };
        this.visited = false;
    }

    draw() {
        let x = this.i * cellSize;
        let y = this.j * cellSize;

        ctx.strokeStyle = '#444'; // Wall color
        ctx.lineWidth = 2;
        ctx.lineCap = 'square';

        if (this.walls.top) {
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + cellSize, y);
            ctx.stroke();
        }
        if (this.walls.right) {
            ctx.beginPath();
            ctx.moveTo(x + cellSize, y);
            ctx.lineTo(x + cellSize, y + cellSize);
            ctx.stroke();
        }
        if (this.walls.bottom) {
            ctx.beginPath();
            ctx.moveTo(x + cellSize, y + cellSize);
            ctx.lineTo(x, y + cellSize);
            ctx.stroke();
        }
        if (this.walls.left) {
            ctx.beginPath();
            ctx.moveTo(x, y + cellSize);
            ctx.lineTo(x, y);
            ctx.stroke();
        }
        
        // Draw End Point
        if (this.i === cols - 1 && this.j === rows - 1) {
            ctx.fillStyle = '#2ecc71';
            ctx.fillRect(x + 4, y + 4, cellSize - 8, cellSize - 8);
        }
    }
}

function getIndex(i, j) {
    if (i < 0 || j < 0 || i > cols - 1 || j > rows - 1) {
        return -1;
    }
    return i + j * cols;
}

function generateMaze() {
    winModal.classList.add('hidden'); // Hide modal if open
    
    // Validate inputs
    cols = parseInt(widthInput.value);
    rows = parseInt(heightInput.value);
    
    if (cols < 10) cols = 10;
    if (cols > 100) cols = 100;
    if (rows < 10) rows = 10;
    if (rows > 100) rows = 100;
    
    widthInput.value = cols;
    heightInput.value = rows;

    // Calculate cell size based on canvas container
    const containerWidth = document.querySelector('.game-area').clientWidth - 40;
    const containerHeight = document.querySelector('.game-area').clientHeight - 40;
    
    cellSize = Math.floor(Math.min(containerWidth / cols, containerHeight / rows));
    
    canvas.width = cols * cellSize;
    canvas.height = rows * cellSize;

    cells = [];
    for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
            cells.push(new Cell(i, j));
        }
    }

    currentCell = cells[0];
    currentCell.visited = true;
    stack = [currentCell];

    // Iterative backtracker
    while (stack.length > 0) {
        let next = getUnvisitedNeighbor(currentCell);
        if (next) {
            next.visited = true;
            stack.push(currentCell);
            removeWalls(currentCell, next);
            currentCell = next;
        } else {
            currentCell = stack.pop();
        }
    }

    // Add multiple paths if selected
    if (mazeTypeInput.value === 'multiple') {
        createMultiplePaths();
    }

    // Reset for playing
    playerLogicalPos = { x: 0, y: 0 };
    playerVisualPos = { x: 0, y: 0 };
    playerPath = [{ x: 0, y: 0 }];
    currentDirection = { dx: 0, dy: 0 };
    isMoving = false;
    gameActive = true;
    
    statusMessage.innerText = "Game started. Navigate to the green box!";
    statusMessage.style.color = '#4facfe';
}

function getUnvisitedNeighbor(cell) {
    let neighbors = [];
    let top = cells[getIndex(cell.i, cell.j - 1)];
    let right = cells[getIndex(cell.i + 1, cell.j)];
    let bottom = cells[getIndex(cell.i, cell.j + 1)];
    let left = cells[getIndex(cell.i - 1, cell.j)];

    if (top && !top.visited) neighbors.push(top);
    if (right && !right.visited) neighbors.push(right);
    if (bottom && !bottom.visited) neighbors.push(bottom);
    if (left && !left.visited) neighbors.push(left);

    if (neighbors.length > 0) {
        let r = Math.floor(Math.random() * neighbors.length);
        return neighbors[r];
    } else {
        return undefined;
    }
}

function removeWalls(a, b) {
    let x = a.i - b.i;
    if (x === 1) {
        a.walls.left = false;
        b.walls.right = false;
    } else if (x === -1) {
        a.walls.right = false;
        b.walls.left = false;
    }
    let y = a.j - b.j;
    if (y === 1) {
        a.walls.top = false;
        b.walls.bottom = false;
    } else if (y === -1) {
        a.walls.bottom = false;
        b.walls.top = false;
    }
}

function createMultiplePaths() {
    // Loop through all cells and find dead ends (cells with 3 walls)
    // Break a random wall in 80% of dead ends to create multiple possible paths
    for (let i = 0; i < cells.length; i++) {
        let cell = cells[i];
        
        // Don't break walls for start and end cells to maintain start/end structure
        if ((cell.i === 0 && cell.j === 0) || (cell.i === cols - 1 && cell.j === rows - 1)) {
            continue;
        }

        let wallCount = 0;
        if (cell.walls.top) wallCount++;
        if (cell.walls.right) wallCount++;
        if (cell.walls.bottom) wallCount++;
        if (cell.walls.left) wallCount++;
        
        if (wallCount === 3) {
            if (Math.random() < 0.8) { // 80% chance to break a wall
                let neighbors = [];
                let top = cells[getIndex(cell.i, cell.j - 1)];
                let right = cells[getIndex(cell.i + 1, cell.j)];
                let bottom = cells[getIndex(cell.i, cell.j + 1)];
                let left = cells[getIndex(cell.i - 1, cell.j)];

                // Only add neighbors where there is currently a wall
                if (top && cell.walls.top) neighbors.push(top);
                if (right && cell.walls.right) neighbors.push(right);
                if (bottom && cell.walls.bottom) neighbors.push(bottom);
                if (left && cell.walls.left) neighbors.push(left);

                if (neighbors.length > 0) {
                    let r = Math.floor(Math.random() * neighbors.length);
                    removeWalls(cell, neighbors[r]);
                }
            }
        }
    }
}

function getAvailableExits(x, y) {
    let current = cells[getIndex(x, y)];
    let exits = 0;
    if (!current.walls.top) exits++;
    if (!current.walls.right) exits++;
    if (!current.walls.bottom) exits++;
    if (!current.walls.left) exits++;
    return exits;
}

function canMove(x, y, dx, dy) {
    let current = cells[getIndex(x, y)];
    if (dx === 1 && current.walls.right) return false;
    if (dx === -1 && current.walls.left) return false;
    if (dy === 1 && current.walls.bottom) return false;
    if (dy === -1 && current.walls.top) return false;
    return true;
}

function processMovement() {
    if (!gameActive) return;

    if (!isMoving && (currentDirection.dx !== 0 || currentDirection.dy !== 0)) {
        // Try to move in current direction
        if (canMove(playerLogicalPos.x, playerLogicalPos.y, currentDirection.dx, currentDirection.dy)) {
            targetLogicalPos = {
                x: playerLogicalPos.x + currentDirection.dx,
                y: playerLogicalPos.y + currentDirection.dy
            };
            isMoving = true;
            
            // Check backtracking
            if (playerPath.length >= 2) {
                let prev = playerPath[playerPath.length - 2];
                if (prev.x === targetLogicalPos.x && prev.y === targetLogicalPos.y) {
                    playerPath.pop(); // Remove the current cell, we are going back
                } else {
                    playerPath.push({ ...targetLogicalPos });
                }
            } else {
                playerPath.push({ ...targetLogicalPos });
            }
            
        } else {
            // Hit a wall, stop moving
            currentDirection = { dx: 0, dy: 0 };
        }
    }

    if (isMoving && targetLogicalPos) {
        // Interpolate visual position
        let dx = targetLogicalPos.x - playerVisualPos.x;
        let dy = targetLogicalPos.y - playerVisualPos.y;
        let dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= MOVE_SPEED) {
            // Reached target cell
            playerVisualPos.x = targetLogicalPos.x;
            playerVisualPos.y = targetLogicalPos.y;
            playerLogicalPos.x = targetLogicalPos.x;
            playerLogicalPos.y = targetLogicalPos.y;
            isMoving = false;
            
            // Check win condition
            if (playerLogicalPos.x === cols - 1 && playerLogicalPos.y === rows - 1) {
                gameActive = false;
                currentDirection = { dx: 0, dy: 0 };
                winModal.classList.remove('hidden');
                statusMessage.innerText = "You Win!";
                statusMessage.style.color = '#2ecc71';
            } else {
                // Determine if we should continue auto-moving
                // Stop if there is a wall ahead OR if it's an intersection (exits > 2)
                let exits = getAvailableExits(playerLogicalPos.x, playerLogicalPos.y);
                let canContinue = canMove(playerLogicalPos.x, playerLogicalPos.y, currentDirection.dx, currentDirection.dy);
                
                // Stop at intersections or corners to let the user decide
                if (exits > 2 || !canContinue) {
                    currentDirection = { dx: 0, dy: 0 };
                }
            }
        } else {
            // Move visually
            playerVisualPos.x += (dx / dist) * MOVE_SPEED;
            playerVisualPos.y += (dy / dist) * MOVE_SPEED;
        }
    }
}

function renderGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw cells
    for (let i = 0; i < cells.length; i++) {
        cells[i].draw();
    }
    
    // Draw player path
    if (playerPath.length > 0) {
        ctx.beginPath();
        ctx.strokeStyle = '#e74c3c'; // Path line color
        ctx.lineWidth = Math.max(2, cellSize * 0.3);
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        
        for (let i = 0; i < playerPath.length; i++) {
            let cx = playerPath[i].x * cellSize + cellSize / 2;
            let cy = playerPath[i].y * cellSize + cellSize / 2;
            
            // If it's the last point in the path and we are moving, draw line to the visual position instead
            if (i === playerPath.length - 1 && isMoving) {
                cx = playerVisualPos.x * cellSize + cellSize / 2;
                cy = playerVisualPos.y * cellSize + cellSize / 2;
            }

            if (i === 0) {
                ctx.moveTo(cx, cy);
            } else {
                ctx.lineTo(cx, cy);
            }
        }
        ctx.stroke();
        
        // Draw player head (current position)
        let headX = isMoving ? playerVisualPos.x : playerLogicalPos.x;
        let headY = isMoving ? playerVisualPos.y : playerLogicalPos.y;
        
        ctx.fillStyle = '#ff6b6b';
        ctx.beginPath();
        ctx.arc(headX * cellSize + cellSize / 2, headY * cellSize + cellSize / 2, Math.max(3, cellSize * 0.3), 0, Math.PI * 2);
        ctx.fill();
    }
}

function gameLoop() {
    processMovement();
    renderGame();
    requestAnimationFrame(gameLoop);
}

window.addEventListener('keydown', (e) => {
    if (!gameActive) return;
    
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].indexOf(e.code) > -1) {
        e.preventDefault();
    }

    switch(e.key.toLowerCase()) {
        case 'arrowup':
        case 'w':
            currentDirection = { dx: 0, dy: -1 };
            break;
        case 'arrowright':
        case 'd':
            currentDirection = { dx: 1, dy: 0 };
            break;
        case 'arrowdown':
        case 's':
            currentDirection = { dx: 0, dy: 1 };
            break;
        case 'arrowleft':
        case 'a':
            currentDirection = { dx: -1, dy: 0 };
            break;
    }
});

generateBtn.addEventListener('click', generateMaze);
playAgainBtn.addEventListener('click', generateMaze);

// Generate initial maze on load and start game loop
window.onload = () => {
    setTimeout(() => {
        generateMaze();
        requestAnimationFrame(gameLoop);
    }, 100);
};
