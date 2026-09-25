import {
  Component,
  computed,
  inject,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgApexchartsModule } from 'ng-apexcharts';
import {
  Activity,
  BarChart3,
  CheckCircle2,
  Filter,
  Gauge,
  Layers3,
  Plus,
  RefreshCw,
  Trash2,
  X
} from 'lucide-angular';
import type {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexFill,
  ApexGrid,
  ApexLegend,
  ApexNonAxisChartSeries,
  ApexPlotOptions,
  ApexStroke,
  ApexTheme,
  ApexTooltip,
  ApexXAxis,
  ApexYAxis
} from 'ng-apexcharts';
import { ChecklistRepository } from '../../core/checklist.repository';
import { ChecklistSubmission, ChecklistTemplate } from '../../core/models';
import { ThemeService } from '../../core/services/theme.service';
import { AppButtonComponent } from '../../shared/components/button/button';
import { PageHeaderComponent } from '../../shared/page-header.component';


interface SubmissionRow {
  submission: ChecklistSubmission;
  data: Record<string, unknown>;
}

interface FilterOption {
  key: string;
  label: string;
  values: string[];
}

interface DashboardFilter {
  id: string;
  key: string;
  value: string;
}

interface MetricSummary {
  key: string;
  label: string;
  average: number;
  minimum: number;
  maximum: number;
  count: number;
}

@Component({
  selector: 'app-dashboard-page',
  imports: [
    FormsModule,
    NgApexchartsModule,
    AppButtonComponent,
    PageHeaderComponent
  ],
  templateUrl: './dashboard.page.html'
})
export class DashboardPage {
  private readonly repository = inject(ChecklistRepository);

  private readonly themeService =
    inject(ThemeService);

  readonly Activity = Activity;
  readonly BarChart3 = BarChart3;
  readonly CheckCircle2 = CheckCircle2;
  readonly Filter = Filter;
  readonly Gauge = Gauge;
  readonly Layers3 = Layers3;
  readonly Plus = Plus;
  readonly RefreshCw = RefreshCw;
  readonly Trash2 = Trash2;
  readonly X = X;

  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly templates = signal<ChecklistTemplate[]>([]);
  readonly rows = signal<SubmissionRow[]>([]);

  readonly selectedTemplateId = signal<number | null>(null);
  readonly activeFilters = signal<DashboardFilter[]>([]);
  readonly filterPanelOpen = signal(true);
  readonly addFilterOpen = signal(false);
  readonly pendingFilterKey = signal('');
  readonly pendingFilterValue = signal('');
  readonly selectedDistributionKey = signal('');

  readonly templateRows = computed(() => {
    const templateId = this.selectedTemplateId();

    return this.rows().filter(row =>
      templateId === null || row.submission.templateId === templateId
    );
  });

  readonly filteredRows = computed(() => {
    const filters = this.activeFilters();

    return this.templateRows().filter(row =>
      filters.every(filter =>
        this.displayValue(row.data[filter.key]) === filter.value
      )
    );
  });

  readonly filterOptions = computed<FilterOption[]>(() => {
    const keys = new Set<string>();
    const source = this.templateRows();

    source.forEach(row => {
      Object.keys(row.data)
        .filter(key => !this.isCalculatedKey(key))
        .filter(key => !key.endsWith('_observation'))
        .filter(key => !key.startsWith('_'))
        .forEach(key => keys.add(key));
    });

    return [...keys]
      .map(key => ({
        key,
        label: this.resolveFieldLabel(key),
        values: [...new Set(
          source
            .map(row => this.displayValue(row.data[key]))
            .filter(Boolean)
        )].sort((left, right) => left.localeCompare(right))
      }))
      .filter(option => option.values.length > 0)
      .sort((left, right) => left.label.localeCompare(right.label));
  });

