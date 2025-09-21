import {
  CalendarConfig,
  CalendarLegendItem,
} from '../components/generic-calendar/generic-calendar.component';

/**
 * Configuration commune pour tous les calendriers de l'application
 * Garantit une présentation cohérente et uniforme
 */
export const COMMON_CALENDAR_DIMENSIONS = {
  employeeColumnWidth: 300,
  cellWidth: 24,
  cellHeight: 32,
};

/**
 * Configuration de base commune à tous les calendriers
 */
export const BASE_CALENDAR_CONFIG: Partial<CalendarConfig> = {
  ...COMMON_CALENDAR_DIMENSIONS,
  showEmployeeSearch: true,
  allowMultiSelect: true,
  allowDragSelect: true,
};

/**
 * Légendes pour le calendrier des congés
 */
export const LEAVE_CALENDAR_LEGENDS: CalendarLegendItem[] = [
  { status: 'worked', label: 'Jour travaillé', color: '#ffffff' },
  { status: 'approved', label: 'Congé approuvé', color: '#10b981' },
  { status: 'pending', label: 'En attente', color: '#f59e0b' },
  { status: 'rejected', label: 'Refusé', color: '#ef4444' },
  { status: 'rtt', label: 'RTT', color: '#3b82f6' },
  { status: 'holiday', label: 'Jour férié', color: '#6b7280' },
  { status: 'weekend', label: 'Week-end', color: '#f1f5f9' },
];

/**
 * Légendes pour le calendrier CRA
 */
export const CRA_CALENDAR_LEGENDS: CalendarLegendItem[] = [
  { status: 'empty', label: 'À saisir', color: '#f8fafc' },
  { status: 'partial', label: '0.5 jour', color: '#fef3c7' },
  { status: 'full', label: '1 jour', color: '#d1fae5' },
  { status: 'vacation', label: 'Congé payé', color: '#3b82f6' },
  { status: 'rtt', label: 'RTT', color: '#8b5cf6' },
  { status: 'sick_leave', label: 'Maladie', color: '#ef4444' },
  { status: 'holiday', label: 'Jour férié', color: '#6b7280' },
  { status: 'weekend', label: 'Week-end', color: '#e5e7eb' },
];

/**
 * Configuration complète pour le calendrier des congés
 */
export const LEAVE_CALENDAR_CONFIG: CalendarConfig = {
  ...BASE_CALENDAR_CONFIG,
  mode: 'leave-management',
  viewMode: 'year',
  showEmployeeSearch: true,
  showFilters: true,
  showLegend: true,
  showMultiSelection: true,
  allowCellEditing: false,
  title: 'Calendrier des congés',
  legends: LEAVE_CALENDAR_LEGENDS,
};

/**
 * Configuration complète pour le calendrier CRA
 */
export const CRA_CALENDAR_CONFIG: CalendarConfig = {
  ...BASE_CALENDAR_CONFIG,
  mode: 'cra',
  viewMode: 'month',
  showEmployeeSearch: false,
  showFilters: false,
  showLegend: true,
  showMultiSelection: true,
  allowCellEditing: true,
  title: "Compte Rendu d'Activité (CRA)",
  legends: CRA_CALENDAR_LEGENDS,
};
