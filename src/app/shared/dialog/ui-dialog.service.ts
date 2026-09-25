import { Injectable, inject } from '@angular/core';
import { Dialog } from '@angular/cdk/dialog';
import { LucideIconData } from 'lucide-angular';
import { firstValueFrom } from 'rxjs';
import {
  UiDialogComponent,
  UiDialogData,
  UiDialogKind,
  UiDialogResult,
  UiDialogTone
} from './ui-dialog.component';

export interface UiDialogOptions {
  title: string;
  message?: string;
  detail?: string;
  tone?: UiDialogTone;
  confirmText?: string;
  icon?: LucideIconData;
}

export interface UiDialogConfirmOptions extends UiDialogOptions {
  cancelText?: string;
}

export interface UiDialogPromptOptions extends UiDialogConfirmOptions {
  label?: string;
  placeholder?: string;
  initialValue?: string;
  required?: boolean;
  maxLength?: number;
  validate?: (value: string) => string | null;
}

type UiDialogPayload = Omit<UiDialogData, 'kind'>;

@Injectable({ providedIn: 'root' })
export class UiDialogService {
  private readonly dialog = inject(Dialog);

  /** Muestra un diálogo informativo con un único botón de aceptar. */
  alert(options: UiDialogOptions): Promise<void> {
    return this.open('alert', this.base(options, options.tone ?? 'info')).then(
      () => undefined
    );
  }

  /** Pregunta sí/no. Resuelve `true` solo si se acepta. */
  confirm(options: UiDialogConfirmOptions): Promise<boolean> {
    return this.open('confirm', {
      ...this.base(options, options.tone ?? 'warning'),
      cancelText: options.cancelText ?? 'Cancelar'
    }).then(result => result === true);
  }

  /** Solicita un valor al usuario. Resuelve `null` si se cancela. */
  prompt(options: UiDialogPromptOptions): Promise<string | null> {
    return this.open('prompt', {
      ...this.base(options, options.tone ?? 'info'),
      cancelText: options.cancelText ?? 'Cancelar',
      input: {
        label: options.label ?? 'Valor',
        placeholder: options.placeholder,
        value: options.initialValue ?? '',
        required: options.required,
        maxLength: options.maxLength,
        validate: options.validate
      }
    }).then(result => (typeof result === 'string' ? result : null));
  }

  private base(
    options: UiDialogOptions,
    tone: UiDialogTone
  ): UiDialogPayload {
    return {
      tone,
      title: options.title,
      message: options.message,
      detail: options.detail,
      icon: options.icon,
      confirmText:
        options.confirmText ?? (tone === 'danger' ? 'Eliminar' : 'Aceptar'),
      cancelText: 'Cancelar'
    };
  }

  private open(
    kind: UiDialogKind,
    payload: UiDialogPayload
  ): Promise<UiDialogResult | undefined> {
    const data: UiDialogData = { kind, ...payload };

    const dialogRef = this.dialog.open<UiDialogResult, UiDialogData>(
      UiDialogComponent,
      {
        data,
        role: kind === 'prompt' ? 'dialog' : 'alertdialog',
        panelClass: 'ui-dialog-panel',
        backdropClass: 'checklist-dialog-backdrop',
        autoFocus: false,
        ariaModal: true,
        disableClose: false,
        closeOnNavigation: false
      }
    );

    return firstValueFrom(dialogRef.closed);
  }
}
