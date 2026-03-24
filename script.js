/* =========================================
   CALCULATOR LOGIC & UI CONTROLLER
   ========================================= */

class CalculatorApp {
    constructor() {
        this.currentOperand = '0';
        this.previousOperand = '';
        this.operation = undefined;
        this.history = [];
        this.soundEnabled = true;
        
        // DOM Elements
        this.currDisplay = document.getElementById('curr-calc');
        this.prevDisplay = document.getElementById('prev-calc');
        this.historyList = document.getElementById('history-list');
        this.themePanel = document.getElementById('theme-panel');
        this.historySidebar = document.getElementById('history-sidebar');
        
        // Audio Context (Web Audio API)
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.renderThemes();
        this.loadTheme();
        this.updateDisplay();
    }

    /* --- CORE CALCULATION LOGIC --- */
    
    appendNumber(number) {
        if (number === '.' && this.currentOperand.includes('.')) return;
        if (this.currentOperand === '0' && number !== '.') {
            this.currentOperand = number.toString();
        } else {
            this.currentOperand = this.currentOperand.toString() + number.toString();
        }
        this.playTone(400, 'sine');
        this.updateDisplay();
    }

    chooseOperation(op) {
        if (this.currentOperand === '') return;
        if (this.previousOperand !== '') {
            this.compute();
        }
        this.operation = op;
        this.previousOperand = this.currentOperand;
        this.currentOperand = '';
        this.playTone(300, 'square');
        this.updateDisplay();
    }

    compute() {
        let computation;
        const prev = parseFloat(this.previousOperand);
        const current = parseFloat(this.currentOperand);
        if (isNaN(prev) || isNaN(current)) return;

        switch (this.operation) {
            case '+': computation = prev + current; break;
            case '-': computation = prev - current; break;
            case '×': computation = prev * current; break;
            case '÷': 
                if(current === 0) {
                    alert("Cannot divide by zero!");
                    this.clear();
                    return;
                }
                computation = prev / current; 
                break;
            case '%': computation = prev % current; break;
            default: return;
        }

        // Handle floating point precision errors
        this.currentOperand = Math.round(computation * 100000000) / 100000000;
        this.operation = undefined;
        this.addToHistory(this.previousOperand, this.operation, current, this.currentOperand);
        this.previousOperand = '';
        this.playTone(600, 'triangle');
        this.updateDisplay();
    }

    delete() {
        this.currentOperand = this.currentOperand.toString().slice(0, -1);
        if (this.currentOperand === '') this.currentOperand = '0';
        this.playTone(200, 'sawtooth');
        this.updateDisplay();
    }

    clear() {
        this.currentOperand = '0';
        this.previousOperand = '';
        this.operation = undefined;
        this.playTone(150, 'sine');
        this.updateDisplay();
    }

    /* --- UI UPDATES --- */

    updateDisplay() {
        this.currDisplay.innerText = this.getDisplayNumber(this.currentOperand);
        if (this.operation != null) {
            this.prevDisplay.innerText = 
                `${this.getDisplayNumber(this.previousOperand)} ${this.operation}`;
        } else {
            this.prevDisplay.innerText = '';
        }
    }

    getDisplayNumber(number) {
        const stringNumber = number.toString();
        const integerDigits = parseFloat(stringNumber.split('.')[0]);
        const decimalDigits = stringNumber.split('.')[1];
        let integerDisplay;
        if (isNaN(integerDigits)) {
            integerDisplay = '';
        } else {
            integerDisplay = integerDigits.toLocaleString('en', { maximumFractionDigits: 0 });
        }
        if (decimalDigits != null) {
            return `${integerDisplay}.${decimalDigits}`;
        } else {
            return integerDisplay;
        }
    }

    /* --- THEME SYSTEM --- */

    themes = [
        { id: 'cyberpunk', name: 'Cyberpunk' },
        { id: 'minimal', name: 'Minimal' },
        { id: 'glass', name: 'Glass UI' },
        { id: 'gradient', name: 'Gradient' },
        { id: 'retro', name: 'Retro LCD' },
        { id: 'hud', name: 'Sci-Fi HUD' },
        { id: 'neumorphism', name: 'Neumorphism' },
        { id: 'transparent', name: 'Transparent' },
        { id: 'dashboard', name: 'Dashboard' },
        { id: 'iphone', name: 'iPhone Style' }
    ];

