import {
  Component,
  computed,
  inject,
  signal
} from '@angular/core';
import { Dialog } from '@angular/cdk/dialog';
import { RouterLink } from '@angular/router';
import {
  ChecklistDefinition,
  ChecklistField,
  ChecklistTemplate,
  ChecklistTemplateInput,
  FieldObservationConfig,
  FieldType
} from '../../../../core/models';
import { ChecklistRepository } from '../../../../core/checklist.repository';
import { PageHeaderComponent } from '../../../../shared/page-header.component';
import { TemplateImportDialogComponent } from '../../components/template-import-dialog/template-import-dialog';
import { Auth } from '../../../../core/services/auth';
import {
  Copy,
  FileJson2,
  Pencil,
  Play,
  Plus,
  Search,
  Trash2,
  Upload,
  X
} from 'lucide-angular';
import { AppButtonComponent } from '../../../../shared/components/button/button';
import {
  isActionPlanSection,
  isFormSection,
  isMatrixSection
} from '../../../../core/checklist-section.utils';

@Component({
  selector: 'app-template-list',
  imports: [
    RouterLink,
    PageHeaderComponent,
    AppButtonComponent
  ],
  templateUrl: './template-list.page.html'
})
export class TemplateListPage {
  readonly FileJson2 = FileJson2;
  readonly Pencil = Pencil;
  readonly Play = Play;
  readonly Plus = Plus;
  readonly Trash2 = Trash2;
  readonly Upload = Upload;
  readonly Copy = Copy;
  readonly Search = Search;
  readonly X = X;

  readonly auth = inject(Auth);
  private readonly repository = inject(ChecklistRepository);
  private readonly dialog = inject(Dialog);

  readonly templates = signal<ChecklistTemplate[]>([]);
  readonly loading = signal(true);
  readonly importing = signal(false);
  readonly deletingId = signal<number | null>(null);
  readonly exportingId = signal<number | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly searchTerm = signal('');

  readonly filteredTemplates = computed(() => {
    const query = this.normalizeSearchText(this.searchTerm());
    if (!query) {
      return this.templates();
    }

    return this.templates().filter(template => {
      const searchableText = this.normalizeSearchText([
        template.name,
        template.description ?? '',
        `v${template.version}`,
        template.isActive === 1 ? 'activa' : 'inactiva'
      ].join(' '));

      return searchableText.includes(query);
    });
  });

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set(null);

