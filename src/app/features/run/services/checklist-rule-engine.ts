import { Injectable } from '@angular/core';

import {
  ChecklistCalculatedRule,
  ChecklistDefinition,
  ChecklistField,
  ChecklistMatrixRow,
  ChecklistRuleVariable
} from '../../../core/models';
import { isFormSection, isMatrixSection } from '../../../core/checklist-section.utils';

export interface ChecklistRuleResults {
  variables: Record<string, number>;
  calculations: Record<string, number>;
  all: Record<string, number>;
}

@Injectable({
  providedIn: 'root'
})
export class ChecklistRuleEngine {
  calculate(
    definition: ChecklistDefinition,
    values: Record<string, unknown>
  ): ChecklistRuleResults {
    const variables = this.resolveVariables(
      definition,
      values
    );

    const calculations = this.resolveCalculations(
      definition,
      variables
    );

    return {
      variables,
      calculations,
      all: {
        ...variables,
        ...calculations
      }
    };
  }

  private resolveVariables(
    definition: ChecklistDefinition,
    values: Record<string, unknown>
  ): Record<string, number> {
    const variables =
      definition.rules?.variables ?? [];

    const results: Record<string, number> = {};

    for (const variable of variables) {
      const variableName =
        this.normalizeName(variable.name);

      if (!variableName) {
        continue;
      }

      results[variableName] =
        this.resolveVariable(
          definition,
          values,
          variable
        );
    }

    return results;
  }
private resolveMatrixVariable(
  rows: ChecklistMatrixRow[],
  values: Record<string, unknown>,
  variable: ChecklistRuleVariable
): number {
  switch (variable.operation) {
    case 'countTotal':
      return rows.length;

    case 'countAnswered':
      return rows.filter(row =>
        this.hasMatrixValue(
          values[row.key]
        )
      ).length;

    case 'countEquals':
      return rows.filter(row =>
        this.valuesAreEqual(
          values[row.key],
          variable.compareValue
        )
      ).length;

    case 'countNotEquals':
      return rows.filter(row => {
        const value =
          values[row.key];

        return (
          this.hasMatrixValue(value) &&
          !this.valuesAreEqual(
            value,
            variable.compareValue
          )
        );
      }).length;

    default:
      return 0;
  }
}
private hasMatrixValue(
  value: unknown
): boolean {
  if (
    value === null ||
    value === undefined
  ) {
    return false;
  }

  if (typeof value === 'string') {
    return value.trim().length > 0;
  }

  return true;
}
  private resolveVariable(
  definition: ChecklistDefinition,
  values: Record<string, unknown>,
  variable: ChecklistRuleVariable
): number {
  const section = definition.sections.find(
    current =>
      current.id === variable.sectionId
  );

  if (!section) {
    return 0;
  }

  if (isMatrixSection(section)) {
    return this.resolveMatrixVariable(
      section.rows,
      values,
      variable
    );
  }

  if (!isFormSection(section)) {
    return 0;
  }
  switch (variable.operation) {
    case 'countTotal':
      return section.fields.length;

    case 'countAnswered':
      return section.fields.filter(
        (field: ChecklistField) =>
          this.hasFieldValue(
            field,
            values[field.key]
          )
      ).length;

    case 'countEquals':
      return section.fields.filter(
        (field: ChecklistField) =>
          this.valuesAreEqual(
            values[field.key],
            variable.compareValue
          )
      ).length;

    case 'countNotEquals':
      return section.fields.filter(
        (field: ChecklistField) => {
          const value =
            values[field.key];

          return (
            this.hasFieldValue(
              field,
              value
            ) &&
            !this.valuesAreEqual(
              value,
              variable.compareValue
            )
          );
        }
      ).length;

    default:
      return 0;
  }
}

