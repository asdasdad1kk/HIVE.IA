export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'checkbox'
  | 'select'
  | 'dropdown'
  | 'month';

export type SubmissionStatus =
  | 'DRAFT'
  | 'COMPLETE'
  | 'CANCELLED';

export interface FieldObservationConfig {
  enabled: boolean;
  triggerValue?: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
}

export type FieldLayout = 'half' | 'full';

export interface ChecklistField {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  placeholder?: string;
  options?: string[];
  observation?: FieldObservationConfig;
  layout?: FieldLayout;
}

export interface FieldResponse {
  value: unknown;
  observation?: string;
}

export type RuleVariableOperation =
  | 'countEquals'
  | 'countNotEquals'
  | 'countAnswered'
  | 'countTotal';

export interface ChecklistRuleVariable {
  id: string;
  name: string;
  label: string;
  sectionId: string;
  operation: RuleVariableOperation;
  compareValue?: string;
}

export type ChecklistRuleFormat =
  | 'number'
  | 'decimal'
  | 'percentage';

export interface ChecklistCalculatedRule {
  id: string;
  name: string;
  label: string;
  formula: string;
  format: ChecklistRuleFormat;
  decimalPlaces?: number;
}

export interface ChecklistRules {
  variables: ChecklistRuleVariable[];
  calculations: ChecklistCalculatedRule[];
}

export interface ChecklistMatrixRow {
  key: string;
  label: string;
  legend?: string;
  required?: boolean;
}

export interface ChecklistFormSection {
  id: string;
  title: string;
  view?: 'form';
  fields: ChecklistField[];
}

export interface ChecklistMatrixSection {
  id: string;
  title: string;
  view: 'matrix';
  columns: string[];
  rows: ChecklistMatrixRow[];
}

/* =========================================================
   PLANES DE ACCIÓN
   ========================================================= */

export type ActionPlanMethodology =
  | 'FREE'
  | 'PDCA'
  | 'DMAIC';

export interface ActionPlanPhase {
  id: string;
  label: string;
  description?: string;
}

export interface ChecklistActionPlanSection {
  id: string;
  title: string;
  view: 'action-plan';

  methodology: ActionPlanMethodology;
  /** Correos configurados desde el editor de la plantilla. */
  involvedEmails?: string[];

  /**
   * FREE normalmente tendrá una sola fase.
   * PDCA tendrá PLAN, DO, CHECK y ACT.
   * DMAIC tendrá DEFINE, MEASURE, ANALYZE, IMPROVE y CONTROL.
   */
  phases: ActionPlanPhase[];

  /**
   * Permite comenzar con una o más filas vacías.
   */
  initialRows?: number;

  /**
   * Límites opcionales para evitar capturas accidentales excesivas.
   */
  minimumRows?: number;
  maximumRows?: number;

  /**
   * Reglas de validación al completar.
   */
  requireAction?: boolean;
  requireResponsible?: boolean;
  requireEcd?: boolean;
}

export type ChecklistSection =
  | ChecklistFormSection
  | ChecklistMatrixSection
  | ChecklistActionPlanSection;

export interface ChecklistDefinition {
  sections: ChecklistSection[];
  rules?: ChecklistRules;
}

export interface ActionPlanEcd {
  id: string;
  label: string;
  date: string;
  completed: boolean;
}

export interface ActionPlanRow {
  id: string;
  phaseId: string;

  /**
   * Cuando existe, esta fila es una subacción
   * de la acción indicada.
   */
  parentId?: string;

  action: string;
  responsibleEmail: string;
  ecds: ActionPlanEcd[];
  progress: number;
  observations: string;
}

export interface ActionPlanSectionValue {
  methodology: ActionPlanMethodology;
  involvedEmails: string[];
  rows: ActionPlanRow[];
}

export interface ActionPlanMinutePayload {
  templateId: number;
  templateName: string;
  submissionId: number | null;
  submittedBy: string;
  generatedAt: string;
  recipients: string[];
  subject: string;
  sections: Array<{
    sectionId: string;
    sectionTitle: string;
    methodology: ActionPlanMethodology;
    rows: ActionPlanRow[];
  }>;
  allData: Record<string, unknown>;
}

/* =========================================================
   PLANTILLAS Y SUBMISSIONS
   ========================================================= */

export interface ChecklistTemplateInput {
  name: string;
  description?: string;
  definition: ChecklistDefinition;
}

export interface ChecklistTemplate {
  id: number;
  name: string;
  description: string | null;
  definitionJson: string;
  version: number;
  isActive: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChecklistSubmissionInput {
  templateId: number;
  status: SubmissionStatus;
  submittedBy: string;
  data: Record<string, unknown>;
}

export interface ChecklistSubmission {
  id: number;
  templateId: number;
  templateName?: string;
  templateDefinitionJson?: string;
  status: SubmissionStatus;
  submittedBy: string | null;
  dataJson: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  templates: number;
  submissions: number;
  complete: number;
  drafts: number;
}

export interface DatabaseOperationResult {
  id?: number;
  changes: number;
}

export interface UserCredentials {
  email: string;
  name: string;
  username: string;
  employeeNumber?: string;
  computer: string;
  role: 'admin' | 'user';
}