    renderThemes() {
        const grid = document.querySelector('.theme-grid');
        grid.innerHTML = '';
        this.themes.forEach(theme => {
            const btn = document.createElement('div');
            btn.className = 'theme-option';
            btn.innerText = theme.name;
            btn.dataset.theme = theme.id;
            btn.addEventListener('click', () => this.setTheme(theme.id));
            grid.appendChild(btn);
        });
    }

    setTheme(themeId) {
        document.documentElement.setAttribute('data-theme', themeId);
        localStorage.setItem('calc-theme', themeId);
        
        // Update active state in UI
        document.querySelectorAll('.theme-option').forEach(el => {
            el.classList.toggle('active', el.dataset.theme === themeId);
        });
        
        this.playTone(500, 'sine');
    }

    loadTheme() {
        const savedTheme = localStorage.getItem('calc-theme') || 'cyberpunk';
        this.setTheme(savedTheme);
    }

    /* --- HISTORY SYSTEM --- */

    addToHistory(prev, op, current, result) {
        const entry = { prev, op, current, result };
        this.history.unshift(entry);
        if (this.history.length > 10) this.history.pop();
        this.renderHistory();
    }

    renderHistory() {
        if (this.history.length === 0) {
            this.historyList.innerHTML = '<div class="empty-state">No calculations yet</div>';
            return;
        }
        this.historyList.innerHTML = this.history.map(item => `
            <div class="history-item" onclick="app.loadHistoryItem('${item.result}')">
                <div class="history-expression">${item.prev} ${item.op} ${item.current}</div>
                <div class="history-result">= ${item.result}</div>
            </div>
        `).join('');
    }

    loadHistoryItem(result) {
        this.currentOperand = result;
        this.operation = undefined;
        this.previousOperand = '';
        this.updateDisplay();
        this.historySidebar.classList.remove('open');
    }

    clearHistory() {
        this.history = [];
        this.renderHistory();
    }

    /* --- AUDIO SYSTEM (Synthesizer) --- */

    playTone(freq, type) {
        if (!this.soundEnabled) return;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
        
        gain.gain.setValueAtTime(0.05, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.1);
        
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        
        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.1);
    }

    /* --- EVENT LISTENERS --- */

    setupEventListeners() {
        // Keypad Clicks
        document.querySelectorAll('.btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const num = btn.dataset.num;
                const action = btn.dataset.action;

                if (num !== undefined) this.appendNumber(num);
                if (action === 'clear') this.clear();
                if (action === 'delete') this.delete();
                if (action === 'calculate') this.compute();
                if (['add', 'subtract', 'multiply', 'divide', 'percent'].includes(action)) {
                    const opMap = { 'add': '+', 'subtract': '-', 'multiply': '×', 'divide': '÷', 'percent': '%' };
                    this.chooseOperation(opMap[action]);
                }
            });
        });

        // Keyboard Support
        document.addEventListener('keydown', (e) => {
            if (e.key >= '0' && e.key <= '9') this.appendNumber(e.key);
            if (e.key === '.') this.appendNumber('.');
            if (e.key === '=' || e.key === 'Enter') { e.preventDefault(); this.compute(); }
            if (e.key === 'Backspace') this.delete();
            if (e.key === 'Escape') this.clear();
            if (e.key === '+') this.chooseOperation('+');
            if (e.key === '-') this.chooseOperation('-');
            if (e.key === '*') this.chooseOperation('×');
            if (e.key === '/') { e.preventDefault(); this.chooseOperation('÷'); }
        });

        // UI Toggles
        document.getElementById('theme-toggle').addEventListener('click', () => {
            this.themePanel.classList.toggle('open');
            this.historySidebar.classList.remove('open');
        });

        document.getElementById('history-toggle').addEventListener('click', () => {
            this.historySidebar.classList.toggle('open');
            this.themePanel.classList.remove('open');
        });

        document.getElementById('close-history').addEventListener('click', () => {
            this.historySidebar.classList.remove('open');
        });

        document.getElementById('sound-toggle').addEventListener('click', (e) => {
            this.soundEnabled = !this.soundEnabled;
            e.currentTarget.classList.toggle('active', this.soundEnabled);
            // Visual feedback for mute
            if(!this.soundEnabled) this.playTone(100, 'sawtooth'); 
        });

        document.getElementById('clear-history').addEventListener('click', () => {
            this.clearHistory();
        });

        // Close panels when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.themePanel.contains(e.target) && !e.target.closest('#theme-toggle')) {
                this.themePanel.classList.remove('open');
            }
        });
    }
}

// Initialize App
const app = new CalculatorApp();
