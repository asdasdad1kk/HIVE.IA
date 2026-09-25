import {
  Component,
  computed,
  inject,
  signal
} from '@angular/core';

import { RouterLink } from '@angular/router';
import { ExternalLink, LucideAngularModule, X } from 'lucide-angular';
import {
  ChecklistRepository
} from '../../core/checklist.repository';

import {
  ChecklistDefinition,
  ChecklistSubmission,
  SubmissionStatus
} from '../../core/models';

import {
  PageHeaderComponent
} from '../../shared/page-header.component';
import { sectionFields, sectionRows } from '../../core/checklist-section.utils';
import { Auth } from '../../core/services/auth';

interface TemplateHistoryGroup {
  templateId: number;
  templateName: string;
  submissions: ChecklistSubmission[];
  total: number;
  completed: number;
  drafts: number;
  cancelled: number;
}

interface ParsedSubmission {
  submission: ChecklistSubmission;
  responses: Record<string, unknown>;
}
interface ResponseColumn {
  key: string;
  label: string;
}

@Component({
  selector: 'app-submission-history',

  imports: [
    PageHeaderComponent,
    RouterLink,
    LucideAngularModule
  ],

  templateUrl:'./submission-history.page.html'
})
export class SubmissionHistoryPage {
  readonly ExternalLink = ExternalLink;
  readonly X = X;
  private readonly repository =
    inject(ChecklistRepository);
  readonly auth=inject(Auth)
  readonly submissions =
    signal<ChecklistSubmission[]>([]);

  readonly loading =
    signal(true);

  readonly errorMessage =
    signal<string | null>(null);

  readonly selectedTemplateId =
    signal<number | null>(null);

  readonly templateGroups =
    computed<TemplateHistoryGroup[]>(() => {
      const groups =
        new Map<number, TemplateHistoryGroup>();

      for (const submission of this.submissions()) {
        const group =
          groups.get(submission.templateId);

        if (group) {
          group.submissions.push(submission);
          group.total += 1;

          if (submission.status === 'COMPLETE') {
            group.completed += 1;
          }

          if (submission.status === 'DRAFT') {
            group.drafts += 1;
          }

          if (submission.status === 'CANCELLED') {
            group.cancelled += 1;
          }

          continue;
        }

        groups.set(
          submission.templateId,
          {
            templateId: submission.templateId,

            templateName:
              submission.templateName ||
              `Plantilla ${submission.templateId}`,

            submissions: [
              submission
            ],

            total: 1,

            completed:
              submission.status === 'COMPLETE'
                ? 1
                : 0,

            drafts:
              submission.status === 'DRAFT'
                ? 1
                : 0,

            cancelled:
              submission.status === 'CANCELLED'
                ? 1
                : 0
          }
        );
      }

      return Array
        .from(groups.values())
        .sort(
          (first, second) =>
            first.templateName.localeCompare(
              second.templateName
            )
        );
    });

  readonly selectedTemplateGroup =
    computed<TemplateHistoryGroup | null>(() => {
      const selectedId =
        this.selectedTemplateId();

      if (selectedId === null) {
        return null;
      }

      return (
        this.templateGroups().find(
          group =>
            group.templateId === selectedId
        ) ?? null
      );
    });

  readonly parsedSubmissions =
    computed<ParsedSubmission[]>(() => {
      const selectedGroup =
        this.selectedTemplateGroup();

      if (!selectedGroup) {
        return [];
      }

      return selectedGroup.submissions.map(
        submission => ({
          submission,

          responses:
            this.parseResponses(
              submission.dataJson
            )
        })
      );
    });

  readonly responseColumns =
  computed<ResponseColumn[]>(() => {
    const selectedGroup =
      this.selectedTemplateGroup();

    if (!selectedGroup) {
      return [];
    }

    const columns =
      new Map<string, ResponseColumn>();

    const firstSubmission =
      selectedGroup.submissions[0];

    const fieldLabels =
      this.getFieldLabels(
        firstSubmission?.templateDefinitionJson
      );

    for (
      const row
      of this.parsedSubmissions()
    ) {
      for (
        const key
        of Object.keys(row.responses)
      ) {
        if (!columns.has(key)) {
          columns.set(
            key,
            {
              key,

              label:
                fieldLabels.get(key) ??
                this.formatColumnName(key)
            }
          );
        }
      }
    }

    return Array.from(
      columns.values()
    );
  });
  private isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}
