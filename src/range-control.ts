interface LabeledRangeGroupOptions {
  controlName?: string;
  description?: string;
  initialIndex: number;
  label: string;
  name: string;
  onInput: (stepIndex: number) => void;
  signal: AbortSignal;
  steps: readonly string[];
}

export function createLabeledRangeGroup({
  controlName,
  description,
  initialIndex,
  label,
  name,
  onInput,
  signal,
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
  range.min = '0';
  range.max = String(steps.length - 1);
  range.step = '1';
  range.value = String(initialIndex);
  range.ariaLabel = label;
  range.addEventListener('input', () => {
    onInput(Number.parseInt(range.value, 10));
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
