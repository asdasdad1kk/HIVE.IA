import {
  Component,
  computed,
  inject,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogRef } from '@angular/cdk/dialog';
import {
  Bot,
  Check,
  Clipboard,
  FileJson2,
  Lightbulb,
  Sparkles,
  Upload,
  WandSparkles,
  X
} from 'lucide-angular';
import { LucideAngularModule } from 'lucide-angular';

import {
  ActionPlanMethodology,
  ActionPlanTemplateRow,
  ChecklistActionPlanSection,
  ChecklistDefinition,
  ChecklistField,
  ChecklistMatrixRow,
  ChecklistMatrixSection,
  ChecklistRules,
  ChecklistSection,
  ChecklistTemplateInput,
  FieldLayout,
  FieldObservationConfig,
  FieldType,
  RuleVariableOperation,
  ChecklistRuleFormat
} from '../../../../core/models';
import {
  isActionPlanSection,
  isMatrixSection,
  sectionItemCount
} from '../../../../core/checklist-section.utils';

interface ValidationIssue {
  id: string;
  location: string;
  problem: string;
  solution: string;
}

interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  template: ChecklistTemplateInput | null;
}

type DialogTab = 'import' | 'ai';
type TemplateMode = 'form' | 'matrix' | 'mixed' | 'action-plan';

@Component({
  selector: 'app-template-import-dialog',
  imports: [FormsModule, LucideAngularModule],
  templateUrl: './template-import-dialog.html'
})
export class TemplateImportDialogComponent {
  private readonly dialogRef = inject(
    DialogRef<ChecklistTemplateInput | undefined>
  );

  readonly Bot = Bot;
  readonly Check = Check;
  readonly Clipboard = Clipboard;
  readonly FileJson2 = FileJson2;
  readonly Lightbulb = Lightbulb;
  readonly Sparkles = Sparkles;
  readonly Upload = Upload;
  readonly WandSparkles = WandSparkles;
  readonly X = X;

  readonly activeTab = signal<DialogTab>('import');
  readonly dragging = signal(false);
  readonly selectedFileName = signal<string | null>(null);
  readonly jsonText = signal('');
  readonly copiedPrompt = signal(false);
  readonly copiedDebugPrompt = signal(false);

  readonly aiRequest = signal('');
  readonly aiMode = signal<TemplateMode>('mixed');
  readonly includeRules = signal(true);
  readonly includeObservations = signal(true);

  readonly validation = computed<ValidationResult>(() =>
    this.validateJson(this.jsonText())
  );

  readonly totalItems = computed(() => {
    const template = this.validation().template;

    if (!template) {
      return 0;
    }

    return template.definition.sections.reduce(
      (total, section) => total + sectionItemCount(section),
      0
    );
  });

  readonly matrixCount = computed(() =>
    this.validation().template?.definition.sections.filter(
      section => isMatrixSection(section)
    ).length ?? 0
  );

  readonly formCount = computed(() =>
    this.validation().template?.definition.sections.filter(
      section => !isMatrixSection(section) && !isActionPlanSection(section)
    ).length ?? 0
  );
  readonly actionPlanCount = computed(() =>
    this.validation().template?.definition.sections.filter(
      section => isActionPlanSection(section)
    ).length ?? 0
  );

  setActiveTab(tab: DialogTab): void {
    this.activeTab.set(tab);
  }

  cancel(): void {
    this.dialogRef.close();
  }

  importTemplate(): void {
    const result = this.validation();

    if (!result.valid || !result.template) {
      return;
    }

    this.dialogRef.close(result.template);
  }

  openFilePicker(fileInput: HTMLInputElement): void {
    fileInput.click();
  }

  handleFileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.item(0);

    if (file) {
      void this.readFile(file);
    }

