document.addEventListener('DOMContentLoaded', async () => {
    const app = new PIXI.Application();
    await app.init({
        width: window.innerWidth,
        height: window.innerHeight,
        backgroundColor: 0x1C1C1F, // page background
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
    });
    document.body.appendChild(app.view);
    app.stage.sortableChildren = true; // Enable zIndex sorting

    const circleSize = 12;
    const circleRadius = circleSize / 2;
    const gap = 12;
    const numCirclesToConnect = 6;
    const connectionRadius = 200; // User requested 200px

    const colors = {
        inactive: 0x27272B,
        hovered: 0xD4D4DA, // User requested #ccc
        connected: 0x57575C, // Updated to #ccc
        line: 0x999999     // User requested #ccc
    };

    // --- performance helpers --------------------------------------------------
    let offsetX = 0;
    let offsetY = 0;
    let cols = 0;
    let rows = 0;
    const step = circleSize + gap;

    // single white circle texture reused by all dots
    const baseGfx = new PIXI.Graphics();
    baseGfx.circle(0, 0, circleRadius).fill(0xffffff);
    const circleTexture = app.renderer.generateTexture(baseGfx);
    // --------------------------------------------------------------------------

    let circlesData = []; // { sprite: PIXI.Sprite, x:number, y:number, id:string, isHovered:boolean, isConnected:boolean }
    let lineGraphics = new PIXI.Graphics();
    lineGraphics.zIndex = 1; // Ensure lines are on top of circles
    app.stage.addChild(lineGraphics);

    let hoveredCircleData = null;
    let connectedCircles = []; // currently connected circles

    function shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    }

    function setHoveredCircle(newHover) {
        if (hoveredCircleData === newHover) return;
        if (hoveredCircleData) hoveredCircleData.isHovered = false;
        hoveredCircleData = newHover;
        if (hoveredCircleData) hoveredCircleData.isHovered = true;
        updateConnections();
        drawScene(); // repaint only once
    }

    function updateConnections() {
        // Clear connection flags first
        circlesData.forEach(c => c.isConnected = false);
        if (!hoveredCircleData) {
            connectedCircles = [];
            return;
        }
        // Keep existing connected circles that are still in radius
        const stillValid = connectedCircles.filter(c => getDistance(c, hoveredCircleData) <= connectionRadius);
        const needed = numCirclesToConnect - stillValid.length;
        const pool = findCirclesInRadius(hoveredCircleData).filter(c => !stillValid.includes(c));
        shuffle(pool);
        const additions = pool.slice(0, needed);
        connectedCircles = [...stillValid, ...additions];
        connectedCircles.forEach(c => (c.isConnected = true));
    }

    function drawScene() {
        // lines
        lineGraphics.clear();
        if (hoveredCircleData && connectedCircles.length) {
            connectedCircles.forEach(n => {
                lineGraphics.moveTo(n.x, n.y);
                lineGraphics.lineTo(hoveredCircleData.x, hoveredCircleData.y);
            });
            lineGraphics.stroke({ width: 1, color: colors.line, alpha: 1, pixelLine: true });
        }
        // circles color update
        circlesData.forEach(c => {
            let col = colors.inactive;
            if (c.isHovered)      col = colors.hovered;
            else if (c.isConnected) col = colors.connected;
            c.sprite.tint = col;
        });
    }

    function populateGrid() {
        // destroy previous sprites
        circlesData.forEach(c => c.sprite.destroy());
        circlesData = [];

        const availableWidth = app.screen.width;
        const availableHeight = app.screen.height;

        const contentWidth = availableWidth - gap * 2;
        const contentHeight = availableHeight - gap * 2;

        cols = Math.max(1, Math.floor(contentWidth / step));
        rows = Math.max(1, Math.floor(contentHeight / step));

        const totalGridWidth  = cols * circleSize + (cols - 1) * gap;
        const totalGridHeight = rows * circleSize + (rows - 1) * gap;

        offsetX = (availableWidth  - totalGridWidth)  / 2;
        offsetY = (availableHeight - totalGridHeight) / 2;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const x = offsetX + c * step + circleRadius;
                const y = offsetY + r * step + circleRadius;

                const sprite = new PIXI.Sprite(circleTexture);
                sprite.anchor.set(0.5);
                sprite.x = x;
                sprite.y = y;
                sprite.zIndex = 0;
                sprite.tint = colors.inactive;

                circlesData.push({
                    sprite,
                    x,
                    y,
                    id: `circle-${r}-${c}`,
                    isHovered: false,
                    isConnected: false,
                });

                app.stage.addChild(sprite);
            }
        }
    }

    function handlePointerMove(e) {
        const g = e.data?.global || e.global;
        const col = Math.floor((g.x - offsetX) / step);
        const row = Math.floor((g.y - offsetY) / step);

        if (col < 0 || col >= cols || row < 0 || row >= rows) {
            setHoveredCircle(null);
            return;
        }
        setHoveredCircle(circlesData[row * cols + col]);
    }

    app.stage.on('pointermove', handlePointerMove);

    app.stage.eventMode = 'static';
    app.stage.hitArea = app.screen; // Make the stage interactive for global mouse events
    
    // Removed app.stage.on('pointermove') as it wasn't fully utilized and pointerover on circles is primary

    app.view.addEventListener('mouseout', (event) => {
        // Ensure mouse actually left the canvas, not just moving to a child
        if (event.target === app.view && hoveredCircleData) {
            hoveredCircleData.isHovered = false;
            hoveredCircleData = null;
            drawScene();
        }
    });

    function getDistance(circle1, circle2) {
        const dx = circle1.x - circle2.x;
        const dy = circle1.y - circle2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    function findCirclesInRadius(targetCircleData) {
        if (!targetCircleData) return [];
        return circlesData.filter(cData => {
            if (cData === targetCircleData) return false;
            return getDistance(targetCircleData, cData) <= connectionRadius;
        });
    }
    
    function onResize() {
        app.renderer.resize(window.innerWidth, window.innerHeight);
        // When resizing, screen dimensions change, so grid positions need recalculation
        populateGrid(); 
        drawScene(); // Redraw based on new state
    }

    window.addEventListener('resize', onResize);

    populateGrid();
    drawScene(); 
}); 