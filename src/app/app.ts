import {
  Component,
  inject,
  OnDestroy,
  OnInit,
  signal
} from '@angular/core';

import {
  ActivatedRouteSnapshot,
  NavigationEnd,
  Router,
  RouterOutlet
} from '@angular/router';
import { filter, Subscription } from 'rxjs';
import {
  ExternalLink,
  LogOut,
  LucideAngularModule,
  PanelRightOpen,
  RefreshCw,
  Sparkles,
  X
} from 'lucide-angular';
import { AppSidebarComponent } from './layout/sidebar/sidebar';
import { Titlebar } from './layout/titlebar/titlebar';


@Component({
  selector: 'app-root',

  imports: [
    RouterOutlet,
    AppSidebarComponent,
    LucideAngularModule,
    Titlebar
  ],

  template: `
    <div
      class="
        flex
        h-screen
        w-screen
        flex-col
        overflow-hidden
        bg-zinc-950
        text-zinc-100
      "
    >
      <app-titlebar />

      <div
        class="
          flex
          min-h-0
          flex-1
          overflow-hidden
        "
      >
        <app-sidebar />

      <main
  data-app-scroll-container
  class="
    relative
    min-w-0
    flex-1
    overflow-y-auto
    overflow-x-hidden
    bg-zinc-950
  "
>
  <div
    class="
      pointer-events-none
      fixed
      right-0
      top-12
      h-96
      w-96
      rounded-full
      bg-blue-600/8
      blur-3xl
    "
    aria-hidden="true"
  ></div>

  <div
    class="
      pointer-events-none
      fixed
      bottom-0
      left-1/3
      h-80
      w-80
      rounded-full
      bg-blue-600/5
      blur-3xl
    "
    aria-hidden="true"
  ></div>

  <div
    class="app-grain"
    aria-hidden="true"
  ></div>

  <div
     [class]="
       fullBleed()
         ? 'relative min-h-full w-full'
         : 'relative min-h-full w-full p-5 md:p-7'
     "
   >
    <router-outlet />
  </div>
</main>

        @if (copilotOpen()) {
          <aside
            class="
              flex
              w-[440px]
              shrink-0
              flex-col
              border-l
              border-zinc-800
              bg-zinc-950
            "
          >
            <header
              class="
                flex
                h-11
                shrink-0
                items-center
                gap-2
                border-b
                border-zinc-800
                bg-zinc-900
                px-3
              "
            >
              <span
                class="
                  grid
                  size-6
                  place-items-center
                  rounded
                  bg-blue-500/15
                  text-blue-300
                "
              >
                <lucide-icon [img]="sparklesIcon" [size]="14" />
              </span>

              <span class="text-sm font-semibold text-zinc-100">
                Copilot
              </span>

              <div class="ml-auto flex items-center">
                <button
                  type="button"
                  class="grid size-9 place-items-center text-zinc-400 transition hover:text-zinc-100"
                  title="Recargar Copilot"
                  (click)="refreshCopilot()"
                >
                  <lucide-icon [img]="refreshIcon" [size]="15" />
                </button>

                <button
                  type="button"
                  class="grid size-9 place-items-center text-zinc-400 transition hover:text-zinc-100"
                  title="Abrir en el navegador"
                  (click)="openCopilotExternal()"
                >
                  <lucide-icon [img]="externalIcon" [size]="15" />
                </button>

                <button
                  type="button"
                  class="grid size-9 place-items-center text-zinc-400 transition hover:text-amber-400"
                  title="Cerrar sesión de Copilot (borra la sesión guardada)"
                  (click)="clearCopilotSession()"
                >
                  <lucide-icon [img]="logoutIcon" [size]="15" />
                </button>

                <button
                  type="button"
                  class="grid size-9 place-items-center text-zinc-400 transition hover:text-red-400"
                  title="Cerrar panel"
                  (click)="toggleCopilot()"
                >
                  <lucide-icon [img]="closeIcon" [size]="16" />
                </button>
              </div>
            </header>

            <div class="min-h-0 flex-1 bg-zinc-950"></div>
          </aside>
        }
      </div>
    </div>
  `
})
export class App
implements OnInit, OnDestroy {

  readonly sparklesIcon = Sparkles;
  readonly refreshIcon = RefreshCw;
  readonly externalIcon = ExternalLink;
  readonly logoutIcon = LogOut;
  readonly closeIcon = X;
  readonly copilotIcon = PanelRightOpen;

  readonly copilotOpen = signal(false);

  readonly fullBleed = signal(false);

  private removeCopilotListener: (() => void) | null = null;

  private readonly router = inject(Router);

  private routerSubscription: Subscription | null = null;

  private zoom = 1;

  ngOnInit(): void {

    window.addEventListener(
      'wheel',
      this.wheelHandler,
      {
        passive: false
      }
    );

    const copilot =
      window.checklistApi?.copilot;

    if (copilot) {

      void copilot.isOpen().then(
        open => this.applyCopilotState(open)
      );

      this.removeCopilotListener =
        copilot.onStateChange(
          open => this.applyCopilotState(open)
        );
    }

    this.updateBleed();

    this.routerSubscription =
      this.router.events
        .pipe(
          filter(
            event =>
              event instanceof NavigationEnd
          )
        )
        .subscribe(() => this.updateBleed());

  }

  ngOnDestroy(): void {

    window.removeEventListener(
      'wheel',
      this.wheelHandler
    );

    this.removeCopilotListener?.();

    this.routerSubscription?.unsubscribe();
  }

  private updateBleed(): void {

    let snapshot: ActivatedRouteSnapshot | null =
      this.router.routerState.snapshot.root;

    let bleed = false;

    while (snapshot) {

      if (snapshot.data?.['bleed']) {
        bleed = true;
      }

      snapshot = snapshot.firstChild;
    }

    this.fullBleed.set(bleed);
  }

  toggleCopilot(): void {

    const copilot =
      window.checklistApi?.copilot;

    if (!copilot) {
      this.applyCopilotState(!this.copilotOpen());
      return;
    }

    void copilot.toggle();
  }

  refreshCopilot(): void {
    void window.checklistApi
      ?.copilot
      .reload();
  }

  openCopilotExternal(): void {
    void window.checklistApi
      ?.copilot
      .openExternal();
  }

  clearCopilotSession(): void {
    void window.checklistApi
      ?.copilot
      .clearSession();
  }

  private applyCopilotState(open: boolean): void {

    this.copilotOpen.set(open);

    document.body.classList.toggle(
      'copilot-panel-open',
      open
    );
  }

  private wheelHandler =
  (
    e: WheelEvent
  ) => {

    if (!e.ctrlKey) {
      return;
    }

    e.preventDefault();

    this.zoom +=
      e.deltaY < 0
        ? 0.1
        : -0.1;

    this.zoom =
      Math.max(
        0.7,
        Math.min(
          3,
          this.zoom
        )
      );

    console.log(
      'ZOOM',
      this.zoom
    );

    window.checklistApi
      ?.zoom
      .set(this.zoom);

  };

}