    try {
      this.templates.set(await this.repository.listTemplates());
    } catch (error: unknown) {
      this.errorMessage.set(
        this.getErrorMessage(error, 'No se pudieron cargar las plantillas.')
      );
    } finally {
      this.loading.set(false);
    }
  }

  updateSearch(value: string): void {
    this.searchTerm.set(value);
  }

  clearSearch(): void {
    this.searchTerm.set('');
  }

  public openImportDialog(): void {
    if (this.importing()) {
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);

    const dialogRef = this.dialog.open<ChecklistTemplateInput, void>(
      TemplateImportDialogComponent,
      {
        disableClose: true,
        panelClass: 'checklist-import-dialog',
        backdropClass: 'checklist-dialog-backdrop'
      }
    );

    dialogRef.closed.subscribe(result => {
      if (result) {
        void this.importTemplate(result);
      }
    });
  }

  async remove(template: ChecklistTemplate): Promise<void> {
    if (this.deletingId() !== null) {
      return;
    }

    if (!window.confirm(`¿Eliminar la plantilla "${template.name}"?`)) {
      return;
    }

    this.deletingId.set(template.id);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    try {
      await this.repository.deleteTemplate(template.id);
      this.templates.update(templates =>
        templates.filter(current => current.id !== template.id)
      );
      this.successMessage.set(`La plantilla "${template.name}" fue eliminada.`);
    } catch (error: unknown) {
      this.errorMessage.set(
        this.getErrorMessage(error, 'No se pudo eliminar la plantilla.')
      );
    } finally {
      this.deletingId.set(null);
    }
  }

  async exportTemplate(template: ChecklistTemplate): Promise<void> {
    if (this.exportingId() !== null) {
      return;
    }

    this.exportingId.set(template.id);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    try {
      const fullTemplate = await this.repository.getTemplate(template.id);
      if (!fullTemplate) {
        throw new Error('No se encontró la plantilla seleccionada.');
      }

      const exportData: ChecklistTemplateInput = {
        name: fullTemplate.name,
        description: fullTemplate.description?.trim() || undefined,
        definition: this.parseDefinition(fullTemplate.definitionJson)
      };

      await navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
      this.successMessage.set(
        `El JSON de la plantilla "${fullTemplate.name}" se copió al portapapeles.`
      );
    } catch (error: unknown) {
      this.errorMessage.set(
        this.getErrorMessage(
          error,
          'No se pudo copiar la plantilla al portapapeles.'
        )
      );
    } finally {
      this.exportingId.set(null);
    }
  }

  private async importTemplate(input: ChecklistTemplateInput): Promise<void> {
    this.importing.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    try {
      const normalizedInput: ChecklistTemplateInput = {
        name: input.name.trim(),
        description: input.description?.trim() || undefined,
        definition: this.normalizeDefinition(input.definition)
      };

      this.validateTemplateInput(normalizedInput);
      await this.repository.createTemplate(normalizedInput);
      this.successMessage.set(
        `La plantilla "${normalizedInput.name}" se importó correctamente.`
      );
      await this.load();
    } catch (error: unknown) {
      this.errorMessage.set(
        this.getErrorMessage(error, 'No se pudo importar la plantilla.')
      );
    } finally {
      this.importing.set(false);
    }
  }

  private validateTemplateInput(input: ChecklistTemplateInput): void {
    if (!input.name.trim()) {
      throw new Error('El nombre de la plantilla es obligatorio.');
    }

    if (!Array.isArray(input.definition.sections) || input.definition.sections.length === 0) {
      throw new Error('La plantilla debe contener al menos una sección.');
    }

    const usedKeys = new Set<string>();
    const usedSectionIds = new Set<string>();

    input.definition.sections.forEach((section, sectionIndex) => {
      const sectionNumber = sectionIndex + 1;
      const sectionId = section.id.trim();

      if (!sectionId) {
        throw new Error(`La sección ${sectionNumber} debe tener un id.`);
      }
      if (usedSectionIds.has(sectionId)) {
        throw new Error(`El id de sección "${sectionId}" está repetido.`);
      }
      usedSectionIds.add(sectionId);

      if (!section.title.trim()) {
        throw new Error(`La sección ${sectionNumber} debe tener un título.`);
      }

      if (isMatrixSection(section)) {
        if (!Array.isArray(section.columns) || section.columns.length === 0) {
          throw new Error(
            `La sección matriz "${section.title}" debe contener al menos una columna.`
          );
        }
        if (!Array.isArray(section.rows) || section.rows.length === 0) {
          throw new Error(
            `La sección matriz "${section.title}" debe contener al menos una fila.`
          );
        }

        section.rows.forEach((row, rowIndex) => {
          const key = row.key.trim();
          if (!key) {
            throw new Error(
              `La fila ${rowIndex + 1} de "${section.title}" no contiene key.`
            );
          }
          if (!row.label.trim()) {
            throw new Error(
              `La fila ${rowIndex + 1} de "${section.title}" no contiene etiqueta.`
            );
          }
          this.validateUniqueKey(key, usedKeys);
        });
        return;
      }

      if (isActionPlanSection(section)) {
        if (!Array.isArray(section.phases) || section.phases.length === 0) {
          throw new Error(
            `El plan de acción "${section.title}" debe contener al menos una fase.`
          );
        }

        const phaseIds = new Set<string>();
        section.phases.forEach((phase, phaseIndex) => {
          const phaseId = phase.id.trim();
          if (!phaseId) {
            throw new Error(
              `La fase ${phaseIndex + 1} de "${section.title}" debe tener un id.`
            );
          }
          if (!phase.label.trim()) {
            throw new Error(
              `La fase ${phaseIndex + 1} de "${section.title}" debe tener una etiqueta.`
            );
          }
          if (phaseIds.has(phaseId)) {
            throw new Error(
              `El id de fase "${phaseId}" está repetido en "${section.title}".`
            );
          }
          phaseIds.add(phaseId);
        });

        const minimumRows = section.minimumRows ?? 0;
        const maximumRows = section.maximumRows ?? 100;
        const initialRows = section.initialRows ?? 1;
        if (minimumRows < 0 || maximumRows < 1 || minimumRows > maximumRows) {
          throw new Error(`Los límites de filas de "${section.title}" no son válidos.`);
        }
        if (initialRows < minimumRows || initialRows > maximumRows) {
          throw new Error(
            `Las filas iniciales de "${section.title}" deben estar entre ${minimumRows} y ${maximumRows}.`
          );
        }
        return;
      }

      if (!isFormSection(section)) {
        throw new Error(`El tipo de la sección "${section}" no es válido.`);
      }

      section.fields.forEach((field: ChecklistField, fieldIndex: number) => {
        const key = field.key.trim();
        if (!key) {
          throw new Error(
            `El campo ${fieldIndex + 1} de "${section.title}" no contiene key.`
          );
        }
        this.validateUniqueKey(key, usedKeys);
        this.validateField(field, section.title, fieldIndex);
      });
    });
  }

  private validateUniqueKey(key: string, usedKeys: Set<string>): void {
    if (usedKeys.has(key)) {
      throw new Error(`La key "${key}" está repetida en la plantilla.`);
    }
    usedKeys.add(key);
  }

  private validateField(
    field: ChecklistField,
    sectionTitle: string,
    fieldIndex: number
  ): void {
    if (!field.label.trim()) {
      throw new Error(
        `El campo ${fieldIndex + 1} de la sección "${sectionTitle}" debe tener una etiqueta.`
      );
    }
    if (!this.isFieldType(field.type)) {
      throw new Error(`El campo "${field.label}" tiene un tipo inválido.`);
    }
    if (this.fieldUsesOptions(field.type) && (!field.options || field.options.length === 0)) {
      throw new Error(`El campo "${field.label}" debe contener opciones.`);
    }

    const observation = field.observation;
    if (!observation?.enabled) {
      return;
    }
    if (observation.required && !observation.label?.trim()) {
      throw new Error(
        `La observación requerida del campo "${field.label}" debe tener una etiqueta.`
      );
    }
    if (
      field.type === 'select' &&
      (!observation.triggerValue || !field.options?.includes(observation.triggerValue))
    ) {
      throw new Error(
        `Selecciona una respuesta válida para activar la observación del campo "${field.label}".`
      );
    }
  }

  private normalizeDefinition(definition: ChecklistDefinition): ChecklistDefinition {
    return {
      sections: definition.sections.map(section => {
        if (isMatrixSection(section)) {
          return {
            id: section.id.trim() || crypto.randomUUID(),
            title: section.title.trim(),
            view: 'matrix' as const,
            columns: this.normalizeOptions(section.columns),
            rows: section.rows.map((row, rowIndex) => ({
              key: row.key.trim() || `matrix-row-${rowIndex + 1}`,
              label: row.label.trim(),
              legend: row.legend?.trim() || undefined,
              required: row.required === true
            }))
          };
        }

        if (isActionPlanSection(section)) {
          const minimumRows = Math.max(0, Math.trunc(section.minimumRows ?? 1));
          const maximumRows = Math.max(
            minimumRows,
            Math.trunc(section.maximumRows ?? 100)
          );
          const initialRows = Math.min(
            maximumRows,
            Math.max(minimumRows, Math.trunc(section.initialRows ?? 1))
          );

          return {
            id: section.id.trim() || crypto.randomUUID(),
            title: section.title.trim(),
            view: 'action-plan' as const,
            methodology: section.methodology,
            involvedEmails: [...new Set((section.involvedEmails ?? []).map(email => email.trim().toLowerCase()).filter(Boolean))],
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
            })),
            phases: section.phases.map((phase, phaseIndex) => ({
              id: phase.id.trim() || `phase-${phaseIndex + 1}`,
              label: phase.label.trim() || `Fase ${phaseIndex + 1}`,
              description: phase.description?.trim() || undefined
            })),
            initialRows,
            minimumRows,
            maximumRows,
            requireAction: section.requireAction !== false,
            requireResponsible: section.requireResponsible !== false,
            requireEcd: section.requireEcd === true
          };
        }

        return {
          id: section.id.trim() || crypto.randomUUID(),
          title: section.title.trim(),
          view: 'form' as const,
          fields: section.fields.map((field: ChecklistField) =>
            this.normalizeField(field)
          )
        };
      }),
      rules: definition.rules
    };
  }

  private fieldUsesOptions(type: FieldType): boolean {
    return type === 'select' || type === 'dropdown' || type === 'month';
  }

  private normalizeField(field: ChecklistField): ChecklistField {
    const options = this.fieldUsesOptions(field.type)
      ? this.normalizeOptions(field.options)
      : undefined;

    return {
      key: field.key.trim() || crypto.randomUUID(),
      label: field.label.trim(),
      type: field.type,
      required: field.required === true,
      placeholder: field.placeholder?.trim() || undefined,
      options,
      observation: this.normalizeObservation(field, options),
      layout: field.layout === 'half' ? 'half' : 'full'
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

    const normalized: FieldObservationConfig = {
      enabled: true,
      label: observation.label?.trim() || 'Observaciones',
      placeholder: observation.placeholder?.trim() || undefined,
      required: observation.required === true
    };

    if (field.type === 'select') {
      normalized.triggerValue =
        observation.triggerValue && options?.includes(observation.triggerValue)
          ? observation.triggerValue
          : this.getDefaultTrigger(options);
    }

    return normalized;
  }

  private normalizeOptions(options: string[] | undefined): string[] {
    return [...new Set((options ?? []).map(option => option.trim()).filter(Boolean))];
  }

  private getDefaultTrigger(options: string[] | undefined): string {
    return options?.find(option => option.trim().toUpperCase() === 'NO')
      ?? options?.[0]
      ?? '';
  }

  private isFieldType(value: unknown): value is FieldType {
    const allowedTypes: readonly FieldType[] = [
      'text',
      'textarea',
      'number',
      'date',
      'checkbox',
      'select',
      'dropdown',
      'month'
    ];

    return typeof value === 'string' && allowedTypes.includes(value as FieldType);
  }

  private parseDefinition(definitionJson: string): ChecklistDefinition {
    let parsed: unknown;
    try {
      parsed = JSON.parse(definitionJson);
    } catch {
      throw new Error(
        'La definición guardada de la plantilla no contiene un JSON válido.'
      );
    }

    if (!this.isChecklistDefinition(parsed)) {
      throw new Error('La definición guardada no tiene la estructura esperada.');
    }
    return parsed;
  }

  private isChecklistDefinition(value: unknown): value is ChecklistDefinition {
    if (typeof value !== 'object' || value === null) {
      return false;
    }
    return Array.isArray((value as { sections?: unknown }).sections);
  }

  private normalizeSearchText(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  private getErrorMessage(error: unknown, fallbackMessage: string): string {
    if (error instanceof SyntaxError) {
      return (
        'El contenido no contiene un JSON válido. ' +
        'Revisa las comas, comillas, corchetes y llaves.'
      );
    }
    return error instanceof Error ? error.message : fallbackMessage;
  }
}
