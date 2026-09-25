import { Component, input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  template: `
    <header class="mb-7 flex flex-wrap items-start justify-between gap-4">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.22em] text-blue-400">
          Checklist Studio
        </p>

        <h1 class="mt-2 text-3xl font-semibold tracking-tight text-zinc-100">
          {{ title() }}
        </h1>

        @if (description()) {
          <p class="mt-2 text-sm text-zinc-400">
            {{ description() }}
          </p>
        }
      </div>

      <div class="flex items-center gap-2">
        <ng-content />
      </div>
    </header>
  `
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly description = input('');
}
