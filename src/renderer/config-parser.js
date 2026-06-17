// ── DBD Config Parser ──
// Parses GameUserSettings.ini into structured sections
// and generates INI back from modified values

// ── Field definitions with labels, ranges, and perf impact ──

const FIELD_DEFS = {
  scalability: {
    label: 'Scalability',
    desc: 'Graphics quality settings. Higher = better visuals, lower = better performance.',
    fields: [
      { key: 'sg.ResolutionQuality', label: 'Resolution Scale', min: 1, max: 100, step: 1, unit: '%', impact: 'high', desc: 'Internal render resolution. 100% = native.' },
      { key: 'sg.ViewDistanceQuality', label: 'View Distance', min: 0, max: 4, step: 1, impact: 'medium', desc: 'How far objects are rendered.' },
      { key: 'sg.AntiAliasingQuality', label: 'Anti-Aliasing', min: 0, max: 4, step: 1, impact: 'low', desc: 'Smooths jagged edges.' },
      { key: 'sg.ShadowQuality', label: 'Shadows', min: 0, max: 4, step: 1, impact: 'high', desc: 'Shadow resolution and detail.' },
      { key: 'sg.GlobalIlluminationQuality', label: 'Global Illumination', min: 0, max: 4, step: 1, impact: 'high', desc: 'Lighting quality.' },
      { key: 'sg.ReflectionQuality', label: 'Reflections', min: 0, max: 4, step: 1, impact: 'medium', desc: 'Reflection quality.' },
      { key: 'sg.PostProcessQuality', label: 'Post Processing', min: 0, max: 4, step: 1, impact: 'low', desc: 'Bloom, DOF, color grading.' },
      { key: 'sg.TextureQuality', label: 'Textures', min: 0, max: 4, step: 1, impact: 'medium', desc: 'Texture resolution.' },
      { key: 'sg.EffectsQuality', label: 'Effects', min: 0, max: 4, step: 1, impact: 'medium', desc: 'Particle effects quality.' },
      { key: 'sg.FoliageQuality', label: 'Foliage', min: 0, max: 4, step: 1, impact: 'medium', desc: 'Grass and vegetation density.' },
      { key: 'sg.ShadingQuality', label: 'Shading', min: 0, max: 4, step: 1, impact: 'high', desc: 'Shader complexity.' },
      { key: 'sg.LandscapeQuality', label: 'Landscape', min: 0, max: 4, step: 1, impact: 'low', desc: 'Terrain detail.' },
      { key: 'sg.AnimationQuality', label: 'Animation', min: 0, max: 4, step: 1, impact: 'low', desc: 'Animation LOD distance.' },
    ]
  },
  video: {
    label: 'Video',
    desc: 'Display and rendering settings.',
    fields: [
      { key: 'ResolutionSizeX', label: 'Resolution Width', type: 'select', options: { '2560': '2560×1440 (QHD)', '1920': '1920×1080 (FHD)', '3440': '3440×1440 (UW)', '3840': '3840×2160 (4K)', '1280': '1280×720 (HD)' }, impact: 'high', desc: 'Game resolution width. Height is derived from your config. ⚠️ Wrong values can break display.' },
      { key: 'FullscreenMode', label: 'Fullscreen Mode', type: 'select', options: { '0': 'Fullscreen', '1': 'Windowed Fullscreen', '2': 'Windowed' }, impact: 'low', desc: 'Display mode.' },
      { key: 'FieldOfView', label: 'Field of View', min: 80, max: 103, step: 1, unit: '°', impact: 'low', desc: 'Camera FOV. Values above 103 are silently clamped by the game.' },
      { key: 'FrameRateLimit', label: 'FPS Limit', min: 30, max: 120, step: 1, unit: 'fps', impact: 'low', desc: 'Maximum frame rate. Above 120 causes physics/input issues in DBD.' },
      { key: 'FPSLimitMode', label: 'FPS Limit Preset', type: 'select', options: { '1': '30', '2': '60', '3': '120', '120': '120 (GameUserSettings)' }, impact: 'low', desc: 'FPS cap preset from DBD settings. Only 30/60/120 are stable.' },
      { key: 'bUseVSync', label: 'VSync', type: 'bool', impact: 'low', desc: 'Synchronize with monitor refresh rate.' },
      { key: 'bUseDynamicResolution', label: 'Dynamic Resolution', type: 'bool', impact: 'medium', desc: 'Auto-adjust resolution to maintain FPS.' },
      { key: 'AntiAliasingMode', label: 'Anti-Aliasing Mode', type: 'select', options: { '0': 'Off', '1': 'FXAA', '2': 'TAA' }, impact: 'low', desc: 'AA technique. DBD supports: Off, FXAA, TAA (recommended).' },
      { key: 'EnableFSR', label: 'FSR / Upscaling', type: 'bool', impact: 'medium', desc: 'AMD FidelityFX Super Resolution.' },
      { key: 'SharpnessValue', label: 'Sharpness (FSR)', min: 0, max: 100, step: 1, unit: '%', impact: 'low', desc: 'FSR sharpening intensity. Only applies when FSR is enabled.' },
      { key: 'ScreenRenderSize', label: 'Screen Render Size', type: 'select', options: { '100': '100% (Native)', '90': '90%', '80': '80%', '70': '70%', '60': '60%', '50': '50%' }, impact: 'high', desc: '3D render resolution scale. Affects both 3D and UI (DBD unique quirk).' },
    ]
  },
  audio: {
    label: 'Audio',
    desc: 'Volume and audio settings.',
    fields: [
      { key: 'MainVolume', label: 'Master Volume', min: 0, max: 100, step: 1, unit: '%', impact: 'none', desc: 'Overall game volume.' },
      { key: 'MenuMusicVolume', label: 'Menu Music', min: 0, max: 100, step: 1, unit: '%', impact: 'none', desc: 'Menu music volume.' },
      { key: 'UseHeadphones', label: 'Headphone Mode', type: 'bool', impact: 'none', desc: 'Optimize audio for headphones (3D audio).' },
    ]
  },
  accessibility: {
    label: 'Accessibility',
    desc: 'Vision and accessibility settings.',
    fields: [
      { key: 'LargeText', label: 'Large Text', type: 'bool', impact: 'none', desc: 'Larger UI text.' },
      { key: 'ColorBlindMode', label: 'Colorblind Mode', type: 'select', options: { '0': 'Off', '1': 'Protanopia', '2': 'Deuteranopia', '3': 'Tritanopia' }, impact: 'none', desc: 'Colorblind filter.' },
      { key: 'Subtitles', label: 'Subtitles', type: 'bool', impact: 'none', desc: 'Show subtitles for voiced lines.' },
      { key: 'HUDConstrainedAspectRatio', label: 'Constrained HUD', type: 'bool', impact: 'none', desc: 'Keep HUD at 16:9 on ultrawide.' },
      { key: 'MenuScaleFactor', label: 'Menu Scale', min: 50, max: 150, step: 5, unit: '%', impact: 'none', desc: 'Menu UI size.' },
      { key: 'HudScaleFactor', label: 'HUD Scale', min: 50, max: 150, step: 5, unit: '%', impact: 'none', desc: 'In-game HUD size.' },
    ]
  },
  gameplay: {
    label: 'Gameplay',
    desc: 'Gameplay preferences.',
    fields: [
      { key: 'FieldOfView', label: 'Field of View', min: 80, max: 120, step: 1, unit: '°', impact: 'low', desc: 'Camera FOV.' },
      { key: 'TerrorRadiusVisualFeedback', label: 'Terror Radius Visual', type: 'bool', impact: 'none', desc: 'Heartbeat icon when in terror radius.' },
      { key: 'DeepWoundBarVisibility', label: 'Deep Wound Bar', type: 'bool', impact: 'none', desc: 'Show deep wound timer.' },
      { key: 'HUDPlayerNamesVisibility', label: 'Player Names', type: 'bool', impact: 'none', desc: 'Show player names on HUD.' },
      { key: 'HUDKillerHookCountVisibility', label: 'Hook Count', type: 'bool', impact: 'none', desc: 'Show hook states.' },
      { key: 'KillerCameraSensitivity', label: 'Killer Look Sensitivity', min: 1, max: 100, step: 1, unit: '%', impact: 'none', desc: 'Mouse sensitivity for killer.' },
      { key: 'SurvivorCameraSensitivity', label: 'Survivor Look Sensitivity', min: 1, max: 100, step: 1, unit: '%', impact: 'none', desc: 'Mouse sensitivity for survivor.' },
      { key: 'SprintToCancel', label: 'Sprint to Cancel', type: 'bool', impact: 'none', desc: 'Sprint to cancel actions.' },
    ]
  },
  auras: {
    label: 'Aura Colors',
    desc: 'Custom RGBA colors for in-game auras. Each aura has a tag name and RGBA values.',
    fields: [
      { key: 'aura.Survivor', label: 'Survivor Aura', tag: 'Aura.Type.Character.Survivor', impact: 'none', desc: 'Survivor body aura color.' },
      { key: 'aura.Survivor.Dying', label: 'Dying Survivor', tag: 'Aura.Type.Character.Survivor.State.Dying', impact: 'none', desc: 'Downed survivor aura.' },
      { key: 'aura.Generator', label: 'Generator', tag: 'Aura.Type.Objective.Generator', impact: 'none', desc: 'Generator aura color.' },
      { key: 'aura.Generator.Repaired', label: 'Repaired Generator', tag: 'Aura.Type.Objective.Generator.Repair.Gradient.FullyRepaired', impact: 'none', desc: 'Completed generator aura.' },
      { key: 'aura.Hook', label: 'Hook', tag: 'Aura.Type.Objective.Hook', impact: 'none', desc: 'Hook aura color.' },
      { key: 'aura.Hook.Carrying', label: 'Hook (Carrying)', tag: 'Aura.Type.Objective.Hook.State.Carrying', impact: 'none', desc: 'Hook aura while carrying survivor.' },
      { key: 'aura.Highlighted', label: 'Highlighted Object', tag: 'Aura.Type.Object.Highlighted', impact: 'none', desc: 'Highlighted interactable objects.' },
      { key: 'aura.KillerObject', label: 'Killer Object', tag: 'Aura.Type.Objective.KillerObject', impact: 'none', desc: 'Killer power related objects.' },
      { key: 'aura.KillerObject.Highlighted', label: 'Killer Object Highlighted', tag: 'Aura.Type.Objective.KillerObject.State.Highlighted', impact: 'none', desc: 'Highlighted killer objects.' },
      { key: 'aura.PalletTarget', label: 'Pallet Highlight', tag: 'Aura.Type.Object.Pallet.K36.CurrentTarget', impact: 'none', desc: 'Pallet when highlighted by killer power.' },
      { key: 'aura.ObjectiveHighlighted', label: 'Objective Highlighted', tag: 'Aura.Type.Objective.Highlighted', impact: 'none', desc: 'Generic objective highlighted aura.' },
      { key: 'aura.KillerPodAutoAim', label: 'Killer Pod AutoAim', tag: 'Aura.Type.Objective.KillerObject.K32.KillerPod.AutoAim', impact: 'none', desc: 'Killer pod auto-aim target aura.' },
    ]
  },
  scratchmarks: {
    label: 'Scratch Marks',
    desc: 'Color of scratch marks left by running survivors.',
    fields: [
      { key: 'ScratchMarksColor', label: 'Scratch Marks Color', type: 'color-object', impact: 'none', desc: 'RGBA color for scratch marks. Separate from AuraColors.' },
    ]
  }
};