private getFieldLabels(
  definitionJson: string | null | undefined
): Map<string, string> {
  const fieldLabels =
    new Map<string, string>();

  if (!definitionJson) {
    return fieldLabels;
  }

  try {
    const parsed: unknown =
      JSON.parse(definitionJson);

    if (
      !this.isRecord(parsed) ||
      !Array.isArray(parsed['sections'])
    ) {
      return fieldLabels;
    }

    const definition = parsed as unknown as ChecklistDefinition;

    for (
      const section of
      definition.sections
    ) {
      for (
        const field of
        sectionFields(section)
      ) {
        fieldLabels.set(
          field.key,
          field.label
        );

        if (
          field.observation?.enabled
        ) {
          fieldLabels.set(
            `${field.key}_observation`,
            field.observation.label?.trim() ||
              `Observación de ${field.label}`
          );
        }
      }

      for (
        const row of
        sectionRows(section)
      ) {
        fieldLabels.set(
          row.key,
          row.label
        );
      }
    }

    const calculations =
      definition.rules?.calculations ?? [];

    for (
      const calculation of
      calculations
    ) {
      fieldLabels.set(
        `calculated_${calculation.name}`,
        calculation.label
      );
    }

    const variables =
      definition.rules?.variables ?? [];

    for (
      const variable of variables
    ) {
      fieldLabels.set(
        `calculated_${variable.name}`,
        variable.label
      );
    }
  } catch (error: unknown) {
    console.error(
      'No se pudo leer la definición de la plantilla:',
      error
    );
  }

  return fieldLabels;
}

  constructor() {
    void this.load();
  }

  selectTemplate(
    templateId: number
  ): void {
    this.selectedTemplateId.set(
      templateId
    );
  }

  clearSelection(): void {
    this.selectedTemplateId.set(null);
  }

  statusLabel(
    status: SubmissionStatus
  ): string {
    switch (status) {
      case 'COMPLETE':
        return 'Completado';

      case 'DRAFT':
        return 'Borrador';

      case 'CANCELLED':
        return 'Cancelado';
    }
  }

  formatColumnName(
    column: string
  ): string {
    return column
      .replace(
        /([a-z])([A-Z])/g,
        '$1 $2'
      )
      .replace(
        /[_-]+/g,
        ' '
      )
      .replace(
        /^\w/,
        character =>
          character.toUpperCase()
      );
  }

  formatValue(
    value: unknown
  ): string {
    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {
      return 'Sin respuesta';
    }

    if (typeof value === 'boolean') {
      return value
        ? 'Sí'
        : 'No';
    }

    if (typeof value === 'object') {
      return JSON.stringify(
        value,
        null,
        2
      );
    }

    return String(value);
  }

  formatDate(
    value: string
  ): string {
    if (!value) {
      return 'Sin fecha';
    }

    const normalized =
      value.includes('T')
        ? value
        : `${value.replace(' ', 'T')}Z`;

    const date =
      new Date(normalized);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return value;
    }

    return new Intl.DateTimeFormat(
      'es-MX',
      {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }
    ).format(date);
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set(null);

    try {
      const submissions =
        await this.repository.listSubmissions();

      this.submissions.set(submissions);

      if (submissions.length > 0) {
        this.selectedTemplateId.set(
          submissions[0].templateId
        );
      }
    } catch (error: unknown) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : 'No se pudo cargar el historial.'
      );
    } finally {
      this.loading.set(false);
    }
  }

  private parseResponses(
    dataJson: string
  ): Record<string, unknown> {
    if (!dataJson) {
      return {};
    }

    try {
      const parsed: unknown =
        JSON.parse(dataJson);

      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        !Array.isArray(parsed)
      ) {
        return parsed as Record<
          string,
          unknown
        >;
      }

      return {
        respuesta: parsed
      };
    } catch {
      return {
        respuesta: dataJson
      };
    }
  }
}
