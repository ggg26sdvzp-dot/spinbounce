(function (global) {
  const DIFFICULTY_PRESETS = {
    easy: {
      id: 'easy',
      label: 'Easy',
      speed: 0.86,
      progression: 0.86,
      ringArc: 1.18,
      particleMultiplier: 0.7,
      comboScale: 0.9,
    },
    normal: {
      id: 'normal',
      label: 'Normal',
      speed: 1,
      progression: 1,
      ringArc: 1,
      particleMultiplier: 1,
      comboScale: 1,
    },
    hard: {
      id: 'hard',
      label: 'Hard',
      speed: 1.24,
      progression: 1.2,
      ringArc: 0.82,
      particleMultiplier: 1.2,
      comboScale: 1.15,
    },
  };

  function getDifficultyPreset(name) {
    return DIFFICULTY_PRESETS[name] || DIFFICULTY_PRESETS.normal;
  }

  function resolveQualitySettings(isLowPower) {
    return {
      particleMultiplier: isLowPower ? 0.7 : 1,
      maxParticles: isLowPower ? 42 : 90,
      extraGlow: !isLowPower,
      extraSparkles: !isLowPower,
    };
  }

  const api = {
    DIFFICULTY_PRESETS,
    getDifficultyPreset,
    resolveQualitySettings,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  global.GameCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