// ── INI Parser ──

function parseIni(content) {
  const lines = content.split('\n');
  const sections = {};
  let currentSection = '_global';

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith(';') || line.startsWith('#')) continue;

    // Section header
    const sectionMatch = line.match(/^\[(.+)\]$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      if (!sections[currentSection]) sections[currentSection] = {};
      continue;
    }

    // Key=value
    const eqIdx = line.indexOf('=');
    if (eqIdx === -1) continue;
    const key = line.slice(0, eqIdx).trim();
    const value = line.slice(eqIdx + 1).trim();

    if (!sections[currentSection]) sections[currentSection] = {};
    sections[currentSection][key] = value;
  }

  return sections;
}

function serializeIni(sections) {
  let output = '; Generated by NightLight Enhanced\n; https://github.com/3L0935/nightlight-enhanced\n\n';
  for (const [sectionName, keys] of Object.entries(sections)) {
    if (sectionName === '_global') {
      for (const [k, v] of Object.entries(keys)) {
        output += `${k}=${v}\n`;
      }
    } else {
      output += `[${sectionName}]\n`;
      for (const [k, v] of Object.entries(keys)) {
        output += `${k}=${v}\n`;
      }
      output += '\n';
    }
  }
  return output;
}

// ── Merge modified values back into parsed sections ──

