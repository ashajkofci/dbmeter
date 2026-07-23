class DecibelMeter {
    constructor({ demoMode = false } = {}) {
        this.apiUrl = 'http://127.0.0.1:4735';
        this.meterId = 1;
        this.demoMode = demoMode;
        this.isConnected = false;
        this.isConnecting = false;
        this.isRecording = false;
        this.currentSpl = null;
        this.recordingAverage = new MeterCore.RunningAverage();
        this.lastAverage = null;
        this.pollTimer = null;
        this.consecutivePollFailures = 0;

        this.initializeElements();
        this.setupEventListeners();
        this.generateScaleMarkings();
        this.updateDisplay();
        this.connect();
    }

    initializeElements() {
        this.currentSplElement = document.getElementById('current-spl');
        this.averageSplElement = document.getElementById('average-spl');
        this.recordingStatusElement = document.getElementById('recording-status');
        this.connectionStatusElement = document.getElementById('connection-status');
        this.digitalDisplay = document.getElementById('digital-display');
        this.meterProgress = document.getElementById('meter-progress');
        this.needle = document.getElementById('needle');
        this.errorMessage = document.getElementById('error-message');
        this.connectButton = document.getElementById('connect-button');
        this.recordButton = document.getElementById('record-button');
    }

    setupEventListeners() {
        this.connectButton.addEventListener('click', () => {
            if (this.isConnected) {
                this.disconnect();
            } else {
                this.connect();
            }
        });

        this.recordButton.addEventListener('click', () => this.toggleRecording());

        document.addEventListener('keydown', (event) => {
            const isInteractive = ['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(event.target.tagName);
            if (event.code === 'Space' && !isInteractive) {
                event.preventDefault();
                this.toggleRecording();
            }
        });

        window.addEventListener('beforeunload', () => this.stopPolling());
    }

    generateScaleMarkings() {
        const scaleMarkings = document.getElementById('scale-markings');
        const centerX = 300;
        const centerY = 300;
        const radius = 150;

        for (let db = MeterCore.MIN_DB; db <= MeterCore.MAX_DB; db += 5) {
            const scaleAngle = 180 - MeterCore.dbToAngle(db);
            const radians = (scaleAngle * Math.PI) / 180;
            const isMajor = db % 10 === 0;
            const markLength = isMajor ? 20 : 12;

            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', centerX + (radius - markLength) * Math.cos(radians));
            line.setAttribute('y1', centerY - (radius - markLength) * Math.sin(radians));
            line.setAttribute('x2', centerX + radius * Math.cos(radians));
            line.setAttribute('y2', centerY - radius * Math.sin(radians));
            line.classList.add(isMajor ? 'major' : 'minor');
            scaleMarkings.appendChild(line);

            if (isMajor) {
                const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                text.setAttribute('x', centerX + (radius - 35) * Math.cos(radians));
                text.setAttribute('y', centerY - (radius - 35) * Math.sin(radians) + 6);
                text.textContent = db;
                scaleMarkings.appendChild(text);
            }
        }
    }

    async request(path, { method = 'GET', body } = {}) {
        if (window.rewApi) {
            return window.rewApi.request({ path, method, body });
        }

        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 2500);
        try {
            const response = await fetch(`${this.apiUrl}${path}`, {
                method,
                headers: {
                    Accept: 'application/json',
                    ...(body ? { 'Content-Type': 'application/json' } : {})
                },
                body: body ? JSON.stringify(body) : undefined,
                signal: controller.signal
            });

            if (!response.ok) {
                throw new Error(`REW returned HTTP ${response.status}`);
            }

            const text = await response.text();
            return text ? JSON.parse(text) : null;
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('REW did not respond in time');
            }
            throw error;
        } finally {
            window.clearTimeout(timeout);
        }
    }

    async connect() {
        if (this.isConnected || this.isConnecting) return;

        this.isConnecting = true;
        this.setConnectionState('connecting');
        this.showError('');

        try {
            await this.request('/spl-meter/commands');
            await this.startSplMeter();

            this.isConnected = true;
            this.consecutivePollFailures = 0;
            this.setConnectionState(this.demoMode ? 'demo' : 'connected');
            this.startPolling();
        } catch (error) {
            this.isConnected = false;
            this.setConnectionState('disconnected');
            this.showError(`Could not connect to REW. ${error.message}. Check that its API is enabled on port 4735.`);
        } finally {
            this.isConnecting = false;
        }
    }

    async startSplMeter() {
        await this.request(`/spl-meter/${this.meterId}/configuration`, {
            method: 'PUT',
            body: {
                mode: 'SPL',
                weighting: 'A',
                filter: 'Slow',
                highPassActive: false,
                rollingLeqActive: false
            }
        });

        await this.request(`/spl-meter/${this.meterId}/command`, {
            method: 'POST',
            body: { command: 'Start' }
        });
    }

    disconnect({ connectionLost = false } = {}) {
        const wasConnected = this.isConnected;
        this.isConnected = false;
        this.stopPolling();
        this.stopRecording();
        this.currentSpl = null;
        this.setConnectionState('disconnected');
        this.updateDisplay();

        if (wasConnected && !connectionLost) {
            this.request(`/spl-meter/${this.meterId}/command`, {
                method: 'POST',
                body: { command: 'Stop' }
            }).catch(() => {});
        }
    }

    startPolling() {
        this.stopPolling();

        const poll = async () => {
            if (!this.isConnected) return;

            try {
                const data = await this.request(`/spl-meter/${this.meterId}/levels`);
                const spl = MeterCore.parseSpl(data);

                if (spl === null) {
                    throw new Error('REW returned an invalid SPL value');
                }

                this.currentSpl = spl;
                this.consecutivePollFailures = 0;
                if (this.isRecording) {
                    this.recordingAverage.add(spl);
                }
                this.updateDisplay();
            } catch (error) {
                this.consecutivePollFailures += 1;
                if (this.consecutivePollFailures >= 3) {
                    this.showError(`Connection to REW was lost. ${error.message}.`);
                    this.disconnect({ connectionLost: true });
                    return;
                }
            }

            this.pollTimer = window.setTimeout(poll, 200);
        };

        poll();
    }

    stopPolling() {
        if (this.pollTimer !== null) {
            window.clearTimeout(this.pollTimer);
            this.pollTimer = null;
        }
    }

    toggleRecording() {
        if (!this.isConnected) {
            this.showError('Connect to REW before recording an average.');
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
        this.recordingAverage.reset();
        this.lastAverage = null;
        this.showError('');
        this.updateRecordingState();
        this.updateDisplay();
    }

    stopRecording() {
        if (!this.isRecording) return;

        this.isRecording = false;
        this.lastAverage = this.recordingAverage.value;
        this.updateRecordingState();
        this.updateDisplay();
    }

    updateRecordingState() {
        this.recordingStatusElement.textContent = this.isRecording ? 'ON' : 'OFF';
        this.recordingStatusElement.classList.toggle('recording-on', this.isRecording);
        this.recordingStatusElement.classList.toggle('recording-off', !this.isRecording);
        this.recordButton.textContent = this.isRecording ? 'Stop & calculate' : 'Record average';
        this.recordButton.classList.toggle('btn-recording', this.isRecording);
    }

    setConnectionState(state) {
        const labels = {
            connected: 'CONNECTED',
            connecting: 'CONNECTING…',
            disconnected: 'OFFLINE',
            demo: 'DEMO'
        };

        this.connectionStatusElement.textContent = labels[state];
        this.connectionStatusElement.className = `status-value connection-${state}`;
        this.connectButton.textContent = state === 'connected' || state === 'demo'
            ? 'Disconnect'
            : state === 'connecting' ? 'Connecting…' : 'Reconnect';
        this.connectButton.disabled = state === 'connecting';
        this.recordButton.disabled = state === 'connecting' || state === 'disconnected';
    }

    updateDisplay() {
        const currentText = MeterCore.formatDb(this.currentSpl);
        const average = this.isRecording ? this.recordingAverage.value : this.lastAverage;
        const averageText = MeterCore.formatDb(average);

        this.currentSplElement.textContent = currentText;
        this.averageSplElement.textContent = averageText;
        this.digitalDisplay.textContent = this.lastAverage !== null && !this.isRecording
            ? averageText
            : currentText;

        const displaySpl = this.currentSpl ?? MeterCore.MIN_DB;
        this.needle.setAttribute('transform', `rotate(${MeterCore.dbToAngle(displaySpl)} 300 300)`);
        this.meterProgress.style.strokeDashoffset = 471.239 * (1 - MeterCore.dbToProgress(displaySpl));
        this.meterProgress.classList.toggle('meter-idle', this.currentSpl === null);
    }

    showError(message) {
        this.errorMessage.textContent = message;
        this.errorMessage.classList.toggle('show', Boolean(message));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const demoMode = new URLSearchParams(window.location.search).get('demo') === 'true';
    window.decibelMeter = new DecibelMeter({ demoMode });
});
