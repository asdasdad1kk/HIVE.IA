import {
  Component,
  inject,
  OnDestroy,
  OnInit,
  signal
} from '@angular/core';

import {
  LucideAngularModule,
  Hexagon,
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
import { ThemeService } from '../../core/services/theme.service';

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

  readonly brandIcon = Hexagon;

  readonly applicationLogo = './assets/G.png';

  readonly auth = inject(Auth);

  readonly themeService = inject(ThemeService);

  readonly isMaximized = signal(false);

  readonly userTooltipOpen = signal(false);

  private removeMaximizeListener: (() => void) | null = null;

  async ngOnInit(): Promise<void> {

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
    this.themeService.toggle();
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