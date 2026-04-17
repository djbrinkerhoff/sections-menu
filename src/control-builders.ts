// Shared control-panel builder functions.
// Each builder creates a fieldset with a legend and wires events via { signal }.

// ─── Stepper ───

interface StepperGroupOptions {
  name: string;
  label: string;
  initialValue: number;
  min: number;
  max: number;
  onStep: (value: number) => void;
  getDisplayValue: () => string;
  signal: AbortSignal;
}

export function createStepperGroup({
  name,
  label,
  initialValue,
  min,
  max,
  onStep,
  getDisplayValue,
  signal,
}: StepperGroupOptions): HTMLFieldSetElement {
  const fieldset = document.createElement('fieldset');
  fieldset.className = 'control-group';
  fieldset.dataset.control = name;
  fieldset.innerHTML = `<legend class="control-group__label">${label}</legend>`;

  let current = initialValue;

  const stepper = document.createElement('div');
  stepper.className = 'control-stepper';

  const minusBtn = document.createElement('button');
  minusBtn.className = 'control-stepper__btn';
  minusBtn.type = 'button';
  minusBtn.textContent = '\u2212';
  minusBtn.ariaLabel = `Decrease ${label}`;

  const valueInput = document.createElement('input');
  valueInput.className = 'control-stepper__value';
  valueInput.type = 'text';
  valueInput.inputMode = 'numeric';
  valueInput.value = getDisplayValue();
  valueInput.ariaLabel = label;
  valueInput.autocomplete = 'off';

  const plusBtn = document.createElement('button');
  plusBtn.className = 'control-stepper__btn';
  plusBtn.type = 'button';
  plusBtn.textContent = '+';
  plusBtn.ariaLabel = `Increase ${label}`;

  function update(newValue: number): void {
    current = Math.max(min, Math.min(max, newValue));
    onStep(current);
    valueInput.value = getDisplayValue();
  }

  minusBtn.addEventListener('click', () => update(current - 1), { signal });
  plusBtn.addEventListener('click', () => update(current + 1), { signal });
  valueInput.addEventListener('change', () => {
    const parsed = Number.parseInt(valueInput.value, 10);
    if (Number.isFinite(parsed)) {
      update(parsed);
    } else {
      valueInput.value = getDisplayValue();
    }
  }, { signal });
  valueInput.addEventListener('blur', () => {
    valueInput.value = getDisplayValue();
  }, { signal });

  stepper.appendChild(minusBtn);
  stepper.appendChild(valueInput);
  stepper.appendChild(plusBtn);
  fieldset.appendChild(stepper);
  return fieldset;
}

// ─── Segmented (radio button row) ───

interface SegmentedGroupOptions {
  name: string;
  label: string;
  values: readonly string[];
  labels: Record<string, string>;
  initialValue: string | undefined;
  onChange: (value: string) => void;
  signal: AbortSignal;
  description?: string;
}

export function createSegmentedGroup({
  name,
  label,
  values,
  labels,
  initialValue,
  onChange,
  signal,
  description,
}: SegmentedGroupOptions): HTMLFieldSetElement {
  const fieldset = document.createElement('fieldset');
  fieldset.className = 'control-group';
  fieldset.dataset.control = name;
  fieldset.innerHTML = `<legend class="control-group__label">${label}</legend>`;

  if (description) {
    const desc = document.createElement('p');
    desc.className = 'control-group__desc';
    desc.textContent = description;
    fieldset.appendChild(desc);
  }

  const options = document.createElement('div');
  options.className = 'control-group__options--segmented';

  for (const v of values) {
    const labelEl = document.createElement('label');
    labelEl.className = 'segmented-btn';

    const input = document.createElement('input');
    input.type = 'radio';
    input.name = name;
    input.value = v;
    input.checked = v === (initialValue ?? values[0]);
    input.addEventListener('change', () => onChange(v), { signal });

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
