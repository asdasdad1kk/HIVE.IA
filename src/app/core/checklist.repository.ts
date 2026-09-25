import { Injectable } from '@angular/core';
import {
  ChecklistSubmission,
  ChecklistSubmissionInput,
  ChecklistTemplate,
  ChecklistTemplateInput,
  DashboardStats,
  DatabaseOperationResult
} from './models';

@Injectable({ providedIn: 'root' })
export class ChecklistRepository {
  private get api(): NonNullable<Window['checklistApi']> {
    const api = window.checklistApi;

    if (!api) {
      throw new Error(
        'La API de Electron no está disponible. Ejecuta la aplicación con npm run desktop.'
      );
    }

    return api;
  }

  listTemplates(): Promise<ChecklistTemplate[]> {
    return this.api.templates.list();
  }

  getTemplate(id: number): Promise<ChecklistTemplate | null> {
    return this.api.templates.get(id);
  }

  createTemplate(input: ChecklistTemplateInput): Promise<ChecklistTemplate> {
    return this.api.templates.create(input);
  }

  updateTemplate(
    id: number,
    input: ChecklistTemplateInput
  ): Promise<ChecklistTemplate> {
    return this.api.templates.update(id, input);
  }

  deleteTemplate(id: number): Promise<DatabaseOperationResult> {
    return this.api.templates.remove(id);
  }

  listSubmissions(): Promise<ChecklistSubmission[]> {
    return this.api.submissions.list();
  }

  getSubmission(id: number): Promise<ChecklistSubmission | null> {
    return this.api.submissions.get(id);
  }

  createSubmission(
    input: ChecklistSubmissionInput
  ): Promise<ChecklistSubmission> {
    return this.api.submissions.create(input);
  }

  updateSubmission(
    id: number,
    input: ChecklistSubmissionInput
  ): Promise<ChecklistSubmission> {
    return this.api.submissions.update(id, input);
  }

  deleteSubmission(id: number): Promise<DatabaseOperationResult> {
    return this.api.submissions.remove(id);
  }

  stats(): Promise<DashboardStats> {
    return this.api.dashboard.stats();
  }

  getDatabasePath(): Promise<string> {
    return this.api.system.databasePath();
  }
}
