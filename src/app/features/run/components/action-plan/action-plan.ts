import {
  Component,
  computed,
  input,
  output,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  CalendarPlus,
  CircleUserRound,
  ListFilter,
  ListPlus,
  Plus,
  Trash2,
  ChevronDown,
ChevronRight,
GitBranchPlus
} from 'lucide-angular';
import { LucideAngularModule } from 'lucide-angular';
import {
  ActionPlanEcd,
  ActionPlanRow,
  ActionPlanSectionValue,
  ChecklistActionPlanSection
} from '../../../../core/models';

@Component({
  selector: 'app-action-plan',
  imports: [
    FormsModule,
    LucideAngularModule
  ],
  templateUrl: './action-plan.html'
})
export class ActionPlanComponent {
  readonly section =
    input.required<ChecklistActionPlanSection>();

  readonly value =
    input<ActionPlanSectionValue | null>(null);

  readonly previewMode = input(false);

  readonly valueChange =
    output<ActionPlanSectionValue>();
    readonly collapsedRows =
  signal<Set<string>>(new Set());
  readonly ChevronDown = ChevronDown;
readonly ChevronRight = ChevronRight;
readonly GitBranchPlus = GitBranchPlus;
  readonly Plus = Plus;
  readonly Trash2 = Trash2;
  readonly CalendarPlus = CalendarPlus;
  readonly CircleUserRound = CircleUserRound;
  readonly ListPlus = ListPlus;

  readonly currentValue =
    computed<ActionPlanSectionValue>(() => {
      const current = this.value();

      if (current) {
        return {
          methodology:
            current.methodology ??
            this.section().methodology,
          involvedEmails:
            Array.isArray(current.involvedEmails)
              ? current.involvedEmails
              : [...(this.section().involvedEmails ?? [])],
          rows:
            Array.isArray(current.rows)
              ? current.rows
              : []
        };
      }

      return {
        methodology:
          this.section().methodology,
        involvedEmails: [...(this.section().involvedEmails ?? [])],
        rows: []
      };
    });

  readonly rowsByPhase = computed(() => {
    const result = new Map<string, ActionPlanRow[]>();

    for (const phase of this.section().phases) {
      result.set(
        phase.id,
        this.currentValue().rows.filter(
          row => row.phaseId === phase.id
        )
      );
    }

    return result;
  });

  readonly overallProgress = computed(() => {
    const rows = this.currentValue().rows;

    if (rows.length === 0) {
      return 0;
    }

    const total = rows.reduce(
      (sum, row) =>
        sum + this.normalizeProgress(row.progress),
      0
    );

    return Math.round(total / rows.length);
  });

  addInvolvedEmail(rawValue: string): void {
    if (this.previewMode()) {
      return;
    }

    const email = rawValue
      .trim()
      .toLowerCase();

    if (!email || !this.isValidEmail(email)) {
      return;
    }

    const current = this.currentValue();

    if (
      current.involvedEmails.some(
        item => item.toLowerCase() === email
      )
    ) {
      return;
    }

    this.emit({
      ...current,
      involvedEmails: [
        ...current.involvedEmails,
        email
      ]
    });
  }

  addEmailsFromText(
    rawValue: string,
    inputElement: HTMLInputElement
  ): void {
    const emails = rawValue
      .split(/[;,\s]+/)
      .map(value => value.trim().toLowerCase())
      .filter(Boolean)
      .filter(value => this.isValidEmail(value));

    if (emails.length === 0) {
      return;
    }

    const uniqueEmails = [
      ...new Set([
        ...this.currentValue().involvedEmails,
        ...emails
      ])
    ];

    this.emit({
      ...this.currentValue(),
      involvedEmails: uniqueEmails
    });

    inputElement.value = '';
  }

  handleEmailKeydown(
    event: KeyboardEvent,
    inputElement: HTMLInputElement
  ): void {
    if (
      event.key !== 'Enter' &&
      event.key !== ',' &&
      event.key !== ';'
    ) {
      return;
    }

    event.preventDefault();
    this.addEmailsFromText(
      inputElement.value,
      inputElement
    );
  }

