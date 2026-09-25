import {
  Component,
  input,
  output
} from '@angular/core';

import {
  DragDropModule
} from '@angular/cdk/drag-drop';

import {
  AlignLeft,
  Calendar,
  CalendarDays,
  CheckSquare,
  ChevronDown,
  GripVertical,
  Hash,
  LucideAngularModule,
  List,
  Type
} from 'lucide-angular';

import {
  FieldType
} from '../../../../core/models';

interface ToolboxItem {
  type: FieldType;
  label: string;
  description: string;
  icon: typeof Type;
}

@Component({
  selector: 'app-field-toolbox',
  imports: [
    DragDropModule,
    LucideAngularModule
  ],
  template: `
    <section
      class=" border border-zinc-800 bg-zinc-900 p-4 shadow-xl shadow-black/10"
    >
      <div class="mb-4">
        <p
          class="text-xs font-semibold uppercase tracking-[0.18em] text-blue-400"
        >
          Controles
        </p>

        <h2 class="mt-1 text-sm font-semibold text-zinc-100">
          Agregar campo
        </h2>

        <p class="mt-1 text-xs leading-5 text-zinc-500">
          Haz clic o arrastra un control hacia cualquier sección.
        </p>
      </div>

      <div
        cdkDropList
        id="field-toolbox"
        class="space-y-2"
        [cdkDropListData]="items"
        [cdkDropListConnectedTo]="connectedDropLists()"
        [cdkDropListSortingDisabled]="true"
        [cdkDropListEnterPredicate]="blockIncomingItems"
      >
        @for (item of items; track item.type) {
          <button
            type="button"
            cdkDrag
            [cdkDragData]="item.type"
            class="group flex w-full cursor-grab items-start gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 p-3 text-left outline-none transition hover:border-blue-500/60 hover:bg-blue-950/20 focus-visible:ring-2 focus-visible:ring-blue-500 active:cursor-grabbing"
            [attr.aria-label]="'Agregar campo ' + item.label"
            (click)="add.emit(item.type)"
          >
            <div
              *cdkDragPreview
              class="flex w-60 items-center gap-3 rounded-2xl border border-blue-500/60 bg-zinc-900 p-3 text-zinc-100 shadow-2xl shadow-black/40"
            >
              <span
                class="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-500/10 text-blue-300"
                aria-hidden="true"
              >
                <lucide-icon
                  [img]="item.icon"
                  [size]="19"
                  [strokeWidth]="2"
                />
              </span>

              <div class="min-w-0">
                <div class="text-sm font-medium">
                  {{ item.label }}
                </div>

                <div class="mt-0.5 text-xs text-zinc-400">
                  Suelta dentro de una sección
                </div>
              </div>
            </div>

            <span
              class="grid size-10 shrink-0 place-items-center rounded-xl bg-zinc-800 text-zinc-400 transition group-hover:bg-blue-500/10 group-hover:text-blue-300"
              aria-hidden="true"
            >
              <lucide-icon
                [img]="item.icon"
                [size]="19"
                [strokeWidth]="2"
              />
            </span>

            <span class="min-w-0 flex-1">
              <span class="block text-sm font-medium text-zinc-100">
                {{ item.label }}
              </span>

              <span class="mt-1 block text-xs text-zinc-500">
                {{ item.description }}
              </span>
            </span>

            <span
              class="mt-2 shrink-0 text-zinc-600 transition group-hover:text-zinc-400"
              aria-hidden="true"
            >
              <lucide-icon
                [img]="GripVertical"
                [size]="17"
                [strokeWidth]="2"
              />
            </span>
          </button>
        }
      </div>
    </section>
  `
})
export class FieldToolboxComponent {
  readonly connectedDropLists =
  input<string[]>([]);
  readonly add =
    output<FieldType>();

  protected readonly GripVertical =
    GripVertical;

  protected readonly items:
  readonly ToolboxItem[] = [
    {
      type: 'text',
      label: 'Texto',
      description: 'Captura texto corto',
      icon: Type
    },
    {
      type: 'textarea',
      label: 'Comentarios',
      description: 'Captura texto largo',
      icon: AlignLeft
    },
    {
      type: 'number',
      label: 'Número',
      description: 'Valores numéricos',
      icon: Hash
    },
    {
      type: 'date',
      label: 'Fecha',
      description: 'Selecciona una fecha',
      icon: CalendarDays
    },
    {
      type: 'month',
      label: 'Mes',
      description: 'Lista de meses',
      icon: Calendar
    },
    {
      type: 'checkbox',
      label: 'Confirmación',
      description: 'Control de confirmación',
      icon: CheckSquare
    },
    {
      type: 'select',
      label: 'Lista corta',
      description: 'Opciones SI / NO o pocas opciones',
      icon: ChevronDown
    },
    {
      type: 'dropdown',
      label: 'Dropdown',
      description:
        'Listas largas o columnas de Excel',
      icon: List
    }
  ];

  readonly blockIncomingItems = (): boolean => false;
}