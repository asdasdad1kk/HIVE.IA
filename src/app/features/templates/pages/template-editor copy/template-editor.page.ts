import {
  Component,
  computed,
  inject,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
  transferArrayItem
} from '@angular/cdk/drag-drop';
import { Calculator, Eye, MailPlus, Plus, Save, Trash2, UserRound, X, LucideAngularModule } from 'lucide-angular';

import {
  ActionPlanMethodology,
  ChecklistActionPlanSection,
  ChecklistDefinition,
  ChecklistField,
  ChecklistFormSection,
  ChecklistMatrixRow,
  ChecklistMatrixSection,
  ChecklistRuleFormat,
  ChecklistRules,
  ChecklistSection,
  ChecklistTemplateInput,
  FieldLayout,
  FieldObservationConfig,
  FieldType,
  RuleVariableOperation
} from '../../../../core/models';
import { ChecklistRepository } from '../../../../core/checklist.repository';
import { AppButtonComponent } from '../../../../shared/components/button/button';
import { ChecklistShellComponent } from '../../../run/components/checklist-shell/checklist-shell.component';
import { EditorFieldCardComponent } from '../../components/editor-field-card/editor-field-card.component';
import { FieldToolboxComponent } from '../../components/field-toolbox/field-toolbox';
import { MatrixSectionEditorComponent } from '../../components/matrix-section-editor/matrix-section-editor';
import { RuleBuilderComponent } from '../../components/rule-builder/rule-builder.component';

@Component({
  selector: 'app-template-editor',
  imports: [
    FormsModule,
    DragDropModule,
    AppButtonComponent,
    FieldToolboxComponent,
    RuleBuilderComponent,
    EditorFieldCardComponent,
    ChecklistShellComponent,
    MatrixSectionEditorComponent,
    LucideAngularModule
],
  templateUrl: './template-editor.page.html'
})
export class TemplateEditorPage {
  private readonly repository = inject(ChecklistRepository);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly Eye = Eye;
  readonly Save = Save;
  readonly X = X;
  readonly Calculator = Calculator;
  readonly MailPlus = MailPlus;
  readonly Plus = Plus;
  readonly Trash2 = Trash2;
  readonly UserRound = UserRound;

  readonly templateId = Number(this.route.snapshot.paramMap.get('id')) || 0;
  readonly saving = signal(false);
  readonly loading = signal(this.templateId > 0);
  readonly errorMessage = signal<string | null>(null);
  readonly previewOpen = signal(false);
  readonly rulesOpen = signal(false);

  readonly definition = signal<ChecklistDefinition>({
    sections: [this.createFormSection('General')]
  });

  readonly sectionDropListIds = computed<string[]>(() =>
    this.definition().sections
      .filter(section => this.isFormSection(section))
      .map(section => this.sectionDropListId(section.id))
  );

  name = '';
  description = '';

  constructor() {
    if (this.templateId > 0) {
      void this.loadTemplate();
    }
  }

  openPreview(): void {
    this.previewOpen.set(true);
  }

  closePreview(): void {
    this.previewOpen.set(false);
  }

  openRules(): void {
    this.rulesOpen.set(true);
  }

  closeRules(): void {
    this.rulesOpen.set(false);
  }

  addSection(): void {
    this.definition.update(definition => ({
      ...definition,
      sections: [
        ...definition.sections,
        this.createFormSection(`Sección ${definition.sections.length + 1}`)
      ]
    }));
  }

  addMatrixSection(): void {
    const section: ChecklistMatrixSection = {
      id: crypto.randomUUID(),
      title: `Matriz ${this.definition().sections.length + 1}`,
      view: 'matrix',
      columns: ['SI', 'NO', 'N/A'],
      rows: []
    };

    this.definition.update(definition => ({
      ...definition,
      sections: [...definition.sections, section]
    }));
  }

  removeSection(sectionIndex: number): void {
    if (this.definition().sections.length <= 1) {
      return;
    }

    this.definition.update(definition => ({
      ...definition,
      sections: definition.sections.filter((_, index) => index !== sectionIndex)
    }));
  }

  updateSectionTitle(sectionIndex: number, title: string): void {
    this.definition.update(definition => ({
      ...definition,
      sections: definition.sections.map((section, index) =>
        index === sectionIndex ? { ...section, title } : section
      )
    }));
  }

