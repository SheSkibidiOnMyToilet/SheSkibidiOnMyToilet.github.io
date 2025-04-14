document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const authScreen = document.getElementById('auth-screen');
    const loadingScreen = document.getElementById('loading-screen');
    const drawingApp = document.getElementById('drawing-app');
    const viewOnlyNotice = document.getElementById('view-only-notice');
    
    const loginTab = document.getElementById('login-tab');
    const registerTab = document.getElementById('register-tab');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    const loginButton = document.getElementById('login-button');
    const registerButton = document.getElementById('register-button');
    const guestButton = document.getElementById('guest-button');
    const logoutButton = document.getElementById('logout-button');
    const usernameDisplay = document.getElementById('username-display');
    
    const shareButton = document.getElementById('share-button');
    const shareModal = document.getElementById('share-modal');
    const closeModal = document.querySelector('.close-modal');
    const sharePreviewImage = document.getElementById('share-preview-image');
    const copyLinkBtn = document.getElementById('copy-link-btn');
    const downloadBtn = document.getElementById('download-btn');
    const shareBtns = document.querySelectorAll('.share-btn[data-platform]');
    
    // Auth state
    let currentUser = null;
    let isGuest = true;
    let isViewOnly = false;
    
    // Check for shared drawing ID in URL
    const urlParams = new URLSearchParams(window.location.search);
    const sharedDrawingId = urlParams.get('drawing');
    
    // View-only mode setup
    const loginLink = document.getElementById('login-link');
    const registerLink = document.getElementById('register-link');
    const closeNoticeBtn = document.getElementById('close-notice');
    
    if (loginLink) {
        loginLink.addEventListener('click', (e) => {
            e.preventDefault();
            viewOnlyNotice.style.display = 'none';
            authScreen.style.display = 'flex';
            loginTab.click();
        });
    }
    
    if (registerLink) {
        registerLink.addEventListener('click', (e) => {
            e.preventDefault();
            viewOnlyNotice.style.display = 'none';
            authScreen.style.display = 'flex';
            registerTab.click();
        });
    }
    
    if (closeNoticeBtn) {
        closeNoticeBtn.addEventListener('click', () => {
            viewOnlyNotice.style.display = 'none';
        });
    }
    
    // Tab switching
    loginTab.addEventListener('click', () => {
        loginTab.classList.add('active');
        registerTab.classList.remove('active');
        loginForm.classList.add('active');
        registerForm.classList.remove('active');
    });
    
    registerTab.addEventListener('click', () => {
        registerTab.classList.add('active');
        loginTab.classList.remove('active');
        registerForm.classList.add('active');
        loginForm.classList.remove('active');
    });
    
    // Mock user database (in real app would use backend server)
    const users = JSON.parse(localStorage.getItem('drawingAppUsers') || '[]');
    
    // Mock shared drawings database
    const sharedDrawings = JSON.parse(localStorage.getItem('drawingAppSharedDrawings') || '[]');
    
    // Save users to local storage
    function saveUsers() {
        localStorage.setItem('drawingAppUsers', JSON.stringify(users));
    }
    
    // Save shared drawings to local storage
    function saveSharedDrawings() {
        localStorage.setItem('drawingAppSharedDrawings', JSON.stringify(sharedDrawings));
    }
    
    // Login function
    loginButton.addEventListener('click', () => {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        if (!email || !password) {
            alert('Please enter both email and password.');
            return;
        }
        
        // Find user in "database"
        const user = users.find(u => u.email === email && u.password === password);
        
        if (user) {
            currentUser = user;
            isGuest = false;
            isViewOnly = false;
            startLoadingAnimation();
            
            // Save login state
            localStorage.setItem('drawingAppCurrentUser', JSON.stringify(user));
        } else {
            alert('Invalid email or password.');
        }
    });
    
    // Register function
    registerButton.addEventListener('click', () => {
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const confirm = document.getElementById('register-confirm').value;
        
        if (!name || !email || !password || !confirm) {
            alert('Please fill in all fields.');
            return;
        }
        
        if (password !== confirm) {
            alert('Passwords do not match.');
            return;
        }
        
        // Check if email already exists
        if (users.some(u => u.email === email)) {
            alert('Email already registered.');
            return;
        }
        
        // Create new user
        const newUser = {
            id: Date.now().toString(),
            name,
            email,
            password,
            drawings: []
        };
        
        users.push(newUser);
        saveUsers();
        
        currentUser = newUser;
        isGuest = false;
        isViewOnly = false;
        startLoadingAnimation();
        
        // Save login state
        localStorage.setItem('drawingAppCurrentUser', JSON.stringify(newUser));
    });
    
    // Guest login
    guestButton.addEventListener('click', () => {
        currentUser = null;
        isGuest = true;
        isViewOnly = false;
        startLoadingAnimation();
        
        // Clear any saved login state
        localStorage.removeItem('drawingAppCurrentUser');
    });
    
    // Logout function
    logoutButton.addEventListener('click', () => {
        // Save drawing before logout if user is logged in
        if (!isGuest) {
            saveCurrentDrawing();
        }
        
        // Reset to auth screen
        drawingApp.style.display = 'none';
        authScreen.style.display = 'flex';
        
        // Clear form fields
        document.getElementById('login-email').value = '';
        document.getElementById('login-password').value = '';
        document.getElementById('register-name').value = '';
        document.getElementById('register-email').value = '';
        document.getElementById('register-password').value = '';
        document.getElementById('register-confirm').value = '';
        
        // Reset user state
        currentUser = null;
        isGuest = true;
        isViewOnly = false;
        localStorage.removeItem('drawingAppCurrentUser');
    });
    
    // Loading animation
    function startLoadingAnimation() {
        authScreen.style.display = 'none';
        loadingScreen.style.display = 'flex';
        
        // Show loading animation for 2 seconds (exact 24 fps timing)
        setTimeout(() => {
            loadingScreen.style.display = 'none';
            drawingApp.style.display = 'flex';
            
            // Update username display
            if (isGuest) {
                usernameDisplay.textContent = 'Guest User';
            } else {
                usernameDisplay.textContent = currentUser.name;
            }
            
            // Load drawing data
            if (sharedDrawingId && isViewOnly) {
                // Load shared drawing in view-only mode
                loadSharedDrawing(sharedDrawingId);
                viewOnlyNotice.style.display = 'flex';
                
                // Disable editing tools in view-only mode
                disableEditing();
            } else if (!isGuest) {
                // Load user's saved drawing if they have one
                loadUserDrawing();
            } else if (sharedDrawingId) {
                // Guest viewing a shared drawing
                loadSharedDrawing(sharedDrawingId);
            }
        }, 2000);
    }
    
    // Disable editing in view-only mode
    function disableEditing() {
        // Disable all tool buttons except the ones for viewing
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.disabled = true;
            btn.classList.add('disabled');
        });
        
        // Disable sliders
        document.querySelectorAll('input[type="range"]').forEach(slider => {
            slider.disabled = true;
        });
        
        // Disable canvas clearing and resizing
        document.getElementById('clear-canvas').disabled = true;
        document.getElementById('resize-canvas').disabled = true;
        
        // Disable layer controls
        document.querySelectorAll('.layer-up, .layer-down').forEach(btn => {
            btn.disabled = true;
        });
        
        // Disable share button (can still download)
        document.getElementById('share-button').disabled = true;
        
        // Make canvas non-interactive
        document.querySelector('.canvas-container').style.pointerEvents = 'none';
    }
    
    // Save current drawing for logged-in user
    function saveCurrentDrawing() {
        if (isGuest || !currentUser) return;
        
        const canvasElements = document.querySelectorAll('.drawing-canvas');
        const drawingData = [];
        
        canvasElements.forEach((canvas, index) => {
            drawingData.push({
                index,
                dataUrl: canvas.toDataURL('image/png')
            });
        });
        
        // Find user in the array and update their drawings
        const userIndex = users.findIndex(u => u.id === currentUser.id);
        if (userIndex !== -1) {
            users[userIndex].drawings = drawingData;
            saveUsers();
        }
    }
    
    // Load user's saved drawing
    function loadUserDrawing() {
        if (isGuest || !currentUser || !currentUser.drawings || currentUser.drawings.length === 0) return;
        
        const canvasElements = document.querySelectorAll('.drawing-canvas');
        
        currentUser.drawings.forEach(drawingData => {
            const canvas = canvasElements[drawingData.index];
            if (!canvas) return;
            
            const ctx = canvas.getContext('2d');
            
            const img = new Image();
            img.onload = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
            };
            img.src = drawingData.dataUrl;
        });
    }
    
    // Load a shared drawing
    function loadSharedDrawing(drawingId) {
        const sharedDrawing = sharedDrawings.find(d => d.id === drawingId);
        
        if (!sharedDrawing) return;
        
        const canvasElements = document.querySelectorAll('.drawing-canvas');
        
        sharedDrawing.layers.forEach((layer, index) => {
            if (index >= canvasElements.length) return;
            
            const canvas = canvasElements[index];
            const ctx = canvas.getContext('2d');
            
            const img = new Image();
            img.onload = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
            };
            img.src = layer.dataUrl;
        });
    }
    
    // Share the current drawing
    function shareDrawing() {
        // Create a unique ID for this shared drawing
        const drawingId = Date.now().toString();
        
        // Capture the current state of all canvas layers
        const canvasElements = document.querySelectorAll('.drawing-canvas');
        const layers = [];
        
        canvasElements.forEach((canvas, index) => {
            const isVisible = document.getElementById(`layer-${index}-visible`).checked;
            
            if (isVisible) {
                layers.push({
                    index,
                    dataUrl: canvas.toDataURL('image/png')
                });
            }
        });
        
        // Create a shared drawing object
        const sharedDrawing = {
            id: drawingId,
            layers,
            createdAt: new Date().toISOString(),
            createdBy: isGuest ? 'guest' : currentUser.id
        };
        
        // Add to shared drawings "database"
        sharedDrawings.push(sharedDrawing);
        saveSharedDrawings();
        
        // Generate a share URL
        const shareUrl = `${window.location.origin}${window.location.pathname}?drawing=${drawingId}`;
        
        return {
            drawingId,
            shareUrl
        };
    }
    
    // Check if user is already logged in or if viewing a shared drawing
    if (sharedDrawingId) {
        // We have a shared drawing ID, load in view-only mode first
        isViewOnly = true;
        
        const savedUser = JSON.parse(localStorage.getItem('drawingAppCurrentUser'));
        if (savedUser) {
            // Find user in the database to ensure they still exist
            const user = users.find(u => u.id === savedUser.id);
            if (user) {
                currentUser = user;
                isGuest = false;
                isViewOnly = false; // Logged in users can edit
                startLoadingAnimation();
            } else {
                // Start in view-only mode
                startLoadingAnimation();
            }
        } else {
            // Start in view-only mode
            startLoadingAnimation();
        }
    } else {
        // No shared drawing, check if user is logged in
        const savedUser = JSON.parse(localStorage.getItem('drawingAppCurrentUser'));
        if (savedUser) {
            // Find user in the database to ensure they still exist
            const user = users.find(u => u.id === savedUser.id);
            if (user) {
                currentUser = user;
                isGuest = false;
                startLoadingAnimation();
            } else {
                // User no longer exists in database (might have been cleared)
                localStorage.removeItem('drawingAppCurrentUser');
            }
        }
    }
    
    // Layer management (move layers up and down)
    function setupLayerMovement() {
        const layerUpButtons = document.querySelectorAll('.layer-up');
        const layerDownButtons = document.querySelectorAll('.layer-down');
        
        // Move layer up
        layerUpButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const layerNum = parseInt(button.dataset.layer);
                const nextLayerNum = layerNum + 1;
                
                // Can't move the top layer up further
                if (nextLayerNum > 2) return;
                
                swapLayers(layerNum, nextLayerNum);
            });
        });
        
        // Move layer down
        layerDownButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const layerNum = parseInt(button.dataset.layer);
                const prevLayerNum = layerNum - 1;
                
                // Can't move the bottom layer down further
                if (prevLayerNum < 0) return;
                
                swapLayers(layerNum, prevLayerNum);
            });
        });
    }
    
    // Swap layers in the stack
    function swapLayers(layerA, layerB) {
        const canvasA = document.getElementById(`layer-${layerA}`);
        const canvasB = document.getElementById(`layer-${layerB}`);
        
        // Save current canvas contents
        const tempCanvasA = document.createElement('canvas');
        tempCanvasA.width = canvasA.width;
        tempCanvasA.height = canvasA.height;
        const tempCtxA = tempCanvasA.getContext('2d');
        tempCtxA.drawImage(canvasA, 0, 0);
        
        const tempCanvasB = document.createElement('canvas');
        tempCanvasB.width = canvasB.width;
        tempCanvasB.height = canvasB.height;
        const tempCtxB = tempCanvasB.getContext('2d');
        tempCtxB.drawImage(canvasB, 0, 0);
        
        // Clear and redraw swapped content
        const ctxA = canvasA.getContext('2d');
        const ctxB = canvasB.getContext('2d');
        
        ctxA.clearRect(0, 0, canvasA.width, canvasA.height);
        ctxB.clearRect(0, 0, canvasB.width, canvasB.height);
        
        ctxA.drawImage(tempCanvasB, 0, 0);
        ctxB.drawImage(tempCanvasA, 0, 0);
        
        // Update layer UI to reflect the swap
        // This doesn't physically move the canvas elements, just their content
        // The visual order is controlled by z-index in CSS
    }
    
    // Share functionality
    shareButton.addEventListener('click', () => {
        // First create a shared drawing and get its URL
        const { shareUrl } = shareDrawing();
        
        // Combine all visible layers into one image
        const combinedCanvas = document.createElement('canvas');
        const firstCanvas = document.querySelector('.drawing-canvas');
        combinedCanvas.width = firstCanvas.width;
        combinedCanvas.height = firstCanvas.height;
        const ctx = combinedCanvas.getContext('2d');
        
        // Fill with white background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, combinedCanvas.width, combinedCanvas.height);
        
        // Draw each visible layer from bottom to top
        const canvasElements = document.querySelectorAll('.drawing-canvas');
        for (let i = 0; i < canvasElements.length; i++) {
            const canvas = canvasElements[i];
            const layerVisible = document.getElementById(`layer-${i}-visible`).checked;
            
            if (layerVisible) {
                ctx.drawImage(canvas, 0, 0);
            }
        }
        
        // Show the combined image in the share modal
        sharePreviewImage.src = combinedCanvas.toDataURL('image/png');
        
        // Update share links with the new URL
        shareBtns.forEach(btn => {
            const platform = btn.dataset.platform;
            
            switch (platform) {
                case 'whatsapp':
                    btn.setAttribute('data-url', `https://api.whatsapp.com/send?text=Check%20out%20my%20drawing!%20${encodeURIComponent(shareUrl)}`);
                    break;
                case 'facebook':
                    btn.setAttribute('data-url', `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`);
                    break;
                case 'twitter':
                    btn.setAttribute('data-url', `https://twitter.com/intent/tweet?text=Check%20out%20my%20drawing!&url=${encodeURIComponent(shareUrl)}`);
                    break;
            }
        });
        
        // Store the share URL for copy functionality
        copyLinkBtn.setAttribute('data-url', shareUrl);
        
        // Show modal
        shareModal.style.display = 'block';
    });
    
    // Close the share modal
    closeModal.addEventListener('click', () => {
        shareModal.style.display = 'none';
    });
    
    // Click outside the modal to close it
    window.addEventListener('click', (e) => {
        if (e.target === shareModal) {
            shareModal.style.display = 'none';
        }
    });
    
    // Share buttons
    shareBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const platform = btn.dataset.platform;
            const shareUrl = btn.getAttribute('data-url');
            
            if (shareUrl) {
                window.open(shareUrl, '_blank', 'width=600,height=400');
            }
        });
    });
    
    // Copy link button
    copyLinkBtn.addEventListener('click', () => {
        const shareUrl = copyLinkBtn.getAttribute('data-url');
        
        // Create temporary element to copy from
        const temp = document.createElement('input');
        document.body.appendChild(temp);
        temp.value = shareUrl;
        temp.select();
        document.execCommand('copy');
        document.body.removeChild(temp);
        
        alert('Link copied to clipboard!');
    });
    
    // Download button
    downloadBtn.addEventListener('click', () => {
        // Create a temporary link element
        const downloadLink = document.createElement('a');
        downloadLink.href = sharePreviewImage.src;
        downloadLink.download = 'my-drawing.png';
        
        // Add to document, click it, and remove it
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    });
    
    // Auto-save drawing every 30 seconds for logged-in users
    if (!isGuest) {
        setInterval(saveCurrentDrawing, 30000);
    }
    
    // Setup layer movement controls
    setupLayerMovement();
}); 