    input.value = '';
  }

  handleDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragging.set(true);

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
  }

  handleDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragging.set(false);
  }

  handleDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragging.set(false);

    const file = event.dataTransfer?.files.item(0);

    if (file) {
      void this.readFile(file);
    }
  }

  updateJson(value: string): void {
    this.jsonText.set(value);
    this.selectedFileName.set(null);
  }

  clearJson(): void {
    this.jsonText.set('');
    this.selectedFileName.set(null);
  }

  formatJson(): void {
    try {
      const parsed: unknown = JSON.parse(this.jsonText());
      this.jsonText.set(JSON.stringify(parsed, null, 2));
    } catch {
      // La validación visible explica el error de sintaxis.
    }
  }

  useExample(): void {
    this.jsonText.set(
      JSON.stringify(this.createExample(), null, 2)
    );
    this.selectedFileName.set('ejemplo-checklist.json');
    this.activeTab.set('import');
  }

  async generateAiPrompt(): Promise<void> {
    const request = this.aiRequest().trim();

    if (!request) {
      return;
    }

    await this.copyText(
      this.buildAiPrompt(request),
      this.copiedPrompt
    );
  }

  async copyDebugPrompt(): Promise<void> {
    const issues = this.validation().issues;

    if (issues.length === 0) {
      return;
    }

    const prompt = [
      'Corrige el siguiente JSON de una plantilla de checklist.',
      'Devuelve únicamente el JSON corregido, sin Markdown ni explicación.',
      '',
      'ERRORES DETECTADOS:',
      ...issues.map(
        (issue, index) =>
          `${index + 1}. ${issue.location}: ${issue.problem} Solución esperada: ${issue.solution}`
      ),
      '',
      'JSON A CORREGIR:',
      this.jsonText()
    ].join('\n');

    await this.copyText(prompt, this.copiedDebugPrompt);
  }

  issueSummary(issue: ValidationIssue): string {
    return `${issue.location}: ${issue.problem}`;
  }

  getFieldCount(definition: ChecklistDefinition): number {
    return definition.sections.reduce(
      (total, section) => total + sectionItemCount(section),
      0
    );
  }

  private async copyText(
    text: string,
    state: ReturnType<typeof signal<boolean>>
  ): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      state.set(true);
      window.setTimeout(() => state.set(false), 1800);
    } catch {
      state.set(false);
    }
  }

  private buildAiPrompt(request: string): string {
    return this.aiMode() === 'action-plan'
      ? this.buildActionPlanPrompt(request)
      : this.buildChecklistPrompt(request);
  }

  private buildChecklistPrompt(request: string): string {
    const modeInstruction = {
      form: 'Genera exclusivamente secciones view="form".',
      matrix: 'Genera principalmente secciones view="matrix"; usa form solo para encabezados/datos generales visibles.',
      mixed: 'Combina form y matrix respetando exactamente la organización del documento.'
    }[this.aiMode() as 'form' | 'matrix' | 'mixed'];

    return [
      'TAREA CRÍTICA DE MIGRACIÓN: convierte TODA la información de las imágenes, capturas de Excel o documentos adjuntos en una plantilla de HIVE AI Checklist Studio.',
      '',
      'ENTREGA OBLIGATORIA Y PRIORIDAD MÁXIMA:',
      '1. DEBES crear y adjuntar un archivo descargable llamado checklist-template.json.',
      '2. El archivo DEBE contener JSON UTF-8 válido y completo.',
      '3. NO entregues solamente una explicación, vista previa, resumen o bloque Markdown.',
      '4. Si la interfaz impide adjuntar archivos, devuelve como única salida el JSON completo sin ``` y sin texto antes o después.',
      '5. No concluyas la tarea hasta haber verificado que el archivo contiene todas las preguntas visibles.',
      '',
      'SOLICITUD:',
      request,
      '',
      'MODO:',
      modeInstruction,
      this.includeObservations()
        ? 'Se permite observation solo para capturar justificaciones adicionales.'
        : 'No agregues observation.',
      this.includeRules()
        ? 'Se permiten rules solo si hay cálculos explícitos o claramente visibles.'
        : 'No agregues definition.rules.',
      '',
      'PROTOCOLO OBLIGATORIO DE COBERTURA:',
      '- Revisa cada imagen de izquierda a derecha y de arriba abajo, celda por celda.',
      '- Antes de producir el JSON, crea internamente un inventario numerado de TODAS las preguntas, filas, encabezados, ayudas, referencias, opciones y fórmulas visibles.',
      '- Después compara internamente ese inventario contra el JSON. Cada elemento capturable debe aparecer exactamente una vez.',
      '- No agrupes, resumas, combines ni omitas preguntas aunque parezcan repetidas. Conserva las repeticiones si pertenecen a áreas, fases o secciones distintas.',
      '- Si hay varias imágenes, procesa TODAS. No te detengas después de la primera.',
      '- Conserva el orden del Excel o formulario original.',
      '- Si una parte no es legible, conserva el texto legible y marca el resto como [ILEGIBLE]; no inventes.',
      '- Los textos auxiliares de formulario van en field.placeholder.',
      '- Los criterios, ayudas o referencias de una fila de matriz van en row.legend.',
      '- Conserva literalmente números de procedimiento, WI, SOP, revisiones, especificaciones y referencias.',
      '',
      'ESQUEMA EXACTO:',
      '{"name":"...","description":"...","definition":{"sections":[]}}',
      'FORM: {"id":"kebab-case","title":"...","view":"form","fields":[]}',
      'FIELD: {"key":"kebab-case-globalmente-unica","label":"...","type":"text|textarea|number|date|checkbox|select|dropdown|month","required":true|false,"layout":"half|full","placeholder":"texto de ayuda opcional","options":["..."],"observation":{"enabled":true,"triggerValue":"NO","label":"Observaciones","placeholder":"...","required":false}}',
      'MATRIX: {"id":"kebab-case","title":"...","view":"matrix","columns":["SI","NO","N/A"],"rows":[]}',
      'MATRIX ROW: {"key":"kebab-case-globalmente-unica","label":"...","legend":"criterio o referencia opcional","required":true|false}',
      '',
      'REGLAS ESTRICTAS:',
      '- No uses propiedades distintas de las anteriores.',
      '- Todos los ids y keys son únicos y en kebab-case.',
      '- select, dropdown y month requieren options no vacías.',
      '- month usa Enero a Diciembre.',
      '- No uses legend en fields; el texto de ayuda del formulario se almacena en placeholder.',
      '- No uses view="action-plan" en este modo.',
      '- No uses null, undefined, NaN ni comentarios.',
      '',
      'CONTROL FINAL OBLIGATORIO:',
      '- JSON.parse debe funcionar.',
      '- El número de preguntas/filas del JSON debe coincidir con el inventario interno de elementos visibles.',
      '- Verifica nuevamente todas las imágenes antes de adjuntar checklist-template.json.',
      '',
      'EJEMPLO DE ESTRUCTURA VÁLIDA:',
      JSON.stringify(this.createCompactExample()),
      '',
      'ENTREGA AHORA EL ARCHIVO checklist-template.json.'
    ].join('\n');
  }

  private buildActionPlanPrompt(request: string): string {
    return [
      'TAREA CRÍTICA DE MIGRACIÓN: convierte TODAS las filas visibles de las fotos o capturas de Excel en un plan de acción YA LLENO para HIVE AI Checklist Studio.',
      '',
      'ENTREGA OBLIGATORIA Y PRIORIDAD MÁXIMA:',
      '1. DEBES crear y adjuntar un archivo descargable llamado checklist-template.json.',
      '2. No entregues un plan vacío, un ejemplo parcial, una explicación ni solamente la estructura.',
      '3. Cada fila de acción visible en Excel DEBE convertirse en un objeto dentro de initialActions.',
      '4. Si la interfaz impide adjuntar archivos, devuelve únicamente el JSON completo sin Markdown.',
      '',
      'SOLICITUD:',
      request,
      '',
      'PROTOCOLO DE EXTRACCIÓN OBLIGATORIO:',
      '- Revisa todas las imágenes, de izquierda a derecha y de arriba abajo, fila por fila y celda por celda.',
      '- Construye internamente un inventario de todas las acciones y subacciones antes de generar el JSON.',
      '- No omitas filas en blanco parcial si contienen acción, responsable, fecha, avance u observación.',
      '- Conserva exactamente el texto de acción y observaciones.',
      '- Convierte porcentajes como 25%, 0.25 o 25 a un entero progress entre 0 y 100.',
      '- Convierte fechas a YYYY-MM-DD cuando sean legibles. Si no son legibles usa cadena vacía.',
      '- Si Excel muestra numeración 1.1, 1.2, etc., crea parentId apuntando al id de la acción padre.',
      '- Si no hay jerarquía visible, no agregues parentId.',
      '- Detecta la fase por encabezado o columna. Para PDCA usa plan/do/check/act; para DMAIC usa define/measure/analyze/improve/control; para FREE usa general.',
      '- No inventes responsables ni correos.',
      '',
      'INVOLUCRADOS Y RESPONSABLES:',
      '- involvedEmails debe contener todos los correos únicos proporcionados por el usuario o legibles en el documento.',
      '- responsibleEmail DEBE ser uno de los valores exactos de involvedEmails para que aparezca preseleccionado en el selector.',
      '- Si únicamente aparece un nombre sin correo, no inventes correo: deja responsibleEmail vacío.',
      '- Si el usuario proporciona una tabla nombre-correo, usa esa correspondencia en todas las acciones.',
      '- Incluye también involucrados que no tengan todavía una acción asignada.',
      '',
      'ESQUEMA EXACTO:',
      '{"name":"...","description":"...","definition":{"sections":[{"id":"plan-accion","title":"...","view":"action-plan","methodology":"FREE|PDCA|DMAIC","involvedEmails":["correo@empresa.com"],"phases":[{"id":"general","label":"Acciones","description":"..."}],"initialRows":0,"minimumRows":0,"maximumRows":100,"requireAction":true,"requireResponsible":true,"requireEcd":true,"initialActions":[]}]}}',
      '',
      'INITIAL ACTION:',
      '{"id":"accion-1","phaseId":"general","action":"Texto completo","responsibleEmail":"correo@empresa.com","ecds":[{"label":"ECD1","date":"2026-09-30","completed":false}],"progress":25,"observations":"..."}',
      'SUBACTION:',
      '{"id":"accion-1-1","parentId":"accion-1","phaseId":"general","action":"Subacción completa","responsibleEmail":"correo@empresa.com","ecds":[{"label":"ECD1","date":"","completed":false}],"progress":0,"observations":""}',
      '',
      'REGLAS ESTRICTAS DE DATOS:',
      '- initialActions debe contener TODAS las acciones y subacciones visibles, no filas vacías de ejemplo.',
      '- Cada id de initialActions debe ser único, estable y en kebab-case.',
      '- parentId debe coincidir exactamente con el id de una acción principal del mismo plan.',
      '- phaseId debe coincidir exactamente con una fase declarada.',
      '- ecds siempre es una lista. Crea una entrada por cada fecha ECD visible.',
      '- action, responsibleEmail, observations y date siempre son strings.',
      '- progress siempre es número entero 0..100.',
      '- completed siempre es boolean.',
      '- initialRows debe ser 0 cuando initialActions tenga contenido para evitar filas vacías adicionales.',
      '- maximumRows debe ser mayor o igual al total de initialActions y permitir crecimiento futuro.',
      '- No agregues fields, columns, matrix rows ni definition.rules.',
      '',
      'METODOLOGÍAS:',
      '- FREE: fase general.',
      '- PDCA: fases plan, do, check, act.',
      '- DMAIC: fases define, measure, analyze, improve, control.',
      '- Usa la metodología solicitada o visible. Si no existe evidencia, usa FREE.',
      '',
      'CONTROL FINAL OBLIGATORIO:',
      '- JSON.parse debe funcionar.',
      '- El conteo de initialActions debe coincidir con el inventario interno de filas de Excel.',
      '- Cada responsibleEmail no vacío debe existir en involvedEmails.',
      '- Cada parentId y phaseId debe apuntar a un id válido.',
      '- Revisa todas las imágenes una segunda vez antes de adjuntar el archivo.',
      '',
      'EJEMPLO VÁLIDO:',
      JSON.stringify(this.createFilledActionPlanExample()),
      '',
      'ENTREGA AHORA EL ARCHIVO checklist-template.json.'
    ].join('\n');
  }

  private async readFile(file: File): Promise<void> {
    if (!file.name.toLowerCase().endsWith('.json')) {
      this.jsonText.set('');
      this.selectedFileName.set('El archivo debe tener extensión .json');
      return;
    }

    try {
      this.jsonText.set(await file.text());
      this.selectedFileName.set(file.name);
      this.activeTab.set('import');
    } catch {
      this.jsonText.set('');
      this.selectedFileName.set('No se pudo leer el archivo');
    }
  }

  private validateJson(jsonText: string): ValidationResult {
    if (!jsonText.trim()) {
      return this.invalid([
        this.issue(
          'Contenido',
          'No hay JSON para revisar.',
          'Pega el resultado generado por la IA o selecciona un archivo .json.'
        )
      ]);
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(jsonText);
    } catch (error: unknown) {
      return this.invalid([
        this.issue(
          'Sintaxis JSON',
          this.getJsonSyntaxError(error),
          'Pide a la IA que devuelva solo JSON válido, sin ```json, comentarios ni texto antes o después.'
        )
      ]);
    }

    if (!this.isObject(parsed)) {
      return this.invalid([
        this.issue(
          'Raíz del documento',
          'El contenido principal no es un objeto JSON.',
          'La raíz debe iniciar con { y contener name, description y definition.'
        )
      ]);
    }

    const issues: ValidationIssue[] = [];
    const name = parsed['name'];
    const description = parsed['description'];
    const definitionValue = parsed['definition'];

    if (typeof name !== 'string' || !name.trim()) {
      issues.push(this.issue(
        'Plantilla > name',
        'Falta el nombre de la plantilla.',
        'Agrega "name": "Nombre de la plantilla".'
      ));
    }

    if (description !== undefined && typeof description !== 'string') {
      issues.push(this.issue(
        'Plantilla > description',
        'La descripción no es texto.',
        'Usa texto entre comillas o elimina la propiedad description.'
      ));
    }

    if (!this.isObject(definitionValue)) {
      issues.push(this.issue(
        'Plantilla > definition',
        'Falta el objeto definition.',
        'Agrega "definition": { "sections": [] }.'
      ));
      return this.invalid(issues);
    }

    const sectionsValue = definitionValue['sections'];

    if (!Array.isArray(sectionsValue) || sectionsValue.length === 0) {
      issues.push(this.issue(
        'definition > sections',
        'No existe una lista de secciones válida o está vacía.',
        'Agrega al menos una sección de formulario o matriz dentro de sections.'
      ));
      return this.invalid(issues);
    }

    const sections: ChecklistSection[] = [];
    const usedKeys = new Set<string>();
    const usedSectionIds = new Set<string>();

    sectionsValue.forEach((sectionValue, index) => {
      const section = this.validateSection(
        sectionValue,
        index,
        issues,
        usedKeys,
        usedSectionIds
      );

      if (section) {
        sections.push(section);
      }
    });

    const rules = this.validateRules(
      definitionValue['rules'],
      sections,
      issues
    );

    if (issues.length > 0 || typeof name !== 'string' || !name.trim()) {
      return this.invalid(issues);
    }

    const definition: ChecklistDefinition = {
      sections,
      ...(rules ? { rules } : {})
    };

    return {
      valid: true,
      issues: [],
      template: {
        name: name.trim(),
        description:
          typeof description === 'string' && description.trim()
            ? description.trim()
            : undefined,
        definition
      }
    };
  }

  private validateSection(
    value: unknown,
    sectionIndex: number,
    issues: ValidationIssue[],
    usedKeys: Set<string>,
    usedSectionIds: Set<string>
  ): ChecklistSection | null {
    const location = `Sección ${sectionIndex + 1}`;

    if (!this.isObject(value)) {
      issues.push(this.issue(
        location,
        'La sección no es un objeto.',
        'Cada sección debe estar entre llaves { }.'
      ));
      return null;
    }

    const id = this.readRequiredText(
      value['id'],
      `${location} > id`,
      'Agrega un id único en kebab-case, por ejemplo "seguridad".',
      issues
    );
    const title = this.readRequiredText(
      value['title'],
      `${location} > title`,
      'Agrega un título visible para la sección.',
      issues
    );

    if (id) {
      if (usedSectionIds.has(id)) {
        issues.push(this.issue(
          `${location} > id`,
          `El id "${id}" está repetido.`,
          'Usa un id diferente para cada sección.'
        ));
      } else {
        usedSectionIds.add(id);
      }
    }

    const view = value['view'];
    if (view === 'action-plan') {
      return this.validateActionPlanSection(value, sectionIndex, id, title, issues);
    }
    if (view === 'matrix') {
      return this.validateMatrixSection(
        value,
        sectionIndex,
        id,
        title,
        issues,
        usedKeys
      );
    }

    return this.validateFormSection(
      value,
      sectionIndex,
      id,
      title,
      issues,
      usedKeys
    );
  }

  private validateFormSection(
    value: Record<string, unknown>,
    sectionIndex: number,
    id: string,
    title: string,
    issues: ValidationIssue[],
    usedKeys: Set<string>
  ): ChecklistSection | null {
    const location = `Sección ${sectionIndex + 1} > fields`;
    const fieldsValue = value['fields'];

    if (!Array.isArray(fieldsValue)) {
      issues.push(this.issue(
        location,
        'La sección de formulario no contiene fields.',
        'Agrega "view": "form" y "fields": [ ... ].'
      ));
      return null;
    }

    const fields: ChecklistField[] = [];

    fieldsValue.forEach((fieldValue, fieldIndex) => {
      const field = this.validateField(
        fieldValue,
        sectionIndex,
        fieldIndex,
        issues,
        usedKeys
      );

      if (field) {
        fields.push(field);
      }
    });

    if (!id || !title) {
      return null;
    }

    return {
      id,
      title,
      view: 'form',
      fields
    };
  }

  private validateActionPlanSection(
    value: Record<string, unknown>,
    sectionIndex: number,
    id: string,
    title: string,
    issues: ValidationIssue[]
  ): ChecklistActionPlanSection | null {
    const location = `Sección ${sectionIndex + 1} (plan de acción)`;
    const methodology = value['methodology'];
    if (!this.isActionPlanMethodology(methodology)) {
      issues.push(this.issue(`${location} > methodology`, 'Metodología inválida.', 'Usa FREE, PDCA o DMAIC.'));
      return null;
    }

    const phasesValue = value['phases'];
    if (!Array.isArray(phasesValue) || phasesValue.length === 0) {
      issues.push(this.issue(`${location} > phases`, 'El plan no contiene fases.', 'Agrega al menos una fase.'));
      return null;
    }
    const phases = phasesValue.flatMap((phaseValue, index) => {
      if (!this.isObject(phaseValue)) {
        issues.push(this.issue(`${location} > fase ${index + 1}`, 'La fase no es un objeto.', 'Usa id, label y description.'));
        return [];
      }
      const phaseId = this.text(phaseValue['id']);
      const label = this.text(phaseValue['label']);
      if (!phaseId || !label) {
        issues.push(this.issue(`${location} > fase ${index + 1}`, 'Falta id o label.', 'Agrega id y label a la fase.'));
        return [];
      }
      return [{ id: phaseId, label, description: this.text(phaseValue['description']) || undefined }];
    });
    const phaseIds = new Set(phases.map(phase => phase.id));

    const involvedEmails = this.readEmailArray(value['involvedEmails'], `${location} > involvedEmails`, issues);
    const involvedSet = new Set(involvedEmails);
    const actionsValue = value['initialActions'];
    const initialActions: ActionPlanTemplateRow[] = [];
    const actionIds = new Set<string>();

    if (actionsValue !== undefined && !Array.isArray(actionsValue)) {
      issues.push(this.issue(`${location} > initialActions`, 'initialActions no es una lista.', 'Usa un arreglo con las acciones migradas.'));
    }
    if (Array.isArray(actionsValue)) {
      actionsValue.forEach((rawAction, actionIndex) => {
        const actionLocation = `${location} > acción ${actionIndex + 1}`;
        if (!this.isObject(rawAction)) {
          issues.push(this.issue(actionLocation, 'La acción no es un objeto.', 'Usa id, phaseId, action, responsibleEmail, ecds, progress y observations.'));
          return;
        }
        const actionId = this.text(rawAction['id']);
        const phaseId = this.text(rawAction['phaseId']);
        const action = this.text(rawAction['action']);
        const parentId = this.text(rawAction['parentId']) || undefined;
        const responsibleEmail = this.text(rawAction['responsibleEmail']).toLowerCase();
        const observations = this.text(rawAction['observations']);
        const progressValue = rawAction['progress'];
        if (!actionId || actionIds.has(actionId)) {
          issues.push(this.issue(`${actionLocation} > id`, 'El id falta o está repetido.', 'Usa un id único en kebab-case.'));
        } else {
          actionIds.add(actionId);
        }
        if (!phaseIds.has(phaseId)) {
          issues.push(this.issue(`${actionLocation} > phaseId`, `La fase "${phaseId}" no existe.`, 'Usa un id declarado en phases.'));
        }
        if (!action) {
          issues.push(this.issue(`${actionLocation} > action`, 'La acción está vacía.', 'Transcribe el texto completo de la fila de Excel.'));
        }
        if (responsibleEmail && !involvedSet.has(responsibleEmail)) {
          issues.push(this.issue(`${actionLocation} > responsibleEmail`, 'El responsable no está en involvedEmails.', 'Agrega el correo a involvedEmails o deja responsibleEmail vacío.'));
        }
        if (typeof progressValue !== 'number' || !Number.isFinite(progressValue) || progressValue < 0 || progressValue > 100) {
          issues.push(this.issue(`${actionLocation} > progress`, 'El avance no está entre 0 y 100.', 'Usa un número entre 0 y 100.'));
        }
        const ecdsValue = rawAction['ecds'];
        if (!Array.isArray(ecdsValue)) {
          issues.push(this.issue(`${actionLocation} > ecds`, 'ecds no es una lista.', 'Usa una lista, aunque esté vacía.'));
        }
        const ecds = Array.isArray(ecdsValue)
          ? ecdsValue.flatMap((rawEcd, ecdIndex) => {
              if (!this.isObject(rawEcd)) {
                issues.push(this.issue(`${actionLocation} > ECD ${ecdIndex + 1}`, 'La ECD no es un objeto.', 'Usa label, date y completed.'));
                return [];
              }
              const date = this.text(rawEcd['date']);
              if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                issues.push(this.issue(`${actionLocation} > ECD ${ecdIndex + 1} > date`, 'La fecha no usa YYYY-MM-DD.', 'Convierte la fecha a YYYY-MM-DD.'));
              }
              return [{
                label: this.text(rawEcd['label']) || `ECD${ecdIndex + 1}`,
                date,
                completed: rawEcd['completed'] === true
              }];
            })
          : [];
        if (actionId && action && phaseIds.has(phaseId)) {
          initialActions.push({
            id: actionId,
            phaseId,
            parentId,
            action,
            responsibleEmail,
            ecds,
            progress: typeof progressValue === 'number' ? Math.round(progressValue) : 0,
            observations
          });
        }
      });
      for (const action of initialActions) {
        if (action.parentId && !actionIds.has(action.parentId)) {
          issues.push(this.issue(`${location} > acción ${action.id} > parentId`, `El padre "${action.parentId}" no existe.`, 'Usa el id de una acción principal existente.'));
        }
      }
    }

    const minimumRows = this.readNonNegativeInteger(value['minimumRows'], 0, `${location} > minimumRows`, issues);
    const maximumRows = this.readPositiveInteger(value['maximumRows'], Math.max(100, initialActions.length), `${location} > maximumRows`, issues);
    const initialRows = this.readNonNegativeInteger(value['initialRows'], initialActions.length > 0 ? 0 : 1, `${location} > initialRows`, issues);
    if (maximumRows < initialActions.length) {
      issues.push(this.issue(`${location} > maximumRows`, 'maximumRows es menor que initialActions.', 'Aumenta maximumRows para incluir todas las acciones.'));
    }

    if (!id || !title) return null;
    return {
      id, title, view: 'action-plan', methodology, involvedEmails, phases,
      initialRows, minimumRows, maximumRows,
      requireAction: value['requireAction'] !== false,
      requireResponsible: value['requireResponsible'] !== false,
      requireEcd: value['requireEcd'] === true,
      initialActions
    };
  }

  private validateMatrixSection(
    value: Record<string, unknown>,
    sectionIndex: number,
    id: string,
    title: string,
    issues: ValidationIssue[],
    usedKeys: Set<string>
  ): ChecklistMatrixSection | null {
    const location = `Sección ${sectionIndex + 1} (matriz)`;
    const columns = this.readStringArray(
      value['columns'],
      `${location} > columns`,
      'Agrega respuestas como ["SI", "NO", "N/A"].',
      issues
    );
    const rowsValue = value['rows'];

    if (!Array.isArray(rowsValue) || rowsValue.length === 0) {
      issues.push(this.issue(
        `${location} > rows`,
        'La matriz no contiene filas.',
        'Agrega al menos un objeto dentro de rows con key, label y required.'
      ));
      return null;
    }

    const rows: ChecklistMatrixRow[] = [];

    rowsValue.forEach((rowValue, rowIndex) => {
      const row = this.validateMatrixRow(
        rowValue,
        sectionIndex,
        rowIndex,
        issues,
        usedKeys
      );

      if (row) {
        rows.push(row);
      }
    });

    if (!id || !title || columns.length === 0) {
      return null;
    }

    return {
      id,
      title,
      view: 'matrix',
      columns,
      rows
    };
  }

  private validateMatrixRow(
    value: unknown,
    sectionIndex: number,
    rowIndex: number,
    issues: ValidationIssue[],
    usedKeys: Set<string>
  ): ChecklistMatrixRow | null {
    const location = `Sección ${sectionIndex + 1} > fila ${rowIndex + 1}`;

    if (!this.isObject(value)) {
      issues.push(this.issue(
        location,
        'La fila no es un objeto.',
        'Usa { "key": "...", "label": "...", "required": false }.'
      ));
      return null;
    }

    const key = this.readRequiredText(
      value['key'],
      `${location} > key`,
      'Agrega una key única en kebab-case.',
      issues
    );
    const label = this.readRequiredText(
      value['label'],
      `${location} > label`,
      'Agrega el texto visible del ítem.',
      issues
    );
    const legend = value['legend'];
    const required = value['required'];

    this.validateUniqueKey(key, location, usedKeys, issues);

    if (legend !== undefined && typeof legend !== 'string') {
      issues.push(this.issue(
        `${location} > legend`,
        'La leyenda no es texto.',
        'Usa texto entre comillas o elimina legend.'
      ));
    }

    if (required !== undefined && typeof required !== 'boolean') {
      issues.push(this.issue(
        `${location} > required`,
        'required no es verdadero o falso.',
        'Usa true o false sin comillas.'
      ));
    }

    if (!key || !label) {
      return null;
    }

    return {
      key,
      label,
      legend:
        typeof legend === 'string' && legend.trim()
          ? legend.trim()
          : undefined,
      required: required === true
    };
  }

  private validateField(
    value: unknown,
    sectionIndex: number,
    fieldIndex: number,
    issues: ValidationIssue[],
    usedKeys: Set<string>
  ): ChecklistField | null {
    const location = `Sección ${sectionIndex + 1} > campo ${fieldIndex + 1}`;

    if (!this.isObject(value)) {
      issues.push(this.issue(
        location,
        'El campo no es un objeto.',
        'Cada campo debe estar entre llaves { }.'
      ));
      return null;
    }

    const key = this.readRequiredText(
      value['key'],
      `${location} > key`,
      'Agrega una key única en kebab-case.',
      issues
    );
    const label = this.readRequiredText(
      value['label'],
      `${location} > label`,
      'Agrega el texto visible del campo.',
      issues
    );
    const type = value['type'];
    const required = value['required'];
    const placeholder = value['placeholder'];
    const layoutValue = value['layout'];

    this.validateUniqueKey(key, location, usedKeys, issues);

    if (!this.isFieldType(type)) {
      issues.push(this.issue(
        `${location} > type`,
        `El tipo "${String(type)}" no existe en el toolbox.`,
        'Usa text, textarea, number, date, checkbox, select, dropdown o month.'
      ));
    }

    if (required !== undefined && typeof required !== 'boolean') {
      issues.push(this.issue(
        `${location} > required`,
        'required no es verdadero o falso.',
        'Usa true o false sin comillas.'
      ));
    }

    if (placeholder !== undefined && typeof placeholder !== 'string') {
      issues.push(this.issue(
        `${location} > placeholder`,
        'placeholder no es texto.',
        'Usa texto entre comillas o elimina placeholder.'
      ));
    }

    if (
      layoutValue !== undefined &&
      layoutValue !== 'half' &&
      layoutValue !== 'full'
    ) {
      issues.push(this.issue(
        `${location} > layout`,
        'El ancho del campo no es válido.',
        'Usa "half" para media columna o "full" para una fila completa.'
      ));
    }

    if (!key || !label || !this.isFieldType(type)) {
      return null;
    }

    const field: ChecklistField = {
      key,
      label,
      type,
      required: required === true,
      layout: layoutValue === 'half' ? 'half' : 'full'
    };

    if (typeof placeholder === 'string' && placeholder.trim()) {
      field.placeholder = placeholder.trim();
    }

    if (this.fieldUsesOptions(type)) {
      const fallback = type === 'month' ? this.monthOptions() : [];
      field.options = this.readStringArray(
        value['options'] ?? fallback,
        `${location} > options`,
        type === 'month'
          ? 'Usa la lista de Enero a Diciembre.'
          : 'Agrega una lista de opciones, por ejemplo ["SI", "NO"].',
        issues
      );
    }

    const observation = this.validateObservation(
      value['observation'],
      field,
      location,
      issues
    );

    if (observation) {
      field.observation = observation;
    }

    return field;
  }

  private validateObservation(
    value: unknown,
    field: ChecklistField,
    location: string,
    issues: ValidationIssue[]
  ): FieldObservationConfig | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (!this.isObject(value)) {
      issues.push(this.issue(
        `${location} > observation`,
        'observation no es un objeto.',
        'Usa un objeto con enabled, label, placeholder, required y, para select, triggerValue.'
      ));
      return undefined;
    }

    if (value['enabled'] !== true) {
      return undefined;
    }

    const triggerValue = value['triggerValue'];

    if (
      field.type === 'select' &&
      (
        typeof triggerValue !== 'string' ||
        !field.options?.includes(triggerValue)
      )
    ) {
      issues.push(this.issue(
        `${location} > observation > triggerValue`,
        'El valor que activa la observación no existe en options.',
        'Usa exactamente una de las opciones configuradas en el campo.'
      ));
    }

    return {
      enabled: true,
      triggerValue:
        field.type === 'select' && typeof triggerValue === 'string'
          ? triggerValue
          : undefined,
      label:
        typeof value['label'] === 'string' && value['label'].trim()
          ? value['label'].trim()
          : 'Observaciones',
      placeholder:
        typeof value['placeholder'] === 'string' && value['placeholder'].trim()
          ? value['placeholder'].trim()
          : undefined,
      required: value['required'] === true
    };
  }

  private validateRules(
    value: unknown,
    sections: ChecklistSection[],
    issues: ValidationIssue[]
  ): ChecklistRules | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (!this.isObject(value)) {
      issues.push(this.issue(
        'definition > rules',
        'rules no es un objeto.',
        'Usa { "variables": [], "calculations": [] } o elimina rules.'
      ));
      return undefined;
    }

    const sectionIds = new Set(sections.map(section => section.id));
    const variablesValue = value['variables'];
    const calculationsValue = value['calculations'];
    const variables: ChecklistRules['variables'] = [];
    const calculations: ChecklistRules['calculations'] = [];

    if (variablesValue !== undefined && !Array.isArray(variablesValue)) {
      issues.push(this.issue(
        'definition > rules > variables',
        'variables no es una lista.',
        'Usa un arreglo [ ] de variables.'
      ));
    }

    if (calculationsValue !== undefined && !Array.isArray(calculationsValue)) {
      issues.push(this.issue(
        'definition > rules > calculations',
        'calculations no es una lista.',
        'Usa un arreglo [ ] de cálculos.'
      ));
    }

    if (Array.isArray(variablesValue)) {
      variablesValue.forEach((variableValue, index) => {
        if (!this.isObject(variableValue)) {
          issues.push(this.issue(
            `Regla > variable ${index + 1}`,
            'La variable no es un objeto.',
            'Usa id, name, label, sectionId, operation y compareValue cuando aplique.'
          ));
          return;
        }

        const name = this.text(variableValue['name']);
        const sectionId = this.text(variableValue['sectionId']);
        const operation = variableValue['operation'];

        if (!name) {
          issues.push(this.issue(
            `Regla > variable ${index + 1} > name`,
            'Falta el nombre usado por las fórmulas.',
            'Agrega un nombre como seguridad_si.'
          ));
        }

        if (!sectionIds.has(sectionId)) {
          issues.push(this.issue(
            `Regla > variable ${index + 1} > sectionId`,
            `La sección "${sectionId}" no existe.`,
            'Usa exactamente el id de una sección existente.'
          ));
        }

        if (!this.isRuleVariableOperation(operation)) {
          issues.push(this.issue(
            `Regla > variable ${index + 1} > operation`,
            'La operación no está soportada.',
            'Usa countEquals, countNotEquals, countAnswered o countTotal.'
          ));
          return;
        }

        variables.push({
          id: this.text(variableValue['id']) || crypto.randomUUID(),
          name,
          label: this.text(variableValue['label']) || name,
          sectionId,
          operation,
          compareValue: this.text(variableValue['compareValue']) || undefined
        });
      });
    }

    if (Array.isArray(calculationsValue)) {
      calculationsValue.forEach((calculationValue, index) => {
        if (!this.isObject(calculationValue)) {
          issues.push(this.issue(
            `Regla > cálculo ${index + 1}`,
            'El cálculo no es un objeto.',
            'Usa id, name, label, formula, format y decimalPlaces.'
          ));
          return;
        }

        const name = this.text(calculationValue['name']);
        const formula = this.text(calculationValue['formula']);
        const formatValue = calculationValue['format'];

        if (!name || !formula) {
          issues.push(this.issue(
            `Regla > cálculo ${index + 1}`,
            'Falta name o formula.',
            'Agrega un nombre único y una fórmula matemática escrita.'
          ));
        }

        if (!this.isRuleFormat(formatValue)) {
          issues.push(this.issue(
            `Regla > cálculo ${index + 1} > format`,
            'El formato no es válido.',
            'Usa number, decimal o percentage.'
          ));
          return;
        }

        calculations.push({
          id: this.text(calculationValue['id']) || crypto.randomUUID(),
          name,
          label: this.text(calculationValue['label']) || name,
          formula,
          format: formatValue,
          decimalPlaces:
            typeof calculationValue['decimalPlaces'] === 'number'
              ? Math.max(0, Math.min(6, Math.trunc(calculationValue['decimalPlaces'])))
              : 0
        });
      });
    }

    return variables.length || calculations.length
      ? { variables, calculations }
      : undefined;
  }

  private readEmailArray(value: unknown, location: string, issues: ValidationIssue[]): string[] {
    if (value === undefined) return [];
    if (!Array.isArray(value)) {
      issues.push(this.issue(location, 'El valor no es una lista.', 'Usa un arreglo de correos.'));
      return [];
    }
    const result: string[] = [];
    for (const raw of value) {
      const email = this.text(raw).toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        issues.push(this.issue(location, `El correo "${String(raw)}" no es válido.`, 'Usa correos completos.'));
      } else if (!result.includes(email)) {
        result.push(email);
      }
    }
    return result;
  }

  private readNonNegativeInteger(value: unknown, fallback: number, location: string, issues: ValidationIssue[]): number {
    if (value === undefined) return fallback;
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
      issues.push(this.issue(location, 'Debe ser un entero no negativo.', 'Usa 0 o un entero positivo.'));
      return fallback;
    }
    return value;
  }

  private readPositiveInteger(value: unknown, fallback: number, location: string, issues: ValidationIssue[]): number {
    if (value === undefined) return fallback;
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
      issues.push(this.issue(location, 'Debe ser un entero mayor que cero.', 'Usa un entero desde 1.'));
      return fallback;
    }
    return value;
  }

  private isActionPlanMethodology(value: unknown): value is ActionPlanMethodology {
    return value === 'FREE' || value === 'PDCA' || value === 'DMAIC';
  }

  private readRequiredText(
    value: unknown,
    location: string,
    solution: string,
    issues: ValidationIssue[]
  ): string {
    const result = this.text(value);

    if (!result) {
      issues.push(this.issue(
        location,
        'Falta un texto obligatorio.',
        solution
      ));
    }

    return result;
  }

  private readStringArray(
    value: unknown,
    location: string,
    solution: string,
    issues: ValidationIssue[]
  ): string[] {
    if (!Array.isArray(value)) {
      issues.push(this.issue(
        location,
        'El valor no es una lista.',
        solution
      ));
      return [];
    }

    const result = [...new Set(
      value.map(item => String(item).trim()).filter(Boolean)
    )];

    if (result.length === 0) {
      issues.push(this.issue(
        location,
        'La lista está vacía.',
        solution
      ));
    }

    return result;
  }

  private validateUniqueKey(
    key: string,
    location: string,
    usedKeys: Set<string>,
    issues: ValidationIssue[]
  ): void {
    if (!key) {
      return;
    }

    if (usedKeys.has(key)) {
      issues.push(this.issue(
        `${location} > key`,
        `La key "${key}" está repetida.`,
        'Usa una key diferente. Fields y filas de matriz comparten el mismo espacio de respuestas.'
      ));
      return;
    }

    usedKeys.add(key);
  }

  private issue(
    location: string,
    problem: string,
    solution: string
  ): ValidationIssue {
    return {
      id: crypto.randomUUID(),
      location,
      problem,
      solution
    };
  }

  private invalid(issues: ValidationIssue[]): ValidationResult {
    return {
      valid: false,
      issues,
      template: null
    };
  }

  private text(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  private fieldUsesOptions(type: FieldType): boolean {
    return type === 'select' || type === 'dropdown' || type === 'month';
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
    return value === 'number' || value === 'decimal' || value === 'percentage';
  }

  private isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private getJsonSyntaxError(error: unknown): string {
    return error instanceof Error
      ? `El JSON tiene un error de sintaxis: ${error.message}`
      : 'El JSON tiene un error de sintaxis.';
  }

  private monthOptions(): string[] {
    return [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
  }

  private createCompactExample(): ChecklistTemplateInput {
    return {
      name: 'Auditoría de seguridad',
      description: 'Evaluación general del área.',
      definition: {
        sections: [
          {
            id: 'datos-generales',
            title: 'Datos generales',
            view: 'form',
            fields: [
              {
                key: 'mes',
                label: 'Mes',
                type: 'month',
                required: true,
                layout: 'half',
                options: this.monthOptions()
              }
            ]
          },
          {
            id: 'seguridad',
            title: 'Seguridad',
            view: 'matrix',
            columns: ['SI', 'NO', 'N/A'],
            rows: [
              {
                key: 'equipo-proteccion',
                label: 'Equipo de protección',
                legend: 'Verifica uso y condición del equipo.',
                required: true
              }
            ]
          }
        ]
      }
    };
  }

  private createFilledActionPlanExample(): ChecklistTemplateInput {
    return {
      name: 'Plan de acción migrado',
      description: 'Plan precargado desde una hoja de Excel.',
      definition: {
        sections: [{
          id: 'plan-accion',
          title: 'Plan de acción',
          view: 'action-plan',
          methodology: 'FREE',
          involvedEmails: ['responsable@gulfstream.com'],
          phases: [{ id: 'general', label: 'Acciones', description: 'Acciones migradas.' }],
          initialRows: 0,
          minimumRows: 0,
          maximumRows: 100,
          requireAction: true,
          requireResponsible: true,
          requireEcd: true,
          initialActions: [{
            id: 'accion-1',
            phaseId: 'general',
            action: 'Actualizar instrucción de trabajo',
            responsibleEmail: 'responsable@gulfstream.com',
            ecds: [{ label: 'ECD1', date: '2026-09-30', completed: false }],
            progress: 25,
            observations: 'Pendiente validación.'
          }]
        }]
      }
    };
  }

  private createExample(): ChecklistTemplateInput {
    return {
      name: 'MASTER AUDIT AVIONICS',
      description: 'Checklist mixto para auditoría general.',
      definition: {
        sections: [
          {
            id: 'informacion-general',
            title: 'Información general',
            view: 'form',
            fields: [
              {
                key: 'nombre-operador',
                label: 'Nombre del operador',
                type: 'text',
                required: true,
                layout: 'half',
                placeholder: 'Captura el nombre'
              },
              {
                key: 'mes',
                label: 'Mes',
                type: 'month',
                required: true,
                layout: 'half',
                options: this.monthOptions()
              },
              {
                key: 'turno',
                label: 'Turno',
                type: 'dropdown',
                required: true,
                layout: 'half',
                options: ['Primer turno', 'Segundo turno', 'Tercer turno']
              }
            ]
          },
          {
            id: 'seguridad',
            title: 'Seguridad',
            view: 'matrix',
            columns: ['SI', 'NO', 'N/A'],
            rows: [
              {
                key: 'equipo-proteccion',
                label: 'Equipo de protección personal',
                legend: 'Verifica que el equipo requerido esté presente, vigente y en buenas condiciones.',
                required: true
              },
              {
                key: 'area-limpia',
                label: 'Área limpia y ordenada',
                legend: 'Revisa pasillos, estaciones y accesos.',
                required: true
              }
            ]
          }
        ],
        rules: {
          variables: [
            {
              id: 'seguridad-si',
              name: 'seguridad_si',
              label: 'Respuestas SI de Seguridad',
              sectionId: 'seguridad',
              operation: 'countEquals',
              compareValue: 'SI'
            },
            {
              id: 'seguridad-total',
              name: 'seguridad_total',
              label: 'Total de Seguridad',
              sectionId: 'seguridad',
              operation: 'countTotal'
            }
          ],
          calculations: [
            {
              id: 'calificacion-seguridad',
              name: 'calificacion_seguridad',
              label: 'Calificación de Seguridad',
              formula: '(seguridad_si / seguridad_total) * 100',
              format: 'percentage',
              decimalPlaces: 0
            }
          ]
        }
      }
    };
  }
}
