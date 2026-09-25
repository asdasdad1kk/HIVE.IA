import {
  AfterViewInit,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  output,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CheckCircle2, Clipboard, FilePenLine, LucideAngularModule } from 'lucide-angular';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  auditTime,
  debounceTime,
  distinctUntilChanged,
  fromEvent,
  map,
  startWith
} from 'rxjs';

import {
  ActionPlanSectionValue,
  ChecklistActionPlanSection,
  ChecklistDefinition,
  ChecklistField,
  ChecklistMatrixRow,
  ChecklistSection,
  SubmissionStatus
} from '../../../../core/models';

import {
  sectionFields,
  sectionItemCount,
  sectionRows
} from '../../../../core/checklist-section.utils';

import {
  ChecklistFieldComponent
} from '../checklist-field/checklist-field.component';

import {
  ChecklistMatrixComponent
} from '../checklist-matrix/checklist-matrix';
import { ActionPlanComponent } from '../action-plan/action-plan';
import { Router } from '@angular/router';
import { AppButtonComponent } from '../../../../shared/components/button/button';

export interface ChecklistValueChange {
  field: ChecklistField;
  value: unknown;
}

export interface ChecklistMatrixValueChange {
  key: string;
  value: string;
}

export interface ChecklistObservationChange {
  fieldKey: string;
  value: string;
}
export interface ChecklistActionPlanValueChange {
  sectionId: string;
  value: ActionPlanSectionValue;
}

@Component({
  selector: 'app-checklist-shell',
  imports: [
    FormsModule,
    ChecklistFieldComponent,
    ChecklistMatrixComponent,
    ActionPlanComponent,
    LucideAngularModule,
    AppButtonComponent
  ],
  templateUrl: './checklist-shell.component.html'
})
export class ChecklistShellComponent implements AfterViewInit {
  readonly CheckCircle2 = CheckCircle2;
  readonly ClipboardSave = Clipboard;
  readonly FilePenLine = FilePenLine;
  private readonly destroyRef = inject(DestroyRef);


private readonly router = inject(Router);
readonly editLink =
  input<string[] | null>(null);
readonly editTemplateRequested =
  output<void>();

goToEditTemplate(): void {
  this.editTemplateRequested.emit();
}
  readonly actionPlanValueChange =
  output<ChecklistActionPlanValueChange>();

  private readonly previewValues =
    signal<Record<string, unknown>>({});

  readonly templateName =
    input('Plantilla sin nombre');

  readonly templateDescription =
    input('');

  readonly definition =
    input.required<ChecklistDefinition>();

  readonly values =
    input<Record<string, unknown>>({});

  readonly previewMode =
    input(false);

  readonly showFooter =
    input(true);

  readonly showNavigation =
    input(true);

  readonly saving =
    input(false);

  readonly valueChange =
    output<ChecklistValueChange>();

  readonly matrixValueChange =
    output<ChecklistMatrixValueChange>();

  readonly observationChange =
    output<ChecklistObservationChange>();

  readonly saveRequested =
    output<SubmissionStatus>();

  readonly compactHeader =
    signal(false);

  readonly navigationSections = computed(() =>
    this.definition().sections.filter(section => section.view !== 'action-plan')
  );
  readonly hasNavigation = computed(() =>
    this.showNavigation() && this.navigationSections().length > 0
  );
  readonly fields =
    computed<ChecklistField[]>(() =>
      this.definition().sections.flatMap(section =>
        sectionFields(section)
      )
    );

  readonly matrixRows =
    computed<ChecklistMatrixRow[]>(() =>
      this.definition().sections.flatMap(section =>
        sectionRows(section)
      )
    );

  readonly effectiveValues =
    computed<Record<string, unknown>>(() =>
      this.previewMode()
        ? this.previewValues()
        : this.values()
    );

  readonly itemCount =
    computed(() =>
      this.fields().length +
      this.matrixRows().length
    );

  readonly answeredCount =
    computed(() => {
      const values =
        this.effectiveValues();

      const answeredFields =
        this.fields().filter(field =>
          this.hasFieldValue(
            field,
            values[field.key]
          )
        ).length;

      const answeredMatrixRows =
        this.matrixRows().filter(row =>
          this.hasMatrixValue(
            values[row.key]
          )
        ).length;

      return (
        answeredFields +
        answeredMatrixRows
      );
    });

  readonly pendingCount =
    computed(() =>
      Math.max(
        0,
        this.itemCount() -
        this.answeredCount()
      )
    );

  readonly progress =
    computed(() => {
      const total =
        this.itemCount();

      return total === 0
        ? 0
        : Math.round(
            (
              this.answeredCount() /
              total
            ) * 100
          );
    });

