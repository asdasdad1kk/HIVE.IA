import {
  Component,
  inject
} from '@angular/core';
import { APP_TOOLTIP_TEXT } from './tooltip.token';


@Component({
  selector:
    'app-tooltip-content',

  template: `
    <div
      role="tooltip"
      class="
        pointer-events-none
        max-w-80
        rounded
        border border-zinc-700
        bg-zinc-900
        px-3 py-2.5
        text-xs
        leading-5
        text-zinc-200
        shadow-2xl
        shadow-black/60
      "
    >
      {{ text }}
    </div>
  `
})
export class AppTooltipContentComponent {
  readonly text =
    inject<string>(
      APP_TOOLTIP_TEXT
    );
}