  removeInvolvedEmail(email: string): void {
    if (this.previewMode()) {
      return;
    }

    const current = this.currentValue();

    this.emit({
      ...current,
      involvedEmails:
        current.involvedEmails.filter(
          value => value !== email
        ),
      rows: current.rows.map(row =>
        row.responsibleEmail === email
          ? {
              ...row,
              responsibleEmail: ''
            }
          : row
      )
    });
  }

  addRow(phaseId: string): void {
    if (this.previewMode()) {
      return;
    }

    const maximum =
      this.section().maximumRows ?? 100;

    if (
      this.currentValue().rows.length >=
      maximum
    ) {
      return;
    }

    const row: ActionPlanRow = {
      id: crypto.randomUUID(),
      phaseId,
      action: '',
      responsibleEmail: '',
      ecds: [
        this.createEcd(1)
      ],
      progress: 0,
      observations: ''
    };

    this.emit({
      ...this.currentValue(),
      rows: [
        ...this.currentValue().rows,
        row
      ]
    });
  }

 removeRow(
  rowId: string
): void {
  if (this.previewMode()) {
    return;
  }

  const current =
    this.currentValue();

  const row =
    current.rows.find(
      item =>
        item.id === rowId
    );

  if (!row) {
    return;
  }

  /*
   * Las filas principales cuentan para minimumRows.
   * Las subacciones no.
   */
  if (!row.parentId) {
    const mainRows =
      current.rows.filter(
        item =>
          !item.parentId
      );

    const minimum =
      this.section()
        .minimumRows ?? 0;

    if (
      mainRows.length <= minimum
    ) {
      return;
    }
  }

  /*
   * Al eliminar una acción principal,
   * también elimina sus subacciones.
   */
  this.emit({
    ...current,
    rows:
      current.rows.filter(
        item =>
          item.id !== rowId &&
          item.parentId !== rowId
      )
  });

  this.collapsedRows.update(
    collapsed => {
      const next =
        new Set(collapsed);

      next.delete(rowId);

      return next;
    }
  );
}

  updateRow(
    rowId: string,
    patch: Partial<ActionPlanRow>
  ): void {
    if (this.previewMode()) {
      return;
    }

    this.emit({
      ...this.currentValue(),
      rows:
        this.currentValue().rows.map(row =>
          row.id === rowId
            ? {
                ...row,
                ...patch,
                progress:
                  patch.progress === undefined
                    ? row.progress
                    : this.normalizeProgress(
                        patch.progress
                      )
              }
            : row
        )
    });
  }

  addEcd(rowId: string): void {
    if (this.previewMode()) {
      return;
    }

    const row =
      this.currentValue().rows.find(
        item => item.id === rowId
      );

    if (!row) {
      return;
    }

    const nextNumber =
      row.ecds.length + 1;

    this.updateRow(rowId, {
      ecds: [
        ...row.ecds,
        this.createEcd(nextNumber)
      ]
    });
  }

  updateEcd(
    rowId: string,
    ecdId: string,
    patch: Partial<ActionPlanEcd>
  ): void {
    const row =
      this.currentValue().rows.find(
        item => item.id === rowId
      );

    if (!row) {
      return;
    }

    this.updateRow(rowId, {
      ecds: row.ecds.map(ecd =>
        ecd.id === ecdId
          ? {
              ...ecd,
              ...patch
            }
          : ecd
      )
    });
  }

  removeEcd(
    rowId: string,
    ecdId: string
  ): void {
    if (this.previewMode()) {
      return;
    }

    const row =
      this.currentValue().rows.find(
        item => item.id === rowId
      );

    if (!row || row.ecds.length <= 1) {
      return;
    }

    const ecds = row.ecds
      .filter(ecd => ecd.id !== ecdId)
      .map((ecd, index) => ({
        ...ecd,
        label: `ECD${index + 1}`
      }));

    this.updateRow(rowId, {
      ecds
    });
  }

  phaseRows(
  phaseId: string
): ActionPlanRow[] {
  return this.currentValue()
    .rows
    .filter(row =>
      row.phaseId === phaseId &&
      !row.parentId
    );
}


  trackRow(
    _index: number,
    row: ActionPlanRow
  ): string {
    return row.id;
  }

  displayName(email: string): string {
    const local = email.split('@')[0] ?? email;
    const withoutNumericSuffix = local.replace(/\d+$/g, '');
    return withoutNumericSuffix
      .split(/[._-]+/)
      .filter(Boolean)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ') || email;
  }
  private emit(
    value: ActionPlanSectionValue
  ): void {
    this.valueChange.emit(value);
  }

