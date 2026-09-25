import {
  Injectable,
  signal
} from '@angular/core';

export type AppTheme = 'zinc' | 'slate';

@Injectable({ providedIn: 'root' })
export class ThemeService {

  readonly theme = signal<AppTheme>(
    this.readStoredTheme()
  );

  readonly isDark =
    signal(
      this.readStoredTheme() === 'zinc'
    );

  constructor() {
    this.apply(this.theme());
  }

  toggle(): void {
    const next =
      this.theme() === 'zinc'
        ? 'slate'
        : 'zinc';

    this.theme.set(next);
    this.isDark.set(next === 'zinc');

    localStorage.setItem(
      'theme',
      next
    );

    this.apply(next);
  }

  private apply(
    theme: AppTheme
  ): void {
    const root =
      document.documentElement;

    root.setAttribute(
      'data-theme',
      theme
    );

    root.classList.remove(
      'theme-zinc',
      'theme-slate'
    );

    root.classList.add(
      `theme-${theme}`
    );

    window.checklistApi
      ?.copilot
      .setTheme(
        theme === 'zinc'
          ? 'dark'
          : 'light'
      );
  }

  private readStoredTheme(): AppTheme {
    return (
      localStorage.getItem(
        'theme'
      ) as AppTheme
    ) ?? 'zinc';
  }
}