'use strict';

const assert = require('node:assert/strict');
const MeterCore = require('../meter-core');

assert.equal(MeterCore.dbToProgress(60), 0);
assert.equal(MeterCore.dbToProgress(80), 0.5);
assert.equal(MeterCore.dbToProgress(100), 1);
assert.equal(MeterCore.dbToProgress(20), 0);
assert.equal(MeterCore.dbToProgress(140), 1);
assert.equal(MeterCore.dbToAngle(80), 90);
assert.equal(MeterCore.formatDb(81.64), '81.6 dB');
assert.equal(MeterCore.formatDb(null), '-- dB');
assert.equal(MeterCore.parseSpl({ spl: 72.5 }), 72.5);
assert.equal(MeterCore.parseSpl({ level: 72.5 }), null);
assert.equal(MeterCore.parseSpl({ spl: '72.5' }), null);

const average = new MeterCore.RunningAverage();
assert.equal(average.value, null);
average.add(70);
average.add(80);
average.add(Number.NaN);
assert.equal(average.count, 2);
assert.equal(average.value, 75);
average.reset();
assert.equal(average.value, null);

console.log('meter-core tests passed');
