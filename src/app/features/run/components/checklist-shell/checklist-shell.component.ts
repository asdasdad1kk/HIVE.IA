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
import {
  Check,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Clipboard,
  FilePenLine,
  LucideAngularModule,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-angular';
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
  ActionPlanRow,
  ActionPlanSectionValue,
  ChecklistActionPlanSection,
  ChecklistDefinition,
  ChecklistField,
  ChecklistMatrixRow,
  ChecklistSection,
  SubmissionStatus
} from '../../../../core/models';

import {
  isActionPlanSection,
  isFormSection,
  isMatrixSection,
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

export type SectionFillState =
  | 'empty'
  | 'partial'
  | 'complete';

export interface SectionStat {
  answered: number;
  total: number;
  percent: number;
  state: SectionFillState;
}

const EMPTY_SECTION_STAT: SectionStat = {
  answered: 0,
  total: 0,
  percent: 0,
  state: 'empty'
};

const NAV_COLLAPSED_STORAGE_KEY =
  'run-nav-collapsed';

function readNavCollapsed(): boolean {
  try {
    return (
      localStorage.getItem(
        NAV_COLLAPSED_STORAGE_KEY
      ) === '1'
    );
  } catch {
    return false;
  }
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

  readonly Check = Check;
  readonly chevronDownIcon = ChevronDown;
  readonly chevronRightIcon = ChevronRight;
  readonly panelLeftCloseIcon = PanelLeftClose;
  readonly panelLeftOpenIcon = PanelLeftOpen;

  readonly navCollapsed =
    signal(readNavCollapsed());

  readonly collapsedSections =
    signal<ReadonlySet<string>>(new Set());

  readonly activeSectionId =
    signal<string | null>(null);

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

  /**
   * Avance de captura por sección: alimenta el
   * panel lateral (verde/amarillo) y los badges
   * de cada sección.
   */
  readonly sectionStats =
    computed<Map<string, SectionStat>>(() => {

      const values =
        this.effectiveValues();

      const stats =
        new Map<string, SectionStat>();

      for (const section of this.definition().sections) {

        let answered = 0;
        let total = 0;

        if (isFormSection(section)) {

          total = section.fields.length;

          answered = section.fields.filter(field =>
            this.hasFieldValue(
              field,
              values[field.key]
            )
          ).length;

        } else if (isMatrixSection(section)) {

          total = section.rows.length;

          answered = section.rows.filter(row =>
            this.hasMatrixValue(
              values[row.key]
            )
          ).length;

        } else {

          const rows =
            this.actionPlanValue(section.id)?.rows ?? [];

          total = Math.max(
            section.initialRows ?? 1,
            rows.length
          );

          answered = Math.min(
            total,
            rows.filter(row =>
              this.hasActionPlanRow(row)
            ).length
          );
        }

        const percent =
          total === 0
            ? 0
            : Math.round(
                (answered / total) * 100
              );

        const state: SectionFillState =
          total === 0 || answered === 0
            ? 'empty'
            : answered >= total
              ? 'complete'
              : 'partial';

        stats.set(section.id, {
          answered,
          total,
          percent,
          state
        });
      }

      return stats;
    });

  sectionStat(
    section: ChecklistSection
  ): SectionStat {
    return (
      this.sectionStats().get(section.id) ??
      EMPTY_SECTION_STAT
    );
  }

  viewLabel(
    section: ChecklistSection
  ): string {
    if (section.view === 'matrix') {
      return 'Matriz';
    }

    if (section.view === 'action-plan') {
      return 'Plan de acción';
    }

    return 'Formulario';
  }

  isSectionCollapsed(
    sectionId: string
  ): boolean {
    return this.collapsedSections().has(
      sectionId
    );
  }

  toggleSection(sectionId: string): void {
    this.collapsedSections.update(current => {
      const next = new Set(current);

      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }

      return next;
    });
  }

  expandSection(sectionId: string): void {
    if (!this.isSectionCollapsed(sectionId)) {
      return;
    }

    this.collapsedSections.update(current => {
      const next = new Set(current);

      next.delete(sectionId);

      return next;
    });
  }

  onNavClick(sectionId: string): void {
    this.expandSection(sectionId);
    this.activeSectionId.set(sectionId);
  }

  toggleNavCollapsed(): void {
    this.navCollapsed.update(
      value => !value
    );

    try {
      localStorage.setItem(
        NAV_COLLAPSED_STORAGE_KEY,
        this.navCollapsed() ? '1' : '0'
      );
    } catch {
      /* almacenamiento no disponible */
    }
  }

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

    fromEvent(
      scrollContainer,
      'scroll',
      {
        passive: true
      }
    )
      .pipe(
        auditTime(80),
        takeUntilDestroyed(
          this.destroyRef
        )
      )
      .subscribe(() =>
        this.updateActiveSection()
      );

    this.updateActiveSection();
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

  private hasActionPlanRow(
    row: ActionPlanRow
  ): boolean {
    return (
      row.action.trim().length > 0 ||
      row.responsibleEmail.trim().length > 0
    );
  }

  private updateActiveSection(): void {
    const sections =
      this.navigationSections();

    if (sections.length === 0) {
      return;
    }

    let activeId: string | null = null;

    for (const section of sections) {
      const element =
        document.getElementById(
          `shell-section-${section.id}`
        );

      if (!element) {
        continue;
      }

      if (
        element.getBoundingClientRect().top <= 180
      ) {
        activeId = section.id;
      }
    }

    this.activeSectionId.set(
      activeId ?? sections[0].id
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