  private resolveCalculations(
    definition: ChecklistDefinition,
    variables: Record<string, number>
  ): Record<string, number> {
    const calculations =
      definition.rules?.calculations ?? [];

    const results: Record<string, number> = {};
    const pending = [...calculations];

    let iterations = 0;

    while (
      pending.length > 0 &&
      iterations < calculations.length + 1
    ) {
      const unresolved: ChecklistCalculatedRule[] = [];
      let resolvedInIteration = false;

      for (const calculation of pending) {
        const calculationName =
          this.normalizeName(calculation.name);

        if (!calculationName) {
          continue;
        }

        try {
          const scope = {
            ...variables,
            ...results
          };

          const rawResult =
            this.evaluateFormula(
              calculation.formula,
              scope
            );

          results[calculationName] =
            this.formatResult(
              rawResult,
              calculation.decimalPlaces
            );

          resolvedInIteration = true;
        } catch (error: unknown) {
          if (
            error instanceof Error &&
            error.message.startsWith(
              'VARIABLE_NOT_FOUND:'
            )
          ) {
            unresolved.push(calculation);
            continue;
          }

          throw new Error(
            `Error en la fórmula "${calculation.label}": ${
              error instanceof Error
                ? error.message
                : 'La fórmula no es válida.'
            }`
          );
        }
      }

      if (!resolvedInIteration && unresolved.length > 0) {
        const unresolvedNames =
          unresolved
            .map(calculation =>
              calculation.name
            )
            .join(', ');

        throw new Error(
          `No se pudieron resolver los cálculos: ${unresolvedNames}. Revisa variables inexistentes o referencias circulares.`
        );
      }

      pending.splice(
        0,
        pending.length,
        ...unresolved
      );

      iterations += 1;
    }

    return results;
  }

  private evaluateFormula(
    formula: string,
    scope: Record<string, number>
  ): number {
    const tokens =
      this.tokenize(formula);

    const postfix =
      this.toPostfix(tokens);

    return this.evaluatePostfix(
      postfix,
      scope
    );
  }

  private tokenize(
    formula: string
  ): string[] {
    const normalized =
      formula.trim();

    if (!normalized) {
      throw new Error(
        'La fórmula está vacía.'
      );
    }

    if (
      !/^[a-zA-Z0-9_+\-*/%().\s]+$/.test(
        normalized
      )
    ) {
      throw new Error(
        'La fórmula contiene caracteres no permitidos.'
      );
    }

    const tokens =
      normalized.match(
        /[a-zA-Z_][a-zA-Z0-9_]*|\d+(?:\.\d+)?|[()+\-*/%]/g
      );

    if (!tokens || tokens.length === 0) {
      throw new Error(
        'No se encontraron elementos válidos en la fórmula.'
      );
    }

    const joinedTokens =
      tokens.join('');

    const joinedFormula =
      normalized.replace(/\s+/g, '');

    if (joinedTokens !== joinedFormula) {
      throw new Error(
        'La fórmula contiene una expresión inválida.'
      );
    }

    return this.normalizeUnaryOperators(
      tokens
    );
  }

  private normalizeUnaryOperators(
    tokens: string[]
  ): string[] {
    const result: string[] = [];

    for (
      let index = 0;
      index < tokens.length;
      index += 1
    ) {
      const token = tokens[index];

      const isUnary =
        (token === '-' || token === '+') &&
        (
          index === 0 ||
          tokens[index - 1] === '(' ||
          this.isOperator(
            tokens[index - 1]
          )
        );

      if (isUnary) {
        if (token === '-') {
          result.push('0');
          result.push('-');
        }

        continue;
      }

      result.push(token);
    }

    return result;
  }

  private toPostfix(
    tokens: string[]
  ): string[] {
    const output: string[] = [];
    const operators: string[] = [];

    for (const token of tokens) {
      if (
        this.isNumber(token) ||
        this.isIdentifier(token)
      ) {
        output.push(token);
        continue;
      }

      if (this.isOperator(token)) {
        while (
          operators.length > 0 &&
          this.isOperator(
            operators[operators.length - 1]
          ) &&
          this.precedence(
            operators[operators.length - 1]
          ) >= this.precedence(token)
        ) {
          const operator =
            operators.pop();

          if (operator) {
            output.push(operator);
          }
        }

        operators.push(token);
        continue;
      }

      if (token === '(') {
        operators.push(token);
        continue;
      }

      if (token === ')') {
        let foundOpeningParenthesis = false;

        while (operators.length > 0) {
          const operator =
            operators.pop();

          if (operator === '(') {
            foundOpeningParenthesis = true;
            break;
          }

          if (operator) {
            output.push(operator);
          }
        }

        if (!foundOpeningParenthesis) {
          throw new Error(
            'Los paréntesis no están balanceados.'
          );
        }
      }
    }

    while (operators.length > 0) {
      const operator =
        operators.pop();

      if (
        operator === '(' ||
        operator === ')'
      ) {
        throw new Error(
          'Los paréntesis no están balanceados.'
        );
      }

      if (operator) {
        output.push(operator);
      }
    }

    return output;
  }

