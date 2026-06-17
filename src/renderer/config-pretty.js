// ── Config Pretty Mode ──
// Renders the config as an organized form with sections

let _currentSections = null;
let _configRaw = '';
let _modifiedValues = {};
let _currentAuras = [];

function renderPrettyMode(rawContent) {
  _configRaw = rawContent;
  _currentSections = parseIni(rawContent);
  _modifiedValues = {};
  _currentAuras = [];

  const container = document.getElementById('pretty-config');
  if (!container) return;

  const dbdSection = _currentSections['/Script/DeadByDaylight.DBDGameUserSettings'] || {};

  // Parse auras
  const auraRaw = dbdSection['AuraColors'] || '';
  _currentAuras = parseAuraColors(auraRaw);

  let html = '';

  // ── Presets bar ──
  html += `<div class="config-presets">
    <span class="presets-label">${icon('refresh')} Quick Presets:</span>
    ${Object.entries(PRESETS).map(([key, p]) => `
      <button class="btn btn-sm preset-btn" data-preset="${key}" title="${p.desc}">${p.label}</button>
    `).join('')}
  </div>`;

  // ── Section: Scalability ──
  const scalGroup = _currentSections['ScalabilityGroups'] || {};
  html += renderSection('scalability', scalGroup);

  // ── Section: Video ──
  html += renderSection('video', dbdSection);

  // ── Section: Audio ──
  html += renderSection('audio', dbdSection);

  // ── Section: Accessibility ──
  html += renderSection('accessibility', dbdSection);

  // ── Section: Auras ──
  html += renderAuraSection();

  // ── Section: Scratch Marks ──
  html += renderScratchMarksSection();

  container.innerHTML = html;

  // ── Bind events ──
  container.querySelectorAll('.cfg-slider').forEach(el => {
    el.addEventListener('input', () => {
      const val = el.value;
      const label = el.closest('.cfg-field').querySelector('.cfg-value');
      if (label) label.textContent = val + (el.dataset.unit || '');
      _modifiedValues[el.dataset.key] = val;
      onConfigModified();
    });
  });

  container.querySelectorAll('.cfg-select').forEach(el => {
    el.addEventListener('change', () => {
      _modifiedValues[el.dataset.key] = el.value;
      onConfigModified();
    });
  });

  container.querySelectorAll('.cfg-bool').forEach(el => {
    el.addEventListener('change', () => {
      _modifiedValues[el.dataset.key] = el.checked ? 'True' : 'False';
      onConfigModified();
    });
  });

  // Aura color picker & sliders
  container.querySelectorAll('.cfg-color').forEach(el => {
    el.addEventListener('input', () => {
      const channel = el.dataset.channel;
      const value = channel === 'color' ? el.value : parseInt(el.value);
      applyAuraColor(el.dataset.tag, channel, value);
      onConfigModified();
    });
  });

  // Scratch marks color
  container.querySelectorAll('.cfg-scratch-color').forEach(el => {
    el.addEventListener('input', () => {
      const channel = el.dataset.channel;
      const key = el.dataset.key;
      const card = el.closest('.cfg-aura-card');
      if (!card) return;

      // Read current values from the card
      let r = parseInt(card.querySelector('[data-channel="r"]').value);
      let g = parseInt(card.querySelector('[data-channel="g"]').value);
      let b = parseInt(card.querySelector('[data-channel="b"]').value);
      let a = parseInt(card.querySelector('[data-channel="a"]').value);

      if (channel === 'color') {
        const hex = el.value.replace('#', '');
        r = parseInt(hex.slice(0,2), 16);
        g = parseInt(hex.slice(2,4), 16);
        b = parseInt(hex.slice(4,6), 16);
      } else if (channel === 'r') r = parseInt(el.value);
      else if (channel === 'g') g = parseInt(el.value);
      else if (channel === 'b') b = parseInt(el.value);
      else if (channel === 'a') a = parseInt(el.value);

      // Update preview
      const preview = card.querySelector('.cfg-aura-preview');
      if (preview) preview.style.background = `rgba(${r},${g},${b},${a/255})`;

      // Update color picker
      const picker = card.querySelector('.cfg-scratch-color[data-channel="color"]');
      if (picker) picker.value = rgbToHex(r, g, b);

      // Sync sliders
      card.querySelectorAll('.cfg-scratch-color').forEach(sl => {
        if (sl.dataset.channel === 'r') sl.value = r;
        else if (sl.dataset.channel === 'g') sl.value = g;
        else if (sl.dataset.channel === 'b') sl.value = b;
        else if (sl.dataset.channel === 'a') sl.value = a;
      });

      // Store in modified values as inline color string
      _modifiedValues[key] = serializeInlineColor({ r, g, b, a });
      onConfigModified();
    });
  });

  container.querySelectorAll('.preset-btn').forEach(el => {
    el.addEventListener('click', () => {
      const preset = PRESETS[el.dataset.preset];
      if (!preset) return;
      for (const [key, val] of Object.entries(preset.values)) {
        _modifiedValues[key] = String(val);
        // Update UI if field exists
        const input = container.querySelector(`[data-key="${key}"]`);
        if (input) {
          if (input.type === 'checkbox') input.checked = val === 'True';
          else input.value = val;
          const label = input.closest('.cfg-field')?.querySelector('.cfg-value');
          if (label) label.textContent = val;
        }
      }
      onConfigModified();
    });
  });
}

