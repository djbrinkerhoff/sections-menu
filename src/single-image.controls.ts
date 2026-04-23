import { applyImageRadius, getImageRadiusIndex, IMAGE_RADIUS_STOPS } from './image-radius';
import { createSegmentedGroup } from './control-builders';
import { createLabeledRangeGroup } from './range-control';
import { BG_WIDTHS, BG_WIDTH_LABELS, CONTENT_WIDTHS, CONTENT_WIDTH_LABELS } from './section-width';

export interface SingleImageControlsHandle {
  cleanup(): void;
}

export function initSingleImageControls(
  singleImageRoot: HTMLElement,
  container: HTMLElement,
  onStateChange: () => void = () => {},
): SingleImageControlsHandle {
  const abortController = new AbortController();
  const { signal } = abortController;

  const wrapper = document.createElement('div');
  wrapper.className = 'controls';
  applyImageRadius(singleImageRoot, singleImageRoot.dataset.radius);

  // Section width controls (shared schema from section-width.ts)
  wrapper.appendChild(createSegmentedGroup({
    name: 'bgWidth', label: 'Background width', values: BG_WIDTHS,
    labels: BG_WIDTH_LABELS,
    initialValue: singleImageRoot.dataset.bgWidth,
    onChange(v) {
      singleImageRoot.dataset.bgWidth = v;
      onStateChange();
    },
    signal,
  }));

  wrapper.appendChild(createSegmentedGroup({
    name: 'contentWidth', label: 'Content width', values: CONTENT_WIDTHS,
    labels: CONTENT_WIDTH_LABELS,
    initialValue: singleImageRoot.dataset.contentWidth,
    onChange(v) {
      singleImageRoot.dataset.contentWidth = v;
      onStateChange();
    },
    signal, description: 'Visible at wider viewports.',
  }));

  wrapper.appendChild(createLabeledRangeGroup({
    name: 'radius',
    label: 'Border radius',
    steps: IMAGE_RADIUS_STOPS.map((stop) => stop.label),
    initialIndex: getImageRadiusIndex(singleImageRoot.dataset.radius),
    onInput(stepIndex) {
      const stop = IMAGE_RADIUS_STOPS[stepIndex];
      if (!stop) return;
      applyImageRadius(singleImageRoot, stop.value);
      onStateChange();
    },
    signal,
  }));

  container.appendChild(wrapper);

  return {
    cleanup() {
      abortController.abort();
      wrapper.remove();
    },
  };
}