  readonly availableFilterOptions = computed(() => {
    const activeKeys = new Set(
      this.activeFilters().map(filter => filter.key)
    );

    return this.filterOptions().filter(option => !activeKeys.has(option.key));
  });

  readonly pendingValues = computed(() =>
    this.filterOptions().find(
      option => option.key === this.pendingFilterKey()
    )?.values ?? []
  );

  readonly calculatedMetrics = computed<MetricSummary[]>(() => {
    const rows = this.filteredRows();
    const keys = new Set<string>();

    rows.forEach(row => {
      Object.keys(row.data)
        .filter(key => this.isCalculatedKey(key))
        .forEach(key => keys.add(key));
    });

    return [...keys]
      .map(key => {
        const values = rows
          .map(row => this.toNumber(row.data[key]))
          .filter((value): value is number => value !== null);

        if (values.length === 0) {
          return null;
        }

        return {
          key,
          label: this.resolveCalculatedLabel(key),
          average: this.round(
            values.reduce((total, value) => total + value, 0) / values.length
          ),
          minimum: Math.min(...values),
          maximum: Math.max(...values),
          count: values.length
        };
      })
      .filter((metric): metric is MetricSummary => metric !== null)
      .sort((left, right) => left.label.localeCompare(right.label));
  });

  readonly distributionKeys = computed(() =>
    this.filterOptions().map(option => ({
      key: option.key,
      label: option.label
    }))
  );

  readonly completeCount = computed(() =>
    this.filteredRows().filter(
      row => row.submission.status === 'COMPLETE'
    ).length
  );

  readonly draftCount = computed(() =>
    this.filteredRows().filter(
      row => row.submission.status === 'DRAFT'
    ).length
  );

  readonly completionRate = computed(() => {
    const total = this.filteredRows().length;

    return total === 0
      ? 0
      : Math.round((this.completeCount() / total) * 100);
  });

  readonly statusSeries = computed<ApexNonAxisChartSeries>(() => [
    this.completeCount(),
    this.draftCount(),
    this.filteredRows().filter(
      row => row.submission.status === 'CANCELLED'
    ).length
  ]);

  readonly statusLabels = ['Completados', 'Borradores', 'Cancelados'];

  readonly statusChart: ApexChart = {
    type: 'donut',
    height: 285,
    background: 'transparent',
    toolbar: { show: false }
  };

  readonly statusColors = ['#2f9e68', '#cf942f', '#d95f4b'];

  readonly statusLegend = computed<ApexLegend>(() => ({
    position: 'bottom',
    labels: { colors: this.secondaryTextColor() },
    fontSize: '12px'
  }));

  readonly statusDataLabels: ApexDataLabels = {
    enabled: false
  };

  readonly statusStroke: ApexStroke = {
    width: 0
  };

  readonly calculatedSeries = computed<ApexAxisChartSeries>(() => [{
    name: 'Promedio',
    data: this.calculatedMetrics().map(metric => metric.average)
  }]);

  readonly calculatedCategories = computed(() =>
    this.calculatedMetrics().map(metric => metric.label)
  );

  readonly calculatedChart: ApexChart = {
    type: 'bar',
    height: 330,
    background: 'transparent',
    toolbar: { show: false }
  };

  readonly calculatedPlotOptions: ApexPlotOptions = {
    bar: {
      horizontal: true,
      borderRadius: 5,
      barHeight: '58%',
      distributed: false
    }
  };

  readonly calculatedDataLabels = computed<ApexDataLabels>(() => ({
    enabled: true,
    style: {
      colors: [this.dataLabelColor()],
      fontSize: '11px'
    },
    offsetX: 6
  }));

  readonly calculatedFill: ApexFill = {
    type: 'gradient',
    gradient: {
      shade: 'dark',
      type: 'horizontal',
      shadeIntensity: 0.2,
      gradientToColors: ['#8fb8d8'],
      inverseColors: false,
      opacityFrom: 1,
      opacityTo: 1,
      stops: [0, 100]
    }
  };

