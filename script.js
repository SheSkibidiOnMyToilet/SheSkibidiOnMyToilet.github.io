document.addEventListener('DOMContentLoaded', () => {
    // Canvas setup
    const canvasContainer = document.querySelector('.canvas-container');
    const canvasElements = document.querySelectorAll('.drawing-canvas');
    let activeLayer = 0;
    
    // Zoom and pan functionality
    let zoomLevel = 1;
    let panX = 0;
    let panY = 0;
    const minZoom = 0.1;
    const maxZoom = 5;
    
    // Undo history
    const maxHistorySteps = 50;
    const history = []; // Will store snapshots of all three layers
    let currentHistoryIndex = -1; // Track current position in history
    
    // Drawing state
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;
    let currentTool = 'pen';
    let currentColor = '#000000';
    let lineWidth = 5;
    let opacity = 1;
    let startWidth = 5;
    let endWidth = 5;
    let eraserSize = 20;
    
    // Layer order tracking (index corresponds to z-index, value is the layer number)
    let layerOrder = [0, 1, 2]; // Bottom to top
    
    // Set initial canvas size
    const canvasWidth = 800;
    const canvasHeight = 600;
    
    // Initialize all canvases
    canvasElements.forEach(canvas => {
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        
        const ctx = canvas.getContext('2d');
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    });
    
    // Take initial snapshot of empty canvases
    saveToHistory();
    
    // Apply zoom and pan to canvas container
    function updateCanvasTransform() {
        const transform = `scale(${zoomLevel}) translate(${panX}px, ${panY}px)`;
        canvasElements.forEach(canvas => {
            canvas.style.transform = transform;
        });
        
        // Update canvas background to show edges when zoomed out
        if (zoomLevel < 1 || panX !== 0 || panY !== 0) {
            canvasContainer.classList.add('zoomed-out');
        } else {
            canvasContainer.classList.remove('zoomed-out');
        }
        
        // Update zoom display
        document.getElementById('zoom-level-value').textContent = `${Math.round(zoomLevel * 100)}%`;
        document.getElementById('zoom-slider').value = zoomLevel * 100;
    }
    
    // Zoom functionality
    function setZoom(newZoom, centerX, centerY) {
        // Limit zoom level
        newZoom = Math.max(minZoom, Math.min(maxZoom, newZoom));
        
        // If center point is provided, zoom toward that point
        if (centerX !== undefined && centerY !== undefined) {
            // Calculate current mouse position in canvas space
            const oldZoom = zoomLevel;
            const mouseXInCanvas = (centerX - panX) / oldZoom;
            const mouseYInCanvas = (centerY - panY) / oldZoom;
            
            // Calculate new pan position to keep mouse over same canvas point
            panX = centerX - mouseXInCanvas * newZoom;
            panY = centerY - mouseYInCanvas * newZoom;
        }
        
        zoomLevel = newZoom;
        updateCanvasTransform();
    }
    
    // Add zoom event listeners
    document.getElementById('zoom-slider').addEventListener('input', (e) => {
        setZoom(parseInt(e.target.value) / 100);
    });
    
    // Mouse wheel zoom
    canvasContainer.addEventListener('wheel', (e) => {
        e.preventDefault();
        
        // Get mouse position relative to canvas container
        const rect = canvasContainer.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Determine zoom direction
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        
        // Set new zoom level centered on mouse position
        setZoom(zoomLevel * delta, mouseX, mouseY);
    });
    
    // Pan the canvas with middle mouse button or space+drag
    let isPanning = false;
    let panStartX = 0;
    let panStartY = 0;
    let startPanX = 0;
    let startPanY = 0;
    let spaceKeyDown = false;
    
    // Space key for panning
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && !spaceKeyDown) {
            spaceKeyDown = true;
            canvasContainer.style.cursor = 'grab';
        }
    });
    
    window.addEventListener('keyup', (e) => {
        if (e.code === 'Space') {
            spaceKeyDown = false;
            canvasContainer.style.cursor = currentTool === 'eraser' ? 
                `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="${eraserSize}" height="${eraserSize}" viewBox="0 0 ${eraserSize} ${eraserSize}"><circle cx="${eraserSize/2}" cy="${eraserSize/2}" r="${eraserSize/2 - 1}" fill="white" stroke="black" stroke-width="1"/></svg>') ${eraserSize/2} ${eraserSize/2}, auto` :
                'crosshair';
        }
    });
    
    canvasContainer.addEventListener('mousedown', (e) => {
        // Middle mouse button (button 1) or space+left click for panning
        if (e.button === 1 || (spaceKeyDown && e.button === 0)) {
            e.preventDefault();
            isPanning = true;
            canvasContainer.style.cursor = 'grabbing';
            
            // Store starting position
            panStartX = e.clientX;
            panStartY = e.clientY;
            startPanX = panX;
            startPanY = panY;
        }
    });
    
    window.addEventListener('mousemove', (e) => {
        if (isPanning) {
            e.preventDefault();
            // Calculate how far the mouse has moved
            const dx = e.clientX - panStartX;
            const dy = e.clientY - panStartY;
            
            // Update pan position
            panX = startPanX + dx / zoomLevel;
            panY = startPanY + dy / zoomLevel;
            
            updateCanvasTransform();
        }
    });
    
    window.addEventListener('mouseup', (e) => {
        if (isPanning) {
            isPanning = false;
            canvasContainer.style.cursor = spaceKeyDown ? 'grab' : 
                (currentTool === 'eraser' ? 
                    `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="${eraserSize}" height="${eraserSize}" viewBox="0 0 ${eraserSize} ${eraserSize}"><circle cx="${eraserSize/2}" cy="${eraserSize/2}" r="${eraserSize/2 - 1}" fill="white" stroke="black" stroke-width="1"/></svg>') ${eraserSize/2} ${eraserSize/2}, auto` :
                    'crosshair');
        }
    });
    
    // Reset zoom and pan
    document.getElementById('reset-zoom').addEventListener('click', () => {
        zoomLevel = 1;
        panX = 0;
        panY = 0;
        updateCanvasTransform();
    });
    
    // Update canvas order
    function updateCanvasOrder() {
        layerOrder.forEach((layerNum, index) => {
            const canvas = document.getElementById(`layer-${layerNum}`);
            canvas.style.zIndex = index; // Higher index = higher in the stack
        });
        
        // Update layer display in the side menu to reflect the visual order
        updateLayerDisplayOrder();
    }
    
    // Update the layer display in the side menu to match the actual layer order
    function updateLayerDisplayOrder() {
        const layersContainer = document.querySelector('.layers-container');
        const layerElements = Array.from(document.querySelectorAll('.layer'));
        
        // Rearrange elements in reverse order (top layer first in the list)
        const reversedOrder = [...layerOrder].reverse();
        
        // Clear the container
        while (layersContainer.firstChild) {
            layersContainer.removeChild(layersContainer.firstChild);
        }
        
        // Re-add elements in the correct order
        reversedOrder.forEach(layerNum => {
            const layer = layerElements.find(el => parseInt(el.dataset.layer) === layerNum);
            if (layer) {
                layersContainer.appendChild(layer);
            }
        });
    }
    
    // Initialize canvas order
    updateCanvasOrder();
    
    // Get active canvas and context
    const getActiveCanvas = () => document.getElementById(`layer-${activeLayer}`);
    const getActiveContext = () => getActiveCanvas().getContext('2d');
    
    // Drawing functions
    function startDrawing(e) {
        // Ignore if we're panning or if it's not the left mouse button or space is pressed
        if (isPanning || e.button !== 0 || spaceKeyDown) return;
        
        const canvas = getActiveCanvas();
        const rect = canvas.getBoundingClientRect();
        
        // Calculate correct coordinates accounting for zoom and pan
        lastX = (e.clientX - rect.left) / zoomLevel - panX;
        lastY = (e.clientY - rect.top) / zoomLevel - panY;
        
        // Check if coordinates are within canvas bounds
        if (lastX < 0 || lastX >= canvas.width || lastY < 0 || lastY >= canvas.height) return;
        
        isDrawing = true;
        
        // Take a snapshot before starting to draw
        if (currentTool !== 'eyedropper') {
            saveToHistory();
        }
        
        const ctx = getActiveContext();
        ctx.globalAlpha = opacity;
        
        // Set up context based on current tool
        switch (currentTool) {
            case 'pen':
                ctx.strokeStyle = currentColor;
                ctx.lineWidth = lineWidth;
                ctx.beginPath();
                ctx.moveTo(lastX, lastY);
                break;
                
            case 'pencil':
                ctx.fillStyle = currentColor;
                drawPencilLine(ctx, lastX, lastY, lastX, lastY);
                break;
                
            case 'marker':
                ctx.strokeStyle = currentColor;
                ctx.lineWidth = lineWidth;
                ctx.globalAlpha = 0.2;  // Low opacity for marker effect
                ctx.beginPath();
                ctx.moveTo(lastX, lastY);
                ctx.lineTo(lastX, lastY);
                ctx.stroke();
                break;
                
            case 'eraser':
                ctx.globalCompositeOperation = 'destination-out';
                ctx.lineWidth = eraserSize;
                ctx.beginPath();
                ctx.moveTo(lastX, lastY);
                break;
                
            case 'eyedropper':
                pickColor(e);
                isDrawing = false;
                break;
                
            case 'fill':
                fillArea(e);
                isDrawing = false;
                break;
        }
    }
    
    function draw(e) {
        if (!isDrawing) return;
        
        const canvas = getActiveCanvas();
        const ctx = getActiveContext();
        const rect = canvas.getBoundingClientRect();
        
        // Calculate current position with zoom and pan correction
        const currentX = (e.clientX - rect.left) / zoomLevel - panX;
        const currentY = (e.clientY - rect.top) / zoomLevel - panY;
        
        // Check if coordinates are within canvas bounds
        if (currentX < 0 || currentX >= canvas.width || currentY < 0 || currentY >= canvas.height) {
            // Allow drawing to continue outside bounds, but clamp coordinates
            const clampedX = Math.max(0, Math.min(canvas.width, currentX));
            const clampedY = Math.max(0, Math.min(canvas.height, currentY));
            
            switch (currentTool) {
                case 'pen':
                case 'marker':
                    ctx.lineTo(clampedX, clampedY);
                    ctx.stroke();
                    break;
            }
            return;
        }
        
        switch (currentTool) {
            case 'pen':
                ctx.globalAlpha = opacity;
                ctx.lineTo(currentX, currentY);
                ctx.stroke();
                break;
                
            case 'pencil':
                ctx.globalAlpha = opacity;
                drawPencilLine(ctx, lastX, lastY, currentX, currentY);
                break;
                
            case 'marker':
                ctx.globalAlpha = 0.2;  // Low opacity for marker effect
                ctx.lineTo(currentX, currentY);
                ctx.stroke();
                break;
                
            case 'eraser':
                ctx.globalCompositeOperation = 'destination-out';
                ctx.lineTo(currentX, currentY);
                ctx.stroke();
                break;
        }
        
        lastX = currentX;
        lastY = currentY;
    }
    
    function stopDrawing() {
        if (isDrawing) {
            const ctx = getActiveContext();
            
            // Reset composite operation if using eraser
            if (currentTool === 'eraser') {
                ctx.globalCompositeOperation = 'source-over';
            }
            
            if (currentTool === 'pen' || currentTool === 'marker') {
                ctx.closePath();
            }
            
            // Reset opacity
            ctx.globalAlpha = 1.0;
        }
        
        isDrawing = false;
    }
    
    // Pencil effect with grainy texture
    function drawPencilLine(ctx, x1, y1, x2, y2) {
        const originalGlobalAlpha = ctx.globalAlpha;
        ctx.fillStyle = currentColor;
        
        const distance = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        const points = Math.max(Math.ceil(distance), 1);
        
        // Draw grainy dots along the line
        for (let i = 0; i < points; i++) {
            const ratio = i / points;
            const x = x1 + (x2 - x1) * ratio;
            const y = y1 + (y2 - y1) * ratio;
            
            // Add some randomness for grainy effect
            const jitterX = (Math.random() - 0.5) * lineWidth * 0.3;
            const jitterY = (Math.random() - 0.5) * lineWidth * 0.3;
            
            ctx.globalAlpha = opacity * (Math.random() * 0.3 + 0.7);  // Vary opacity for grainy effect
            
            ctx.beginPath();
            ctx.arc(x + jitterX, y + jitterY, Math.random() * lineWidth * 0.3, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Return opacity to normal
        ctx.globalAlpha = originalGlobalAlpha;
    }
    
    // Event listeners for drawing
    canvasContainer.addEventListener('mousedown', startDrawing);
    canvasContainer.addEventListener('mousemove', draw);
    canvasContainer.addEventListener('mouseup', stopDrawing);
    canvasContainer.addEventListener('mouseout', stopDrawing);
    
    // Prevent context menu on right-click
    canvasContainer.addEventListener('contextmenu', e => e.preventDefault());
    
    // Tool selection
    const toolButtons = document.querySelectorAll('.tool-btn');
    toolButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons
            toolButtons.forEach(btn => {
                btn.classList.remove('active');
                btn.classList.remove('previous');
            });
            
            // Add previous class to the currently active tool if it's not eyedropper
            const currentActive = document.querySelector('.tool-btn.active');
            if (currentActive && currentActive.id !== 'eyedropper-tool') {
                currentActive.classList.add('previous');
            }
            
            // Add active class to clicked button
            button.classList.add('active');
            
            // Set current tool
            currentTool = button.id.replace('-tool', '');
            
            // Update cursor based on tool
            if (currentTool === 'eraser') {
                canvasContainer.style.cursor = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="${eraserSize}" height="${eraserSize}" viewBox="0 0 ${eraserSize} ${eraserSize}"><circle cx="${eraserSize/2}" cy="${eraserSize/2}" r="${eraserSize/2 - 1}" fill="white" stroke="black" stroke-width="1"/></svg>') ${eraserSize/2} ${eraserSize/2}, auto`;
            } else if (currentTool === 'eyedropper') {
                canvasContainer.style.cursor = 'crosshair';
            } else if (currentTool === 'fill') {
                canvasContainer.style.cursor = 'cell';
            } else {
                canvasContainer.style.cursor = 'crosshair';
            }
        });
    });
    
    // Layer selection
    const layerElements = document.querySelectorAll('.layer');
    layerElements.forEach(layer => {
        layer.addEventListener('click', (event) => {
            // Don't switch layers if just toggling visibility or opacity or clicking move buttons
            if (event.target.type === 'checkbox' || 
                event.target.type === 'range' || 
                event.target.tagName === 'BUTTON' || 
                event.target.tagName === 'I') return;
            
            // Remove active class from all layers
            layerElements.forEach(l => l.classList.remove('active'));
            canvasElements.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked layer
            layer.classList.add('active');
            
            // Set active layer
            activeLayer = parseInt(layer.dataset.layer);
            
            // Set active canvas
            document.getElementById(`layer-${activeLayer}`).classList.add('active');
        });
    });
    
    // Layer visibility
    document.querySelectorAll('[id^="layer-"][id$="-visible"]').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            const layerNum = checkbox.id.match(/layer-(\d+)-visible/)[1];
            const canvas = document.getElementById(`layer-${layerNum}`);
            
            // Save state before changing visibility
            saveToHistory();
            
            if (checkbox.checked) {
                canvas.style.display = 'block';
            } else {
                canvas.style.display = 'none';
            }
        });
    });
    
    // Layer opacity
    document.querySelectorAll('[id^="layer-"][id$="-opacity"]').forEach(slider => {
        slider.addEventListener('input', () => {
            const layerNum = slider.id.match(/layer-(\d+)-opacity/)[1];
            const canvas = document.getElementById(`layer-${layerNum}`);
            const value = slider.value;
            
            // Update opacity value display
            document.getElementById(`layer-${layerNum}-opacity-value`).textContent = `${value}%`;
            
            // Set canvas opacity
            canvas.style.opacity = value / 100;
        });
        
        // Save state after opacity change is complete (on mouseup)
        slider.addEventListener('change', () => {
            saveToHistory();
        });
    });
    
    // Layer movement controls
    document.querySelectorAll('.layer-up, .layer-down').forEach(button => {
        button.addEventListener('click', (e) => {
            const layerNum = parseInt(button.dataset.layer);
            const isUp = button.classList.contains('layer-up');
            
            // Find the current position of this layer in the order
            const currentIndex = layerOrder.indexOf(layerNum);
            
            // Calculate the new index
            let newIndex = isUp ? currentIndex + 1 : currentIndex - 1;
            
            // Check bounds
            if (newIndex < 0 || newIndex >= layerOrder.length) return;
            
            // Save current state before moving layers
            saveToHistory();
            
            // Swap this layer with the one at the new index
            const otherLayer = layerOrder[newIndex];
            layerOrder[newIndex] = layerNum;
            layerOrder[currentIndex] = otherLayer;
            
            // Update canvas z-index
            updateCanvasOrder();
        });
    });
    
    // Color picker
    const colorPicker = document.getElementById('color-picker');
    const hexColorInput = document.getElementById('hex-color');
    
    colorPicker.addEventListener('input', () => {
        currentColor = colorPicker.value;
        hexColorInput.value = currentColor;
    });
    
    hexColorInput.addEventListener('input', () => {
        // Validate hex color code
        const hex = hexColorInput.value;
        if (/^#[0-9A-F]{6}$/i.test(hex)) {
            currentColor = hex;
            colorPicker.value = currentColor;
        }
    });
    
    // Sliders
    const lineWidthSlider = document.getElementById('line-width');
    const lineWidthValue = document.getElementById('line-width-value');
    
    lineWidthSlider.addEventListener('input', () => {
        lineWidth = parseInt(lineWidthSlider.value);
        lineWidthValue.textContent = `${lineWidth}px`;
        
        // Update start and end width sliders to match if they're the same
        if (startWidth === endWidth) {
            startWidthSlider.value = lineWidth;
            endWidthSlider.value = lineWidth;
            startWidthValue.textContent = `${lineWidth}px`;
            endWidthValue.textContent = `${lineWidth}px`;
            startWidth = lineWidth;
            endWidth = lineWidth;
        }
    });
    
    const opacitySlider = document.getElementById('opacity');
    const opacityValue = document.getElementById('opacity-value');
    
    opacitySlider.addEventListener('input', () => {
        opacity = parseInt(opacitySlider.value) / 100;
        opacityValue.textContent = `${opacitySlider.value}%`;
    });
    
    const startWidthSlider = document.getElementById('start-width');
    const startWidthValue = document.getElementById('start-width-value');
    
    startWidthSlider.addEventListener('input', () => {
        startWidth = parseInt(startWidthSlider.value);
        startWidthValue.textContent = `${startWidth}px`;
    });
    
    const endWidthSlider = document.getElementById('end-width');
    const endWidthValue = document.getElementById('end-width-value');
    
    endWidthSlider.addEventListener('input', () => {
        endWidth = parseInt(endWidthSlider.value);
        endWidthValue.textContent = `${endWidth}px`;
    });
    
    const eraserSizeSlider = document.getElementById('eraser-size');
    const eraserSizeValue = document.getElementById('eraser-size-value');
    
    eraserSizeSlider.addEventListener('input', () => {
        eraserSize = parseInt(eraserSizeSlider.value);
        eraserSizeValue.textContent = `${eraserSize}px`;
        
        // Update eraser cursor
        if (currentTool === 'eraser') {
            canvasContainer.style.cursor = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="${eraserSize}" height="${eraserSize}" viewBox="0 0 ${eraserSize} ${eraserSize}"><circle cx="${eraserSize/2}" cy="${eraserSize/2}" r="${eraserSize/2 - 1}" fill="white" stroke="black" stroke-width="1"/></svg>') ${eraserSize/2} ${eraserSize/2}, auto`;
        }
    });
    
    // Canvas resize
    const canvasWidthInput = document.getElementById('canvas-width');
    const canvasHeightInput = document.getElementById('canvas-height');
    const resizeButton = document.getElementById('resize-canvas');
    
    resizeButton.addEventListener('click', () => {
        const newWidth = parseInt(canvasWidthInput.value);
        const newHeight = parseInt(canvasHeightInput.value);
        
        if (newWidth < 100 || newWidth > 2000 || newHeight < 100 || newHeight > 2000) {
            alert('Canvas dimensions must be between 100 and 2000 pixels.');
            return;
        }
        
        // Save state before resize
        saveToHistory();
        
        // For each canvas, create a temporary canvas to hold the current content
        canvasElements.forEach(canvas => {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.drawImage(canvas, 0, 0);
            
            // Resize the canvas
            canvas.width = newWidth;
            canvas.height = newHeight;
            
            // Draw the original content back
            const ctx = canvas.getContext('2d');
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.drawImage(tempCanvas, 0, 0);
        });
    });
    
    // Clear canvas
    const clearButton = document.getElementById('clear-canvas');
    
    clearButton.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear the current layer?')) {
            // Save state before clearing
            saveToHistory();
            
            const canvas = getActiveCanvas();
            const ctx = getActiveContext();
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    });
    
    // Eyedropper function
    function pickColor(e) {
        // Get layers in visual order (top to bottom)
        const orderedLayers = [...layerOrder].reverse();
        
        // Check each layer from top to bottom
        for (const layerNum of orderedLayers) {
            const canvas = document.getElementById(`layer-${layerNum}`);
            
            // Skip if layer is hidden
            if (canvas.style.display === 'none') continue;
            
            const rect = canvas.getBoundingClientRect();
            
            // Apply the inverse of the transform to get the correct canvas coordinates
            const x = Math.floor((e.clientX - rect.left) / zoomLevel - panX);
            const y = Math.floor((e.clientY - rect.top) / zoomLevel - panY);
            
            // Check if coordinates are within canvas bounds
            if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) continue;
            
            try {
                const ctx = canvas.getContext('2d');
                const pixel = ctx.getImageData(x, y, 1, 1).data;
                
                // Only pick color if pixel is not transparent
                if (pixel[3] > 0) {
                    // Convert to hex, padding with zeros as needed
                    const r = pixel[0].toString(16).padStart(2, '0');
                    const g = pixel[1].toString(16).padStart(2, '0');
                    const b = pixel[2].toString(16).padStart(2, '0');
                    const color = `#${r}${g}${b}`;
                    
                    currentColor = color;
                    colorPicker.value = color;
                    hexColorInput.value = color;
                    
                    // Switch back to the previously used tool
                    const previousToolBtn = document.querySelector('.tool-btn.previous');
                    if (previousToolBtn) {
                        previousToolBtn.click();
                    } else {
                        // Default back to pen tool
                        document.getElementById('pen-tool').click();
                    }
                    break;
                }
            } catch (error) {
                console.error('Error picking color:', error);
            }
        }
    }
    
    // Fill function
    function fillArea(e) {
        const canvas = getActiveCanvas();
        const ctx = getActiveContext();
        
        const rect = canvas.getBoundingClientRect();
        
        // Apply the inverse of the transform to get the correct canvas coordinates
        const startX = Math.floor((e.clientX - rect.left) / zoomLevel - panX);
        const startY = Math.floor((e.clientY - rect.top) / zoomLevel - panY);
        
        // Check if coordinates are within canvas bounds
        if (startX < 0 || startX >= canvas.width || startY < 0 || startY >= canvas.height) return;
        
        // Get canvas data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Get the color at the clicked position
        const targetColor = getColorAtPixel(data, startX, startY, canvas.width);
        
        // Parse the selected color
        const fillColor = hexToRgb(currentColor);
        fillColor.a = Math.round(opacity * 255);
        
        // Don't fill if colors are the same
        if (colorMatch(targetColor, fillColor)) return;
        
        // Perform flood fill
        floodFill(data, startX, startY, targetColor, fillColor, canvas.width, canvas.height);
        
        // Update canvas with filled data
        ctx.putImageData(imageData, 0, 0);
    }
    
    // Helper function for flood fill
    function getColorAtPixel(data, x, y, width) {
        const index = (y * width + x) * 4;
        return {
            r: data[index],
            g: data[index + 1],
            b: data[index + 2],
            a: data[index + 3]
        };
    }
    
    // Helper function to convert hex to RGB
    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
            a: 255
        } : null;
    }
    
    // Helper function to check if colors match with a tolerance
    function colorMatch(a, b, tolerance = 10) {
        return Math.abs(a.r - b.r) <= tolerance &&
               Math.abs(a.g - b.g) <= tolerance &&
               Math.abs(a.b - b.b) <= tolerance &&
               Math.abs(a.a - b.a) <= tolerance;
    }
    
    // Flood fill algorithm
    function floodFill(data, x, y, targetColor, fillColor, width, height) {
        const stack = [{x, y}];
        const visited = new Set();
        
        while (stack.length > 0) {
            const {x, y} = stack.pop();
            const index = (y * width + x) * 4;
            const key = `${x},${y}`;
            
            // Skip if out of bounds, already visited, or color doesn't match target
            if (x < 0 || y < 0 || x >= width || y >= height || visited.has(key)) {
                continue;
            }
            
            const color = {
                r: data[index],
                g: data[index + 1],
                b: data[index + 2],
                a: data[index + 3]
            };
            
            if (!colorMatch(color, targetColor)) {
                continue;
            }
            
            // Set this pixel to the fill color
            data[index] = fillColor.r;
            data[index + 1] = fillColor.g;
            data[index + 2] = fillColor.b;
            data[index + 3] = fillColor.a;
            
            // Mark as visited
            visited.add(key);
            
            // Add neighboring pixels to stack
            stack.push({x: x + 1, y});
            stack.push({x: x - 1, y});
            stack.push({x, y: y + 1});
            stack.push({x, y: y - 1});
        }
    }
    
    // Save current canvas state to history
    function saveToHistory() {
        // If we're not at the end of the history (user has undone actions)
        // then truncate history to current point before adding new state
        if (currentHistoryIndex !== history.length - 1 && currentHistoryIndex !== -1) {
            history.splice(currentHistoryIndex + 1);
        }
        
        // Create a new history entry with snapshots of all three layers
        const historyEntry = {
            canvasStates: [],
            layerOrder: [...layerOrder],
            layerVisibility: [],
            layerOpacity: []
        };
        
        canvasElements.forEach((canvas, i) => {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.drawImage(canvas, 0, 0);
            historyEntry.canvasStates.push(tempCanvas);
            
            // Store visibility
            const isVisible = document.getElementById(`layer-${i}-visible`).checked;
            historyEntry.layerVisibility.push(isVisible);
            
            // Store opacity
            const opacity = parseInt(document.getElementById(`layer-${i}-opacity`).value);
            historyEntry.layerOpacity.push(opacity);
        });
        
        // Add to history
        history.push(historyEntry);
        currentHistoryIndex = history.length - 1;
        
        // Limit history size
        if (history.length > maxHistorySteps) {
            history.shift();
            currentHistoryIndex--;
        }
        
        // Enable undo button if it exists
        if (document.getElementById('undo-button')) {
            document.getElementById('undo-button').disabled = false;
        }
    }
    
    // Undo last action
    function undo() {
        if (history.length <= 1 || currentHistoryIndex <= 0) return; // Keep at least the initial state
        
        // Move back one step in history
        currentHistoryIndex--;
        
        // Get the previous state
        const previousState = history[currentHistoryIndex];
        
        // Restore canvases from the previous state
        canvasElements.forEach((canvas, index) => {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(previousState.canvasStates[index], 0, 0);
            
            // Restore visibility
            const visibilityCheckbox = document.getElementById(`layer-${index}-visible`);
            visibilityCheckbox.checked = previousState.layerVisibility[index];
            canvas.style.display = previousState.layerVisibility[index] ? 'block' : 'none';
            
            // Restore opacity
            const opacitySlider = document.getElementById(`layer-${index}-opacity`);
            opacitySlider.value = previousState.layerOpacity[index];
            document.getElementById(`layer-${index}-opacity-value`).textContent = `${previousState.layerOpacity[index]}%`;
            canvas.style.opacity = previousState.layerOpacity[index] / 100;
        });
        
        // Restore layer order
        layerOrder = [...previousState.layerOrder];
        updateCanvasOrder();
        
        // Disable undo button if we've reached the initial state
        if (currentHistoryIndex <= 0 && document.getElementById('undo-button')) {
            document.getElementById('undo-button').disabled = true;
        }
    }
    
    // Add undo keyboard shortcut (Ctrl+Z)
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
            e.preventDefault();
            undo();
        }
    });
    
    // Expose undo function to window for easy access from HTML
    window.undoDrawingAction = undo;
    
    // Image handling functionality
    const addedImages = [];
    const addImageUpload = document.getElementById('add-image-upload');
    const imagesContainer = document.querySelector('.images-container');
    const noImagesMessage = document.querySelector('.no-images-message');
    
    // Setup image upload from sidebar
    document.getElementById('add-image-btn').addEventListener('click', () => {
        addImageUpload.click();
    });
    
    // Handle image upload from sidebar
    addImageUpload.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            loadAndAddImage(file);
            e.target.value = ''; // Reset the file input
        }
    });
    
    // Load and add image to canvas and sidebar
    function loadAndAddImage(file) {
        const reader = new FileReader();
        
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                // Save state before adding image
                saveToHistory();
                
                // Add image to the active canvas
                const canvas = getActiveCanvas();
                const ctx = getActiveContext();
                
                // Position the image in the center of the canvas
                const x = (canvas.width - img.width) / 2;
                const y = (canvas.height - img.height) / 2;
                
                // Draw the image
                ctx.globalAlpha = opacity;
                ctx.drawImage(img, x, y);
                ctx.globalAlpha = 1.0;
                
                // Add image to the sidebar
                addImageToSidebar(event.target.result, img);
            };
            img.src = event.target.result;
        };
        
        reader.readAsDataURL(file);
    }
    
    // Add image thumbnail to sidebar
    function addImageToSidebar(dataUrl, imgElement) {
        // Hide no images message
        noImagesMessage.style.display = 'none';
        
        // Create image ID
        const imageId = 'img-' + Date.now();
        
        // Create thumbnail element
        const thumbnail = document.createElement('div');
        thumbnail.className = 'image-thumbnail';
        thumbnail.setAttribute('data-image-id', imageId);
        
        // Create the image element
        const img = document.createElement('img');
        img.src = dataUrl;
        thumbnail.appendChild(img);
        
        // Create delete button
        const deleteBtn = document.createElement('div');
        deleteBtn.className = 'delete-image';
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        thumbnail.appendChild(deleteBtn);
        
        // Store image data
        addedImages.push({
            id: imageId,
            dataUrl: dataUrl,
            element: imgElement
        });
        
        // Add click event for editing
        thumbnail.addEventListener('click', (e) => {
            if (e.target.closest('.delete-image')) {
                // Clicked on delete button
                deleteImage(imageId);
            } else {
                // Clicked on the thumbnail itself
                openImageEditor(imageId);
            }
        });
        
        // Add to container
        imagesContainer.appendChild(thumbnail);
    }
    
    // Delete image from sidebar
    function deleteImage(imageId) {
        // Find the image in our array
        const imageIndex = addedImages.findIndex(img => img.id === imageId);
        
        if (imageIndex !== -1) {
            // Remove from DOM
            const thumbnail = document.querySelector(`.image-thumbnail[data-image-id="${imageId}"]`);
            if (thumbnail) {
                thumbnail.remove();
            }
            
            // Remove from array
            addedImages.splice(imageIndex, 1);
            
            // Show the no images message if no images are left
            if (addedImages.length === 0) {
                noImagesMessage.style.display = 'block';
            }
        }
    }
    
    // Image Editor Modal
    const imageEditModal = document.getElementById('image-edit-modal');
    const imageEditCanvas = document.getElementById('image-edit-canvas');
    const imageEditCtx = imageEditCanvas.getContext('2d');
    let currentEditingImage = null;
    let cropMode = false;
    let cropStart = { x: 0, y: 0 };
    let cropEnd = { x: 0, y: 0 };
    
    // Open image editor
    function openImageEditor(imageId) {
        const image = addedImages.find(img => img.id === imageId);
        
        if (image) {
            currentEditingImage = image;
            
            // Set up canvas size
            imageEditCanvas.width = image.element.width;
            imageEditCanvas.height = image.element.height;
            
            // Clear canvas and draw image
            imageEditCtx.clearRect(0, 0, imageEditCanvas.width, imageEditCanvas.height);
            imageEditCtx.drawImage(image.element, 0, 0);
            
            // Show modal
            imageEditModal.style.display = 'flex';
        }
    }
    
    // Close image editor modal
    document.querySelectorAll('#image-edit-modal .close-modal, #cancel-image-edit').forEach(element => {
        element.addEventListener('click', () => {
            imageEditModal.style.display = 'none';
            cropMode = false;
            currentEditingImage = null;
        });
    });
    
    // Apply image edits
    document.getElementById('apply-image-edit').addEventListener('click', () => {
        if (currentEditingImage) {
            // Save current state before editing
            saveToHistory();
            
            // Create a new image from the edited canvas
            const newImage = new Image();
            newImage.onload = () => {
                // Update the image in our array
                currentEditingImage.element = newImage;
                currentEditingImage.dataUrl = imageEditCanvas.toDataURL();
                
                // Update the thumbnail
                const thumbnail = document.querySelector(`.image-thumbnail[data-image-id="${currentEditingImage.id}"] img`);
                if (thumbnail) {
                    thumbnail.src = currentEditingImage.dataUrl;
                }
                
                // Draw the edited image to the current layer
                const canvas = getActiveCanvas();
                const ctx = getActiveContext();
                
                // Position the image in the center of the canvas
                const x = (canvas.width - newImage.width) / 2;
                const y = (canvas.height - newImage.height) / 2;
                
                // Draw the image
                ctx.globalAlpha = opacity;
                ctx.drawImage(newImage, x, y);
                ctx.globalAlpha = 1.0;
                
                // Close modal
                imageEditModal.style.display = 'none';
                currentEditingImage = null;
                cropMode = false;
            };
            newImage.src = imageEditCanvas.toDataURL();
        }
    });
    
    // Handle crop button
    document.getElementById('crop-image-btn').addEventListener('click', () => {
        cropMode = true;
        alert('Click and drag on the image to select the crop area');
    });
    
    // Handle remove button
    document.getElementById('remove-image-btn').addEventListener('click', () => {
        if (currentEditingImage) {
            if (confirm('Are you sure you want to remove this image?')) {
                deleteImage(currentEditingImage.id);
                imageEditModal.style.display = 'none';
                currentEditingImage = null;
                cropMode = false;
            }
        }
    });
    
    // Handle crop selection
    imageEditCanvas.addEventListener('mousedown', (e) => {
        if (!cropMode || !currentEditingImage) return;
        
        const rect = imageEditCanvas.getBoundingClientRect();
        cropStart.x = e.clientX - rect.left;
        cropStart.y = e.clientY - rect.top;
        
        imageEditCanvas.addEventListener('mousemove', handleCropMove);
        window.addEventListener('mouseup', handleCropEnd);
    });
    
    function handleCropMove(e) {
        if (!cropMode || !currentEditingImage) return;
        
        const rect = imageEditCanvas.getBoundingClientRect();
        cropEnd.x = e.clientX - rect.left;
        cropEnd.y = e.clientY - rect.top;
        
        // Redraw the image with crop overlay
        redrawWithCrop();
    }
    
    function handleCropEnd() {
        imageEditCanvas.removeEventListener('mousemove', handleCropMove);
        window.removeEventListener('mouseup', handleCropEnd);
        
        if (cropMode && currentEditingImage) {
            // Apply the crop
            applyCrop();
            cropMode = false;
        }
    }
    
    function redrawWithCrop() {
        // Clear canvas
        imageEditCtx.clearRect(0, 0, imageEditCanvas.width, imageEditCanvas.height);
        
        // Draw the original image
        imageEditCtx.drawImage(currentEditingImage.element, 0, 0);
        
        // Calculate crop coordinates
        const x = Math.min(cropStart.x, cropEnd.x);
        const y = Math.min(cropStart.y, cropEnd.y);
        const width = Math.abs(cropEnd.x - cropStart.x);
        const height = Math.abs(cropEnd.y - cropStart.y);
        
        // Draw crop overlay
        imageEditCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        imageEditCtx.fillRect(0, 0, imageEditCanvas.width, imageEditCanvas.height);
        
        // Clear the crop area
        imageEditCtx.clearRect(x, y, width, height);
        
        // Draw border around crop area
        imageEditCtx.strokeStyle = '#fff';
        imageEditCtx.lineWidth = 2;
        imageEditCtx.strokeRect(x, y, width, height);
    }
    
    function applyCrop() {
        // Calculate crop coordinates
        const x = Math.min(cropStart.x, cropEnd.x);
        const y = Math.min(cropStart.y, cropEnd.y);
        const width = Math.abs(cropEnd.x - cropStart.x);
        const height = Math.abs(cropEnd.y - cropStart.y);
        
        // Check if crop area is valid
        if (width < 10 || height < 10) {
            alert('Crop area is too small. Please try again.');
            return;
        }
        
        // Create a temporary canvas for the cropped image
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');
        
        // Draw the cropped portion
        tempCtx.drawImage(
            imageEditCanvas,
            x, y, width, height,
            0, 0, width, height
        );
        
        // Resize the edit canvas
        imageEditCanvas.width = width;
        imageEditCanvas.height = height;
        
        // Draw the cropped image to the edit canvas
        imageEditCtx.drawImage(tempCanvas, 0, 0);
    }
    
    // Settings Modal
    const settingsModal = document.getElementById('settings-modal');
    const settingsBtn = document.getElementById('settings-btn');
    const closeSettings = settingsModal.querySelector('.close-modal');
    
    // Open settings modal
    settingsBtn.addEventListener('click', () => {
        settingsModal.style.display = 'flex';
    });
    
    // Close settings modal
    closeSettings.addEventListener('click', () => {
        settingsModal.style.display = 'none';
    });
    
    // Theme Toggle
    const lightThemeBtn = document.getElementById('light-theme-btn');
    const darkThemeBtn = document.getElementById('dark-theme-btn');
    
    // Set theme from localStorage or default to light
    function setInitialTheme() {
        const savedTheme = localStorage.getItem('drawingAppTheme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-theme');
            lightThemeBtn.classList.remove('active');
            darkThemeBtn.classList.add('active');
        } else {
            document.body.classList.remove('dark-theme');
            lightThemeBtn.classList.add('active');
            darkThemeBtn.classList.remove('active');
        }
    }
    
    // Set initial theme
    setInitialTheme();
    
    // Theme buttons event listeners
    lightThemeBtn.addEventListener('click', () => {
        document.body.classList.remove('dark-theme');
        localStorage.setItem('drawingAppTheme', 'light');
        lightThemeBtn.classList.add('active');
        darkThemeBtn.classList.remove('active');
    });
    
    darkThemeBtn.addEventListener('click', () => {
        document.body.classList.add('dark-theme');
        localStorage.setItem('drawingAppTheme', 'dark');
        lightThemeBtn.classList.remove('active');
        darkThemeBtn.classList.add('active');
    });
    
    // Update canvas transform when window is resized
    window.addEventListener('resize', () => {
        updateCanvasTransform();
    });
    
    // Initialize canvas transform
    updateCanvasTransform();
}); 