  ngAfterViewInit(): void {
    if (this.previewMode()) {
      return;
    }

    const scrollContainer =
      document.querySelector<HTMLElement>(
        '[data-app-scroll-container]'
      );

    if (!scrollContainer) {
      return;
    }

    fromEvent(
      scrollContainer,
      'scroll',
      {
        passive: true
      }
    )
      .pipe(
        auditTime(16),

        map(() =>
          scrollContainer.scrollTop
        ),

        startWith(
          scrollContainer.scrollTop
        ),

        map(scrollTop =>
          this.resolveCompactState(
            scrollTop
          )
        ),

        distinctUntilChanged(),

        /*
         * Espera a que el estado se asiente antes de
         * colapsar/expandir: evita el parpadeo cuando
         * el scroll oscila cerca del umbral.
         */
        debounceTime(120),

        takeUntilDestroyed(
          this.destroyRef
        )
      )
      .subscribe(compact =>
        this.compactHeader.set(
          compact
        )
      );
  }

  sectionCount(
    section: ChecklistSection
  ): number {
    return sectionItemCount(section);
  }

  sectionCountLabel(
    section: ChecklistSection
  ): string {
    const count =
      this.sectionCount(section);

    if (section.view === 'matrix') {
      return count === 1
        ? 'fila'
        : 'filas';
    }

    if (section.view === 'action-plan') {
      return count === 1 ? 'acción' : 'acciones';
    }
    return count === 1
      ? 'campo'
      : 'campos';
  }

  fieldValue(
    fieldKey: string
  ): unknown {
    return this.effectiveValues()[
      fieldKey
    ];
  }

  observationKey(
    fieldKey: string
  ): string {
    return `${fieldKey}_observation`;
  }

  observationValue(
    fieldKey: string
  ): string {
    const value =
      this.effectiveValues()[
        this.observationKey(
          fieldKey
        )
      ];

    return typeof value === 'string'
      ? value
      : '';
  }

  setValue(
    field: ChecklistField,
    value: unknown
  ): void {
    if (this.previewMode()) {
      this.previewValues.update(
        current => {
          const next:
            Record<string, unknown> = {
              ...current,
              [field.key]: value
            };

          if (
            !this.isObservationVisibleForValue(
              field,
              value
            )
          ) {
            delete next[
              this.observationKey(
                field.key
              )
            ];
          }

          return next;
        }
      );

      return;
    }

    this.valueChange.emit({
      field,
      value
    });
  }

  setMatrixValue(
    change: ChecklistMatrixValueChange
  ): void {
    if (this.previewMode()) {
      this.previewValues.update(
        current => ({
          ...current,
          [change.key]: change.value
        })
      );

      return;
    }

    this.matrixValueChange.emit(
      change
    );
  }

  setObservation(
    fieldKey: string,
    value: string
  ): void {
    if (this.previewMode()) {
      this.previewValues.update(
        current => ({
          ...current,
          [
            this.observationKey(
              fieldKey
            )
          ]: value
        })
      );

      return;
    }

    this.observationChange.emit({
      fieldKey,
      value
    });
  }

  shouldShowObservation(
    field: ChecklistField
  ): boolean {
    return this.isObservationVisibleForValue(
      field,
      this.effectiveValues()[
        field.key
      ]
    );
  }

  requestSave(
    status: SubmissionStatus
  ): void {
    if (
      this.previewMode() ||
      this.saving()
    ) {
      return;
    }

    this.saveRequested.emit(
      status
    );
  }

  private hasFieldValue(
    field: ChecklistField,
    value: unknown
  ): boolean {
    if (
      field.type === 'checkbox'
    ) {
      return value === true;
    }

    if (
      value === null ||
      value === undefined
    ) {
      return false;
    }

    if (
      typeof value === 'string'
    ) {
      return (
        value.trim().length > 0
      );
    }

    return true;
  }

  private hasMatrixValue(
    value: unknown
  ): boolean {
    return (
      typeof value === 'string' &&
      value.trim().length > 0
    );
  }

  private isObservationVisibleForValue(
    field: ChecklistField,
    value: unknown
  ): boolean {
    const observation =
      field.observation;

    if (!observation?.enabled) {
      return false;
    }

    if (
      field.type !== 'select'
    ) {
      return true;
    }

    return (
      value ===
      observation.triggerValue
    );
  }

  private resolveCompactState(
    scrollTop: number
  ): boolean {
    return this.compactHeader()
      ? scrollTop >= 120
      : scrollTop > 200;
  }
  actionPlanValue(
  sectionId: string
): ActionPlanSectionValue | null {
  const value =
    this.effectiveValues()[sectionId];

  if (!this.isRecord(value)) {
    return null;
  }

  const involvedEmails =
    Array.isArray(value['involvedEmails'])
      ? value['involvedEmails']
          .filter(
            item => typeof item === 'string'
          )
          .map(String)
      : [];

  const rows =
    Array.isArray(value['rows'])
      ? value['rows']
      : [];

  const methodology =
    value['methodology'];

  return {
    methodology:
      methodology === 'PDCA' ||
      methodology === 'DMAIC' ||
      methodology === 'FREE'
        ? methodology
        : 'FREE',
    involvedEmails,
    rows:
      rows as ActionPlanSectionValue['rows']
  };
}

setActionPlanValue(
  section: ChecklistActionPlanSection,
  value: ActionPlanSectionValue
): void {
  if (this.previewMode()) {
    this.previewValues.update(
      current => ({
        ...current,
        [section.id]: value
      })
    );

    return;
  }

  this.actionPlanValueChange.emit({
    sectionId: section.id,
    value
  });
}

private isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}
}
