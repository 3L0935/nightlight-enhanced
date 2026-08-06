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
      { key: 'sg.TextureStreaming', label: 'Texture Streaming', type: 'bool', impact: 'medium', desc: 'Stream textures dynamically. Disable for sharper textures at cost of VRAM.' },
    ]
  },
  video: {
    label: 'Video',
    desc: 'Display and rendering settings.',
    fields: [
      { key: 'ResolutionSizeX', label: 'Resolution Width', type: 'select', options: { '2560': '2560x1440 (QHD)', '1920': '1920x1080 (FHD)', '3440': '3440x1440 (UW)', '3840': '3840x2160 (4K)', '1280': '1280x720 (HD)' }, impact: 'high', desc: 'Game resolution width. Must match your monitor.' },
      { key: 'ResolutionSizeY', label: 'Resolution Height', type: 'select', options: { '1440': '1440', '1080': '1080', '2160': '2160', '720': '720' }, impact: 'high', desc: 'Game resolution height. Must match your monitor.' },
      { key: 'FullscreenMode', label: 'Fullscreen Mode', type: 'select', options: { '0': 'Fullscreen', '1': 'Windowed Fullscreen', '2': 'Windowed' }, impact: 'low', desc: 'Display mode. 0=exclusive fullscreen, 1=borderless window.' },
      { key: 'PreferredFullscreenMode', label: 'Preferred Fullscreen', type: 'select', options: { '0': 'Fullscreen', '1': 'Windowed Fullscreen', '2': 'Windowed' }, impact: 'low', desc: 'Preferred display mode (set in-game).' },
      { key: 'bUseVSync', label: 'VSync', type: 'bool', impact: 'low', desc: 'Synchronize with monitor refresh rate. Disable for lower input lag.' },
      { key: 'bUseDynamicResolution', label: 'Dynamic Resolution', type: 'bool', impact: 'medium', desc: 'Auto-adjust resolution to maintain FPS.' },
      { key: 'engine.FrameRateLimit', label: 'FPS Limit (Engine)', min: 0, max: 360, step: 1, unit: 'fps', impact: 'low', desc: 'Engine-level FPS cap. 0 = unlimited. DBD also has its own FPS cap below.' },
      { key: 'AntiAliasingMode', label: 'Anti-Aliasing Mode', type: 'select', options: { '0': 'Off', '1': 'FXAA', '2': 'TAA' }, impact: 'low', desc: 'AA technique. TAA recommended for DBD.' },
      { key: 'EnableFSR', label: 'FSR / Upscaling', type: 'bool', impact: 'medium', desc: 'AMD FidelityFX Super Resolution. Boosts FPS at cost of sharpness.' },
      { key: 'XeSSMode', label: 'XeSS Mode', type: 'select', options: { '0': 'Off', '1': 'Ultra Quality', '2': 'Quality', '3': 'Balanced', '4': 'Performance' }, impact: 'medium', desc: 'Intel XeSS upscaling. Alternative to FSR.' },
      { key: 'SharpnessValue', label: 'Sharpness (FSR/XeSS)', min: 0, max: 100, step: 1, unit: '%', impact: 'low', desc: 'Upscaling sharpness. Only applies when FSR or XeSS is enabled.' },
      { key: 'ScreenRenderSize', label: 'Screen Render Size', type: 'select', options: { '100': '100% (Native)', '90': '90%', '80': '80%', '70': '70%', '60': '60%', '50': '50%' }, impact: 'high', desc: '3D render resolution scale. Affects both 3D and UI in DBD.' },
      { key: 'Gamma', label: 'Gamma', min: 1.0, max: 5.0, step: 0.1, impact: 'low', desc: 'Screen brightness/gamma. Higher = brighter but washed out.' },
      { key: 'bUseDesiredScreenHeight', label: 'Use Desired Screen Height', type: 'bool', impact: 'low', desc: 'Force a specific screen height.' },
    ]
  },
  audio: {
    label: 'Audio',
    desc: 'Volume and audio settings.',
    fields: [
      { key: 'MainVolume', label: 'Master Volume', min: 0, max: 100, step: 1, unit: '%', impact: 'none', desc: 'Overall game volume.' },
      { key: 'MainVolumeOn', label: 'Master Volume On', type: 'bool', impact: 'none', desc: 'Toggle master volume.' },
      { key: 'MenuMusicVolume', label: 'Menu Music', min: 0, max: 100, step: 1, unit: '%', impact: 'none', desc: 'Menu music volume.' },
      { key: 'MenuMusicVolumeOn', label: 'Menu Music On', type: 'bool', impact: 'none', desc: 'Toggle menu music.' },
      { key: 'UseHeadphones', label: 'Headphone Mode', type: 'bool', impact: 'none', desc: 'Optimize audio for headphones (3D audio).' },
      { key: 'MuteOnFocusLost', label: 'Mute on Focus Loss', type: 'bool', impact: 'none', desc: 'Mute game when alt-tabbed.' },
      { key: 'VoiceChatEnabled', label: 'Voice Chat', type: 'bool', impact: 'none', desc: 'Enable in-game voice chat.' },
    ]
  },
  accessibility: {
    label: 'Accessibility',
    desc: 'Vision and accessibility settings.',
    fields: [
      { key: 'LargeText', label: 'Large Text', type: 'bool', impact: 'none', desc: 'Larger UI text.' },
      { key: 'ColorblindMode', label: 'Colorblind Mode', type: 'select', options: { '0': 'Off', '1': 'Protanopia', '2': 'Deuteranopia', '3': 'Tritanopia' }, impact: 'none', desc: 'Colorblind filter.' },
      { key: 'ColorblindIntensity', label: 'Colorblind Intensity', min: 0, max: 100, step: 1, unit: '%', impact: 'none', desc: 'Strength of colorblind filter.' },
      { key: 'Subtitles', label: 'Subtitles', type: 'bool', impact: 'none', desc: 'Show subtitles for voiced lines.' },
      { key: 'SubtitlesSize', label: 'Subtitles Size', type: 'select', options: { '0': 'Small', '1': 'Medium', '2': 'Large' }, impact: 'none', desc: 'Subtitle text size.' },
      { key: 'SubtitlesBackgroundOpacity', label: 'Subtitles Background', type: 'select', options: { '0': 'Off', '1': 'Low', '2': 'Medium', '3': 'High' }, impact: 'none', desc: 'Subtitle background opacity.' },
      { key: 'HUDConstrainedAspectRatio', label: 'Constrained HUD', type: 'bool', impact: 'none', desc: 'Keep HUD at 16:9 on ultrawide monitors.' },
      { key: 'MenuScaleFactor', label: 'Menu Scale', min: 50, max: 150, step: 5, unit: '%', impact: 'none', desc: 'Menu UI size.' },
      { key: 'HudScaleFactor', label: 'HUD Scale', min: 50, max: 150, step: 5, unit: '%', impact: 'none', desc: 'In-game HUD size.' },
      { key: 'SkillCheckScaleFactor', label: 'Skill Check Scale', min: 50, max: 150, step: 5, unit: '%', impact: 'none', desc: 'Skill check UI size.' },
      { key: 'BeginnerMode', label: 'Beginner Mode', type: 'bool', impact: 'none', desc: 'Show beginner tooltips and hints.' },
    ]
  },
  gameplay: {
    label: 'Gameplay',
    desc: 'Gameplay and control preferences.',
    fields: [
      { key: 'FieldOfView', label: 'Field of View', min: 80, max: 103, step: 1, unit: '°', impact: 'low', desc: 'Camera FOV. Game clamps values above 103.' },
      { key: 'FrameRateLimit', label: 'FPS Limit (DBD)', min: 30, max: 120, step: 1, unit: 'fps', impact: 'low', desc: 'DBD-specific FPS cap. Above 120 causes physics issues.' },
      { key: 'AimAssist', label: 'Aim Assist', type: 'bool', impact: 'none', desc: 'Controller aim assist for killer powers.' },
      { key: 'TerrorRadiusVisualFeedback', label: 'Terror Radius Visual', type: 'bool', impact: 'none', desc: 'Heartbeat icon when in terror radius.' },
      { key: 'DeepWoundBarVisibility', label: 'Deep Wound Bar', type: 'bool', impact: 'none', desc: 'Show deep wound timer on HUD.' },
      { key: 'HUDPlayerNamesVisibility', label: 'Player Names', type: 'bool', impact: 'none', desc: 'Show player names on HUD.' },
      { key: 'HUDKillerHookCountVisibility', label: 'Hook Count', type: 'bool', impact: 'none', desc: 'Show hook states on HUD.' },
      { key: 'HUDScoreEventsVisibility', label: 'Score Events', type: 'bool', impact: 'none', desc: 'Show score event popups.' },
      { key: 'ShowHudStatusEffectValueNumber', label: 'Status Effect Numbers', type: 'bool', impact: 'none', desc: 'Show numeric values on status effects.' },
      { key: 'SprintToCancel', label: 'Sprint to Cancel', type: 'bool', impact: 'none', desc: 'Sprint to cancel interactions.' },
      { key: 'SurvivorCameraSensitivity', label: 'Survivor Look Sens (Controller)', min: 1, max: 100, step: 1, unit: '%', impact: 'none', desc: 'Controller sensitivity for survivor.' },
      { key: 'KillerCameraSensitivity', label: 'Killer Look Sens (Controller)', min: 1, max: 100, step: 1, unit: '%', impact: 'none', desc: 'Controller sensitivity for killer.' },
      { key: 'SurvivorMouseSensitivity', label: 'Survivor Mouse Sens', min: 1, max: 100, step: 1, unit: '%', impact: 'none', desc: 'Mouse sensitivity for survivor.' },
      { key: 'KillerMouseSensitivity', label: 'Killer Mouse Sens', min: 1, max: 100, step: 1, unit: '%', impact: 'none', desc: 'Mouse sensitivity for killer.' },
      { key: 'SurvivorControllerSensitivity', label: 'Survivor Controller Sens', min: 1, max: 100, step: 1, unit: '%', impact: 'none', desc: 'Controller sensitivity survivor.' },
      { key: 'KillerControllerSensitivity', label: 'Killer Controller Sens', min: 1, max: 100, step: 1, unit: '%', impact: 'none', desc: 'Controller sensitivity killer.' },
      { key: 'InvertY', label: 'Invert Y-Axis', type: 'bool', impact: 'none', desc: 'Invert vertical look (both mouse and controller).' },
      { key: 'SurvivorInvertY', label: 'Survivor Invert Y', type: 'bool', impact: 'none', desc: 'Invert Y for survivor only.' },
      { key: 'KillerToggleInteractions', label: 'Killer Toggle Interactions', type: 'bool', impact: 'none', desc: 'Toggle instead of hold for killer interactions.' },
      { key: 'SurvivorToggleInteractions', label: 'Survivor Toggle Interactions', type: 'bool', impact: 'none', desc: 'Toggle instead of hold for survivor interactions.' },
      { key: 'ControlType', label: 'Control Type', type: 'select', options: { '0': 'Keyboard/Mouse', '1': 'Controller' }, impact: 'none', desc: 'Primary input device.' },
      { key: 'Crossplay', label: 'Crossplay', type: 'bool', impact: 'none', desc: 'Enable cross-platform matchmaking.' },
      { key: 'ShowPlayerNames', label: 'Show Player Names', type: 'bool', impact: 'none', desc: 'Show player names above characters.' },
    ]
  },
  ui: {
    label: 'UI & Cosmetics',
    desc: 'Interface and cosmetic preferences.',
    fields: [
      { key: 'ShowPortraitBorder', label: 'Portrait Borders', type: 'bool', impact: 'none', desc: 'Show character portrait borders.' },
      { key: 'AnimateRarityBackgrounds', label: 'Animated Rarity BGs', type: 'bool', impact: 'none', desc: 'Animate perk/item rarity backgrounds.' },
      { key: 'PlayerCardAnimation', label: 'Player Card Animation', type: 'bool', impact: 'none', desc: 'Animate player cards.' },
      { key: 'PlayerCardBadge', label: 'Player Card Badge', type: 'bool', impact: 'none', desc: 'Show badge on player card.' },
      { key: 'PlayerCardBanner', label: 'Player Card Banner', type: 'bool', impact: 'none', desc: 'Show banner on player card.' },
      { key: 'BloodwebInteractionBehaviour', label: 'Bloodweb Auto-Spend', type: 'bool', impact: 'none', desc: 'Auto-spend bloodpoints in bloodweb.' },
      { key: 'HUDUseItemPickupPopupAbridgedVersion', label: 'Compact Item Pickup', type: 'bool', impact: 'none', desc: 'Use compact item pickup popup.' },
      { key: 'LegacyPrestigePortraits', label: 'Legacy Prestige Portraits', type: 'bool', impact: 'none', desc: 'Use legacy prestige portrait style.' },
      { key: 'bForceUnicodeText', label: 'Force Unicode Text', type: 'bool', impact: 'none', desc: 'Force Unicode text rendering.' },
      { key: 'bUseOldLobby', label: 'Old Lobby', type: 'bool', impact: 'none', desc: 'Use legacy lobby UI.' },
      { key: 'ShowAllPerks', label: 'Show All Perks', type: 'bool', impact: 'none', desc: 'Show all perks in loadout (not just owned).' },
      { key: 'AllowCopyrightedMusic', label: 'Copyrighted Music', type: 'bool', impact: 'none', desc: 'Allow copyrighted music in streams.' },
      { key: 'IsAnonymousMode', label: 'Anonymous Mode', type: 'bool', impact: 'none', desc: 'Hide your name from other players.' },
      { key: 'HideYourName', label: 'Hide Your Name', type: 'bool', impact: 'none', desc: 'Hide your own name in HUD.' },
      { key: 'HideOtherNames', label: 'Hide Other Names', type: 'bool', impact: 'none', desc: 'Hide other player names in HUD.' },
      { key: 'HiddenMatchmakingDelay', label: 'Hidden MMR Delay', type: 'bool', impact: 'none', desc: 'Hide matchmaking delay indicator.' },
      { key: 'AutoDeclineFriendRequests', label: 'Auto-Decline Friends', type: 'bool', impact: 'none', desc: 'Auto-decline friend requests.' },
      { key: 'PartyPrivacy', label: 'Party Privacy', type: 'select', options: { 'Open': 'Open', 'FriendsOnly': 'Friends Only', 'InviteOnly': 'Invite Only' }, impact: 'none', desc: 'Who can join your party.' },
      { key: 'HapticsVibration', label: 'Haptics Vibration', type: 'bool', impact: 'none', desc: 'Controller vibration.' },
      { key: 'VoiceOverLanguage', label: 'Voice Over Language', type: 'select', options: { '0': 'English', '1': 'French', '2': 'Japanese' }, impact: 'none', desc: 'Voice over language.' },
    ]
  },
  notifications: {
    label: 'Notifications',
    desc: 'Challenge and event notification toggles.',
    fields: [
      { key: 'TomesChallengeNotification', label: 'Tome Challenges', type: 'select', options: { '0': 'Off', '1': 'On' }, impact: 'none', desc: 'Show tome challenge notifications.' },
      { key: 'DailyChallengeNotification', label: 'Daily Rituals', type: 'select', options: { '0': 'Off', '1': 'On' }, impact: 'none', desc: 'Show daily ritual notifications.' },
      { key: 'EventChallengeNotification', label: 'Event Challenges', type: 'select', options: { '0': 'Off', '1': 'On' }, impact: 'none', desc: 'Show event challenge notifications.' },
      { key: 'BattlePassChallengeNotification', label: 'Rift Challenges', type: 'select', options: { '0': 'Off', '1': 'On' }, impact: 'none', desc: 'Show rift pass notifications.' },
      { key: 'MilestoneChallengeNotification', label: 'Milestones', type: 'select', options: { '0': 'Off', '1': 'On' }, impact: 'none', desc: 'Show milestone notifications.' },
      { key: 'OnboardingChallengeNotification', label: 'Onboarding', type: 'select', options: { '0': 'Off', '1': 'On' }, impact: 'none', desc: 'Show new player onboarding notifications.' },
    ]
  },
  optimization: {
    label: 'Optimization',
    desc: 'Performance and memory optimization settings.',
    fields: [
      { key: 'bDisableLobbyMusic', label: 'Disable Lobby Music', type: 'bool', impact: 'low', desc: 'Disable music in lobby for faster loading.' },
      { key: 'bLowMemoryMode', label: 'Low Memory Mode', type: 'bool', impact: 'medium', desc: 'Reduce memory usage. Enable if you have <16GB RAM.' },
      { key: 'bPreloadLobbyAssets', label: 'Preload Lobby Assets', type: 'bool', impact: 'low', desc: 'Preload lobby assets for faster transitions.' },
    ]
  },
  input: {
    label: 'Input',
    desc: 'Raw input and mouse settings.',
    fields: [
      { key: 'bEnableRawInput', label: 'Raw Mouse Input', type: 'bool', impact: 'low', desc: 'Enable raw mouse input for better precision. Recommended for competitive.' },
      { key: 'bEnableDoubleClick', label: 'Double Click', type: 'bool', impact: 'none', desc: 'Enable double-click actions.' },
      { key: 'bEnableMenuClickSound', label: 'Menu Click Sound', type: 'bool', impact: 'none', desc: 'Play sound on menu clicks.' },
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
      'sg.TextureStreaming': 'True',
      'bUseVSync': 'False',
      'bUseDynamicResolution': 'False',
      'EnableFSR': 'True',
      'XeSSMode': '0',
      'FrameRateLimit': '120',
      'bDisableLobbyMusic': 'True',
      'bLowMemoryMode': 'False',
      'bPreloadLobbyAssets': 'True',
      'bEnableRawInput': 'True',
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
      'sg.TextureStreaming': 'True',
      'bUseVSync': 'False',
      'bUseDynamicResolution': 'False',
      'EnableFSR': 'False',
      'XeSSMode': '0',
      'FrameRateLimit': '60',
      'bDisableLobbyMusic': 'False',
      'bLowMemoryMode': 'False',
      'bPreloadLobbyAssets': 'True',
      'bEnableRawInput': 'True',
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
      'sg.TextureStreaming': 'False',
      'bUseVSync': 'True',
      'bUseDynamicResolution': 'False',
      'EnableFSR': 'False',
      'XeSSMode': '0',
      'FrameRateLimit': '60',
      'bDisableLobbyMusic': 'False',
      'bLowMemoryMode': 'False',
      'bPreloadLobbyAssets': 'True',
      'bEnableRawInput': 'True',
    }
  }
};
