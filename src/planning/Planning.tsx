import React, { useState, useEffect, useRef } from 'react';
import type { PlanningProject, PlanningAlert, PlanningSubTask, PlanningProps } from './types';

// Literal strings so Tailwind's scanner includes all dynamic color classes
const _TAILWIND_SAFELIST = [
  'bg-gray-400', 'bg-green-600', 'bg-yellow-500', 'bg-red-600',
  'bg-red-800', 'bg-blue-600', 'bg-purple-600', 'bg-gray-600',
  'text-red-600', 'text-blue-600', 'text-green-600', 'text-yellow-500',
  'text-purple-600', 'text-gray-600',
] as const;
void _TAILWIND_SAFELIST;

const CURRENT_YEAR = new Date().getFullYear();

const DEFAULT_PROJECTS: PlanningProject[] = [
  {
    id: 1, name: 'Projet Alpha (OTP 102)', start: `${CURRENT_YEAR}-01-05`, end: `${CURRENT_YEAR}-06-30`,
    progress: 75, color: 'bg-green-600', chef: 'Nader L.',
    alerts: [
      { id: 1, date: `${CURRENT_YEAR}-02-15`, type: 'alert', text: 'Retard livraison isolant', color: 'bg-red-600' },
      { id: 2, date: `${CURRENT_YEAR}-04-10`, type: 'milestone', text: 'Fin du gros œuvre attendue', color: 'bg-blue-600' },
    ],
    subTasks: [
      { id: 101, name: 'Installation chantier', start: `${CURRENT_YEAR}-01-05`, end: `${CURRENT_YEAR}-01-20`, progress: 100, color: 'bg-gray-600', dependsOn: '' },
      { id: 102, name: 'Gros oeuvre', start: `${CURRENT_YEAR}-01-21`, end: `${CURRENT_YEAR}-03-10`, progress: 100, color: 'bg-red-800', dependsOn: '101' },
      { id: 103, name: 'Étanchéité', start: `${CURRENT_YEAR}-03-15`, end: `${CURRENT_YEAR}-05-30`, progress: 40, color: 'bg-yellow-500', dependsOn: '102' },
    ],
  },
  { id: 2, name: 'Projet Beta (OTP 240)', start: `${CURRENT_YEAR}-03-15`, end: `${CURRENT_YEAR}-10-10`, progress: 30, color: 'bg-yellow-500', chef: 'Jean D.', alerts: [], subTasks: [] },
  { id: 3, name: 'Hôpital Sud', start: `${CURRENT_YEAR}-02-01`, end: `${CURRENT_YEAR}-11-30`, progress: 45, color: 'bg-green-600', chef: 'Alice M.', alerts: [], subTasks: [] },
  { id: 4, name: 'Lycée Jean Moulin', start: `${CURRENT_YEAR}-06-10`, end: `${CURRENT_YEAR}-12-20`, progress: 0, color: 'bg-gray-400', chef: 'Nader L.', alerts: [], subTasks: [] },
  { id: 5, name: 'Rénovation Gymnase', start: `${CURRENT_YEAR}-01-20`, end: `${CURRENT_YEAR}-04-30`, progress: 95, color: 'bg-red-600', chef: 'Marc P.', alerts: [], subTasks: [] },
];

const DEFAULT_PROJECT_NAMES = [
  'Projet Alpha (OTP 102)', 'Projet Beta (OTP 240)', 'Hôpital Sud',
  'Lycée Jean Moulin', 'Rénovation Gymnase', 'PSA SMAC | Paris',
];

const DEFAULT_CHEFS = ['Nader L.', 'Jean D.', 'Alice M.', 'Marc P.'];

const MONTHS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

const COLORS = [
  { value: 'bg-gray-400', label: 'À venir / Non démarré (Gris)' },
  { value: 'bg-green-600', label: 'Dans les temps (Vert)' },
  { value: 'bg-yellow-500', label: 'Vigilance (Jaune)' },
  { value: 'bg-red-600', label: 'En retard (Rouge)' },
];

