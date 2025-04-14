document.addEventListener('DOMContentLoaded', () => {
    // Canvas setup
    const canvasContainer = document.querySelector('.canvas-container');
    const canvasElements = document.querySelectorAll('.drawing-canvas');
    let activeLayer = 0;
    
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
            } else {
                canvasContainer.style.cursor = 'crosshair';
            }
        });
    });
    
    // Layer selection
    const layerElements = document.querySelectorAll('.layer');
    layerElements.forEach(layer => {
        layer.addEventListener('click', () => {
            // Don't switch layers if just toggling visibility or opacity
            if (event.target.type === 'checkbox' || event.target.type === 'range') return;
            
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
            const canvas = getActiveCanvas();
            const ctx = getActiveContext();
            ctx.clearRect(0, 0, canvas.width, canvas.height);
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
        // Check all layers from top to bottom
        for (let i = 2; i >= 0; i--) {
            const canvas = document.getElementById(`layer-${i}`);
            
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
    
    // Event listeners
    canvasContainer.addEventListener('mousedown', startDrawing);
    canvasContainer.addEventListener('mousemove', draw);
    canvasContainer.addEventListener('mouseup', stopDrawing);
    canvasContainer.addEventListener('mouseout', stopDrawing);
    
    // Prevent context menu on right-click
    canvasContainer.addEventListener('contextmenu', e => e.preventDefault());
}); 