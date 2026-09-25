import {
  Component,
  computed,
  input,
  output
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  Calculator,
  Plus,
  Trash2,
  Variable
} from 'lucide-angular';

import {
  ChecklistCalculatedRule,
  ChecklistRuleFormat,
  ChecklistRules,
  ChecklistRuleVariable,
  ChecklistSection,
  RuleVariableOperation
} from '../../../../core/models';
import { isFormSection, isMatrixSection } from '../../../../core/checklist-section.utils';
import {
  AppButtonComponent
} from '../../../../shared/components/button/button';

@Component({
  selector: 'app-rule-builder',
  imports: [
    FormsModule,
    AppButtonComponent
  ],
  templateUrl: './rule-builder.component.html'
})
export class RuleBuilderComponent {
  readonly sections = input.required<ChecklistSection[]>();
  readonly rules = input<ChecklistRules | undefined>(undefined);
  readonly rulesChange = output<ChecklistRules>();

  readonly Variable = Variable;
  readonly Calculator = Calculator;
  readonly Plus = Plus;
  readonly Trash2 = Trash2;

  readonly ruleSections = computed(() =>
    this.sections().filter(section => isFormSection(section) || isMatrixSection(section))
  );
  readonly variables = computed(() =>
    this.rules()?.variables ?? []
  );

  readonly calculations = computed(() =>
    this.rules()?.calculations ?? []
  );

  readonly availableVariableNames = computed(() =>
    this.variables()
      .map(variable => variable.name.trim())
      .filter(Boolean)
  );

  readonly duplicateVariableNames = computed(() =>
    this.findDuplicates(
      this.variables().map(variable => variable.name)
    )
  );

  readonly duplicateCalculationNames = computed(() =>
    this.findDuplicates(
      this.calculations().map(calculation => calculation.name)
    )
  );

  addVariable(): void {
    const section = this.ruleSections()[0];

    const variable: ChecklistRuleVariable = {
      id: crypto.randomUUID(),
      name: this.createUniqueName('variable'),
      label: 'Nueva variable',
      sectionId: section?.id ?? '',
      operation: 'countEquals',
      compareValue: 'SI'
    };

    this.emitRules(
      [...this.variables(), variable],
      this.calculations()
    );
  }

  updateVariable(
    variableId: string,
    patch: Partial<ChecklistRuleVariable>
  ): void {
    const variables = this.variables().map(variable => {
      if (variable.id !== variableId) {
        return variable;
      }

      const next: ChecklistRuleVariable = {
        ...variable,
        ...patch
      };

      if (
        next.operation !== 'countEquals' &&
        next.operation !== 'countNotEquals'
      ) {
        delete next.compareValue;
      } else if (!next.compareValue) {
        next.compareValue = 'SI';
      }

      return next;
    });

    this.emitRules(variables, this.calculations());
  }

  updateVariableName(
    variableId: string,
    value: string
  ): void {
    this.updateVariable(variableId, {
      name: this.normalizeName(value)
    });
  }

  removeVariable(variableId: string): void {
    this.emitRules(
      this.variables().filter(variable => variable.id !== variableId),
      this.calculations()
    );
  }

  addCalculation(): void {
    const firstVariable = this.availableVariableNames()[0];

    const calculation: ChecklistCalculatedRule = {
      id: crypto.randomUUID(),
      name: this.createUniqueName('resultado'),
      label: 'Nuevo resultado',
      formula: firstVariable || '0',
      format: 'number',
      decimalPlaces: 0
    };

    this.emitRules(
      this.variables(),
      [...this.calculations(), calculation]
    );
  }

  updateCalculation(
    calculationId: string,
    patch: Partial<ChecklistCalculatedRule>
  ): void {
    const calculations = this.calculations().map(calculation =>
      calculation.id === calculationId
        ? {
            ...calculation,
            ...patch
          }
        : calculation
    );

    this.emitRules(this.variables(), calculations);
  }

  updateCalculationName(
    calculationId: string,
    value: string
  ): void {
    this.updateCalculation(calculationId, {
      name: this.normalizeName(value)
    });
  }

  updateDecimalPlaces(
    calculationId: string,
    value: number | string
  ): void {
    const parsed = Number(value);
    const decimalPlaces = Number.isFinite(parsed)
      ? Math.max(0, Math.min(Math.trunc(parsed), 6))
      : 0;

    this.updateCalculation(calculationId, {
      decimalPlaces
    });
  }

  removeCalculation(calculationId: string): void {
    this.emitRules(
      this.variables(),
      this.calculations().filter(
        calculation => calculation.id !== calculationId
      )
    );
  }

  insertVariable(
    calculationId: string,
    variableName: string
  ): void {
    const calculation = this.calculations().find(
      current => current.id === calculationId
    );

    if (!calculation || !variableName) {
      return;
    }

    const separator = calculation.formula.trim() ? ' + ' : '';

    this.updateCalculation(calculationId, {
      formula: `${calculation.formula}${separator}${variableName}`
    });
  }

  operationLabel(operation: RuleVariableOperation): string {
    const labels: Record<RuleVariableOperation, string> = {
      countEquals: 'Contar respuestas iguales a',
      countNotEquals: 'Contar respuestas diferentes de',
      countAnswered: 'Contar preguntas respondidas',
      countTotal: 'Contar todas las preguntas'
    };

    return labels[operation];
  }

  formulaIssues(formula: string): string[] {
    const issues: string[] = [];
    const trimmed = formula.trim();

    if (!trimmed) {
      return ['Captura una fórmula.'];
    }

    if (!/^[a-zA-Z0-9_+\-*/%().\s]+$/.test(trimmed)) {
      issues.push(
        'La fórmula contiene caracteres no permitidos.'
      );
    }

    if (!this.hasBalancedParentheses(trimmed)) {
      issues.push('Los paréntesis no están balanceados.');
    }

    const allowedNames = new Set([
      ...this.availableVariableNames(),
      ...this.calculations().map(calculation => calculation.name)
    ]);

    const identifiers = trimmed.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) ?? [];
    const unknownNames = [...new Set(
      identifiers.filter(identifier => !allowedNames.has(identifier))
    )];

    if (unknownNames.length > 0) {
      issues.push(
        `Variables no encontradas: ${unknownNames.join(', ')}.`
      );
    }

    return issues;
  }

  private emitRules(
    variables: ChecklistRuleVariable[],
    calculations: ChecklistCalculatedRule[]
  ): void {
    this.rulesChange.emit({
      variables,
      calculations
    });
  }

  private normalizeName(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9_]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  private createUniqueName(prefix: string): string {
    const usedNames = new Set([
      ...this.variables().map(variable => variable.name),
      ...this.calculations().map(calculation => calculation.name)
    ]);

    let index = 1;
    let candidate = `${prefix}_${index}`;

    while (usedNames.has(candidate)) {
      index += 1;
      candidate = `${prefix}_${index}`;
    }

    return candidate;
  }

  private findDuplicates(values: string[]): Set<string> {
    const normalized = values
      .map(value => this.normalizeName(value))
      .filter(Boolean);
    const seen = new Set<string>();
    const duplicates = new Set<string>();

    for (const value of normalized) {
      if (seen.has(value)) {
        duplicates.add(value);
      } else {
        seen.add(value);
      }
    }

    return duplicates;
  }

  private hasBalancedParentheses(value: string): boolean {
    let depth = 0;

    for (const character of value) {
      if (character === '(') {
        depth += 1;
      }

      if (character === ')') {
        depth -= 1;
      }

      if (depth < 0) {
        return false;
      }
    }

    return depth === 0;
  }
}
