export type AlertType = 'alert' | 'milestone';

export type StatusColor =
  | 'bg-gray-400'
  | 'bg-green-600'
  | 'bg-yellow-500'
  | 'bg-red-600'
  | 'bg-red-800'
  | 'bg-blue-600'
  | 'bg-purple-600'
  | 'bg-gray-600'
  | (string & {});

export interface PlanningAlert {
  id: number;
  date: string;
  type: AlertType;
  text: string;
  color: StatusColor;
}

export interface PlanningSubTask {
  id: number;
  name: string;
  start: string;
  end: string;
  progress: number;
  color: StatusColor;
  /** ID (as string) of the subtask this depends on, or empty string */
  dependsOn: string;
}

export interface PlanningProject {
  id: number;
  name: string;
  start: string;
  end: string;
  progress: number;
  color: StatusColor;
  chef: string;
  alerts: PlanningAlert[];
  subTasks: PlanningSubTask[];
}

export interface PlanningProps {
  /** Initial project list. Defaults to built-in sample data. */
  initialProjects?: PlanningProject[];
  /** Called whenever the project list changes (add / edit / delete / drag). */
  onProjectsChange?: (projects: PlanningProject[]) => void;
  /** ISO date string for the start of the timeline axis. Defaults to Jan 1 of the current year. */
  yearStart?: string;
  /** ISO date string for the end of the timeline axis. Defaults to Dec 31 of the current year. */
  yearEnd?: string;
  /** Project names shown in the "Add project" dropdown. */
  availableProjectNames?: string[];
  /** Conductor names shown in the chef dropdown. */
  availableChefs?: string[];
  /** Card title. Defaults to "Planning Global des Projets (Année YYYY)". */
  title?: string;
  /** Extra CSS class on the root wrapper. */
  className?: string;
}
