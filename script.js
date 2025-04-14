document.addEventListener('DOMContentLoaded', () => {
    // Canvas setup
    const canvasContainer = document.querySelector('.canvas-container');
    const canvasElements = document.querySelectorAll('.drawing-canvas');
    let activeLayer = 0;
    
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
    
    // Update canvas z-index based on layer order
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
    
    // Tool selection
    const toolButtons = document.querySelectorAll('.tool-btn');
    toolButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons
            toolButtons.forEach(btn => btn.classList.remove('active'));
            
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
            } else if (currentTool === 'image') {
                canvasContainer.style.cursor = 'copy';
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
    
    // Image upload and placement
    const imageInput = document.getElementById('image-upload');
    
    imageInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            
            reader.onload = (event) => {
                const img = new Image();
                
                img.onload = () => {
                    // Save state before adding image
                    saveToHistory();
                    
                    const canvas = getActiveCanvas();
                    const ctx = getActiveContext();
                    
                    // Calculate position to center the image
                    const x = (canvas.width - img.width) / 2;
                    const y = (canvas.height - img.height) / 2;
                    
                    // Draw the image
                    ctx.drawImage(img, x, y);
                };
                
                img.src = event.target.result;
            };
            
            reader.readAsDataURL(e.target.files[0]);
            
            // Reset the input so the same file can be selected again
            imageInput.value = '';
        }
    });
    
    // Drawing functions
    function startDrawing(e) {
        // Get correct position regardless of scroll
        const rect = getActiveCanvas().getBoundingClientRect();
        const scaleX = getActiveCanvas().width / rect.width;
        const scaleY = getActiveCanvas().height / rect.height;
        
        lastX = (e.clientX - rect.left) * scaleX;
        lastY = (e.clientY - rect.top) * scaleY;
        
        isDrawing = true;
        
        // Take a snapshot before starting to draw
        if (currentTool !== 'eyedropper') {
            saveToHistory();
        }
        
        // For marker tool, we start at the calculated position
        if (currentTool === 'marker') {
            const ctx = getActiveContext();
            ctx.beginPath();
            ctx.moveTo(lastX, lastY);
            ctx.lineTo(lastX, lastY);
            ctx.stroke();
        }
        
        // For eyedropper tool, pick color immediately on mousedown
        if (currentTool === 'eyedropper') {
            pickColor(e);
        }
        
        // For fill tool, fill area immediately on mousedown
        if (currentTool === 'fill') {
            fillArea(e);
        }
        
        // For image tool, trigger file input click
        if (currentTool === 'image') {
            document.getElementById('image-upload').click();
        }
    }
    
    function draw(e) {
        if (!isDrawing) return;
        
        const canvas = getActiveCanvas();
        const ctx = getActiveContext();
        
        // Get correct position regardless of scroll
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        const currentX = (e.clientX - rect.left) * scaleX;
        const currentY = (e.clientY - rect.top) * scaleY;
        
        // Configure context based on current tool
        ctx.globalAlpha = opacity;
        
        switch (currentTool) {
            case 'pen':
                ctx.strokeStyle = currentColor;
                ctx.lineWidth = lineWidth;
                ctx.beginPath();
                ctx.moveTo(lastX, lastY);
                ctx.lineTo(currentX, currentY);
                ctx.stroke();
                break;
                
            case 'pencil':
                drawPencilLine(ctx, lastX, lastY, currentX, currentY);
                break;
                
            case 'marker':
                ctx.strokeStyle = currentColor;
                ctx.lineWidth = lineWidth;
                ctx.globalAlpha = 0.2;  // Low opacity for marker effect
                
                // Draw multiple strokes for marker effect
                ctx.beginPath();
                ctx.moveTo(lastX, lastY);
                ctx.lineTo(currentX, currentY);
                ctx.stroke();
                break;
                
            case 'eraser':
                ctx.globalCompositeOperation = 'destination-out';
                ctx.lineWidth = eraserSize;
                ctx.beginPath();
                ctx.moveTo(lastX, lastY);
                ctx.lineTo(currentX, currentY);
                ctx.stroke();
                ctx.globalCompositeOperation = 'source-over';
                break;
        }
        
        lastX = currentX;
        lastY = currentY;
    }
    
    function stopDrawing() {
        isDrawing = false;
    }
    
    // Pencil effect with grainy texture
    function drawPencilLine(ctx, x1, y1, x2, y2) {
        ctx.strokeStyle = currentColor;
        ctx.lineWidth = lineWidth;
        
        const distance = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        const points = Math.ceil(distance);
        
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
        ctx.globalAlpha = opacity;
    }
    
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
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            
            const x = Math.floor((e.clientX - rect.left) * scaleX);
            const y = Math.floor((e.clientY - rect.top) * scaleY);
            
            try {
                const ctx = canvas.getContext('2d');
                const pixel = ctx.getImageData(x, y, 1, 1).data;
                
                // Only pick color if pixel is not transparent
                if (pixel[3] > 0) {
                    const color = `#${pixel[0].toString(16).padStart(2, '0')}${pixel[1].toString(16).padStart(2, '0')}${pixel[2].toString(16).padStart(2, '0')}`;
                    currentColor = color;
                    colorPicker.value = color;
                    hexColorInput.value = color;
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
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        const startX = Math.floor((e.clientX - rect.left) * scaleX);
        const startY = Math.floor((e.clientY - rect.top) * scaleY);
        
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
    
    // Event listeners
    canvasContainer.addEventListener('mousedown', startDrawing);
    canvasContainer.addEventListener('mousemove', draw);
    canvasContainer.addEventListener('mouseup', stopDrawing);
    canvasContainer.addEventListener('mouseout', stopDrawing);
    
    // Prevent context menu on right-click
    canvasContainer.addEventListener('contextmenu', e => e.preventDefault());
    
    // Expose undo function to window for easy access from HTML
    window.undoDrawingAction = undo;
}); 