  readonly calculatedGrid = computed<ApexGrid>(() => ({
    borderColor: this.gridLineColor(),
    strokeDashArray: 4,
    xaxis: { lines: { show: true } },
    yaxis: { lines: { show: false } }
  }));

  readonly calculatedXAxis = computed<ApexXAxis>(() => ({
    categories: this.calculatedCategories(),
    labels: {
      style: { colors: this.axisTextColor(), fontSize: '11px' }
    },
    axisBorder: { show: false },
    axisTicks: { show: false }
  }));

  readonly calculatedYAxis = computed<ApexYAxis>(() => ({
    labels: {
      style: { colors: this.secondaryTextColor(), fontSize: '11px' },
      maxWidth: 180
    }
  }));

  readonly distributionSeries = computed<ApexAxisChartSeries>(() => [{
    name: 'Respuestas',
    data: this.distributionItems().map(item => item.count)
  }]);

  readonly distributionItems = computed(() => {
    const key = this.selectedDistributionKey();
    const counts = new Map<string, number>();

    if (!key) {
      return [];
    }

    this.filteredRows().forEach(row => {
      const value = this.displayValue(row.data[key]);

      if (value) {
        counts.set(value, (counts.get(value) ?? 0) + 1);
      }
    });

    return [...counts.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 12);
  });

  readonly distributionXAxis = computed<ApexXAxis>(() => ({
    categories: this.distributionItems().map(item => item.label),
    labels: {
      rotate: -35,
      trim: true,
      style: { colors: this.secondaryTextColor(), fontSize: '11px' }
    },
    axisBorder: { color: this.strongLineColor() },
    axisTicks: { color: this.strongLineColor() }
  }));

  readonly distributionChart: ApexChart = {
    type: 'bar',
    height: 330,
    background: 'transparent',
    toolbar: { show: false }
  };

  readonly distributionPlotOptions: ApexPlotOptions = {
    bar: {
      borderRadius: 5,
      columnWidth: '52%',
      distributed: true
    }
  };

  readonly distributionDataLabels: ApexDataLabels = {
    enabled: false
  };

  readonly distributionLegend: ApexLegend = {
    show: false
  };

  readonly chartTheme = computed<ApexTheme>(() => ({
    mode: this.themeService.isDark() ? 'dark' : 'light'
  }));

  readonly tooltip = computed<ApexTooltip>(() => ({
    theme: this.themeService.isDark() ? 'dark' : 'light'
  }));

  readonly grid = computed<ApexGrid>(() => ({
    borderColor: this.gridLineColor(),
    strokeDashArray: 4
  }));

  private readonly gridLineColor = computed(() =>
    this.themeService.isDark() ? '#27272a' : '#e3e1d9'
  );

  private readonly strongLineColor = computed(() =>
    this.themeService.isDark() ? '#3f3f46' : '#d5d3cb'
  );

  private readonly axisTextColor = computed(() =>
    this.themeService.isDark() ? '#71717a' : '#6f6e69'
  );

  private readonly secondaryTextColor = computed(() =>
    this.themeService.isDark() ? '#a1a1aa' : '#6f6e69'
  );

  private readonly dataLabelColor = computed(() =>
    this.themeService.isDark() ? '#e4e4e7' : '#37352f'
  );

  readonly chartColors = [
    '#41688f',
    '#7a6fb0',
    '#4a9ba8',
    '#3e9e6e',
    '#c99a3f',
    '#c06a8a'
  ];

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set(null);

