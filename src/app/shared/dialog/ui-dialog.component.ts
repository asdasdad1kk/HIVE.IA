import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  signal,
  viewChild
} from '@angular/core';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import {
  CircleCheckBig,
  Info,
  LucideAngularModule,
  LucideIconData,
  ShieldAlert,
  TriangleAlert,
  X
} from 'lucide-angular';
import { AppButtonComponent } from '../components/button/button';

export type UiDialogKind = 'alert' | 'confirm' | 'prompt';
export type UiDialogTone = 'info' | 'success' | 'warning' | 'danger';
export type UiDialogResult = boolean | string | null;

export interface UiDialogInputConfig {
  label: string;
  placeholder?: string;
  value: string;
  required?: boolean;
  maxLength?: number;
  validate?: (value: string) => string | null;
}

export interface UiDialogData {
  kind: UiDialogKind;
  tone: UiDialogTone;
  title: string;
  message?: string;
  detail?: string;
  confirmText: string;
  cancelText: string;
  icon?: LucideIconData;
  input?: UiDialogInputConfig;
}

const BADGE_BASE =
  'grid size-11 shrink-0 place-items-center rounded border shadow-lg';

const TONE_ICONS: Record<UiDialogTone, LucideIconData> = {
  info: Info,
  success: CircleCheckBig,
  warning: TriangleAlert,
  danger: ShieldAlert
};

const TONE_LABELS: Record<UiDialogTone, string> = {
  info: 'Información',
  success: 'Completado',
  warning: 'Confirmación',
  danger: 'Atención'
};

const TONE_BADGES: Record<UiDialogTone, string> = {
  info: 'border-blue-500/25 bg-blue-500/10 text-blue-300 shadow-blue-950/20',
  success:
    'border-emerald-500/25 bg-emerald-500/10 text-emerald-300 shadow-emerald-950/20',
  warning:
    'border-amber-500/25 bg-amber-500/10 text-amber-300 shadow-amber-950/20',
  danger: 'border-red-500/25 bg-red-500/10 text-red-300 shadow-red-950/20'
};

const TONE_EYEBROWS: Record<UiDialogTone, string> = {
  info: 'text-blue-400',
  success: 'text-emerald-400',
  warning: 'text-amber-400',
  danger: 'text-red-400'
};

const INPUT_BASE =
  'mt-2 h-11 w-full rounded bg-zinc-900 px-4 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:ring-4';

const INPUT_BASE_INVALID = 'border border-red-500/60 focus:border-red-500 focus:ring-red-500/10';
const INPUT_BASE_VALID = 'border border-zinc-700 focus:border-blue-500 focus:ring-blue-500/10';