  private evaluatePostfix(
    tokens: string[],
    scope: Record<string, number>
  ): number {
    const stack: number[] = [];

    for (const token of tokens) {
      if (this.isNumber(token)) {
        stack.push(Number(token));
        continue;
      }

      if (this.isIdentifier(token)) {
        const variableName =
          this.normalizeName(token);

        const value =
          scope[variableName];

        if (
          value === undefined ||
          !Number.isFinite(value)
        ) {
          throw new Error(
            `VARIABLE_NOT_FOUND:${variableName}`
          );
        }

        stack.push(value);
        continue;
      }

      if (this.isOperator(token)) {
        if (stack.length < 2) {
          throw new Error(
            'La fórmula tiene operadores incompletos.'
          );
        }

        const right =
          stack.pop();

        const left =
          stack.pop();

        if (
          left === undefined ||
          right === undefined
        ) {
          throw new Error(
            'La fórmula no se pudo evaluar.'
          );
        }

        stack.push(
          this.applyOperator(
            token,
            left,
            right
          )
        );
      }
    }

    if (stack.length !== 1) {
      throw new Error(
        'La fórmula tiene una estructura inválida.'
      );
    }

    const result = stack[0];

    if (!Number.isFinite(result)) {
      throw new Error(
        'El resultado no es un número válido.'
      );
    }

    return result;
  }

  private applyOperator(
    operator: string,
    left: number,
    right: number
  ): number {
    switch (operator) {
      case '+':
        return left + right;

      case '-':
        return left - right;

      case '*':
        return left * right;

      case '/':
        if (right === 0) {
          throw new Error(
            'No se puede dividir entre cero.'
          );
        }

        return left / right;

      case '%':
        if (right === 0) {
          throw new Error(
            'No se puede obtener el residuo entre cero.'
          );
        }

        return left % right;

      default:
        throw new Error(
          `Operador no soportado: ${operator}.`
        );
    }
  }

  private formatResult(
    value: number,
    decimalPlaces: number | undefined
  ): number {
    const decimals =
      Math.max(
        0,
        Math.min(
          Math.trunc(decimalPlaces ?? 0),
          6
        )
      );

    const multiplier =
      10 ** decimals;

    return (
      Math.round(
        (value + Number.EPSILON) *
        multiplier
      ) / multiplier
    );
  }

  private valuesAreEqual(
    value: unknown,
    expected: string | undefined
  ): boolean {
    if (
      value === null ||
      value === undefined ||
      expected === undefined
    ) {
      return false;
    }

    return (
      String(value)
        .trim()
        .toUpperCase() ===
      expected
        .trim()
        .toUpperCase()
    );
  }

  private hasFieldValue(
    field: ChecklistField,
    value: unknown
  ): boolean {
    if (field.type === 'checkbox') {
      return value === true;
    }

    if (
      value === null ||
      value === undefined
    ) {
      return false;
    }

    if (typeof value === 'string') {
      return value.trim().length > 0;
    }

    return true;
  }

  private precedence(
    operator: string
  ): number {
    return (
      operator === '*' ||
      operator === '/' ||
      operator === '%'
    )
      ? 2
      : 1;
  }

  private isOperator(
    token: string
  ): boolean {
    return (
      token === '+' ||
      token === '-' ||
      token === '*' ||
      token === '/' ||
      token === '%'
    );
  }

  private isNumber(
    token: string
  ): boolean {
    return /^\d+(?:\.\d+)?$/.test(
      token
    );
  }

  private isIdentifier(
    token: string
  ): boolean {
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(
      token
    );
  }

  private normalizeName(
    value: string
  ): string {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(
        /[\u0300-\u036f]/g,
        ''
      )
      .replace(
        /[^a-z0-9_]+/g,
        '_'
      )
      .replace(
        /^_+|_+$/g,
        ''
      );
  }
}
