import {
  ChecklistSubmission,
  ChecklistSubmissionInput,
  ChecklistTemplate,
  ChecklistTemplateInput,

  DashboardStats,
  DatabaseOperationResult,
  UserCredentials
} from '../core/models';

export interface ChecklistElectronApi {
  templates: {
    list(): Promise<ChecklistTemplate[]>;

    get(
      id: number
    ): Promise<ChecklistTemplate | null>;

    create(
      input: ChecklistTemplateInput
    ): Promise<ChecklistTemplate>;

    update(
      id: number,
      input: ChecklistTemplateInput
    ): Promise<ChecklistTemplate>;

    remove(
      id: number
    ): Promise<DatabaseOperationResult>;
  };

  submissions: {
    list(): Promise<ChecklistSubmission[]>;

    get(
      id: number
    ): Promise<ChecklistSubmission | null>;

    create(
      input: ChecklistSubmissionInput
    ): Promise<ChecklistSubmission>;

    update(
      id: number,
      input: ChecklistSubmissionInput
    ): Promise<ChecklistSubmission>;

    remove(
      id: number
    ): Promise<DatabaseOperationResult>;
  };

  dashboard: {
    stats(): Promise<DashboardStats>;
  };

  system: {
    databasePath(): Promise<string>;
    getCredentials():Promise<UserCredentials>;
  };
  windowControls: {
  minimize(): Promise<void>;

  toggleMaximize(): Promise<boolean>;

  close(): Promise<void>;

  isMaximized(): Promise<boolean>;

  onMaximizedChange(
    callback: (
      isMaximized: boolean
    ) => void
  ): () => void;
};

copilot: {

  toggle(): Promise<boolean>;

  isOpen(): Promise<boolean>;

  reload(): Promise<void>;

  openExternal(): Promise<void>;

  clearSession(): Promise<boolean>;

  setTheme(
    theme: 'dark' | 'light'
  ): Promise<void>;

  onStateChange(
    callback: (
      isOpen: boolean
    ) => void
  ): () => void;

};
mail: {

  sendActionPlanMinute(
    payload:
      ActionPlanMinutePayload
  ): Promise<boolean>;

};
zoom: {

  set(
    factor: number
  ): Promise<void>;

};
}

declare global {
  interface Window {
    checklistApi?: ChecklistElectronApi;
  }
}

export {};