function applyChanges(sections, changes) {
  // changes: { 'sg.ResolutionQuality': '100', 'FullscreenMode': '1', ... }
  for (const [key, value] of Object.entries(changes)) {
    // Determine which section this key belongs to
    if (key.startsWith('sg.')) {
      if (!sections['ScalabilityGroups']) sections['ScalabilityGroups'] = {};
      sections['ScalabilityGroups'][key] = String(value);
    } else if (key.startsWith('aura.')) {
      // Aura changes are handled separately — they modify AuraColors string
      continue;
    } else {
      if (!sections['/Script/DeadByDaylight.DBDGameUserSettings']) {
        sections['/Script/DeadByDaylight.DBDGameUserSettings'] = {};
      }
      sections['/Script/DeadByDaylight.DBDGameUserSettings'][key] = String(value);
    }
  }
  return sections;
}

// ── Aura colors parsing ──

function parseAuraColors(raw) {
  // Format: (((TagName="..."), (B=...,G=...,R=...,A=...)), ...)
  // NOTE: DBD stores colors as (B, G, R, A) — we convert to (R, G, B, A) for the UI
  const auras = [];
  const tagRegex = /TagName="([^"]+)"/g;
  const colorRegex = /B=(\d+),G=(\d+),R=(\d+),A=(\d+)/g;

  const tags = [];
  let m;
  while ((m = tagRegex.exec(raw)) !== null) tags.push(m[1]);
  const colors = [];
  while ((m = colorRegex.exec(raw)) !== null) colors.push({ b: parseInt(m[1]), g: parseInt(m[2]), r: parseInt(m[3]), a: parseInt(m[4]) });

  for (let i = 0; i < Math.min(tags.length, colors.length); i++) {
    // Convert from INI format (B,G,R) to UI format (R,G,B)
    auras.push({ tag: tags[i], r: colors[i].r, g: colors[i].g, b: colors[i].b, a: colors[i].a });
  }
  return auras;
}

