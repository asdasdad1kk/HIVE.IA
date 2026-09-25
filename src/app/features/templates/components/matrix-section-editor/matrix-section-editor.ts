import {
  Component,
  computed,
  input,
  output
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  GripVertical,
  Plus,
  Trash2
} from 'lucide-angular';

import {
  ChecklistMatrixRow,
  ChecklistMatrixSection
} from '../../../../core/models';

import {
  AppButtonComponent
} from '../../../../shared/components/button/button';

@Component({
  selector: 'app-matrix-section-editor',
  imports: [
    FormsModule,
    AppButtonComponent
  ],
  templateUrl:
    './matrix-section-editor.html'
})
export class MatrixSectionEditorComponent {
  readonly section =
    input.required<ChecklistMatrixSection>();

  readonly changed =
    output<ChecklistMatrixSection>();

  readonly Plus = Plus;
  readonly Trash2 = Trash2;
  readonly GripVertical = GripVertical;

  readonly columnCount =
    computed(
      () =>
        this.section().columns.length
    );

  readonly rowCount =
    computed(
      () =>
        this.section().rows.length
    );

  updateColumns(
    value: string
  ): void {
    const columns = [
      ...new Set(
        value
          .split(/\r?\n|,/)
          .map(column =>
            column.trim()
          )
          .filter(Boolean)
      )
    ];

    this.changed.emit({
      ...this.section(),
      columns
    });
  }

  updateRowsFromText(
    value: string
  ): void {
    const currentRows =
      this.section().rows;

    const labels =
      value
        .split(/\r?\n/)
        .map(label =>
          label.trim()
        )
        .filter(Boolean);

    const rows =
      labels.map(
        (
          label,
          index
        ): ChecklistMatrixRow => {
          const current =
            currentRows[index];

          if (current) {
            return {
              ...current,
              label
            };
          }

          return {
            key:
              this.createUniqueRowKey(
                label,
                index
              ),
            label,
            required: false
          };
        }
      );

    this.changed.emit({
      ...this.section(),
      rows
    });
  }

  updateRow(
    rowIndex: number,
    patch: Partial<ChecklistMatrixRow>
  ): void {
    const rows =
      this.section().rows.map(
        (
          row,
          currentIndex
        ) =>
          currentIndex === rowIndex
            ? {
                ...row,
                ...patch
              }
            : row
      );

    this.changed.emit({
      ...this.section(),
      rows
    });
  }

  addRow(): void {
    const index =
      this.section().rows.length;

    const row:
      ChecklistMatrixRow = {
        key:
          this.createUniqueRowKey(
            'nuevo-item',
            index
          ),
        label:
          `Nuevo ítem ${index + 1}`,
        required: false
      };

    this.changed.emit({
      ...this.section(),
      rows: [
        ...this.section().rows,
        row
      ]
    });
  }

  removeRow(
    rowIndex: number
  ): void {
    this.changed.emit({
      ...this.section(),
      rows:
        this.section().rows.filter(
          (_, index) =>
            index !== rowIndex
        )
    });
  }

  rowsAsText(): string {
    return this.section()
      .rows
      .map(row =>
        row.label
      )
      .join('\n');
  }

  columnsAsText(): string {
    return this.section()
      .columns
      .join('\n');
  }

  private createUniqueRowKey(
    label: string,
    rowIndex: number
  ): string {
    const base =
      this.normalizeKey(label) ||
      `item-${rowIndex + 1}`;

    const usedKeys =
      new Set(
        this.section().rows.map(
          row =>
            row.key
        )
      );

    if (!usedKeys.has(base)) {
      return base;
    }

    let suffix = 2;
    let candidate =
      `${base}-${suffix}`;

    while (
      usedKeys.has(candidate)
    ) {
      suffix += 1;
      candidate =
        `${base}-${suffix}`;
    }

    return candidate;
  }

  private normalizeKey(
    value: string
  ): string {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(
        /[\u0300-\u036f]/g,
        ''
      )
      .replace(
        /[^a-z0-9]+/g,
        '-'
      )
      .replace(
        /^-+|-+$/g,
        ''
      );
  }
}