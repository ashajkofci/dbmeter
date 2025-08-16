class DecibelMeter {
    constructor() {
        this.apiUrl = 'http://localhost:4735';
        this.meterId = 1;
        this.isConnected = false;
        this.isRecording = false;
        this.currentSpl = 60;
        this.recordedValues = [];
        this.recordingStartTime = null;
        this.showingAverage = false; // Flag to track when center display shows average
        
        // Configurable needle range (in degrees)
        this.needleStartAngle = 0;    // 0 degrees (right side)
        this.needleEndAngle = 180;    // 180 degrees (left side)
        
        // dB range
        this.minDb = 60;
        this.maxDb = 100;
        
        this.initializeElements();
        this.setupEventListeners();
        this.generateScaleMarkings();
        this.updateDisplay();
    }
    
    initializeElements() {
        this.currentSplElement = document.getElementById('current-spl');
        this.averageSplElement = document.getElementById('average-spl');
        this.recordingStatusElement = document.getElementById('recording-status');
        this.digitalDisplay = document.getElementById('digital-display');
        this.meterProgress = document.getElementById('meter-progress');
        this.needle = document.getElementById('needle');
        this.errorMessage = document.getElementById('error-message');
        
        // Auto-connect on initialization
        this.autoConnect();
    }
    
    setupEventListeners() {
        document.addEventListener('keydown', (event) => {
            if (event.code === 'Space') {
                event.preventDefault();
                this.toggleRecording();
            }
        });
    }

    async autoConnect() {
        try {
            this.showError('');
            await this.connect();
        } catch (error) {
            this.showError(`Auto-connect failed: ${error.message}. REW may not be running.`);
            console.error('Auto-connect error:', error);
        }
    }
    
    generateScaleMarkings() {
        const scaleMarkings = document.getElementById('scale-markings');
        const centerX = 300; // Updated for new SVG size
        const centerY = 300; // Updated for new SVG size
        const radius = 150;
        
        // Generate markings from minDb to maxDb
        for (let db = this.minDb; db <= this.maxDb; db += 5) {
            const angle = this.dbToAngle(db); // 0 to 180
            // Reverse the angle for scale markings to match needle direction
            const scaleAngle = 180 - angle;
            const radian = (scaleAngle * Math.PI) / 180;
            
            const isMajor = db % 10 === 0;
            const markLength = isMajor ? 20 : 12; // Bigger markings
            
            const x1 = centerX + (radius - markLength) * Math.cos(radian);
            const y1 = centerY - (radius - markLength) * Math.sin(radian); // Negative for correct orientation
            const x2 = centerX + radius * Math.cos(radian);
            const y2 = centerY - radius * Math.sin(radian); // Negative for correct orientation
            
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', x1);
            line.setAttribute('y1', y1);
            line.setAttribute('x2', x2);
            line.setAttribute('y2', y2);
            line.classList.add(isMajor ? 'major' : 'minor');
            
            scaleMarkings.appendChild(line);
            
            // Add text labels for major markings
            if (isMajor) {
                const textX = centerX + (radius - 35) * Math.cos(radian);
                const textY = centerY - (radius - 35) * Math.sin(radian); // Negative for correct orientation
                
                const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                text.setAttribute('x', textX);
                text.setAttribute('y', textY + 6); // Bigger offset for better centering
                text.textContent = db;
                
                scaleMarkings.appendChild(text);
            }
        }
    }
    
    dbToAngle(db) {
        // Convert dB to angle based on configurable range
        // Map: minDb (40) -> 0° (right), maxDb (100) -> 180° (left)
        const normalizedDb = (db - this.minDb) / (this.maxDb - this.minDb); // 0 to 1
        return this.needleStartAngle + (normalizedDb * (this.needleEndAngle - this.needleStartAngle));
    }
    
    dbToArcProgress(db) {
        // Convert dB to arc progress (0 to 1)
        const clampedDb = Math.max(this.minDb, Math.min(this.maxDb, db));
        return (clampedDb - this.minDb) / (this.maxDb - this.minDb);
    }
    
    getColorClass(db) {
        return 'level-acroshow';
        if (db < 70) return 'level-safe';
        if (db < 80) return 'level-moderate';
        if (db < 90) return 'level-high';
        return 'level-dangerous';
    }
    
    async connect() {
        try {
            this.showError('');
            
            // Test connection to REW API - try SPL meter commands endpoint first
            const response = await fetch(`${this.apiUrl}/spl-meter/commands`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            // Start the SPL meter
            await this.startSplMeter();
            
            this.isConnected = true;
            
            // Start polling for SPL data
            this.startPolling();
            
        } catch (error) {
            console.error('Connection error:', error);
            this.showError(`Connection failed: ${error.message}. Make sure REW is running with API enabled on port 4735.`);
            throw error; // Re-throw for autoConnect to handle
        }
    }
    
    async startSplMeter() {
        try {
            // Configure SPL meter
            const config = {
                mode: 'SPL',
                weighting: 'A',
                filter: 'Slow',
                highPassActive: false,
                rollingLeqActive: false
            };
            
            await fetch(`${this.apiUrl}/spl-meter/${this.meterId}/configuration`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(config)
            });
            
            // Start the SPL meter
            const startCommand = { command: 'Start' };
            await fetch(`${this.apiUrl}/spl-meter/${this.meterId}/command`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(startCommand)
            });
            
        } catch (error) {
            throw new Error(`Failed to start SPL meter: ${error.message}`);
        }
    }
    
    disconnect() {
        this.isConnected = false;
        this.stopPolling();
        this.stopRecording();
        
        // Reset to default values
        this.currentSpl = 40;
        this.updateDisplay();
    }
    
    startPolling() {
        this.pollInterval = setInterval(async () => {
            if (!this.isConnected) return;
            
            try {
                const response = await fetch(`${this.apiUrl}/spl-meter/${this.meterId}/levels`);
                if (response.ok) {
                    const data = await response.json();
                    this.currentSpl = data.spl || 40;
                    
                    // Add to recording if active
                    if (this.isRecording) {
                        this.recordedValues.push({
                            spl: this.currentSpl,
                            timestamp: Date.now()
                        });
                    }
                    
                    this.updateDisplay();
                } else {
                    console.warn('Failed to fetch SPL data:', response.statusText);
                }
            } catch (error) {
                console.error('Error fetching SPL data:', error);
                if (error.name === 'TypeError' && error.message.includes('fetch')) {
                    this.showError('Connection lost to REW API');
                    this.disconnect();
                }
            }
        }, 200); // Update every 100ms for smooth animation
    }
    
    stopPolling() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    }
    
    toggleRecording() {
        if (!this.isConnected) {
            this.showError('Please connect to REW first');
            return;
        }
        
        if (this.isRecording) {
            this.stopRecording();
        } else {
            this.startRecording();
        }
    }
    
    startRecording() {
        this.isRecording = true;
        this.recordedValues = [];
        this.recordingStartTime = Date.now();
        this.showingAverage = false; // Allow center display to show current values again
        
        // Reset average display in status area only
        this.averageSplElement.textContent = '-- dB';
        
        this.recordingStatusElement.textContent = 'ON';
        this.recordingStatusElement.classList.remove('recording-off');
        this.recordingStatusElement.classList.add('recording-on');
        
        console.log('Started recording SPL values');
    }
    
    stopRecording() {
        if (!this.isRecording) return;
        
        this.isRecording = false;
        
        this.recordingStatusElement.textContent = 'OFF';
        this.recordingStatusElement.classList.remove('recording-on');
        this.recordingStatusElement.classList.add('recording-off');
        
        // Calculate and display average
        if (this.recordedValues.length > 0) {
            const average = this.recordedValues.reduce((sum, val) => sum + val.spl, 0) / this.recordedValues.length;
            this.averageSplElement.textContent = `${average.toFixed(1)} dB`;
            // Put the average in the center digital display
            this.digitalDisplay.textContent = `${average.toFixed(1)} dB`;
            this.showingAverage = true; // Prevent updateDisplay from overwriting the average
            
            console.log(`Recording stopped. Average: ${average.toFixed(1)} dB from ${this.recordedValues.length} samples`);
        }
    }
    
    updateDisplay() {
        // Only update center digital display with current value if not showing average
        if (!this.showingAverage) {
            this.digitalDisplay.textContent = `${this.currentSpl.toFixed(1)} dB`;
        }
        this.currentSplElement.textContent = `${this.currentSpl.toFixed(1)} dB`;
        
        // Update needle position - map 0-180° directly to SVG coordinates
        const angle = this.dbToAngle(this.currentSpl);
        // Don't reverse the angle since we flipped the needle direction
        this.needle.setAttribute('transform', `rotate(${angle} 300 300)`);
        
        // Update arc progress
        const progress = this.dbToArcProgress(this.currentSpl);
        const arcLength = 471.239; // Approximate arc length for semicircle
        const dashOffset = arcLength * (1 - progress);
        this.meterProgress.style.strokeDashoffset = dashOffset;
        
        // Update colors based on SPL level
        const colorClass = this.getColorClass(this.currentSpl);
        this.meterProgress.setAttribute('class', `meter-progress ${colorClass}`);
    }
    
    showError(message) {
        if (message) {
            this.errorMessage.textContent = message;
            this.errorMessage.classList.add('show');
        } else {
            this.errorMessage.classList.remove('show');
        }
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new DecibelMeter();
});

// Add some demo functionality for testing without REW
if (window.location.search.includes('demo=true')) {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            const meter = window.decibelMeter || new DecibelMeter();
            
            // Simulate changing SPL values
            let demoSpl = 45;
            setInterval(() => {
                demoSpl += (Math.random() - 0.5) * 10;
                demoSpl = Math.max(40, Math.min(100, demoSpl));
                meter.currentSpl = demoSpl;
                meter.updateDisplay();
            }, 200);
            
            // Simulate connection
            meter.isConnected = true;
        }, 1000);
    });
}
