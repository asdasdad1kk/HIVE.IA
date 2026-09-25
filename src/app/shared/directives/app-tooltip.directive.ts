import {
  Directive,
  ElementRef,
  Host,
  HostListener,
  Injector,
  Input,
  OnDestroy,
  TemplateRef,
  ViewContainerRef,
  inject
} from '@angular/core';

import {
  ConnectedPosition,
  Overlay,
  OverlayRef
} from '@angular/cdk/overlay';

import {
  ComponentPortal
} from '@angular/cdk/portal';
import { AppTooltipContentComponent } from '../components/tooltip/app-tooltip-content';
import {
  APP_TOOLTIP_TEXT
} from '../components/tooltip/tooltip.token';

@Directive({
  selector: '[appTooltip]',
  host: {
    tabindex: '0',
    '(mouseenter)': 'show()',
    '(mouseleave)': 'hide()',
    '(focusin)': 'show()',
    '(focusout)': 'hide()',
    '(keydown.escape)': 'hide()'
  }
})
export class AppTooltipDirective implements OnDestroy {
  private readonly overlay =
    inject(Overlay);

  private readonly elementRef =
    inject<ElementRef<HTMLElement>>(
      ElementRef
    );

  private readonly injector =
    inject(Injector);

  private overlayRef:
    OverlayRef | null = null;

  @Input()
  appTooltip = '';

  @Input()
  appTooltipPosition:
    'top' | 'bottom' = 'top';

  show(): void {
    const text =
      this.appTooltip.trim();

    if (
      !text ||
      this.overlayRef
    ) {
      return;
    }

    const positionStrategy =
      this.overlay
        .position()
        .flexibleConnectedTo(
          this.elementRef
        )
        .withPositions(
          this.positions()
        )
        .withFlexibleDimensions(false)
        .withPush(true);

    this.overlayRef =
      this.overlay.create({
        positionStrategy,
        scrollStrategy:
          this.overlay
            .scrollStrategies
            .reposition(),
        panelClass:
          'app-tooltip-overlay'
      });

    const portal =
      new ComponentPortal(
        AppTooltipContentComponent,
        null,
        this.createInjector(text)
      );

    this.overlayRef.attach(portal);
  }

  hide(): void {
    this.overlayRef?.dispose();
    this.overlayRef = null;
  }

  ngOnDestroy(): void {
    this.hide();
  }

  private createInjector(
    text: string
  ): Injector {
    return Injector.create({
      parent: this.injector,
      providers: [
        {
          provide:
            APP_TOOLTIP_TEXT,
          useValue:
            text
        }
      ]
    });
  }

  private positions():
    ConnectedPosition[] {
    if (
      this.appTooltipPosition ===
      'bottom'
    ) {
      return [
        {
          originX: 'center',
          originY: 'bottom',
          overlayX: 'center',
          overlayY: 'top',
          offsetY: 8
        },
        {
          originX: 'center',
          originY: 'top',
          overlayX: 'center',
          overlayY: 'bottom',
          offsetY: -8
        }
      ];
    }

    return [
      {
        originX: 'center',
        originY: 'top',
        overlayX: 'center',
        overlayY: 'bottom',
        offsetY: -8
      },
      {
        originX: 'center',
        originY: 'bottom',
        overlayX: 'center',
        overlayY: 'top',
        offsetY: 8
      }
    ];
  }
}

