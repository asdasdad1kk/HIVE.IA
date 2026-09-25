import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideAngularModule,
  LucideIconData,
  LoaderCircle,
} from 'lucide-angular';

export type AppButtonVariant =
  | 'primary'
  | 'secondary'
  | 'danger'
  | 'ghost'
  | 'success';

export type AppButtonSize =
  | 'sm'
  | 'md'
  | 'icon';

@Component({
  selector: 'app-button',
  imports: [
    RouterLink,
    LucideAngularModule,
    NgTemplateOutlet,
  ],
  template: `
    @if (link(); as route) {
      <a
        [routerLink]="route"
        [class]="classes()"
        [attr.aria-label]="ariaLabel()"
        [attr.aria-disabled]="isDisabled()"
        [attr.tabindex]="isDisabled() ? -1 : null"
        [attr.title]="title()"
        (click)="handleLinkClick($event)"
      >
        <ng-container
          [ngTemplateOutlet]="buttonContent"
        />
      </a>
    } @else {
      <button
        [type]="type()"
        [class]="classes()"
        [disabled]="isDisabled()"
        [attr.aria-label]="ariaLabel()"
        [attr.aria-busy]="loading()"
        [attr.title]="title()"
        (click)="handleClick()"
      >
        <ng-container
          [ngTemplateOutlet]="buttonContent"
        />
      </button>
    }

    <ng-template #buttonContent>
      @if (loading()) {
        <lucide-icon
          [img]="LoaderCircle"
          [size]="iconSize()"
          [strokeWidth]="2"
          class="shrink-0 animate-spin"
          aria-hidden="true"
        />
      } @else if (icon(); as buttonIcon) {
        <lucide-icon
          [img]="buttonIcon"
          [size]="iconSize()"
          [strokeWidth]="2"
          class="shrink-0"
          aria-hidden="true"
        />
      }

      @if (size() !== 'icon') {
        <span class="truncate">
          @if (loading() && loadingText()) {
            {{ loadingText() }}
          } @else {
            <ng-content />
          }
        </span>
      }
    </ng-template>
  `,
})
export class AppButtonComponent {
  readonly variant = input<AppButtonVariant>('secondary');
  readonly size = input<AppButtonSize>('md');

  readonly type = input<'button' | 'submit' | 'reset'>(
    'button',
  );

  readonly icon = input<LucideIconData | null>(null);

  readonly link = input<string | readonly unknown[] | null>(
    null,
  );

  readonly disabled = input(false);
  readonly loading = input(false);
  readonly loadingText = input<string | null>(null);
  readonly fullWidth = input(false);
  readonly ariaLabel = input<string | null>(null);
  readonly title = input<string | null>(null);

  readonly pressed = output<void>();

  protected readonly LoaderCircle = LoaderCircle;

  readonly isDisabled = computed(
    () => this.disabled() || this.loading(),
  );

  readonly iconSize = computed(() => {
    return this.size() === 'icon' ? 17 : 16;
  });

  readonly classes = computed(() => {
    const baseClasses = [
      'relative',
      'inline-flex',
      'shrink-0',
      'items-center',
      'justify-center',
      'gap-2',
      // 'rounded-sm',
      'border',
      'font-medium',
      'outline-none',
      'transition',
      'duration-200',
      'focus-visible:ring-2',
      'focus-visible:ring-blue-500',
      'focus-visible:ring-offset-2',
      'focus-visible:ring-offset-zinc-950',
      'disabled:pointer-events-none',
      'disabled:cursor-not-allowed',
      'disabled:opacity-50',
    ];

    const variantClasses: Record<
  AppButtonVariant,
  string[]
> = {
  primary: [
    'border-transparent',
    'bg-blue-600',
    'text-white',
    'shadow-lg',
    'shadow-blue-950/20',
    'hover:bg-blue-500',
    'hover:shadow-blue-950/30',
  ],

  success: [
    'border-transparent',
    'bg-emerald-600',
    'text-white',
    'shadow-lg',
    'shadow-emerald-950/20',
    'hover:bg-emerald-500',
    'hover:shadow-emerald-950/30',
  ],

  secondary: [
    'border-zinc-700',
    'bg-zinc-900',
    'text-zinc-200',
    'hover:border-zinc-600',
    'hover:bg-zinc-800',
    'hover:text-white',
  ],

  danger: [
    'border-transparent',
    'bg-red-600/90',
    'text-white',
    'shadow-lg',
    'shadow-red-950/20',
    'hover:bg-red-500',
    'hover:shadow-red-950/30',
  ],

  ghost: [
    'border-transparent',
    'bg-transparent',
    'text-zinc-400',
    'hover:bg-zinc-800',
    'hover:text-zinc-100',
  ],
};

    const sizeClasses: Record<AppButtonSize, string[]> = {
      sm: [
        'min-h-9',
        'px-3',
        'py-2',
        'text-sm',
      ],
      md: [
        'min-h-10',
        'px-4',
        'py-2.5',
        'text-sm',
      ],
      icon: [
        'size-9',
        'p-0',
      ],
    };

    return [
      ...baseClasses,
      ...variantClasses[this.variant()],
      ...sizeClasses[this.size()],
      this.fullWidth() ? 'w-full' : '',
    ]
      .filter(Boolean)
      .join(' ');
  });

  handleClick(): void {
    if (this.isDisabled()) {
      return;
    }

    this.pressed.emit();
  }

  handleLinkClick(event: MouseEvent): void {
    if (this.isDisabled()) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    this.pressed.emit();
  }
}