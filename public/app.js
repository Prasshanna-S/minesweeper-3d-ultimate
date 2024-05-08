const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('gameContainer').appendChild(renderer.domElement);

const aspectRatio = window.innerWidth / window.innerHeight;
const frustumSize = 25;
const camera = new THREE.OrthographicCamera(
    frustumSize * aspectRatio / -2,
    frustumSize * aspectRatio / 2,
    frustumSize / 2,
    frustumSize / -2,
    1,
    100
);
camera.position.set(20 * Math.sqrt(2), 20 * Math.sqrt(2), 20 * Math.sqrt(2));
camera.lookAt(scene.position);

const light = new THREE.DirectionalLight(0xffffff, 0.5);
light.position.set(20, 40, 20);
light.castShadow = true;
scene.add(light);
scene.add(new THREE.AmbientLight(0xffffff, 0.5));

const loader = new THREE.FontLoader();
let font;
loader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', function (loadedFont) {
    font = loadedFont;
});

const gridSize = 1.2, gridWidth = 10, gridHeight = 10, spacing = 0.8;
const grid = [];
initGrid();

let isFlagMode = false;
let flagsLeft = 10;
let startTime, timerInterval;

const modeToggleBtn = document.getElementById('modeToggle');
modeToggleBtn.addEventListener('click', function () {
    isFlagMode = !isFlagMode;
    modeToggleBtn.textContent = isFlagMode ? "Switch to Click Mode" : "Switch to Flag Mode";
});

const resetBtn = document.getElementById('resetGame');
resetBtn.addEventListener('click', resetGame);

window.addEventListener('click', onMouseClick, false);
animate();
startTimer();
updateFlagCount();

function initGrid() {
    for (let i = 0; i < gridWidth; i++) {
        grid[i] = [];
        for (let j = 0; j < gridHeight; j++) {
            const geometry = new THREE.BoxGeometry(gridSize, gridSize, 0.5);
            const material = new THREE.MeshLambertMaterial({ color: 0xcccccc });
            const cube = new THREE.Mesh(geometry, material);
            cube.position.set((i - gridWidth / 2) * (gridSize + spacing), (j - gridHeight / 2) * (gridSize + spacing), 0);
            cube.castShadow = true;
            cube.receiveShadow = true;
            cube.userData = { x: i, y: j, revealed: false, flagged: false, flagMesh: null };
            scene.add(cube);
            grid[i][j] = cube;
        }
    }
}

function onMouseClick(event) {
    event.preventDefault();
    const rect = renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children);

    if (intersects.length > 0) {
        const obj = intersects[0].object;
        if (isFlagMode && !obj.userData.revealed) {
            toggleFlag(obj);
        } else if (!isFlagMode && !obj.userData.flagged && !obj.userData.revealed) {
            fetch(`/checkTile?x=${obj.userData.x}&y=${obj.userData.y}`)
                .then(response => response.json())
                .then(data => {
                    processRevealedTiles(data);
                })
                .catch(error => console.error('Error:', error));
        }
    }
}

function toggleFlag(obj) {
    if (obj.userData.flagged) {
        scene.remove(obj.userData.flagMesh);
        obj.userData.flagged = false;
        obj.userData.flagMesh = null;
        flagsLeft++;
    } else if (flagsLeft > 0 && !obj.userData.revealed) {
        const flagGeo = new THREE.TextGeometry('F', {
            font: font,
            size: 0.4,
            height: 0.1
        });
        const flagMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const flagMesh = new THREE.Mesh(flagGeo, flagMaterial);
        flagMesh.position.set(obj.position.x, obj.position.y, 1);
        scene.add(flagMesh);
        obj.userData.flagged = true;
        obj.userData.flagMesh = flagMesh;
        flagsLeft--;
    }
    updateFlagCount();
}

function updateFlagCount() {
    document.getElementById('flagsLeft').textContent = "Flags Left: " + flagsLeft;
}

function startTimer() {
    startTime = Date.now();
    timerInterval = setInterval(updateTimer, 1000);
}

function updateTimer() {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    document.getElementById('timer').textContent = `Time: ${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function resetGame() {
    clearInterval(timerInterval);
    startTimer();
    flagsLeft = 10;  // Reset flag count
    updateFlagCount();
    grid.forEach(row => row.forEach(cube => {
        scene.remove(cube);
        if (cube.userData.flagMesh) {
            scene.remove(cube.userData.flagMesh);
            cube.userData.flagMesh = null;
        }
        if (cube.userData.textMesh) {
            scene.remove(cube.userData.textMesh);
            cube.userData.textMesh = null;
        }
    }));
    grid.length = 0;
    initGrid();
}

function processRevealedTiles(data) {
    data.revealedTiles.forEach(tile => {
        const mesh = grid[tile.x][tile.y];
        mesh.userData.revealed = true;
        mesh.material.color.set(tile.isMine ? 0xff0000 : 0x00ff00);
        if (tile.adjacentMines > 0 && !tile.isMine) {
            addTextToMesh(mesh, tile.adjacentMines.toString());
        }
    });
    if (data.gameOver) {
        alert('Game Over!');
    }
}

function addTextToMesh(mesh, text) {
    if (!font) return;
    const textGeo = new THREE.TextGeometry(text, {
        font: font,
        size: 0.3,
        height: 0.05
    });
    const textMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const textMesh = new THREE.Mesh(textGeo, textMaterial);
    textMesh.position.set(mesh.position.x - 0.2, mesh.position.y, mesh.geometry.parameters.height / 2);
    scene.add(textMesh);
    mesh.userData.textMesh = textMesh;
}

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
