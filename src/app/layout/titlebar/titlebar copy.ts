// import {
//   Component,
//   inject,
//   OnDestroy,
//   OnInit,
//   signal
// } from '@angular/core';

// import {
//   LucideAngularModule,
//   Maximize2,
//   Minus,
//   PanelTop,
//   Square,
//   UserRound,
//   X
// } from 'lucide-angular';


// import {
//   OverlayModule
// } from '@angular/cdk/overlay';
// import { Auth } from '../../core/services/auth';
// import { UserCredentials } from '../../core/models';


// @Component({
//   selector: 'app-titlebar',
//   imports: [
//     LucideAngularModule,OverlayModule
//   ],
//   templateUrl: './titlebar.html'
// })
// export class Titlebar implements OnInit, OnDestroy {
//   readonly minimizeIcon = Minus;
//   readonly maximizeIcon = Maximize2;
//   readonly restoreIcon = Square;
//   readonly closeIcon = X;
//   readonly applicationIcon = PanelTop;
//   readonly userIcon=UserRound;
//   readonly applicationLogo ='/assets/G.png';
//   readonly isMaximized = signal(false);

//   readonly user = signal<UserCredentials | null>(
//     null
//   );
//   readonly auth=inject(Auth)
//   readonly loadingUser = signal(true);
//   readonly userTooltipOpen =
//   signal(false);

//   private removeMaximizeListener:
//     (() => void) | null = null;

//   async ngOnInit(): Promise<void> {
   

//     const controls =
//       window.checklistApi?.windowControls;

//     if (!controls) {
//       return;
//     }

//     this.isMaximized.set(
//       await controls.isMaximized()
//     );

//     this.removeMaximizeListener =
//       controls.onMaximizedChange(
//         isMaximized => {
//           this.isMaximized.set(
//             isMaximized
//           );
//         }
//       );
//   }

//   ngOnDestroy(): void {
//     this.removeMaximizeListener?.();
//   }

 

//   minimize(): void {
//     void window.checklistApi
//       ?.windowControls
//       .minimize();
//   }

//   async toggleMaximize(): Promise<void> {
//     const maximized =
//       await window.checklistApi
//         ?.windowControls
//         .toggleMaximize();

//     if (typeof maximized === 'boolean') {
//       this.isMaximized.set(
//         maximized
//       );
//     }
//   }

//   close(): void {
//     void window.checklistApi
//       ?.windowControls
//       .close();
//   }
// }