  updateMatrixSection(
    sectionIndex: number,
    section: ChecklistMatrixSection
  ): void {
    this.definition.update(definition => ({
      ...definition,
      sections: definition.sections.map((current, index) =>
        index === sectionIndex ? section : current
      )
    }));
  }

 addField(type: FieldType): void {
  const sections =
    this.definition().sections;

  let targetSectionIndex = -1;

  for (
    let index = sections.length - 1;
    index >= 0;
    index -= 1
  ) {
    const section = sections[index];

    if (
      section &&
      this.isFormSection(section)
    ) {
      targetSectionIndex = index;
      break;
    }
  }

  if (targetSectionIndex < 0) {
    this.errorMessage.set(
      'Agrega una sección de formulario antes de agregar campos.'
    );
    return;
  }

  const targetSection =
    sections[targetSectionIndex];

  if (
    !targetSection ||
    !this.isFormSection(targetSection)
  ) {
    return;
  }

  this.insertNewField(
    targetSectionIndex,
    targetSection.fields.length,
    type
  );
}
  updateField(
    sectionIndex: number,
    fieldIndex: number,
    field: ChecklistField
  ): void {
    this.definition.update(definition => ({
      ...definition,
      sections: definition.sections.map((section, currentSectionIndex) => {
        if (currentSectionIndex !== sectionIndex || !this.isFormSection(section)) {
          return section;
        }

        return {
          ...section,
          fields: section.fields.map((currentField, currentFieldIndex) =>
            currentFieldIndex === fieldIndex ? field : currentField
          )
        };
      })
    }));
  }

  removeField(sectionIndex: number, fieldIndex: number): void {
    this.definition.update(definition => ({
      ...definition,
      sections: definition.sections.map((section, currentSectionIndex) => {
        if (currentSectionIndex !== sectionIndex || !this.isFormSection(section)) {
          return section;
        }

        return {
          ...section,
          fields: section.fields.filter(
            (_, currentFieldIndex) => currentFieldIndex !== fieldIndex
          )
        };
      })
    }));
  }

  sectionItemCount(
  section: ChecklistSection
): number {

  if (
    section.view === 'matrix'
  ) {
    return section.rows.length;
  }

  if (
    section.view === 'action-plan'
  ) {
    return section.initialRows ?? 1;
  }

  return section.fields.length;
}

  sectionItemLabel(
  section: ChecklistSection
): string {

  const count =
    this.sectionItemCount(section);

  if (
    section.view === 'matrix'
  ) {
    return count === 1
      ? 'fila'
      : 'filas';
  }

  if (
    section.view === 'action-plan'
  ) {
    return count === 1
      ? 'acción'
      : 'acciones';
  }

  return count === 1
    ? 'campo'
    : 'campos';
}

  sectionDropListId(sectionId: string): string {
    return `section-${sectionId}`;
  }

  connectedDropLists(currentSectionId: string): string[] {
    return [
      'field-toolbox',
      ...this.definition().sections
        .filter(
        section =>
          section.view === undefined ||
          section.view === 'form'
      )
        .filter(section => section.id !== currentSectionId)
        .map(section => this.sectionDropListId(section.id))
    ];
  }

  dropField(
    targetSectionIndex: number,
    event: CdkDragDrop<ChecklistField[], ChecklistField[] | readonly unknown[]>
  ): void {
    const targetSection = this.definition().sections[targetSectionIndex];

    if (!targetSection || !this.isFormSection(targetSection)) {
      return;
    }

    if (event.previousContainer.id === 'field-toolbox') {
      const fieldType: unknown = event.item.data;

      if (this.isFieldType(fieldType)) {
        this.insertNewField(targetSectionIndex, event.currentIndex, fieldType);
      }

      return;
    }

    const sourceSectionIndex = this.definition().sections.findIndex(section =>
      this.isFormSection(section) &&
      this.sectionDropListId(section.id) === event.previousContainer.id
    );

    if (sourceSectionIndex < 0) {
      return;
    }

    if (sourceSectionIndex === targetSectionIndex) {
      this.reorderField(
        targetSectionIndex,
        event.previousIndex,
        event.currentIndex
      );
      return;
    }

    this.transferField(
      sourceSectionIndex,
      targetSectionIndex,
      event.previousIndex,
      event.currentIndex
    );
  }

  updateRules(rules: ChecklistRules): void {
    this.definition.update(definition => ({
      ...definition,
      rules
    }));
  }