const SUBTASK_COLORS = [
  { value: 'bg-blue-600', label: 'Bleu' },
  { value: 'bg-red-600', label: 'Rouge' },
  { value: 'bg-green-600', label: 'Vert' },
  { value: 'bg-yellow-500', label: 'Jaune' },
  { value: 'bg-purple-600', label: 'Violet' },
  { value: 'bg-gray-600', label: 'Gris' },
];

const INPUT_CLS = 'w-full p-2 border border-gray-300 rounded-md text-sm bg-gray-50 focus:ring-red-500 focus:border-red-500';
const INPUT_SM = 'w-full p-1.5 border border-gray-300 rounded text-sm bg-white';

type DragInfo =
  | { type: 'progress'; projectId: number; subTaskId: number | null; taskRect: DOMRect }
  | { type: 'alert'; projectId: number; alertId: number };

export function Planning({
  initialProjects = DEFAULT_PROJECTS,
  onProjectsChange,
  yearStart,
  yearEnd,
  availableProjectNames = DEFAULT_PROJECT_NAMES,
  availableChefs = DEFAULT_CHEFS,
  title,
  className,
}: PlanningProps) {
  const resolvedYearStart = yearStart ?? `${CURRENT_YEAR}-01-01`;
  const resolvedYearEnd = yearEnd ?? `${CURRENT_YEAR}-12-31`;
  const resolvedTitle = title ?? `Planning Global des Projets (Année ${new Date(resolvedYearStart).getFullYear()})`;

  const [projects, setProjects] = useState<PlanningProject[]>(initialProjects);

  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [newProject, setNewProject] = useState<Omit<PlanningProject, 'id' | 'alerts' | 'subTasks'>>({
    name: '', start: '', end: '', progress: 0, color: 'bg-gray-400', chef: '',
  });

  const [expandedIds, setExpandedIds] = useState<number[]>([]);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<PlanningProject | null>(null);

  const [newSubTask, setNewSubTask] = useState<Omit<PlanningSubTask, 'id'>>({
    name: '', start: '', end: '', progress: 0, color: 'bg-blue-600', dependsOn: '',
  });
  const [newAlert, setNewAlert] = useState<Omit<PlanningAlert, 'id'>>({
    date: '', text: '', type: 'alert', color: 'bg-red-600',
  });

  const ganttRef = useRef<HTMLDivElement>(null);
  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null);

  // Sync outward
  useEffect(() => {
    onProjectsChange?.(projects);
  }, [projects, onProjectsChange]);

  // Drag & Drop
  useEffect(() => {
    const projStart = new Date(resolvedYearStart);
    const projEnd = new Date(resolvedYearEnd);
    const totalDays = (projEnd.getTime() - projStart.getTime()) / 86400000;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragInfo || !ganttRef.current) return;
      const ganttRect = ganttRef.current.getBoundingClientRect();

      if (dragInfo.type === 'progress') {
        const { taskRect } = dragInfo;
        const raw = ((e.clientX - taskRect.left) / taskRect.width) * 100;
        const progress = Math.max(0, Math.min(100, Math.round(raw)));
        setProjects(prev => prev.map(p => {
          if (dragInfo.subTaskId !== null && p.id === dragInfo.projectId) {
            return { ...p, subTasks: p.subTasks.map(st => st.id === dragInfo.subTaskId ? { ...st, progress } : st) };
          }
          if (dragInfo.subTaskId === null && p.id === dragInfo.projectId) {
            return { ...p, progress };
          }
          return p;
        }));
      } else {
        const daysOffset = ((e.clientX - ganttRect.left) / ganttRect.width) * totalDays;
        const raw = new Date(projStart.getTime() + daysOffset * 86400000);
        const clamped = new Date(Math.max(projStart.getTime(), Math.min(projEnd.getTime(), raw.getTime())));
        const dateStr = clamped.toISOString().split('T')[0];
        setProjects(prev => prev.map(p => {
          if (p.id === dragInfo.projectId) {
            return { ...p, alerts: p.alerts.map(a => a.id === dragInfo.alertId ? { ...a, date: dateStr } : a) };
          }
          return p;
        }));
      }
    };

    const handleMouseUp = () => setDragInfo(null);

    if (dragInfo) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.userSelect = '';
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
    };
  }, [dragInfo, resolvedYearStart, resolvedYearEnd]);

  const startProgressDrag = (e: React.MouseEvent, projectId: number, subTaskId: number | null) => {
    e.stopPropagation();
    const taskBar = (e.target as HTMLElement).closest('.task-bar');
    if (taskBar) {
      setDragInfo({ type: 'progress', projectId, subTaskId, taskRect: taskBar.getBoundingClientRect() });
    }
  };

  const startAlertDrag = (e: React.MouseEvent, projectId: number, alertId: number) => {
    e.stopPropagation();
    setDragInfo({ type: 'alert', projectId, alertId });
  };

  // Gantt calculations
  const projStart = new Date(resolvedYearStart);
  const projEnd = new Date(resolvedYearEnd);
  const totalDays = (projEnd.getTime() - projStart.getTime()) / 86400000;

  const ganttPos = (startStr: string, endStr: string) => {
    const s = new Date(startStr);
    const e = new Date(endStr);
    const effStart = s < projStart ? projStart : s;
    const effEnd = e > projEnd ? projEnd : e;
    const left = (effStart.getTime() - projStart.getTime()) / 86400000;
    const width = (effEnd.getTime() - effStart.getTime()) / 86400000;
    return {
      left: `${(left / totalDays) * 100}%`,
      width: `${(width / totalDays) * 100}%`,
    };
  };

  // Handlers
  const toggleExpand = (id: number) =>
    setExpandedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const openEdit = (project: PlanningProject) => {
    setEditingProject({ ...project, subTasks: [...project.subTasks] });
    setEditModalOpen(true);
  };

  const saveEdit = () => {
    if (!editingProject) return;
    if (!editingProject.name || !editingProject.start || !editingProject.end) {
      alert('Veuillez remplir le nom et les dates du projet.');
      return;
    }
    setProjects(prev => prev.map(p => p.id === editingProject.id ? editingProject : p));
    setEditModalOpen(false);
  };

  const addSubTask = () => {
    if (!newSubTask.name || !newSubTask.start || !newSubTask.end) {
      alert('Veuillez remplir le nom et les dates de la sous-tâche.');
      return;
    }
    setEditingProject(prev => prev && ({
      ...prev,
      subTasks: [...prev.subTasks, { id: Date.now(), ...newSubTask }],
    }));
    setNewSubTask({ name: '', start: '', end: '', progress: 0, color: 'bg-blue-600', dependsOn: '' });
  };

  const deleteSubTask = (subId: number) =>
    setEditingProject(prev => prev && ({ ...prev, subTasks: prev.subTasks.filter(st => st.id !== subId) }));

  const addAlert = () => {
    if (!newAlert.date || !newAlert.text) {
      alert("Veuillez remplir la date et le texte de l'alerte.");
      return;
    }
    setEditingProject(prev => prev && ({
      ...prev,
      alerts: [...prev.alerts, { id: Date.now(), ...newAlert }],
    }));
    setNewAlert({ date: '', text: '', type: 'alert', color: 'bg-red-600' });
  };

  const deleteAlert = (alertId: number) =>
    setEditingProject(prev => prev && ({ ...prev, alerts: prev.alerts.filter(a => a.id !== alertId) }));

  const submitAddProject = () => {
    if (!newProject.name || !newProject.start || !newProject.end) {
      alert('Veuillez remplir le nom et les dates du projet.');
      return;
    }
    if (new Date(newProject.start) > new Date(newProject.end)) {
      alert('La date de fin doit être postérieure à la date de début.');
      return;
    }
    const existingIdx = projects.findIndex(p => p.name === newProject.name);
    if (existingIdx >= 0) {
      setProjects(prev => prev.map((p, i) => i === existingIdx ? { ...p, ...newProject } : p));
    } else {
      setProjects(prev => [...prev, { id: Date.now(), ...newProject, alerts: [], subTasks: [] }]);
    }
    setNewProject({ name: '', start: '', end: '', progress: 0, color: 'bg-gray-400', chef: '' });
    setAddModalOpen(false);
  };

  const deleteProject = (id: number) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce projet du planning ?')) {
      setProjects(prev => prev.filter(p => p.id !== id));
    }
  };

  return (
    <div className={`p-4 max-w-[1400px] mx-auto w-full${className ? ` ${className}` : ''}`}>
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
          <div>
            <h3 className="text-xl font-semibold m-0 text-gray-800">{resolvedTitle}</h3>
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1 bg-blue-50 p-1.5 rounded border border-blue-100 text-blue-800 inline-flex">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.671zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59" />
              </svg>
              <strong>Interactif :</strong>&nbsp;Glissez les barres de progression (%) et les jalons directement sur le graphique.
            </p>
          </div>
          <button className="shadow-md bg-red-800 text-white px-4 py-2 rounded-lg hover:bg-red-900" onClick={() => setAddModalOpen(true)}>
            + Ajouter un projet
          </button>
        </div>

        {/* Gantt */}
        <div className="border border-gray-200 rounded-lg overflow-x-auto bg-white shadow-sm">
          <div style={{ minWidth: '1000px' }}>
            {/* Month headers */}
            <div className="flex border-b border-gray-200 bg-gray-50 text-[10px] sm:text-xs font-semibold text-gray-600 uppercase tracking-wider">
              <div className="w-64 p-3 border-r border-gray-200 flex-shrink-0">Projet</div>
              <div className="flex-grow grid grid-cols-12 text-center">
                {MONTHS_FR.map((m, i) => (
                  <div key={i} className={`p-3 ${i < 11 ? 'border-r border-gray-200' : ''}`}>{m}</div>
                ))}
              </div>
            </div>

            {/* Rows */}
            <div className="relative" ref={ganttRef}>
              {/* Grid background */}
              <div className="absolute inset-0 flex ml-64 pointer-events-none">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className={`flex-1 ${i < 11 ? 'border-r border-gray-100' : ''}`} />
                ))}
              </div>

              {projects.map(proj => {
                const pos = ganttPos(proj.start, proj.end);
                const isExpanded = expandedIds.includes(proj.id);
                const hasSubTasks = proj.subTasks.length > 0;

                return (
                  <React.Fragment key={proj.id}>
                    {/* Project row */}
                    <div className="flex border-b border-gray-100 hover:bg-gray-50 transition-colors group relative">
                      <div className="w-64 p-3 border-r border-gray-200 flex-shrink-0 flex justify-between items-center gap-2">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <button
                            onClick={() => toggleExpand(proj.id)}
                            className={`p-1 text-gray-400 hover:text-gray-700 transition-transform ${isExpanded ? 'rotate-90' : ''} ${!hasSubTasks ? 'invisible' : ''}`}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                            </svg>
                          </button>
                          <div className="overflow-hidden">
                            <div className="text-sm font-bold text-gray-800 truncate" title={proj.name}>{proj.name}</div>
                            <div className="text-[11px] text-gray-500 mt-1 truncate">
                              {proj.chef || 'Non assigné'} | {new Date(proj.start).toLocaleDateString('fr-FR')} – {new Date(proj.end).toLocaleDateString('fr-FR')}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(proj)} className="text-blue-500 hover:text-blue-700 p-1" title="Modifier">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.89 1.113l-3.41 1.13a.98.98 0 01-1.24-1.24l1.13-3.41a4.5 4.5 0 011.113-1.89l12.43-12.43zm0 0L19.5 7.125" />
                            </svg>
                          </button>
                          <button onClick={() => deleteProject(proj.id)} className="text-red-500 hover:text-red-700 p-1" title="Supprimer">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Gantt bar zone */}
                      <div className="flex-grow relative py-3">
                        {/* Alerts & milestones */}
                        {proj.alerts.map(alert => {
                          const alertPos = ganttPos(alert.date, alert.date);
                          return (
                            <div
                              key={alert.id}
                              className="absolute z-30 cursor-pointer group/alert flex flex-col items-center"
                              style={{ left: alertPos.left, top: '50%', transform: 'translate(-50%, -50%)', cursor: dragInfo && 'alertId' in dragInfo && dragInfo.alertId === alert.id ? 'grabbing' : 'grab' }}
                              onMouseDown={e => startAlertDrag(e, proj.id, alert.id)}
                            >
                              {alert.type === 'alert' ? (
                                <div className={`w-4 h-4 ${alert.color || 'bg-red-600'} rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-md border border-white`}>!</div>
                              ) : (
                                <div className={`w-3 h-3 ${alert.color || 'bg-blue-600'} rotate-45 shadow-md border border-white`} />
                              )}
                              <div className="hidden group-hover/alert:block absolute bottom-full mb-2 bg-gray-800 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-40">
                                <span className="font-semibold">{new Date(alert.date).toLocaleDateString('fr-FR')}</span> : {alert.text}
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
                              </div>
                            </div>
                          );
                        })}

                        {/* Project bar */}
                        <div
                          className={`task-bar absolute h-6 rounded-md shadow-sm ${proj.color} flex items-center overflow-hidden z-10`}
                          style={{ left: pos.left, width: pos.width, top: '50%', transform: 'translateY(-50%)', minWidth: '2px' }}
                          title={`${proj.name} (${proj.progress}%)`}
                        >
                          <div className="absolute top-0 left-0 h-full bg-white opacity-30 pointer-events-none" style={{ width: `${proj.progress}%` }} />
                          <div
                            className="absolute top-0 h-full w-4 cursor-ew-resize hover:bg-black hover:bg-opacity-20 z-30 flex items-center justify-center group/handle"
                            style={{ left: `calc(${proj.progress}% - 8px)` }}
                            onMouseDown={e => startProgressDrag(e, proj.id, null)}
                          >
                            <div className="w-1 h-3 bg-white opacity-0 group-hover/handle:opacity-100 rounded-sm shadow-sm" />
                          </div>
                          <span className="text-[10px] text-white font-semibold px-2 relative z-20 truncate drop-shadow-md pointer-events-none">
                            {proj.progress}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Sub-task rows */}
                    {isExpanded && proj.subTasks.map(st => {
                      const stPos = ganttPos(st.start, st.end);
                      const depTask = st.dependsOn ? proj.subTasks.find(t => t.id.toString() === st.dependsOn) : null;
                      return (
                        <div key={st.id} className="flex border-b border-gray-50 bg-gray-50 hover:bg-gray-100 transition-colors relative">
                          <div className="w-64 p-2 pl-10 border-r border-gray-200 flex-shrink-0 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-3 h-3 text-gray-400 mr-2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                            <div className="overflow-hidden">
                              <div className="text-xs font-medium text-gray-600 truncate" title={st.name}>{st.name}</div>
                              {depTask && (
                                <div className="text-[10px] text-gray-400 truncate mt-0.5 flex items-center gap-1">
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-3 h-3">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                                  </svg>
                                  Dépend de: {depTask.name}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex-grow relative py-2">
                            {depTask && (
                              <div
                                className="absolute border-l-2 border-b-2 border-dashed border-gray-400 opacity-50"
                                style={{
                                  left: ganttPos(depTask.end, depTask.end).left,
                                  width: `calc(${stPos.left} - ${ganttPos(depTask.end, depTask.end).left})`,
                                  top: '-10px', height: '20px',
                                }}
                              />
                            )}
                            <div
                              className={`task-bar absolute h-4 rounded-sm shadow-sm ${st.color} flex items-center overflow-hidden z-10`}
                              style={{ left: stPos.left, width: stPos.width, top: '50%', transform: 'translateY(-50%)', minWidth: '2px' }}
                              title={`${st.name} (${st.progress}%)`}
                            >
                              <div className="absolute top-0 left-0 h-full bg-white opacity-30 pointer-events-none" style={{ width: `${st.progress}%` }} />
                              <div
                                className="absolute top-0 h-full w-4 cursor-ew-resize hover:bg-black hover:bg-opacity-20 z-30 flex items-center justify-center group/handle"
                                style={{ left: `calc(${st.progress}% - 8px)` }}
                                onMouseDown={e => startProgressDrag(e, proj.id, st.id)}
                              >
                                <div className="w-0.5 h-2 bg-white opacity-0 group-hover/handle:opacity-100 rounded-sm shadow-sm" />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </React.Fragment>
                );
              })}

              {projects.length === 0 && (
                <div className="p-8 text-center text-gray-500 italic">
                  Aucun projet planifié. Cliquez sur "Ajouter un projet" pour commencer.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 flex gap-4 text-xs text-gray-500 justify-center flex-wrap">
          <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-600 rounded-sm" /> Dans les temps</div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 bg-yellow-500 rounded-sm" /> Vigilance / Retard léger</div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-600 rounded-sm" /> En retard critique</div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 bg-gray-400 rounded-sm" /> À venir / Non démarré</div>
        </div>
      </div>

      {/* --- Modal: Add project --- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-bold text-gray-800">Ajouter un projet au planning</h3>
              <button onClick={() => setAddModalOpen(false)} className="text-gray-500 hover:text-gray-700 text-xl font-bold">&times;</button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom du Projet *</label>
                <select className={INPUT_CLS} value={newProject.name} onChange={e => setNewProject({ ...newProject, name: e.target.value })}>
                  <option value="">Sélectionner un projet disponible...</option>
                  {availableProjectNames.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Conducteur de travaux</label>
                  <select className={INPUT_CLS} value={newProject.chef} onChange={e => setNewProject({ ...newProject, chef: e.target.value })}>
                    <option value="">Sélectionner...</option>
                    {availableChefs.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Statut (Couleur)</label>
                  <select className={INPUT_CLS} value={newProject.color} onChange={e => setNewProject({ ...newProject, color: e.target.value })}>
                    {COLORS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date de début *</label>
                  <input type="date" className={INPUT_CLS} value={newProject.start} onChange={e => setNewProject({ ...newProject, start: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date de fin *</label>
                  <input type="date" className={INPUT_CLS} value={newProject.end} onChange={e => setNewProject({ ...newProject, end: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Progression Globale (%)</label>
                <input type="number" min="0" max="100" className={INPUT_CLS} value={newProject.progress} onChange={e => setNewProject({ ...newProject, progress: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t bg-gray-50">
              <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50" onClick={() => setAddModalOpen(false)}>Annuler</button>
              <button className="px-4 py-2 bg-red-800 text-white rounded-lg font-medium hover:bg-red-900 shadow-md" onClick={submitAddProject}>Ajouter au planning</button>
            </div>
          </div>
        </div>
      )}

      {/* --- Modal: Edit project --- */}
      {isEditModalOpen && editingProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-bold text-gray-800">Modifier le Projet</h3>
              <button onClick={() => setEditModalOpen(false)} className="text-gray-500 hover:text-gray-700 text-xl font-bold">&times;</button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto">
              {/* General info */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-800 border-b pb-2">Informations Générales</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom du Projet *</label>
                  <input type="text" className={INPUT_CLS} value={editingProject.name} onChange={e => setEditingProject({ ...editingProject, name: e.target.value })} />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Conducteur de travaux</label>
                    <select className={INPUT_CLS} value={editingProject.chef} onChange={e => setEditingProject({ ...editingProject, chef: e.target.value })}>
                      <option value="">Sélectionner...</option>
                      {availableChefs.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date de début *</label>
                    <input type="date" className={INPUT_CLS} value={editingProject.start} onChange={e => setEditingProject({ ...editingProject, start: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date de fin *</label>
                    <input type="date" className={INPUT_CLS} value={editingProject.end} onChange={e => setEditingProject({ ...editingProject, end: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Progression Globale (%)</label>
                    <input type="number" min="0" max="100" className={INPUT_CLS} value={editingProject.progress} onChange={e => setEditingProject({ ...editingProject, progress: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Statut (Couleur)</label>
                    <select className={INPUT_CLS} value={editingProject.color} onChange={e => setEditingProject({ ...editingProject, color: e.target.value })}>
                      {COLORS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Sub-tasks */}
              <div className="space-y-4 pt-4 border-t border-gray-200">
                <h4 className="font-semibold text-gray-800 border-b pb-2">Sous-tâches et Dépendances</h4>
                {editingProject.subTasks.length > 0 ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                    {editingProject.subTasks.map(st => (
                      <div key={st.id} className="flex justify-between items-center bg-gray-50 p-2 rounded border border-gray-200 text-sm">
                        <div className="flex gap-2 items-center">
                          <div className={`w-3 h-3 rounded-full ${st.color}`} />
                          <span className="font-medium">{st.name}</span>
                          <span className="text-gray-500">({new Date(st.start).toLocaleDateString('fr-FR')} – {new Date(st.end).toLocaleDateString('fr-FR')} | {st.progress}%)</span>
                          {st.dependsOn && (
                            <span className="bg-gray-200 text-gray-600 text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-3 h-3">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                              </svg>
                              Dépendance
                            </span>
                          )}
                        </div>
                        <button onClick={() => deleteSubTask(st.id)} className="text-red-500 hover:text-red-700">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">Aucune sous-tâche pour le moment.</p>
                )}
                {/* Add subtask form */}
                <div className="bg-gray-100 p-3 rounded-lg border border-gray-200">
                  <h5 className="text-xs font-semibold text-gray-600 uppercase mb-3">Ajouter une sous-tâche</h5>
                  <div className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-12 sm:col-span-3">
                      <label className="block text-[10px] uppercase font-semibold text-gray-500 mb-1">Nom *</label>
                      <input type="text" className={INPUT_SM} value={newSubTask.name} onChange={e => setNewSubTask({ ...newSubTask, name: e.target.value })} />
                    </div>
                    <div className="col-span-6 sm:col-span-2">
                      <label className="block text-[10px] uppercase font-semibold text-gray-500 mb-1">Début *</label>
                      <input type="date" className={INPUT_SM} value={newSubTask.start} onChange={e => setNewSubTask({ ...newSubTask, start: e.target.value })} />
                    </div>
                    <div className="col-span-6 sm:col-span-2">
                      <label className="block text-[10px] uppercase font-semibold text-gray-500 mb-1">Fin *</label>
                      <input type="date" className={INPUT_SM} value={newSubTask.end} onChange={e => setNewSubTask({ ...newSubTask, end: e.target.value })} />
                    </div>
                    <div className="col-span-6 sm:col-span-2">
                      <label className="block text-[10px] uppercase font-semibold text-gray-500 mb-1">Dépend de</label>
                      <select className={INPUT_SM} value={newSubTask.dependsOn} onChange={e => setNewSubTask({ ...newSubTask, dependsOn: e.target.value })}>
                        <option value="">Aucune</option>
                        {editingProject.subTasks.map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
                      </select>
                    </div>
                    <div className="col-span-6 sm:col-span-2">
                      <label className="block text-[10px] uppercase font-semibold text-gray-500 mb-1">Couleur</label>
                      <select className={INPUT_SM} value={newSubTask.color} onChange={e => setNewSubTask({ ...newSubTask, color: e.target.value })}>
                        {SUBTASK_COLORS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                    </div>
                    <div className="col-span-12 sm:col-span-1">
                      <button type="button" onClick={addSubTask} className="w-full bg-gray-800 hover:bg-gray-900 text-white p-1.5 rounded text-sm font-medium transition-colors" title="Ajouter">+</button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Alerts */}
              <div className="space-y-4 pt-4 border-t border-gray-200">
                <h4 className="font-semibold text-gray-800 border-b pb-2">Points d'action et Jalons</h4>
                {editingProject.alerts.length > 0 ? (
                  <div className="space-y-2">
                    {editingProject.alerts.map(alert => (
                      <div key={alert.id} className="flex justify-between items-center bg-red-50 p-2 rounded border border-red-100 text-sm">
                        <div className="flex gap-2 items-center">
                          {alert.type === 'alert'
                            ? <span className={`${alert.color ? alert.color.replace('bg-', 'text-') : 'text-red-600'} font-bold text-lg leading-none`}>!</span>
                            : <div className={`w-2.5 h-2.5 ${alert.color || 'bg-blue-600'} rotate-45`} />
                          }
                          <span className="font-semibold text-gray-700">{new Date(alert.date).toLocaleDateString('fr-FR')}</span>
                          <span className="text-gray-600">– {alert.text}</span>
                        </div>
                        <button onClick={() => deleteAlert(alert.id)} className="text-red-400 hover:text-red-700">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">Aucun point d'action ou jalon défini.</p>
                )}
                {/* Add alert form */}
                <div className="bg-red-50/50 p-3 rounded-lg border border-red-100">
                  <div className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-6 sm:col-span-2">
                      <label className="block text-[10px] uppercase font-semibold text-gray-500 mb-1">Date *</label>
                      <input type="date" className={INPUT_SM} value={newAlert.date} onChange={e => setNewAlert({ ...newAlert, date: e.target.value })} />
                    </div>
                    <div className="col-span-6 sm:col-span-2">
                      <label className="block text-[10px] uppercase font-semibold text-gray-500 mb-1">Type *</label>
                      <select className={INPUT_SM} value={newAlert.type} onChange={e => {
                        const type = e.target.value as 'alert' | 'milestone';
                        setNewAlert({ ...newAlert, type, color: type === 'alert' ? 'bg-red-600' : 'bg-blue-600' });
                      }}>
                        <option value="alert">Alerte</option>
                        <option value="milestone">Jalon</option>
                      </select>
                    </div>
                    <div className="col-span-12 sm:col-span-4">
                      <label className="block text-[10px] uppercase font-semibold text-gray-500 mb-1">Description *</label>
                      <input type="text" placeholder="Ex: Livraison grue..." className={INPUT_SM} value={newAlert.text} onChange={e => setNewAlert({ ...newAlert, text: e.target.value })} />
                    </div>
                    <div className="col-span-6 sm:col-span-2">
                      <label className="block text-[10px] uppercase font-semibold text-gray-500 mb-1">Couleur</label>
                      <select className={INPUT_SM} value={newAlert.color} onChange={e => setNewAlert({ ...newAlert, color: e.target.value })}>
                        {SUBTASK_COLORS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                    </div>
                    <div className="col-span-6 sm:col-span-2">
                      <button type="button" onClick={addAlert} className="w-full bg-red-700 hover:bg-red-800 text-white p-1.5 rounded text-sm font-medium transition-colors">Ajouter</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 p-4 border-t bg-gray-50">
              <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50" onClick={() => setEditModalOpen(false)}>Annuler</button>
              <button className="px-4 py-2 bg-red-800 text-white rounded-lg font-medium hover:bg-red-900 shadow-md" onClick={saveEdit}>Sauvegarder le projet</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Planning;
