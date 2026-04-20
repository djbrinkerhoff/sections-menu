interface LabeledRangeGroupOptions {
  controlName?: string;
  description?: string;
  initialValue?: number;
  initialIndex: number;
  label: string;
  max?: number;
  min?: number;
  name: string;
  onInput: (value: number) => void;
  signal: AbortSignal;
  step?: number;
  steps: readonly string[];
}

export function createLabeledRangeGroup({
  controlName,
  description,
  initialValue,
  initialIndex,
  label,
  max,
  min,
  name,
  onInput,
  signal,
  step,
  steps,
}: LabeledRangeGroupOptions): HTMLFieldSetElement {
  const fieldset = document.createElement('fieldset');
  fieldset.className = 'control-group';
  fieldset.dataset.control = controlName ?? name;
  fieldset.innerHTML = `<legend class="control-group__label">${label}</legend>`;

  if (description) {
    const desc = document.createElement('p');
    desc.className = 'control-group__desc';
    desc.textContent = description;
    fieldset.appendChild(desc);
  }

  const range = document.createElement('input');
  range.className = 'control-group__range';
  range.type = 'range';
  range.name = name;
  range.min = String(min ?? 0);
  range.max = String(max ?? (steps.length - 1));
  range.step = String(step ?? 1);
  range.value = String(initialValue ?? initialIndex);
  range.ariaLabel = label;
  range.addEventListener('input', () => {
    onInput(Number.parseFloat(range.value));
  }, { signal });

  const labels = document.createElement('div');
  labels.className = 'control-group__range-labels';
  labels.style.setProperty('--range-label-count', String(steps.length));

  for (const stepLabel of steps) {
    const span = document.createElement('span');
    span.textContent = stepLabel;
    labels.appendChild(span);
  }

  fieldset.appendChild(range);
  fieldset.appendChild(labels);
  return fieldset;
}
