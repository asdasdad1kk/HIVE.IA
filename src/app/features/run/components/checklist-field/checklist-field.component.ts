import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChecklistField } from '../../../../core/models';

@Component({
  selector: 'app-checklist-field',
  imports: [FormsModule],
  templateUrl: './checklist-field.component.html'
})
export class ChecklistFieldComponent {
  readonly field = input.required<ChecklistField>();
  readonly value = input<unknown>(undefined);
  readonly valueChange = output<unknown>();

  protected asText(value: unknown): string {
    return typeof value === 'string' ? value : '';
  }

  protected asNumber(value: unknown): number | string {
    return typeof value === 'number' || typeof value === 'string'
      ? value
      : '';
  }

  protected asBoolean(value: unknown): boolean {
    return value === true;
  }
}
