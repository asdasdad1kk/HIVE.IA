import { Component, input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  template: `
    <header class="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-zinc-800/70 pb-5">
      <div class="min-w-0">
        <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-500">
          {{ eyebrow() }}
        </p>

        <h1 class="mt-1.5 text-2xl font-semibold tracking-tight text-zinc-100 md:text-3xl">
          {{ title() }}
        </h1>

        @if (description()) {
          <p class="mt-1.5 text-sm text-zinc-500">
            {{ description() }}
          </p>
        }
      </div>

      <div class="flex shrink-0 items-center gap-2">
        <ng-content />
      </div>
    </header>
  `
})
export class PageHeaderComponent {
  readonly eyebrow = input('Checklist Studio');
  readonly title = input.required<string>();
  readonly description = input('');
}