@Component({
  selector: 'app-ui-dialog',
  imports: [LucideAngularModule, AppButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="w-[min(440px,92vw)] overflow-hidden rounded-sm border border-zinc-700 bg-zinc-950 text-zinc-100 shadow-2xl shadow-black/60"
      [attr.aria-labelledby]="titleId"
      [attr.aria-describedby]="data.message ? messageId : null"
    >
      <div class="flex items-start gap-4 px-6 pt-6 pb-5">
        <span [class]="badgeClasses()" aria-hidden="true">
          <lucide-icon [img]="icon()" [size]="21" [strokeWidth]="1.9" />
        </span>

        <div class="min-w-0 flex-1">
          <p [class]="eyebrowClasses()">{{ toneLabel() }}</p>

          <h2 [id]="titleId" class="mt-1 text-base font-semibold tracking-tight text-zinc-100">
            {{ data.title }}
          </h2>

          @if (data.message) {
            <p [id]="messageId" class="mt-2 text-sm leading-6 text-zinc-400">
              {{ data.message }}
            </p>
          }

          @if (data.detail) {
            <p class="mt-2 text-xs leading-5 text-zinc-500">{{ data.detail }}</p>
          }
        </div>

        <button
          type="button"
          class="grid size-8 shrink-0 place-items-center rounded text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label="Cerrar diálogo"
          (click)="cancel()"
        >
          <lucide-icon [img]="XIcon" [size]="16" />
        </button>
      </div>

      @if (data.kind === 'prompt') {
        <div class="px-6 pb-5">
          <label class="block text-xs font-medium text-zinc-400" [attr.for]="inputId">
            {{ inputLabel() }}
            @if (inputRequired()) {
              <span class="text-red-400" aria-hidden="true">*</span>
            }
          </label>

          <input
            #promptInput
            [id]="inputId"
            type="text"
            [class]="inputClasses()"
            [placeholder]="inputPlaceholder()"
            [attr.maxlength]="maxLength()"
            [value]="value()"
            autocomplete="off"
            (input)="onInput(promptInput.value)"
            (keydown.enter)="accept()"
          />

          <div class="mt-1.5 flex items-start justify-between gap-3">
            @if (error()) {
              <p class="text-xs font-medium text-red-400">{{ error() }}</p>
            } @else {
              <p class="text-xs text-zinc-500">{{ inputHint() }}</p>
            }

            @if (maxLength()) {
              <span class="shrink-0 text-xs tabular-nums text-zinc-500">
                {{ value().length }}/{{ maxLength() }}
              </span>
            }
          </div>
        </div>
      }

      <footer
        class="flex items-center justify-end gap-2 border-t border-zinc-800 bg-zinc-900/60 px-6 py-4"
      >
        @if (data.kind !== 'alert') {
          <app-button variant="secondary" (pressed)="cancel()">
            {{ data.cancelText }}
          </app-button>
        }

        <app-button #confirmButton [variant]="confirmVariant()" (pressed)="accept()">
          {{ data.confirmText }}
        </app-button>
      </footer>
    </section>
  `
})
export class UiDialogComponent {
  private static instanceCount = 0;

  protected readonly data: UiDialogData = inject(DIALOG_DATA);
  private readonly dialogRef = inject(DialogRef<UiDialogResult>);

  private readonly instanceId = ++UiDialogComponent.instanceCount;

  protected readonly titleId = `ui-dialog-title-${this.instanceId}`;
  protected readonly messageId = `ui-dialog-message-${this.instanceId}`;
  protected readonly inputId = `ui-dialog-input-${this.instanceId}`;

  protected readonly XIcon = X;

  protected readonly value = signal(this.data.input?.value ?? '');
  protected readonly error = signal<string | null>(null);

  private readonly promptInput =
    viewChild<ElementRef<HTMLInputElement>>('promptInput');
  private readonly confirmButton =
    viewChild<ElementRef<HTMLElement>>('confirmButton');

  protected readonly toneLabel = computed(() => TONE_LABELS[this.data.tone]);
  protected readonly icon = computed(
    () => this.data.icon ?? TONE_ICONS[this.data.tone]
  );
  protected readonly badgeClasses = computed(
    () => `${BADGE_BASE} ${TONE_BADGES[this.data.tone]}`
  );
  protected readonly eyebrowClasses = computed(
    () => `text-[10px] font-bold uppercase tracking-[0.2em] ${TONE_EYEBROWS[this.data.tone]}`
  );

  protected readonly confirmVariant = computed(() =>
    this.data.tone === 'danger' ? ('danger' as const) : ('primary' as const)
  );

  protected readonly inputLabel = computed(
    () => this.data.input?.label ?? 'Valor'
  );
  protected readonly inputPlaceholder = computed(
    () => this.data.input?.placeholder ?? ''
  );
  protected readonly inputRequired = computed(
    () => this.data.input?.required === true
  );
  protected readonly maxLength = computed(() => this.data.input?.maxLength);
  protected readonly inputHint = computed(() =>
    this.inputRequired()
      ? 'Obligatorio. Pulsa Esc para cancelar.'
      : 'Escribe un valor o pulsa Esc para cancelar.'
  );
  protected readonly inputClasses = computed(() =>
    this.error()
      ? `${INPUT_BASE} ${INPUT_BASE_INVALID}`
      : `${INPUT_BASE} ${INPUT_BASE_VALID}`
  );

  constructor() {
    afterNextRender(() => {
      if (this.data.kind === 'prompt') {
        const input = this.promptInput()?.nativeElement;
        input?.focus();
        input?.select();
        return;
      }

      this.focusConfirm();
    });
  }

  private focusConfirm(): void {
    const host = this.confirmButton()?.nativeElement;
    if (!host) {
      return;
    }

    const target =
      host.tagName === 'BUTTON' ? host : host.querySelector('button');
    target?.focus();
  }

  protected onInput(value: string): void {
    this.value.set(value);
    if (this.error()) {
      this.error.set(null);
    }
  }

  protected accept(): void {
    if (this.data.kind !== 'prompt') {
      this.dialogRef.close(true);
      return;
    }

    const config = this.data.input;
    const value = this.value().trim();

    if (config?.required && !value) {
      this.error.set(`El campo "${config.label}" es obligatorio.`);
      return;
    }

    if (config?.maxLength && value.length > config.maxLength) {
      this.error.set(
        `El campo "${config.label}" admite como máximo ${config.maxLength} caracteres.`
      );
      return;
    }

    const validationError = config?.validate?.(value);
    if (validationError) {
      this.error.set(validationError);
      return;
    }

    this.dialogRef.close(value);
  }

  protected cancel(): void {
    this.dialogRef.close(this.data.kind === 'prompt' ? null : false);
  }
}
