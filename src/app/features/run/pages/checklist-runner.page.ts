import {
  Component,
  computed,
  inject,
  signal
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { ChecklistRepository } from '../../../core/checklist.repository';
import {
  ActionPlanMinutePayload,
  ActionPlanSectionValue,
  ActionPlanTemplateRow,
  ChecklistActionPlanSection,
  ChecklistDefinition,
  ChecklistField,
  ChecklistMatrixRow,
  ChecklistSubmission,
  ChecklistSubmissionInput,
  ChecklistTemplate,
  SubmissionStatus
} from '../../../core/models';
import { Auth } from '../../../core/services/auth';
import {
  ChecklistActionPlanValueChange,
  ChecklistObservationChange,
  ChecklistShellComponent,
  ChecklistValueChange
} from '../components/checklist-shell/checklist-shell.component';
import { ChecklistRuleEngine } from '../services/checklist-rule-engine';
import { isActionPlanSection, sectionFields, sectionRows } from '../../../core/checklist-section.utils';
import { DraftsStateService } from '../../../core/services/drafts';

@Component({
  selector: 'app-checklist-runner',
  imports: [ChecklistShellComponent],
  templateUrl: './checklist-runner.page.html'
})
export class ChecklistRunnerPage {
  private readonly auth = inject(Auth);
  private readonly repository = inject(ChecklistRepository);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly ruleEngine = inject(ChecklistRuleEngine);
  private readonly draftsState = inject(DraftsStateService);
  /**
   * /run/:id recibe el TemplateId.
   * Al cargar, se busca el DRAFT más reciente del usuario para esa plantilla.
   */
  private readonly routeId = Number(this.route.snapshot.paramMap.get('id'));
  private readonly resumeSubmission = this.route.snapshot.routeConfig?.path === 'draft/:id';
  private templateId = this.resumeSubmission ? 0 : this.routeId;

  readonly submissionId = signal<number | null>(null);
  readonly template = signal<ChecklistTemplate | null>(null);
  readonly definition = signal<ChecklistDefinition>({ sections: [] });
  readonly values = signal<Record<string, unknown>>({});
  readonly calculatedValues = signal<Record<string, number>>({});
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly fields = computed<ChecklistField[]>(() =>
  this.definition().sections.flatMap(section =>
    sectionFields(section)
  )
);

readonly matrixRows = computed<ChecklistMatrixRow[]>(() =>
  this.definition().sections.flatMap(section =>
    sectionRows(section)
  )
);
setMatrixValue(
  change: {
    key: string;
    value: string;
  }
): void {
  this.values.update(current => ({
    ...current,
    [change.key]: change.value
  }));

  this.errorMessage.set(null);
}

  readonly liveCalculations = computed(() => {
    try {
      return this.ruleEngine.calculate(
        this.definition(),
        this.values()
      );
    } catch {
      return {
        variables: {},
        calculations: {},
        all: {}
      };
    }
  });

  constructor() {
    void this.load();
  }

  setValue(change: ChecklistValueChange): void {
    const { field, value } = change;

    this.values.update(current => {
      const next: Record<string, unknown> = {
        ...current,
        [field.key]: value
      };

      if (!this.isObservationVisibleForValue(field, value)) {
        delete next[this.observationKey(field.key)];
      }

      return next;
    });

    this.errorMessage.set(null);
  }

  setObservation(change: ChecklistObservationChange): void {
    this.values.update(current => ({
      ...current,
      [this.observationKey(change.fieldKey)]: change.value
    }));

    this.errorMessage.set(null);
  }

  async save(status: SubmissionStatus): Promise<void> {
    if (this.saving()) {
      return;
    }

    if (
      status === 'COMPLETE' &&
      !this.validateCompleteSubmission()
    ) {
      
      this.scrollToTop();
      return;
    }

    const username = this.auth.user()?.username?.trim();

    if (!username) {
      this.errorMessage.set(
        'No se pudo identificar al usuario actual.'
      );
      this.scrollToTop();
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);

    try {
      const ruleResults = this.ruleEngine.calculate(
        this.definition(),
        this.values()
      );

      this.calculatedValues.set(ruleResults.all);

      const calculatedData = this.prefixCalculatedValues(
        ruleResults.all
      );

      const input: ChecklistSubmissionInput = {
        submittedBy: username,
        templateId: this.templateId,
        status,
        data: {
          ...this.values(),
          ...calculatedData
        }
      };

      const existingSubmissionId = this.submissionId();

      if (existingSubmissionId !== null) {
        await this.repository.updateSubmission(
          existingSubmissionId,
          input
        );
      } else {
        const created = await this.repository.createSubmission(input);
        this.submissionId.set(created.id);
      }
      if (status === 'COMPLETE') {

  const payload =
    this.buildMinutePayload();

  await window.checklistApi
    ?.mail
    .sendActionPlanMinute(
      payload
    );

}
      this.draftsState.refresh();
      await this.router.navigateByUrl('/history');
    } catch (error: unknown) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : 'No se pudo guardar el checklist.'
      );
      this.scrollToTop();
    } finally {
      this.saving.set(false);
    }
  }

  private async load(): Promise<void> {
    if (!Number.isInteger(this.routeId) || this.routeId <= 0) {
      this.errorMessage.set('El identificador no es válido.');
      this.loading.set(false);
      return;
    }
    try {
      const username = await this.waitForUsername();
      let resumedSubmission: ChecklistSubmission | null = null;
      if (this.resumeSubmission) {
        resumedSubmission = await this.repository.getSubmission(this.routeId);
        if (!resumedSubmission) {
          throw new Error('No se encontró el plan guardado.');
        }
        this.templateId = resumedSubmission.templateId;
      }
      const template = await this.repository.getTemplate(this.templateId);
      if (!template) {
        throw new Error('No se encontró la plantilla del checklist.');
      }
      this.template.set(template);
      this.definition.set(this.parseDefinition(JSON.parse(template.definitionJson)));
      if (resumedSubmission) {
        this.submissionId.set(resumedSubmission.id);
        this.values.set(this.parseSubmissionData(resumedSubmission.dataJson));
      } else {
        const submissions = await this.repository.listSubmissions();
        const draft = this.findLatestDraft(submissions, username);
        if (draft) {
          this.submissionId.set(draft.id);
          this.values.set(this.parseSubmissionData(draft.dataJson));
        }
      }
      this.initializeActionPlans();
    } catch (error: unknown) {
      this.errorMessage.set(
        error instanceof SyntaxError
          ? 'La plantilla o el registro guardado no contiene un JSON válido.'
          : error instanceof Error
            ? error.message
            : 'No se pudo cargar el checklist.'
      );
    } finally {
      this.loading.set(false);
    }
  }
  private findLatestDraft(
    submissions: ChecklistSubmission[],
    username: string
  ): ChecklistSubmission | undefined {
    const normalizedUsername = username.trim().toLowerCase();

    return submissions.find(submission =>
      submission.templateId === this.templateId &&
      submission.status === 'DRAFT' &&
      submission.submittedBy?.trim().toLowerCase() === normalizedUsername
    );
  }

  private parseSubmissionData(
    dataJson: string
  ): Record<string, unknown> {
    const parsed: unknown = JSON.parse(dataJson);

    if (!this.isRecord(parsed)) {
      throw new Error(
        'Los datos guardados del borrador no tienen una estructura válida.'
      );
    }

    return Object.fromEntries(
      Object.entries(parsed).filter(
        ([key]) => !key.startsWith('calculated_')
      )
    );
  }

  private prefixCalculatedValues(
    values: Record<string, number>
  ): Record<string, number> {
    return Object.fromEntries(
      Object.entries(values).map(([name, value]) => [
        `calculated_${name}`,
        value
      ])
    );
  }

  private async waitForUsername(): Promise<string> {
    const current = this.auth.user()?.username?.trim();

    if (current) {
      return current;
    }

    await new Promise<void>(resolve => {
      window.setTimeout(resolve, 100);
    });

    const retry = this.auth.user()?.username?.trim();

    if (!retry) {
      throw new Error(
        'No se pudo identificar al usuario actual.'
      );
    }

    return retry;
  }

  private validateCompleteSubmission(): boolean {
  const missingFields = this.fields()
    .filter(field => field.required)
    .filter(field =>
      !this.hasFieldValue(
        field,
        this.values()[field.key]
      )
    );

  if (missingFields.length > 0) {
    this.errorMessage.set(
      `Completa los campos requeridos: ${missingFields
        .map(field => field.label)
        .join(', ')}.`
    );

    return false;
  }

  const missingMatrixRows = this.matrixRows()
    .filter(row => row.required === true)
    .filter(row =>
      !this.hasMatrixValue(
        this.values()[row.key]
      )
    );

  if (missingMatrixRows.length > 0) {
    this.errorMessage.set(
      `Completa las filas requeridas de las matrices: ${missingMatrixRows
        .map(row => row.label)
        .join(', ')}.`
    );

    return false;
  }

  const missingObservations = this.fields()
    .filter(
      field =>
        field.observation?.enabled === true
    )
    .filter(
      field =>
        field.observation?.required === true
    )
    .filter(field =>
      this.isObservationVisibleForValue(
        field,
        this.values()[field.key]
      )
    )
    .filter(field =>
      this.observationValue(
        field.key
      ).trim().length === 0
    );

  if (missingObservations.length > 0) {
    this.errorMessage.set(
      `Captura las observaciones requeridas para: ${missingObservations
        .map(field => field.label)
        .join(', ')}.`
    );

    return false;
  }
if (!this.validateActionPlans()) {
  return false;
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
  private observationKey(fieldKey: string): string {
    return `${fieldKey}_observation`;
  }

  private observationValue(fieldKey: string): string {
    const value = this.values()[this.observationKey(fieldKey)];
    return typeof value === 'string' ? value : '';
  }

  private hasFieldValue(
    field: ChecklistField,
    value: unknown
  ): boolean {
    if (field.type === 'checkbox') {
      return value === true;
    }

    if (value === null || value === undefined) {
      return false;
    }

    if (typeof value === 'string') {
      return value.trim().length > 0;
    }

    return true;
  }

  private isObservationVisibleForValue(
    field: ChecklistField,
    value: unknown
  ): boolean {
    const observation = field.observation;

    if (!observation?.enabled) {
      return false;
    }

    if (field.type !== 'select') {
      return true;
    }

    return value === observation.triggerValue;
  }

  private parseDefinition(value: unknown): ChecklistDefinition {
    if (!this.isRecord(value) || !Array.isArray(value['sections'])) {
      throw new Error(
        'La definición de la plantilla no es válida.'
      );
    }

    return value as unknown as ChecklistDefinition;
  }

  private scrollToTop(): void {
    requestAnimationFrame(() => {
      const scrollContainer = document.querySelector<HTMLElement>(
        '[data-app-scroll-container]'
      );

      if (scrollContainer) {
        scrollContainer.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
        return;
      }

      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
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
  readonly actionPlanSections =
  computed<ChecklistActionPlanSection[]>(
    () =>
      this.definition()
        .sections
        .filter(isActionPlanSection)
  );

setActionPlanValue(
  change: ChecklistActionPlanValueChange
): void {
  this.values.update(current => ({
    ...current,
    [change.sectionId]: change.value
  }));

  this.errorMessage.set(null);
}

private validateActionPlans(): boolean {
  for (
    const section of
    this.actionPlanSections()
  ) {
    const value =
      this.readActionPlanValue(
        this.values()[section.id],
        section
      );

    if (
      value.involvedEmails.length === 0
    ) {
      this.errorMessage.set(
        `Agrega al menos un involucrado en "${section.title}".`
      );

      return false;
    }

    if (
      value.rows.length <
      (section.minimumRows ?? 0)
    ) {
      this.errorMessage.set(
        `El plan "${section.title}" requiere al menos ${
          section.minimumRows ?? 0
        } acciones.`
      );

      return false;
    }

    for (
      let index = 0;
      index < value.rows.length;
      index += 1
    ) {
      const row = value.rows[index];

      if (
        section.requireAction !== false &&
        !row.action.trim()
      ) {
        this.errorMessage.set(
          `Captura la acción ${
            index + 1
          } de "${section.title}".`
        );

        return false;
      }

      if (
        section.requireResponsible !==
          false &&
        !row.responsibleEmail.trim()
      ) {
        this.errorMessage.set(
          `Selecciona responsable para la acción ${
            index + 1
          } de "${section.title}".`
        );

        return false;
      }

      if (
        row.responsibleEmail &&
        !value.involvedEmails.includes(
          row.responsibleEmail
        )
      ) {
        this.errorMessage.set(
          `El responsable de la acción ${
            index + 1
          } ya no está en la lista de involucrados.`
        );

        return false;
      }

      if (
        section.requireEcd === true &&
        !row.ecds.some(
          ecd => ecd.date.trim()
        )
      ) {
        this.errorMessage.set(
          `Captura al menos una ECD para la acción ${
            index + 1
          } de "${section.title}".`
        );

        return false;
      }

      if (
        !Number.isFinite(
          Number(row.progress)
        ) ||
        Number(row.progress) < 0 ||
        Number(row.progress) > 100
      ) {
        this.errorMessage.set(
          `El avance de la acción ${
            index + 1
          } debe estar entre 0 y 100.`
        );

        return false;
      }
    }
  }

  return true;
}

private readActionPlanValue(
  rawValue: unknown,
  section: ChecklistActionPlanSection
): ActionPlanSectionValue {
  if (!this.isRecord(rawValue)) {
    return {
      methodology:
        section.methodology,
      involvedEmails: [],
      rows: []
    };
  }

  return {
    methodology:
      rawValue['methodology'] ===
        'PDCA' ||
      rawValue['methodology'] ===
        'DMAIC' ||
      rawValue['methodology'] ===
        'FREE'
        ? rawValue['methodology']
        : section.methodology,
    involvedEmails:
      Array.isArray(
        rawValue['involvedEmails']
      )
        ? rawValue['involvedEmails']
            .filter(
              email =>
                typeof email ===
                'string'
            )
            .map(String)
        : [...(section.involvedEmails ?? [])],
    rows:
      Array.isArray(rawValue['rows'])
        ? rawValue[
            'rows'
          ] as ActionPlanSectionValue['rows']
        : []
  };
}

buildMinutePayload():
  ActionPlanMinutePayload {
  const currentTemplate =
    this.template();

  if (!currentTemplate) {
    throw new Error(
      'No hay una plantilla cargada.'
    );
  }

  const submittedBy =
    this.auth.user()?.email ??
    this.auth.user()?.username ??
    '';

  const sections =
    this.actionPlanSections().map(
      section => {
        const value =
          this.readActionPlanValue(
            this.values()[section.id],
            section
          );

        return {
          sectionId: section.id,
          sectionTitle: section.title,
          methodology:
            value.methodology,
          rows: value.rows
        };
      }
    );

  const recipients = [
    ...new Set(
      this.actionPlanSections()
        .flatMap(section =>
          this.readActionPlanValue(
            this.values()[section.id],
            section
          ).involvedEmails
        )
        .map(email =>
          email.trim().toLowerCase()
        )
        .filter(Boolean)
    )
  ];

  return {
    templateId: currentTemplate.id,
    templateName: currentTemplate.name,
    submissionId:
      this.submissionId(),
    submittedBy,
    generatedAt:
      new Date().toISOString(),
    recipients,
    subject:
      `Minuta de plan de acción - ${currentTemplate.name}`,
    sections,
    allData: {
      ...this.values(),
      ...this.prefixCalculatedValues(
        this.liveCalculations().all
      )
    }
  };
}
private initializeActionPlans(): void {
  this.values.update(current => {
    const next = { ...current };

    for (const section of this.actionPlanSections()) {
      if (next[section.id]) {
        continue;
      }

      const migratedRows = (section.initialActions ?? []).map(
        row => this.createInitialActionRow(row, section)
      );

      const initialRows = Math.max(0, section.initialRows ?? 1);
      const firstPhase = section.phases[0];
      const emptyRows = migratedRows.length > 0
        ? []
        : Array.from({ length: initialRows }, () => ({
            id: crypto.randomUUID(),
            phaseId: firstPhase?.id ?? 'general',
            action: '',
            responsibleEmail: '',
            ecds: [{
              id: crypto.randomUUID(),
              label: 'ECD1',
              date: '',
              completed: false
            }],
            progress: 0,
            observations: ''
          }));

      next[section.id] = {
        methodology: section.methodology,
        involvedEmails: [...(section.involvedEmails ?? [])],
        rows: migratedRows.length > 0 ? migratedRows : emptyRows
      } satisfies ActionPlanSectionValue;
    }

    return next;
  });
}

private createInitialActionRow(
  source: ActionPlanTemplateRow,
  section: ChecklistActionPlanSection
): ActionPlanSectionValue['rows'][number] {
  const validPhaseIds = new Set(section.phases.map(phase => phase.id));
  const responsibleEmail = source.responsibleEmail.trim().toLowerCase();

  return {
    id: source.id.trim() || crypto.randomUUID(),
    phaseId: validPhaseIds.has(source.phaseId)
      ? source.phaseId
      : section.phases[0]?.id ?? 'general',
    parentId: source.parentId?.trim() || undefined,
    action: source.action.trim(),
    responsibleEmail: (section.involvedEmails ?? []).includes(responsibleEmail)
      ? responsibleEmail
      : '',
    ecds: source.ecds.length > 0
      ? source.ecds.map((ecd, index) => ({
          id: crypto.randomUUID(),
          label: ecd.label?.trim() || `ECD${index + 1}`,
          date: ecd.date.trim(),
          completed: ecd.completed === true
        }))
      : [{
          id: crypto.randomUUID(),
          label: 'ECD1',
          date: '',
          completed: false
        }],
    progress: Math.max(0, Math.min(100, Math.round(Number(source.progress) || 0))),
    observations: source.observations.trim()
  };
}
editTemplate(): void {
  this.router.navigate([
    '/templates',
    this.templateId,
    'edit'
  ]);
}
}
