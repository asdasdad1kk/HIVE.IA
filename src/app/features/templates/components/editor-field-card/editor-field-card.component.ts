import {
  Component,
  input,
  output
} from '@angular/core';

import { FormsModule } from '@angular/forms';

import {
  ChecklistField,
  FieldLayout,
  FieldObservationConfig,
  FieldType
} from '../../../../core/models';

@Component({
  selector: 'app-editor-field-card',
  imports: [FormsModule],
  templateUrl: './editor-field-card.component.html'
})
export class EditorFieldCardComponent {
  readonly field =
    input.required<ChecklistField>();

  readonly index =
    input.required<number>();

  readonly changed =
    output<ChecklistField>();

  readonly removed =
    output<void>();

  update(
    patch: Partial<ChecklistField>
  ): void {
    this.changed.emit({
      ...this.field(),
      ...patch
    });
  }
changeLayout(
  layout: FieldLayout
): void {
  this.update({
    layout
  });
}
  changeType(
  type: FieldType
): void {

  const current =
    this.field();

  let options:
    | string[]
    | undefined;

  switch (type) {

    case 'select':
      options =
        current.options?.length
          ? current.options
          : ['SI', 'NO'];
      break;

    case 'dropdown':
      options =
        current.options ?? [];
      break;

    case 'month':
      options = [
        'Enero',
        'Febrero',
        'Marzo',
        'Abril',
        'Mayo',
        'Junio',
        'Julio',
        'Agosto',
        'Septiembre',
        'Octubre',
        'Noviembre',
        'Diciembre'
      ];
      break;

    default:
      options =
        undefined;
  }

  let observation =
    current.observation;

  if (
    observation?.enabled &&
    type === 'select'
  ) {

    observation = {
      ...observation,
      triggerValue:
        observation.triggerValue &&
        options?.includes(
          observation.triggerValue
        )
          ? observation.triggerValue
          : this.defaultTrigger(
              options
            )
    };

  }

  if (
    observation &&
    (
      type === 'dropdown' ||
      type === 'month'
    )
  ) {

    observation = {
      ...observation,
      triggerValue:
        undefined
    };

  }

  this.update({
    type,
    options,
    observation
  });

}
changeDropdownOptions(
  value: string
): void {

  const options =
    value
      .split(/\r?\n/)
      .map(option =>
        option.trim()
      )
      .filter(Boolean);

  this.update({
    options
  });

}
 changeOptions(
  value: string
): void {

  const options =
    value
      .split(',')
      .map(option =>
        option.trim()
      )
      .filter(Boolean);

  const observation =
    this.field().observation;

  let normalizedObservation =
    observation;

  if (
    observation?.enabled &&
    this.field().type ===
      'select'
  ) {

    normalizedObservation = {
      ...observation,
      triggerValue:
        observation.triggerValue &&
        options.includes(
          observation.triggerValue
        )
          ? observation.triggerValue
          : this.defaultTrigger(
              options
            )
    };

  }

  this.update({
    options,
    observation:
      normalizedObservation
  });

}

  toggleObservation(
    enabled: boolean
  ): void {
    if (!enabled) {
      this.update({
        observation:
          undefined
      });

      return;
    }

    const field =
      this.field();

    const observation:
      FieldObservationConfig = {
        enabled: true,
        label:
          'Observaciones',
        placeholder:
          'Describe la observación',
        required: false
      };

    if (
      field.type ===
      'select'
    ) {
      observation.triggerValue =
        this.defaultTrigger(
          field.options
        );
    }

    this.update({
      observation
    });
  }

  updateObservation(
    patch: Partial<FieldObservationConfig>
  ): void {
    const current =
      this.field()
        .observation;

    if (!current) {
      return;
    }

    this.update({
      observation: {
        ...current,
        ...patch
      }
    });
  }

  private defaultTrigger(
    options:
      | string[]
      | undefined
  ): string {
    return (
      options?.find(
        option =>
          option
            .trim()
            .toUpperCase() ===
          'NO'
      ) ??
      options?.[0] ??
      ''
    );
  }
}