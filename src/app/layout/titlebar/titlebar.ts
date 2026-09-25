import {
  Component,
  inject,
  OnDestroy,
  OnInit,
  signal
} from '@angular/core';

import {
  LucideAngularModule,
  Maximize2,
  Minus,
  Moon,
  Sun,
  Square,
  UserRound,
  X
} from 'lucide-angular';

import { OverlayModule } from '@angular/cdk/overlay';
import { Auth } from '../../core/services/auth';

type AppTheme = 'zinc' | 'slate';

@Component({
  selector: 'app-titlebar',
  imports: [
    LucideAngularModule,
    OverlayModule
  ],
  templateUrl: './titlebar.html'
})
export class Titlebar implements OnInit, OnDestroy {

  readonly minimizeIcon = Minus;
  readonly maximizeIcon = Maximize2;
  readonly restoreIcon = Square;
  readonly closeIcon = X;

  readonly sunIcon = Sun;
  readonly moonIcon = Moon;

  readonly userIcon = UserRound;

  readonly applicationLogo = './assets/G.png';

  readonly auth = inject(Auth);

  readonly isMaximized = signal(false);

  readonly theme = signal<AppTheme>(
    (localStorage.getItem('theme') as AppTheme) ?? 'zinc'
  );

  readonly userTooltipOpen = signal(false);

  private removeMaximizeListener: (() => void) | null = null;

  async ngOnInit(): Promise<void> {

    this.applyTheme(this.theme());

    const controls =
      window.checklistApi?.windowControls;

    if (!controls) {
      return;
    }

    this.isMaximized.set(
      await controls.isMaximized()
    );

    this.removeMaximizeListener =
      controls.onMaximizedChange(
        maximized =>
          this.isMaximized.set(maximized)
      );
  }

  ngOnDestroy(): void {
    this.removeMaximizeListener?.();
  }

  toggleTheme(): void {

    const next =
      this.theme() === 'zinc'
        ? 'slate'
        : 'zinc';

    this.theme.set(next);

    localStorage.setItem(
      'theme',
      next
    );

    this.applyTheme(next);
  }

  private applyTheme(theme: AppTheme): void {

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
  }

  minimize(): void {
    void window.checklistApi
      ?.windowControls
      .minimize();
  }

  async toggleMaximize(): Promise<void> {

    const maximized =
      await window.checklistApi
        ?.windowControls
        .toggleMaximize();

    if (
      typeof maximized === 'boolean'
    ) {
      this.isMaximized.set(maximized);
    }
  }

  close(): void {
    void window.checklistApi
      ?.windowControls
      .close();
  }
}