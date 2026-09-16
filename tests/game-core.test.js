const assert = require('node:assert/strict');
const { DIFFICULTY_PRESETS, getDifficultyPreset, resolveQualitySettings } = require('../game-core.js');

assert.ok(DIFFICULTY_PRESETS.easy);
assert.ok(DIFFICULTY_PRESETS.normal);
assert.ok(DIFFICULTY_PRESETS.hard);
assert.ok(getDifficultyPreset('easy').speed < getDifficultyPreset('normal').speed);
assert.ok(getDifficultyPreset('normal').speed < getDifficultyPreset('hard').speed);
assert.ok(resolveQualitySettings(true).particleMultiplier < 1);
assert.ok(resolveQualitySettings(false).particleMultiplier >= 1);

console.log('game-core checks passed');
