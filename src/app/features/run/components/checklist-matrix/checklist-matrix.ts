import {
  Component,
  computed,
  input,
  output
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { AppTooltipDirective } from '../../../../shared/directives/app-tooltip.directive';
import { Info, LucideAngularModule } from 'lucide-angular';
import { ChecklistMatrixSection } from '../../../../core/models';



@Component({
  selector: 'app-checklist-matrix',
  imports: [FormsModule, AppTooltipDirective, LucideAngularModule],
  templateUrl: './checklist-matrix.html'
})
export class ChecklistMatrixComponent {
readonly Info = Info;
  readonly section =
    input.required<ChecklistMatrixSection>();

  readonly values =
    input<Record<string, unknown>>(
      {}
    );

  readonly valueChange =
    output<{
      key: string;
      value: string;
    }>();

  readonly hasColumns =
    computed(
      () =>
        this.section()
          .columns.length > 0
    );

  changeValue(
    key: string,
    value: string
  ): void {

    this.valueChange.emit({
      key,
      value
    });

  }

  selectedValue(
    key: string
  ): string {

    const value =
      this.values()[key];

    return typeof value ===
      'string'
      ? value
      : '';

  }
}
