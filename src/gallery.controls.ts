// Gallery control schema (inlined — no separate schema file for 4 controls)
const COLUMNS = ['2', '3', '4'] as const;
const GAPS = ['none', 'sm', 'md', 'lg'] as const;
const ASPECTS = ['square', 'landscape', 'portrait', 'auto'] as const;

type GalleryControlKey = 'columns' | 'gap' | 'aspect' | 'captions';

export function initGalleryControls(galleryRoot: HTMLElement, container: HTMLElement) {
  const abortController = new AbortController();
  const { signal } = abortController;

  const wrapper = document.createElement('div');
  wrapper.className = 'controls';

  function setControl(key: GalleryControlKey, value: string): void {
    galleryRoot.dataset[key] = value;
  }

  // ─── Builder: segmented group ───
  function createSegmentedGroup(
    name: string,
    label: string,
    values: readonly string[],
    labels: Record<string, string>,
    controlKey: GalleryControlKey,
  ): HTMLFieldSetElement {
    const fieldset = document.createElement('fieldset');
    fieldset.className = 'control-group';
    fieldset.dataset.control = name;
    fieldset.innerHTML = `<legend class="control-group__label">${label}</legend>`;

    const options = document.createElement('div');
    options.className = 'control-group__options--segmented';

    for (const v of values) {
      const labelEl = document.createElement('label');
      labelEl.className = 'segmented-btn';

      const input = document.createElement('input');
      input.type = 'radio';
      input.name = name;
      input.value = v;
      input.checked = v === (galleryRoot.dataset[controlKey] ?? values[0]);
      input.addEventListener('change', () => setControl(controlKey, v), { signal });

      labelEl.appendChild(input);

      const display = labels[v];
      if (display !== undefined) {
        const span = document.createElement('span');
        span.innerHTML = display;
        labelEl.appendChild(span);
      }

      options.appendChild(labelEl);
    }

    fieldset.appendChild(options);
    return fieldset;
  }

  // ─── Render controls ───

  // 1. Columns
  wrapper.appendChild(createSegmentedGroup(
    'columns', 'Columns', COLUMNS,
    { '2': '2', '3': '3', '4': '4' },
    'columns',
  ));

  // 2. Gap
  wrapper.appendChild(createSegmentedGroup(
    'gap', 'Gap', GAPS,
    { none: 'None', sm: 'S', md: 'M', lg: 'L' },
    'gap',
  ));

  // 3. Aspect ratio
  wrapper.appendChild(createSegmentedGroup(
    'aspect', 'Aspect ratio', ASPECTS,
    { square: '1:1', landscape: '4:3', portrait: '3:4', auto: 'Auto' },
    'aspect',
  ));

  // 4. Captions
  wrapper.appendChild(createSegmentedGroup(
    'captions', 'Captions', ['false', 'true'] as const,
    { false: 'Off', true: 'On' },
    'captions',
  ));

  container.appendChild(wrapper);

  return {
    cleanup() {
      abortController.abort();
      wrapper.remove();
    },
  };
}
