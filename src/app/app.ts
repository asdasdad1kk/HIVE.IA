import {
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';

import {
  RouterOutlet
} from '@angular/router';
import { AppSidebarComponent } from './layout/sidebar/sidebar';
import { Titlebar } from './layout/titlebar/titlebar';


@Component({
  selector: 'app-root',

  imports: [
    RouterOutlet,
    AppSidebarComponent,
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
     class="
       relative
       min-h-full
       w-full
       p-5
       md:p-7
     "
   >
    <router-outlet />
  </div>
</main>
      </div>
    </div>
  `
})
export class App
implements OnInit, OnDestroy {

  private zoom = 1;

  ngOnInit(): void {

    window.addEventListener(
      'wheel',
      this.wheelHandler,
      {
        passive: false
      }
    );

  }

  ngOnDestroy(): void {

    window.removeEventListener(
      'wheel',
      this.wheelHandler
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