function serializeAuraColors(auras) {
  // Convert back from UI format (R,G,B) to INI format (B,G,R)
  const entries = auras.map(a =>
    `((TagName="${a.tag}"), (B=${a.b},G=${a.g},R=${a.r},A=${a.a}))`
  );
  return `(${entries.join(',')})`;
}

// ── Value impact labels ──

const IMPACT_LABELS = {
  none: { label: 'No impact', color: '#22c55e' },
  low: { label: 'Low impact', color: '#84cc16' },
  medium: { label: 'Medium impact', color: '#eab308' },
  high: { label: 'High impact', color: '#ef4444' },
};

// ── Presets ──

const PRESETS = {
  'performance': {
    label: 'Performance',
    desc: 'Maximum FPS, lowest visuals',
    values: {
      'sg.ResolutionQuality': 70,
      'sg.ViewDistanceQuality': 0,
      'sg.AntiAliasingQuality': 0,
      'sg.ShadowQuality': 0,
      'sg.GlobalIlluminationQuality': 0,
      'sg.ReflectionQuality': 0,
      'sg.PostProcessQuality': 0,
      'sg.TextureQuality': 1,
      'sg.EffectsQuality': 0,
      'sg.FoliageQuality': 0,
      'sg.ShadingQuality': 0,
      'sg.LandscapeQuality': 0,
      'sg.AnimationQuality': 1,
      'bUseVSync': 'False',
      'EnableFSR': 'True',
    }
  },
  'balanced': {
    label: 'Balanced',
    desc: 'Good visuals, stable 60+ FPS',
    values: {
      'sg.ResolutionQuality': 100,
      'sg.ViewDistanceQuality': 2,
      'sg.AntiAliasingQuality': 2,
      'sg.ShadowQuality': 2,
      'sg.GlobalIlluminationQuality': 1,
      'sg.ReflectionQuality': 1,
      'sg.PostProcessQuality': 2,
      'sg.TextureQuality': 3,
      'sg.EffectsQuality': 2,
      'sg.FoliageQuality': 1,
      'sg.ShadingQuality': 2,
      'sg.LandscapeQuality': 2,
      'sg.AnimationQuality': 3,
      'bUseVSync': 'False',
      'EnableFSR': 'False',
    }
  },
  'quality': {
    label: 'Quality',
    desc: 'Max visuals, may drop below 60 FPS',
    values: {
      'sg.ResolutionQuality': 100,
      'sg.ViewDistanceQuality': 3,
      'sg.AntiAliasingQuality': 3,
      'sg.ShadowQuality': 3,
      'sg.GlobalIlluminationQuality': 3,
      'sg.ReflectionQuality': 3,
      'sg.PostProcessQuality': 3,
      'sg.TextureQuality': 3,
      'sg.EffectsQuality': 3,
      'sg.FoliageQuality': 3,
      'sg.ShadingQuality': 3,
      'sg.LandscapeQuality': 3,
      'sg.AnimationQuality': 4,
      'bUseVSync': 'True',
      'EnableFSR': 'False',
    }
  }
};