    try {
      const [templates, submissions] = await Promise.all([
        this.repository.listTemplates(),
        this.repository.listSubmissions()
      ]);

      this.templates.set(templates);
      this.rows.set(
        submissions.map(submission => ({
          submission,
          data: this.parseData(submission.dataJson)
        }))
      );

      this.ensureDistributionKey();
    } catch (error: unknown) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : 'No se pudo cargar el dashboard.'
      );
    } finally {
      this.loading.set(false);
    }
  }

  selectTemplate(value: string | number): void {
    const parsed = value === '' ? null : Number(value);

    this.selectedTemplateId.set(
      parsed !== null && Number.isInteger(parsed)
        ? parsed
        : null
    );

    this.activeFilters.set([]);
    this.pendingFilterKey.set('');
    this.pendingFilterValue.set('');
    this.ensureDistributionKey();
  }

  openAddFilter(): void {
    const first = this.availableFilterOptions()[0];
    this.pendingFilterKey.set(first?.key ?? '');
    this.pendingFilterValue.set(first?.values[0] ?? '');
    this.addFilterOpen.set(true);
  }

  closeAddFilter(): void {
    this.addFilterOpen.set(false);
    this.pendingFilterKey.set('');
    this.pendingFilterValue.set('');
  }

  selectPendingFilterKey(key: string): void {
    this.pendingFilterKey.set(key);
    const firstValue = this.filterOptions().find(
      option => option.key === key
    )?.values[0] ?? '';
    this.pendingFilterValue.set(firstValue);
  }

  addFilter(): void {
    const key = this.pendingFilterKey();
    const value = this.pendingFilterValue();

    if (!key || !value) {
      return;
    }

    this.activeFilters.update(current => [
      ...current,
      {
        id: crypto.randomUUID(),
        key,
        value
      }
    ]);

    this.closeAddFilter();
  }

  removeFilter(filterId: string): void {
    this.activeFilters.update(current =>
      current.filter(filter => filter.id !== filterId)
    );
  }

  clearFilters(): void {
    this.selectedTemplateId.set(null);
    this.activeFilters.set([]);
    this.closeAddFilter();
    this.ensureDistributionKey();
  }

  filterLabel(key: string): string {
    return this.filterOptions().find(option => option.key === key)?.label
      ?? this.humanizeKey(key);
  }

  private ensureDistributionKey(): void {
    queueMicrotask(() => {
      const keys = this.distributionKeys();
      const current = this.selectedDistributionKey();

      if (!keys.some(item => item.key === current)) {
        this.selectedDistributionKey.set(keys[0]?.key ?? '');
      }
    });
  }

  private resolveFieldLabel(key: string): string {
    for (const template of this.templates()) {
      try {
        const definition = JSON.parse(template.definitionJson) as {
          sections?: Array<{
            fields?: Array<{ key?: string; label?: string }>;
          }>;
        };

        for (const section of definition.sections ?? []) {
          const field = section.fields?.find(current => current.key === key);

          if (field?.label) {
            return field.label;
          }
        }
      } catch {
        continue;
      }
    }

    return this.humanizeKey(key);
  }

  private resolveCalculatedLabel(key: string): string {
    const name = key.replace(/^calculated_/, '');

    for (const template of this.templates()) {
      try {
        const definition = JSON.parse(template.definitionJson) as {
          rules?: {
            calculations?: Array<{ name?: string; label?: string }>;
          };
        };

        const calculation = definition.rules?.calculations?.find(
          current => current.name === name
        );

        if (calculation?.label) {
          return calculation.label;
        }
      } catch {
        continue;
      }
    }

    return this.humanizeKey(name);
  }

  private parseData(dataJson: string): Record<string, unknown> {
    try {
      const parsed: unknown = JSON.parse(dataJson);
      return this.isRecord(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  private isCalculatedKey(key: string): boolean {
    return key.startsWith('calculated_');
  }

  private displayValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }

    if (typeof value === 'boolean') {
      return value ? 'Sí' : 'No';
    }

    if (typeof value === 'string' || typeof value === 'number') {
      return String(value);
    }

    return JSON.stringify(value);
  }

  private toNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  }

  private humanizeKey(key: string): string {
    return key
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, character => character.toUpperCase());
  }

  private round(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