  private createEcd(
    number: number
  ): ActionPlanEcd {
    return {
      id: crypto.randomUUID(),
      label: `ECD${number}`,
      date: '',
      completed: false
    };
  }

  private normalizeProgress(
    value: number | string
  ): number {
    const parsed = Number(value);

    if (!Number.isFinite(parsed)) {
      return 0;
    }

    return Math.max(
      0,
      Math.min(100, Math.round(parsed))
    );
  }

  private isValidEmail(
    value: string
  ): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      value
    );
  }
isOverdue(
  ecd: ActionPlanEcd
): boolean {

  if (!ecd.date) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDate = new Date(ecd.date);
  dueDate.setHours(0, 0, 0, 0);

  return dueDate < today;
}

isDueSoon(
  ecd: ActionPlanEcd
): boolean {

  if (
    !ecd.date ||
    this.isOverdue(ecd)
  ) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDate = new Date(ecd.date);
  dueDate.setHours(0, 0, 0, 0);

  const days =
    (
      dueDate.getTime() -
      today.getTime()
    ) /
    (1000 * 60 * 60 * 24);

  return days <= 3;
}

isOnTime(
  ecd: ActionPlanEcd
): boolean {

  return (
    !!ecd.date &&
    !this.isOverdue(ecd) &&
    !this.isDueSoon(ecd)
  );
}
readonly showPendingOnly =
  signal(false);
readonly ListFilter =
  ListFilter;
togglePendingView(): void {
  this.showPendingOnly.update(
    value => !value
  );
}
visiblePhaseRows(
  phaseId: string
): ActionPlanRow[] {
  const rows =
    this.phaseRows(phaseId);

  if (!this.showPendingOnly()) {
    return rows;
  }

  return rows.filter(
    row =>
      this.normalizeProgress(
        row.progress
      ) < 100
  );
}
addSubAction(
  parent: ActionPlanRow
): void {

  if (this.previewMode()) {
    return;
  }

  const maximum =
    this.section().maximumRows ?? 100;

  if (
    this.currentValue().rows.length >=
    maximum
  ) {
    return;
  }

  const row: ActionPlanRow = {
    id: crypto.randomUUID(),

    phaseId:
      parent.phaseId,

    parentId:
      parent.id,

    action: '',

    responsibleEmail:
      parent.responsibleEmail,

    ecds: [
      this.createEcd(1)
    ],

    progress: 0,

    observations: ''
  };

  this.emit({
    ...this.currentValue(),

    rows: [
      ...this.currentValue().rows,
      row
    ]
  });

  /*
   * Si el padre estaba colapsado,
   * lo expandimos automáticamente.
   */

  this.collapsedRows.update(
    current => {

      const next =
        new Set(current);

      next.delete(parent.id);

      return next;
    }
  );
}
displayProgress(
  row: ActionPlanRow
): number {
  const children =
    this.currentValue()
      .rows
      .filter(item =>
        item.parentId === row.id
      );

  if (children.length === 0) {
    return this.normalizeProgress(
      row.progress
    );
  }

  const total =
    children.reduce(
      (sum, child) =>
        sum +
        this.normalizeProgress(
          child.progress
        ),
      0
    );

  return Math.round(
    total / children.length
  );
}
toggleSubActions(
  parentId: string
): void {

  this.collapsedRows.update(
    current => {

      const next =
        new Set(current);

      if (
        next.has(parentId)
      ) {
        next.delete(parentId);
      } else {
        next.add(parentId);
      }

      return next;
    }
  );
}

isCollapsed(
  parentId: string
): boolean {

  return this.collapsedRows()
    .has(parentId);
}

rowNumber(
  parentIndex: number
): string {

  return String(
    parentIndex + 1
  );
}

subActionNumber(
  parentIndex: number,
  childIndex: number
): string {

  return `${
    parentIndex + 1
  }.${
    childIndex + 1
  }`;
}
hasSubActions(
  parentId: string
): boolean {

  return this.currentValue()
    .rows
    .some(
      row =>
        row.parentId === parentId
    );
}

subActions(
  parentId: string
): ActionPlanRow[] {

  return this.currentValue()
    .rows
    .filter(
      row =>
        row.parentId === parentId
    );
}
}