  addActionPlanInvolved(sectionIndex: number, rawValue: string, input: HTMLInputElement): void {
    const emails = rawValue.split(/[;,\s]+/)
      .map(value => value.trim().toLowerCase())
      .filter(value => this.isValidEmail(value));
    if (emails.length === 0) { return; }
    this.definition.update(definition => ({
      ...definition,
      sections: definition.sections.map((section, index) =>
        index === sectionIndex && this.isActionPlanSection(section)
          ? { ...section, involvedEmails: [...new Set([...(section.involvedEmails ?? []), ...emails])] }
          : section
      )
    }));
    input.value = '';
  }
  removeActionPlanInvolved(sectionIndex: number, email: string): void {
    this.definition.update(definition => ({
      ...definition,
      sections: definition.sections.map((section, index) =>
        index === sectionIndex && this.isActionPlanSection(section)
          ? { ...section, involvedEmails: (section.involvedEmails ?? []).filter(value => value !== email) }
          : section
      )
    }));
  }
  involvedDisplayName(email: string): string {
    const local = (email.split('@')[0] ?? email).replace(/\d+$/g, '');
    return local.split(/[._-]+/).filter(Boolean)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()).join(' ') || email;
  }
  async save(): Promise<void> {
    if (this.saving()) {
      return;
    }

    this.errorMessage.set(null);

    try {
      const input = this.createTemplateInput();
      this.validateTemplate(input);
      this.saving.set(true);

      if (this.templateId > 0) {
        await this.repository.updateTemplate(this.templateId, input);
      } else {
        await this.repository.createTemplate(input);
      }

      await this.router.navigateByUrl('/templates');
    } catch (error: unknown) {
      this.errorMessage.set(this.errorText(error));
    } finally {
      this.saving.set(false);
    }
  }

  private async loadTemplate(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set(null);

    try {
      const template = await this.repository.getTemplate(this.templateId);

      if (!template) {
        this.errorMessage.set('No se encontró la plantilla.');
        return;
      }

      this.name = template.name;
      this.description = template.description ?? '';

      const parsedDefinition: unknown = JSON.parse(template.definitionJson);
      this.definition.set(this.normalizeLoadedDefinition(parsedDefinition));
    } catch (error: unknown) {
      this.errorMessage.set(this.errorText(error));
    } finally {
      this.loading.set(false);
    }
  }

  private insertNewField(
    sectionIndex: number,
    fieldIndex: number,
    type: FieldType
  ): void {
    this.definition.update(definition => {
      const sections = [...definition.sections];
      const targetSection = sections[sectionIndex];

      if (!targetSection || !this.isFormSection(targetSection)) {
        return definition;
      }

      const fields = [...targetSection.fields];
      const insertionIndex = Math.max(0, Math.min(fieldIndex, fields.length));
      fields.splice(insertionIndex, 0, this.createField(type));
      sections[sectionIndex] = { ...targetSection, fields };

      return { ...definition, sections };
    });
  }

  private reorderField(
    sectionIndex: number,
    previousIndex: number,
    currentIndex: number
  ): void {
    this.definition.update(definition => {
      const sections = [...definition.sections];
      const section = sections[sectionIndex];

      if (!section || !this.isFormSection(section)) {
        return definition;
      }

      const fields = [...section.fields];
      moveItemInArray(fields, previousIndex, currentIndex);
      sections[sectionIndex] = { ...section, fields };

      return { ...definition, sections };
    });
  }

  private transferField(
    sourceSectionIndex: number,
    targetSectionIndex: number,
    previousIndex: number,
    currentIndex: number
  ): void {
    this.definition.update(definition => {
      const sections = [...definition.sections];
      const source = sections[sourceSectionIndex];
      const target = sections[targetSectionIndex];

      if (
        !source ||
        !target ||
        !this.isFormSection(source) ||
        !this.isFormSection(target)
      ) {
        return definition;
      }

      const sourceFields = [...source.fields];
      const targetFields = [...target.fields];

      transferArrayItem(
        sourceFields,
        targetFields,
        previousIndex,
        currentIndex
      );

      sections[sourceSectionIndex] = { ...source, fields: sourceFields };
      sections[targetSectionIndex] = { ...target, fields: targetFields };

      return { ...definition, sections };
    });
  }

  private createTemplateInput(): ChecklistTemplateInput {
    return {
      name: this.name.trim(),
      description: this.description.trim() || undefined,
      definition: this.normalizeDefinition(this.definition())
    };
  }

  private validateTemplate(input: ChecklistTemplateInput): void {
    if (!input.name) {
      throw new Error('Captura el nombre de la plantilla.');
    }

    if (input.definition.sections.length === 0) {
      throw new Error('La plantilla debe contener al menos una sección.');
    }

    input.definition.sections.forEach((section, sectionIndex) => {
      if (!section.title.trim()) {
        throw new Error(`Captura el título de la sección ${sectionIndex + 1}.`);
      }

      if (this.isMatrixSection(section)) {
  this.validateMatrixSection(
    section,
    sectionIndex
  );

  return;
}

if (this.isActionPlanSection(section)) {
  return;
}

section.fields.forEach(
  (
    field: ChecklistField,
    fieldIndex: number
  ) => {

    if (!field.label.trim()) {
      throw new Error(
        `Captura la etiqueta del campo ${
          fieldIndex + 1
        } en la sección "${section.title}".`
      );
    }

    if (
      this.hasOptions(field.type) &&
      (!field.options ||
        field.options.length === 0)
    ) {
      throw new Error(
        `El campo "${field.label}" debe tener al menos una opción.`
      );
    }
  }
);
    });
  }

  private validateMatrixSection(
    section: ChecklistMatrixSection,
    sectionIndex: number
  ): void {
    if (section.columns.length === 0) {
      throw new Error(
        `La matriz de la sección ${sectionIndex + 1} debe contener al menos una columna.`
      );
    }

    if (section.rows.length === 0) {
      throw new Error(
        `La matriz "${section.title}" debe contener al menos una fila.`
      );
    }

    const keys = new Set<string>();

    section.rows.forEach((row, rowIndex) => {
      if (!row.label.trim()) {
        throw new Error(
          `Captura la etiqueta de la fila ${rowIndex + 1} en la matriz "${section.title}".`
        );
      }

      if (!row.key.trim()) {
        throw new Error(
          `Captura la key de la fila ${rowIndex + 1} en la matriz "${section.title}".`
        );
      }

      if (keys.has(row.key)) {
        throw new Error(
          `La key "${row.key}" está repetida en la matriz "${section.title}".`
        );
      }

      keys.add(row.key);
    });
  }

  private normalizeDefinition(
    definition: ChecklistDefinition
  ): ChecklistDefinition {
    return {
      sections: definition.sections.map(section => {
        if (this.isMatrixSection(section)) {
          return this.normalizeMatrixSection(section);
        }
        if (this.isActionPlanSection(section)) {
          return this.normalizeActionPlanSection(section);
        }
        return {
          id: section.id || crypto.randomUUID(),
          title: section.title.trim(),
          view: 'form' as const,
          fields: section.fields.map(field => this.normalizeField(field))
        };
      }),
      rules: definition.rules
    };
  }

  private normalizeMatrixSection(
    section: ChecklistMatrixSection
  ): ChecklistMatrixSection {
    return {
      id: section.id || crypto.randomUUID(),
      title: section.title.trim(),
      view: 'matrix',
      columns: [...new Set(
        section.columns.map(column => column.trim()).filter(Boolean)
      )],
      rows:
  section.rows.map(
    (
      row,
      index
    ) => ({
      key:
        row.key.trim() ||
        `matrix-row-${index + 1}`,

      label:
        row.label.trim(),

      legend:
        row.legend?.trim() ||
        undefined,

      required:
        row.required === true
    })
  )
    };
  }

  private validateActionPlanSection(
    section: ChecklistActionPlanSection,
    sectionIndex: number
  ): void {
    if (section.phases.length === 0) {
      throw new Error(`El plan de acción de la sección ${sectionIndex + 1} debe tener al menos una fase.`);
    }
    if ((section.minimumRows ?? 0) < 0 || (section.maximumRows ?? 100) < 1) {
      throw new Error(`Los límites del plan "${section.title}" no son válidos.`);
    }
  }

  private normalizeActionPlanSection(
    section: ChecklistActionPlanSection
  ): ChecklistActionPlanSection {
    const phases = section.phases
      .map((phase, index) => ({
        id: phase.id.trim() || `phase-${index + 1}`,
        label: phase.label.trim() || `Fase ${index + 1}`,
        description: phase.description?.trim() || undefined
      }));
    return {
      id: section.id || crypto.randomUUID(),
      title: section.title.trim(),
      view: 'action-plan',
      methodology: section.methodology,
      involvedEmails: this.normalizeEmails(section.involvedEmails),
      phases: phases.length ? phases : [{ id: 'general', label: 'Acciones' }],
      initialRows: Math.max(0, section.initialRows ?? 1),
      minimumRows: Math.max(0, section.minimumRows ?? 1),
      maximumRows: Math.max(1, section.maximumRows ?? 100),
      requireAction: section.requireAction !== false,
      requireResponsible: section.requireResponsible !== false,
      requireEcd: section.requireEcd === true,
      initialActions: section.initialActions?.map(row => ({
        id: row.id.trim() || crypto.randomUUID(),
        phaseId: row.phaseId.trim(),
        parentId: row.parentId?.trim() || undefined,
        action: row.action.trim(),
        responsibleEmail: row.responsibleEmail.trim().toLowerCase(),
        ecds: row.ecds.map(ecd => ({
          label: ecd.label?.trim() || undefined,
          date: ecd.date.trim(),
          completed: ecd.completed === true
        })),
        progress: Math.max(0, Math.min(100, Math.round(Number(row.progress) || 0))),
        observations: row.observations.trim()
      }))
    };
  }

  private normalizeLoadedActionPlanSection(
    section: Record<string, unknown>,
    sectionIndex: number
  ): ChecklistActionPlanSection {
    const methodology: ActionPlanMethodology =
      section['methodology'] === 'PDCA' || section['methodology'] === 'DMAIC'
        ? section['methodology']
        : 'FREE';
    const fallback = this.createActionPlanSection(methodology);
    const phasesValue = Array.isArray(section['phases']) ? section['phases'] : [];
    const phases = phasesValue
      .filter(value => this.isRecord(value))
      .map((phase, index) => ({
        id: this.readTitle(phase['id'], `phase-${index + 1}`),
        label: this.readTitle(phase['label'], `Fase ${index + 1}`),
        description: typeof phase['description'] === 'string' && phase['description'].trim()
          ? phase['description'].trim()
          : undefined
      }));
    return {
      ...fallback,
      id: this.readId(section['id']),
      title: this.readTitle(section['title'], `Plan de acción ${sectionIndex + 1}`),
      involvedEmails: this.normalizeEmails(Array.isArray(section['involvedEmails']) ? section['involvedEmails'].map(String) : fallback.involvedEmails),
      phases: phases.length ? phases : fallback.phases,
      initialRows: this.readNonNegativeInteger(section['initialRows'], fallback.initialRows ?? 1),
      minimumRows: this.readNonNegativeInteger(section['minimumRows'], fallback.minimumRows ?? 1),
      maximumRows: Math.max(1, this.readNonNegativeInteger(section['maximumRows'], fallback.maximumRows ?? 100)),
      requireAction: section['requireAction'] !== false,
      requireResponsible: section['requireResponsible'] !== false,
      requireEcd: section['requireEcd'] === true,
      initialActions: this.normalizeLoadedInitialActions(section['initialActions'])
    };
  }

  private normalizeLoadedInitialActions(value: unknown): ChecklistActionPlanSection['initialActions'] {
    if (!Array.isArray(value)) {
      return undefined;
    }
    return value
      .filter(row => this.isRecord(row))
      .map((row, index) => ({
        id: this.readTitle(row['id'], `initial-action-${index + 1}`),
        phaseId: this.readTitle(row['phaseId'], 'general'),
        parentId: typeof row['parentId'] === 'string' && row['parentId'].trim()
          ? row['parentId'].trim()
          : undefined,
        action: this.readTitle(row['action'], `Acción ${index + 1}`),
        responsibleEmail: typeof row['responsibleEmail'] === 'string'
          ? row['responsibleEmail'].trim().toLowerCase()
          : '',
        ecds: Array.isArray(row['ecds'])
          ? row['ecds'].filter(ecd => this.isRecord(ecd)).map((ecd, ecdIndex) => ({
              label: this.readTitle(ecd['label'], `ECD${ecdIndex + 1}`),
              date: typeof ecd['date'] === 'string' ? ecd['date'].trim() : '',
              completed: ecd['completed'] === true
            }))
          : [],
        progress: typeof row['progress'] === 'number'
          ? Math.max(0, Math.min(100, Math.round(row['progress'])))
          : 0,
        observations: typeof row['observations'] === 'string'
          ? row['observations'].trim()
          : ''
      }));
  }

  private readNonNegativeInteger(value: unknown, fallback: number): number {
    return typeof value === 'number' && Number.isInteger(value) && value >= 0
      ? value
      : fallback;
  }

  private normalizeField(field: ChecklistField): ChecklistField {
    const options = this.hasOptions(field.type)
      ? [...new Set(
          (field.options ?? []).map(option => option.trim()).filter(Boolean)
        )]
      : undefined;

    return {
      key: field.key || crypto.randomUUID(),
      label: field.label.trim(),
      type: field.type,
      required: field.required === true,
      placeholder: field.placeholder?.trim() || undefined,
      options,
      observation: this.normalizeObservation(field, options),
      layout: this.normalizeFieldLayout(field.layout)
    };
  }

  private normalizeLoadedDefinition(value: unknown): ChecklistDefinition {
    if (!this.isRecord(value) || !Array.isArray(value['sections'])) {
      throw new Error('La definición guardada no es válida.');
    }

    const sections = value['sections']
      .filter(section => this.isRecord(section))
      .map((section, sectionIndex) => {
        if (section['view'] === 'matrix') {
          return this.normalizeLoadedMatrixSection(section, sectionIndex);
        }
        if (section['view'] === 'action-plan') {
          return this.normalizeLoadedActionPlanSection(section, sectionIndex);
        }
        return this.normalizeLoadedFormSection(section, sectionIndex);
      });

    return {
      sections: sections.length > 0
        ? sections
        : [this.createFormSection('General')],
      rules: this.normalizeLoadedRules(value['rules'])
    };
  }

  private normalizeLoadedFormSection(
    section: Record<string, unknown>,
    sectionIndex: number
  ): ChecklistFormSection {
    const fields = Array.isArray(section['fields']) ? section['fields'] : [];

    return {
      id: this.readId(section['id']),
      title: this.readTitle(section['title'], `Sección ${sectionIndex + 1}`),
      view: 'form',
      fields: fields
        .filter(field => this.isRecord(field))
        .map(field => this.normalizeLoadedField(field))
    };
  }

  private normalizeLoadedMatrixSection(
    section: Record<string, unknown>,
    sectionIndex: number
  ): ChecklistMatrixSection {
    const columns = Array.isArray(section['columns'])
      ? section['columns'].map(String).map(value => value.trim()).filter(Boolean)
      : [];

    const rowsValue = Array.isArray(section['rows']) ? section['rows'] : [];
    const rows: ChecklistMatrixRow[] = rowsValue
      .filter(row => this.isRecord(row))
      .map((row, rowIndex) => ({
        key:
          typeof row['key'] === 'string' && row['key'].trim()
            ? row['key'].trim()
            : `matrix-row-${rowIndex + 1}`,
        label:
          typeof row['label'] === 'string' && row['label'].trim()
            ? row['label'].trim()
            : `Ítem ${rowIndex + 1}`,
        required: row['required'] === true
      }));

    return {
      id: this.readId(section['id']),
      title: this.readTitle(section['title'], `Matriz ${sectionIndex + 1}`),
      view: 'matrix',
      columns,
      rows
    };
  }

  private normalizeLoadedField(
    field: Record<string, unknown>
  ): ChecklistField {
    const type = this.isFieldType(field['type']) ? field['type'] : 'text';
    const options = this.hasOptions(type) && Array.isArray(field['options'])
      ? field['options'].map(String).map(value => value.trim()).filter(Boolean)
      : undefined;

    const observationValue = field['observation'];
    let observation: FieldObservationConfig | undefined;

    if (this.isRecord(observationValue) && observationValue['enabled'] === true) {
      const triggerValue = typeof observationValue['triggerValue'] === 'string'
        ? observationValue['triggerValue']
        : undefined;

      observation = {
        enabled: true,
        triggerValue:
          type === 'select'
            ? triggerValue && options?.includes(triggerValue)
              ? triggerValue
              : this.defaultTrigger(options)
            : undefined,
        label:
          typeof observationValue['label'] === 'string'
            ? observationValue['label']
            : 'Observaciones',
        placeholder:
          typeof observationValue['placeholder'] === 'string'
            ? observationValue['placeholder']
            : undefined,
        required: observationValue['required'] === true
      };
    }

    return {
      key:
        typeof field['key'] === 'string' && field['key'].trim()
          ? field['key']
          : crypto.randomUUID(),
      label:
        typeof field['label'] === 'string'
          ? field['label']
          : this.defaultLabel(type),
      type,
      required: field['required'] === true,
      layout: field['layout'] === 'half' ? 'half' : 'full',
      placeholder:
        typeof field['placeholder'] === 'string'
          ? field['placeholder']
          : undefined,
      options:
        type === 'select'
          ? options?.length ? options : ['SI', 'NO']
          : type === 'month'
            ? options?.length ? options : this.monthOptions()
            : type === 'dropdown'
              ? options ?? []
              : undefined,
      observation
    };
  }

  private normalizeObservation(
    field: ChecklistField,
    options: string[] | undefined
  ): FieldObservationConfig | undefined {
    const observation = field.observation;

    if (!observation?.enabled) {
      return undefined;
    }

    return {
      enabled: true,
      triggerValue:
        field.type === 'select'
          ? observation.triggerValue && options?.includes(observation.triggerValue)
            ? observation.triggerValue
            : this.defaultTrigger(options)
          : undefined,
      label: observation.label?.trim() || 'Observaciones',
      placeholder: observation.placeholder?.trim() || undefined,
      required: observation.required === true
    };
  }

  private createFormSection(title: string): ChecklistFormSection {
    return {
      id: crypto.randomUUID(),
      title,
      view: 'form',
      fields: []
    };
  }

  private createField(type: FieldType): ChecklistField {
    return {
      key: crypto.randomUUID(),
      label: this.defaultLabel(type),
      type,
      required: false,
      layout: type === 'textarea' ? 'full' : 'half',
      options:
        type === 'select'
          ? ['SI', 'NO']
          : type === 'month'
            ? this.monthOptions()
            : type === 'dropdown'
              ? []
              : undefined,
      observation: undefined
    };
  }

  private monthOptions(): string[] {
    return [
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
  }

  private defaultLabel(type: FieldType): string {
    const labels: Record<FieldType, string> = {
      text: 'Campo de texto',
      textarea: 'Comentarios',
      number: 'Valor numérico',
      date: 'Fecha',
      checkbox: 'Confirmación',
      select: 'Seleccionar opción',
      dropdown: 'Lista desplegable',
      month: 'Mes'
    };

    return labels[type];
  }

  private defaultTrigger(options: string[] | undefined): string {
    return options?.find(option => option.trim().toUpperCase() === 'NO')
      ?? options?.[0]
      ?? '';
  }

  private hasOptions(type: FieldType): boolean {
    return type === 'select' || type === 'dropdown' || type === 'month';
  }

  private normalizeFieldLayout(layout: FieldLayout | undefined): FieldLayout {
    return layout === 'half' ? 'half' : 'full';
  }

  private readId(value: unknown): string {
    return typeof value === 'string' && value.trim()
      ? value
      : crypto.randomUUID();
  }

  private readTitle(value: unknown, fallback: string): string {
    return typeof value === 'string' && value.trim() ? value : fallback;
  }

  private isFieldType(value: unknown): value is FieldType {
    return (
      value === 'text' ||
      value === 'textarea' ||
      value === 'number' ||
      value === 'date' ||
      value === 'checkbox' ||
      value === 'select' ||
      value === 'dropdown' ||
      value === 'month'
    );
  }

  private normalizeLoadedRules(value: unknown): ChecklistRules | undefined {
    if (!this.isRecord(value)) {
      return undefined;
    }

    const variablesValue = value['variables'];
    const calculationsValue = value['calculations'];

    const variables = Array.isArray(variablesValue)
      ? variablesValue
          .filter(variable => this.isRecord(variable))
          .map(variable => ({
            id: typeof variable['id'] === 'string'
              ? variable['id']
              : crypto.randomUUID(),
            name: typeof variable['name'] === 'string'
              ? this.normalizeRuleName(variable['name'])
              : '',
            label: typeof variable['label'] === 'string'
              ? variable['label']
              : '',
            sectionId: typeof variable['sectionId'] === 'string'
              ? variable['sectionId']
              : '',
            operation: this.isRuleVariableOperation(variable['operation'])
              ? variable['operation']
              : 'countEquals',
            compareValue: typeof variable['compareValue'] === 'string'
              ? variable['compareValue']
              : undefined
          }))
      : [];

    const calculations = Array.isArray(calculationsValue)
      ? calculationsValue
          .filter(calculation => this.isRecord(calculation))
          .map(calculation => ({
            id: typeof calculation['id'] === 'string'
              ? calculation['id']
              : crypto.randomUUID(),
            name: typeof calculation['name'] === 'string'
              ? this.normalizeRuleName(calculation['name'])
              : '',
            label: typeof calculation['label'] === 'string'
              ? calculation['label']
              : '',
            formula: typeof calculation['formula'] === 'string'
              ? calculation['formula']
              : '',
            format: this.isRuleFormat(calculation['format'])
              ? calculation['format']
              : 'number',
            decimalPlaces: typeof calculation['decimalPlaces'] === 'number'
              ? calculation['decimalPlaces']
              : 0
          }))
      : [];

    return variables.length || calculations.length
      ? { variables, calculations }
      : undefined;
  }

  private normalizeRuleName(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9_]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  private isRuleVariableOperation(
    value: unknown
  ): value is RuleVariableOperation {
    return (
      value === 'countEquals' ||
      value === 'countNotEquals' ||
      value === 'countAnswered' ||
      value === 'countTotal'
    );
  }

  private isRuleFormat(value: unknown): value is ChecklistRuleFormat {
    return (
      value === 'number' ||
      value === 'decimal' ||
      value === 'percentage'
    );
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private normalizeEmails(values: string[] | undefined): string[] {
    return [...new Set((values ?? []).map(value => value.trim().toLowerCase()).filter(value => this.isValidEmail(value)))];
  }
  private isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }
  private errorText(error: unknown): string {
    if (error instanceof SyntaxError) {
      return 'La definición almacenada no contiene un JSON válido.';
    }

    return error instanceof Error
      ? error.message
      : 'Ocurrió un error inesperado.';
  }
  addActionPlanSection(
  methodology: ActionPlanMethodology
): void {
  const section =
    this.createActionPlanSection(
      methodology
    );

  this.definition.update(
    definition => ({
      ...definition,
      sections: [
        ...definition.sections,
        section
      ]
    })
  );
}

private createActionPlanSection(
  methodology: ActionPlanMethodology
): ChecklistActionPlanSection {
  const shared = {
    id: crypto.randomUUID(),
    view: 'action-plan' as const,
    methodology,
    involvedEmails: [],
    initialRows: 1,
    minimumRows: 1,
    maximumRows: 100,
    requireAction: true,
    requireResponsible: true,
    requireEcd: true
  };

  switch (methodology) {
    case 'PDCA':
      return {
        ...shared,
        title: 'Plan de acción PDCA',
        phases: [
          {
            id: 'plan',
            label: 'Plan',
            description:
              'Definir problema, objetivo y acciones.'
          },
          {
            id: 'do',
            label: 'Do',
            description:
              'Ejecutar las acciones definidas.'
          },
          {
            id: 'check',
            label: 'Check',
            description:
              'Comprobar resultados y evidencias.'
          },
          {
            id: 'act',
            label: 'Act',
            description:
              'Estandarizar o ajustar las acciones.'
          }
        ]
      };

    case 'DMAIC':
      return {
        ...shared,
        title: 'Plan de acción DMAIC',
        phases: [
          {
            id: 'define',
            label: 'Define',
            description:
              'Definir problema, alcance y objetivo.'
          },
          {
            id: 'measure',
            label: 'Measure',
            description:
              'Recopilar datos y establecer línea base.'
          },
          {
            id: 'analyze',
            label: 'Analyze',
            description:
              'Analizar causas y oportunidades.'
          },
          {
            id: 'improve',
            label: 'Improve',
            description:
              'Implementar mejoras.'
          },
          {
            id: 'control',
            label: 'Control',
            description:
              'Controlar y sostener los resultados.'
          }
        ]
      };

    default:
      return {
        ...shared,
        title: 'Plan de acción',
        methodology: 'FREE',
        phases: [
          {
            id: 'general',
            label: 'Acciones',
            description:
              'Plan de acción libre.'
          }
        ]
      };
  }
}
private isFormSection(
  section: ChecklistSection
): section is ChecklistFormSection {
  return (
    section.view === undefined ||
    section.view === 'form'
  );
}

private isMatrixSection(
  section: ChecklistSection
): section is ChecklistMatrixSection {
  return section.view === 'matrix';
}

private isActionPlanSection(
  section: ChecklistSection
): section is ChecklistActionPlanSection {
  return section.view === 'action-plan';
}

}
