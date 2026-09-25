import { Injectable } from "@angular/core";
import { Subject } from "rxjs";

@Injectable({ providedIn: 'root' })
export class DraftsStateService {
  readonly refresh$ = new Subject<void>();

  refresh(): void {
    this.refresh$.next();
  }
}