function renderSection(sectionKey, data) {
  const def = FIELD_DEFS[sectionKey];
  if (!def) return '';

  let html = `<div class="cfg-section">
    <div class="cfg-section-header">
      <span class="cfg-section-title">${def.label}</span>
      <span class="cfg-section-desc">${def.desc}</span>
    </div>
    <div class="cfg-fields">`;

  for (const field of def.fields) {
    const currentVal = data[field.key] !== undefined ? data[field.key] :
      _modifiedValues[field.key] !== undefined ? _modifiedValues[field.key] :
      field.default !== undefined ? field.default : '';

    if (sectionKey === 'auras') continue; // handled separately
    if (field.key === 'FieldOfView' && sectionKey !== 'gameplay') continue; // only in gameplay

    html += renderField(field, currentVal);
  }

  html += '</div></div>';
  return html;
}

function renderField(field, currentVal) {
  const impact = IMPACT_LABELS[field.impact] || IMPACT_LABELS.none;
  const val = currentVal !== undefined && currentVal !== '' ? currentVal : (field.default !== undefined ? field.default : '');

  // Deduplicate: FOV appears in both video and gameplay, only show in gameplay
  if (field.key === 'FieldOfView' && !field.key.startsWith('sg.') && !field.key.startsWith('aura.')) {
    // Only render in gameplay section
  }

  let inputHtml = '';
  if (field.type === 'bool') {
    inputHtml = `
      <label class="cfg-toggle">
        <input type="checkbox" class="cfg-bool" data-key="${field.key}" ${val === 'True' || val === true ? 'checked' : ''} />
        <span class="toggle-track"></span>
      </label>`;
  } else if (field.type === 'select' || (field.min === undefined && field.max === undefined)) {
    // Select or value display
    if (field.options) {
      inputHtml = `<select class="cfg-select cfg-input" data-key="${field.key}">
        ${Object.entries(field.options).map(([k, v]) => `<option value="${k}" ${String(val) === String(k) ? 'selected' : ''}>${v}</option>`).join('')}
      </select>`;
    } else {
      inputHtml = `<input type="text" class="cfg-input cfg-text" data-key="${field.key}" value="${val}" />`;
    }
  } else {
    const unit = field.unit || '';
    inputHtml = `
      <div class="cfg-slider-wrap">
        <input type="range" class="cfg-slider cfg-input" data-key="${field.key}" data-unit="${unit}"
               min="${field.min}" max="${field.max}" step="${field.step || 1}" value="${val}" />
        <span class="cfg-value">${val}${unit}</span>
      </div>`;
  }

  return `
    <div class="cfg-field" data-key="${field.key}">
      <div class="cfg-field-info">
        <span class="cfg-field-label">${field.label}</span>
        <span class="cfg-field-impact" style="color:${impact.color}">● ${impact.label}</span>
      </div>
      <div class="cfg-field-control">${inputHtml}</div>
      <div class="cfg-field-desc">${field.desc}</div>
    </div>`;
}

function renderAuraSection() {
  const def = FIELD_DEFS.auras;
  let html = `<div class="cfg-section">
    <div class="cfg-section-header">
      <span class="cfg-section-title">${def.label}</span>
      <span class="cfg-section-desc">${def.desc}</span>
    </div>
    <div class="cfg-fields cfg-aura-grid">`;

  for (const aura of _currentAuras) {
    const hexColor = rgbToHex(aura.r, aura.g, aura.b);
    html += `
      <div class="cfg-aura-card" data-tag="${aura.tag}">
        <div class="cfg-aura-preview" style="background:rgba(${aura.r},${aura.g},${aura.b},${aura.a/255})"></div>
        <div class="cfg-aura-info">
          <span class="cfg-aura-label">${getAuraLabel(aura.tag)}</span>
          <span class="cfg-aura-tag">${aura.tag.split('.').pop()}</span>
        </div>
        <div class="cfg-aura-controls">
          <input type="color" class="cfg-color-picker cfg-color" value="${hexColor}"
                 data-tag="${aura.tag}" data-channel="color" title="Pick color" />
          <div class="cfg-aura-sliders">
            <label class="cfg-chan">R <input type="range" class="cfg-color" min="0" max="255" value="${aura.r}" data-tag="${aura.tag}" data-channel="r" /></label>
            <label class="cfg-chan">G <input type="range" class="cfg-color" min="0" max="255" value="${aura.g}" data-tag="${aura.tag}" data-channel="g" /></label>
            <label class="cfg-chan">B <input type="range" class="cfg-color" min="0" max="255" value="${aura.b}" data-tag="${aura.tag}" data-channel="b" /></label>
            <label class="cfg-chan">A <input type="range" class="cfg-color" min="0" max="255" value="${aura.a}" data-tag="${aura.tag}" data-channel="a" /></label>
          </div>
        </div>
      </div>`;
  }

  html += '</div></div>';
  return html;
}

