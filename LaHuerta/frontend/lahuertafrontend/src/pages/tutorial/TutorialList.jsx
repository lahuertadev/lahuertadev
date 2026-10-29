import React from 'react';
import { useNavigate } from 'react-router-dom';
import BackButton from '../../components/BackButton';
import TutorialCard from '../../components/TutorialCard';
import { breadcrumbsMap } from '../../constants/breadcrumbs';
import { useTutorial } from '../../context/TutorialContext';

/**
 * Sección Tutoriales del menú: todos los tutoriales guiados que puede ver el usuario, agrupados
 * por sección del menú lateral (en el orden que vienen del backend) y con el estado de cada uno.
 * "Empezar" lleva a la pantalla del tutorial y lo arranca. En cada pantalla, el botón del birrete
 * muestra solo el de esa pantalla.
 */
const TutorialList = () => {
  const navigate = useNavigate();
  const { tutorials, progress, startTutorial } = useTutorial();

  // Vienen en orden desde el backend: cada sección aparece donde aparece su primer tutorial.
  const groups = tutorials.reduce((result, tutorial) => {
    const group = result.find((candidate) => candidate.section === tutorial.section);
    if (group) group.items.push(tutorial);
    else result.push({ section: tutorial.section, items: [tutorial] });
    return result;
  }, []);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-4">
      <div className="flex items-center justify-between gap-4 border-b border-border-subtle pb-4">
        <nav className="flex flex-wrap items-center gap-2 text-sm font-medium text-on-surface-muted">
          {breadcrumbsMap['/tutorials'].map((crumb, index) => (
            <React.Fragment key={crumb.label}>
              {index > 0 && <span className="text-xs">›</span>}
              {crumb.path ? (
                <span className="cursor-pointer whitespace-nowrap transition-colors hover:text-accent" onClick={() => navigate(crumb.path)}>
                  {crumb.label}
                </span>
              ) : (
                <span className="whitespace-nowrap font-semibold text-on-surface">{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
        <BackButton onClick={() => navigate('/')} className="shrink-0 px-5 py-2.5 text-sm" />
      </div>

      <div className="rounded-xl border border-border-subtle bg-surface-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-on-surface">Tutoriales</h2>
        <p className="mt-1 text-sm text-on-surface-muted">
          Te guían paso a paso mientras hacés la tarea real: lo que cargues queda guardado y podés salir cuando quieras.
          En cada pantalla que tiene tutorial, también lo encontrás en el botón del birrete, abajo a la derecha.
        </p>
      </div>

      {groups.length === 0 && (
        <p className="text-center text-sm text-on-surface-muted">No hay tutoriales disponibles.</p>
      )}

      {groups.map(({ section, items }) => (
        <section key={section} className="space-y-3">
          <h3 className="px-1 text-[0.6875rem] font-bold uppercase tracking-wider text-on-surface-muted">{section}</h3>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {items.map((tutorial) => (
              <TutorialCard key={tutorial.key} tutorial={tutorial} status={progress[tutorial.key]} onStart={startTutorial} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
};

export default TutorialList;
