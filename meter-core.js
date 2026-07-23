(function exposeMeterCore(root, factory) {
    const core = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = core;
    } else {
        root.MeterCore = core;
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, () => {
    const MIN_DB = 60;
    const MAX_DB = 100;

    function clamp(value, minimum, maximum) {
        return Math.min(maximum, Math.max(minimum, value));
    }

    function dbToProgress(db) {
        if (!Number.isFinite(db)) return 0;
        return (clamp(db, MIN_DB, MAX_DB) - MIN_DB) / (MAX_DB - MIN_DB);
    }

    function dbToAngle(db) {
        return dbToProgress(db) * 180;
    }

    function formatDb(db) {
        return Number.isFinite(db) ? `${db.toFixed(1)} dB` : '-- dB';
    }

    function parseSpl(payload) {
        const value = payload && payload.spl;
        return Number.isFinite(value) ? value : null;
    }

    function nextDemoValue(previous) {
        const start = Number.isFinite(previous) ? previous : 80;
        return clamp(start + (Math.random() - 0.5) * 4, MIN_DB, MAX_DB);
    }

    class RunningAverage {
        constructor() {
            this.reset();
        }

        add(value) {
            if (!Number.isFinite(value)) return this.value;
            this.count += 1;
            this.mean += (value - this.mean) / this.count;
            return this.value;
        }

        reset() {
            this.count = 0;
            this.mean = 0;
        }

        get value() {
            return this.count > 0 ? this.mean : null;
        }
    }

    return Object.freeze({
        MIN_DB,
        MAX_DB,
        RunningAverage,
        clamp,
        dbToAngle,
        dbToProgress,
        formatDb,
        nextDemoValue,
        parseSpl
    });
}));