function getAuraLabel(tag) {
  for (const [, def] of Object.entries(FIELD_DEFS.auras.fields)) {
    if (def.tag === tag) return def.label;
  }
  const parts = tag.split('.');
  return parts[parts.length - 1].replace(/([A-Z])/g, ' $1').trim();
}

// ── Scratch Marks section ──

function parseInlineColor(value) {
  // Format: (B=75,G=0,R=184,A=255)
  const m = value.match(/B=(\d+),G=(\d+),R=(\d+),A=(\d+)/);
  if (!m) return null;
  return { r: parseInt(m[3]), g: parseInt(m[2]), b: parseInt(m[1]), a: parseInt(m[4]) };
}

function serializeInlineColor(color) {
  return `(B=${color.b},G=${color.g},R=${color.r},A=${color.a})`;
}

function renderScratchMarksSection() {
  const raw = _currentSections['/Script/DeadByDaylight.DBDGameUserSettings'] || {};
  const scratchRaw = raw['ScratchMarksColor'] || '';
  const color = parseInlineColor(scratchRaw);
  if (!color) return '';

  const hexColor = rgbToHex(color.r, color.g, color.b);

  return `<div class="cfg-section">
    <div class="cfg-section-header">
      <span class="cfg-section-title">Scratch Marks</span>
      <span class="cfg-section-desc">Color of scratch marks left by running survivors.</span>
    </div>
    <div class="cfg-fields cfg-aura-grid">
      <div class="cfg-aura-card" data-key="ScratchMarksColor">
        <div class="cfg-aura-preview" style="background:rgba(${color.r},${color.g},${color.b},${color.a/255})"></div>
        <div class="cfg-aura-info">
          <span class="cfg-aura-label">Scratch Marks Color</span>
          <span class="cfg-aura-tag">ScratchMarksColor</span>
        </div>
        <div class="cfg-aura-controls">
          <input type="color" class="cfg-color-picker cfg-scratch-color" value="${hexColor}"
                 data-key="ScratchMarksColor" data-channel="color" title="Pick color" />
          <div class="cfg-aura-sliders">
            <label class="cfg-chan">R <input type="range" class="cfg-scratch-color" min="0" max="255" value="${color.r}" data-key="ScratchMarksColor" data-channel="r" /></label>
            <label class="cfg-chan">G <input type="range" class="cfg-scratch-color" min="0" max="255" value="${color.g}" data-key="ScratchMarksColor" data-channel="g" /></label>
            <label class="cfg-chan">B <input type="range" class="cfg-scratch-color" min="0" max="255" value="${color.b}" data-key="ScratchMarksColor" data-channel="b" /></label>
            <label class="cfg-chan">A <input type="range" class="cfg-scratch-color" min="0" max="255" value="${color.a}" data-key="ScratchMarksColor" data-channel="a" /></label>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

function applyAuraColor(tag, channel, value) {
  const aura = _currentAuras.find(a => a.tag === tag);
  if (!aura) return;

  if (channel === 'color') {
    // hex color picker: set r,g,b from hex
    const hex = value.replace('#', '');
    aura.r = parseInt(hex.slice(0,2), 16);
    aura.g = parseInt(hex.slice(2,4), 16);
    aura.b = parseInt(hex.slice(4,6), 16);
  } else {
    aura[channel] = value;
  }

  // Update preview
  const card = document.querySelector(`.cfg-aura-card[data-tag="${tag}"]`);
  if (card) {
    const preview = card.querySelector('.cfg-aura-preview');
    if (preview) preview.style.background = `rgba(${aura.r},${aura.g},${aura.b},${aura.a/255})`;
    const picker = card.querySelector('.cfg-color-picker');
    if (picker) picker.value = rgbToHex(aura.r, aura.g, aura.b);
  }
}

function onConfigModified() {
  const status = $('#config-status');
  status.innerHTML = `${icon('alertCircle')} Unsaved changes`;
  status.className = 'config-status warning';
  configDirty = true;
}

// ── Serialize pretty mode to INI ──

function serializePrettyConfig() {
  if (!_currentSections) return _configRaw;

  const sections = JSON.parse(JSON.stringify(_currentSections)); // deep clone

  // Apply modified values
  for (const [key, value] of Object.entries(_modifiedValues)) {
    if (key.startsWith('sg.')) {
      if (!sections['ScalabilityGroups']) sections['ScalabilityGroups'] = {};
      sections['ScalabilityGroups'][key] = value;
    } else {
      if (!sections['/Script/DeadByDaylight.DBDGameUserSettings']) {
        sections['/Script/DeadByDaylight.DBDGameUserSettings'] = {};
      }
      sections['/Script/DeadByDaylight.DBDGameUserSettings'][key] = value;
    }
  }

  // Apply aura changes
  if (_currentAuras.length > 0) {
    const auraSection = sections['/Script/DeadByDaylight.DBDGameUserSettings'] || {};
    auraSection['AuraColors'] = serializeAuraColors(_currentAuras);
  }

  return serializeIni(sections);
}
