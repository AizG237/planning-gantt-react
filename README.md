# planning-gantt-react
Composant Gantt interactif React/TypeScript — visualisation de projets sur timeline annuelle avec sous-tâches, jalons et alertes.

# Module Planning — Guide d'intégration

Composant Gantt interactif pour React. Permet de visualiser et gérer des projets sur une timeline annuelle, avec sous-tâches, jalons et alertes.

---

## Prérequis

- React 18 ou supérieur
- Tailwind CSS v3 configuré dans le projet cible

---

## Étapes d'intégration

### Étape 1 — Copier le dossier du module

Copier le dossier `src/planning/` dans le projet cible, par exemple dans `src/components/` :

```
votre-projet/
└── src/
    └── components/
        └── planning/
            ├── index.ts
            ├── Planning.tsx
            └── types.ts
```

### Étape 2 — Vérifier Tailwind CSS v3

Le composant utilise des classes Tailwind CSS v3. Si ce n'est pas déjà fait, installer et configurer Tailwind v3 dans le projet cible.

**Installation :**

```bash
npm install -D tailwindcss@^3.4 postcss autoprefixer
npx tailwindcss init -p
```

**Fichier `tailwind.config.js` — ajouter le chemin vers le module :**

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: { extend: {} },
  plugins: [],
}
```

**Fichier CSS global — ajouter les directives Tailwind :**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### Étape 3 — Utiliser le composant

Importer `Planning` depuis le dossier copié :

```tsx
import { Planning } from './components/planning'
```

**Utilisation minimale** (données d'exemple intégrées) :

```tsx
export default function App() {
  return <Planning />
}
```

**Utilisation avec vos propres données :**

```tsx
import { useState } from 'react'
import { Planning } from './components/planning'
import type { PlanningProject } from './components/planning'

export default function App() {
  const [projects, setProjects] = useState<PlanningProject[]>([
    {
      id: 1,
      name: 'Projet Alpha',
      start: '2026-01-01',
      end: '2026-06-30',
      progress: 40,
      color: 'bg-green-600',
      chef: 'Jean Dupont',
      alerts: [],
      subTasks: [],
    },
  ])

  return (
    <Planning
      initialProjects={projects}
      onProjectsChange={setProjects}
      yearStart="2026-01-01"
      yearEnd="2026-12-31"
      title="Planning Chantier 2026"
      availableProjectNames={['Projet Alpha', 'Projet Beta']}
      availableChefs={['Jean Dupont', 'Marie Martin']}
    />
  )
}
```
<!-- ICI ON VERRA EN FONCTION DE LA BD  -->
---

## Propriétés du composant

| Propriété              | Type                                    | Défaut                              | Description                                              |
|------------------------|-----------------------------------------|-------------------------------------|----------------------------------------------------------|
| `initialProjects`      | `PlanningProject[]`                     | Données d'exemple intégrées         | Liste initiale des projets à afficher                    |
| `onProjectsChange`     | `(projects: PlanningProject[]) => void` | —                                   | Appelé à chaque modification (ajout, édition, suppression, glisser-déposer) |
| `yearStart`            | `string` (date ISO)                     | `AAAA-01-01` (année en cours)       | Début de l'axe temporel                                  |
| `yearEnd`              | `string` (date ISO)                     | `AAAA-12-31` (année en cours)       | Fin de l'axe temporel                                    |
| `availableProjectNames`| `string[]`                              | Liste d'exemple                     | Noms proposés dans le menu déroulant "Ajouter un projet" |
| `availableChefs`       | `string[]`                              | Liste d'exemple                     | Noms des conducteurs de travaux proposés                 |
| `title`                | `string`                                | `"Planning Global des Projets..."` | Titre affiché en en-tête du composant                    |
| `className`            | `string`                                | —                                   | Classe CSS supplémentaire sur l'élément racine           |

---

## Structure des types

```ts
interface PlanningProject {
  id: number
  name: string
  start: string        // date ISO : "2026-01-15"
  end: string          // date ISO : "2026-06-30"
  progress: number     // 0 à 100
  color: string        // classe Tailwind : "bg-green-600"
  chef: string
  alerts: PlanningAlert[]
  subTasks: PlanningSubTask[]
}

interface PlanningSubTask {
  id: number
  name: string
  start: string
  end: string
  progress: number
  color: string
  dependsOn: string    // id (en string) de la sous-tâche dont elle dépend, ou ""
}

interface PlanningAlert {
  id: number
  date: string
  type: 'alert' | 'milestone'
  text: string
  color: string
}
```

---

## Couleurs disponibles

| Classe Tailwind   | Signification                  |
|-------------------|-------------------------------|
| `bg-gray-400`     | A venir / Non démarré         |
| `bg-green-600`    | Dans les temps                |
| `bg-yellow-500`   | Vigilance / Retard léger      |
| `bg-red-600`      | En retard critique            |

---

## Persistance des données

Le composant gère son état en interne. Pour persister les modifications (base de données, localStorage, API), utiliser la propriété `onProjectsChange` :

```tsx
const handleChange = (projects: PlanningProject[]) => {
  // Sauvegarder dans une base de données, une API, ou le localStorage
  localStorage.setItem('planning', JSON.stringify(projects))
}

<Planning onProjectsChange={handleChange} />
```

