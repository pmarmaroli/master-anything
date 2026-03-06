import { useEffect, useRef } from 'react';

interface AboutModalProps {
  show: boolean;
  onClose: () => void;
  language?: string | null;
}

export function AboutModal({ show, onClose, language }: AboutModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (show && !el.open) el.showModal();
    else if (!show && el.open) el.close();
  }, [show]);

  if (!show) return null;

  const fr = language === 'fr';

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="max-w-lg w-[90vw] rounded-2xl p-0 backdrop:bg-black/40 backdrop:backdrop-blur-sm"
    >
      <div className="p-6 sm:p-8 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-amber-900">
            {fr ? 'Comment ca marche ?' : 'How does it work?'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-amber-600 hover:bg-amber-100 transition-colors text-lg"
          >
            &times;
          </button>
        </div>

        <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
          <p>
            {fr
              ? "Master Anything vous aide a maitriser n'importe quel sujet en vous faisant l'enseigner. C'est base sur la methode Feynman : si vous pouvez expliquer simplement un concept, c'est que vous le comprenez vraiment."
              : "Master Anything helps you deeply learn any subject by having you teach it. It's based on the Feynman Method: if you can explain a concept simply, you truly understand it."}
          </p>

          <div className="bg-white/80 rounded-xl p-4 border border-amber-200">
            <h3 className="font-semibold text-amber-900 mb-2">
              {fr ? 'Le parcours' : 'The journey'}
            </h3>
            <ol className="space-y-1.5 list-decimal list-inside text-gray-600">
              <li>{fr ? "On evalue votre niveau et on cree un plan d'apprentissage personnalise" : 'We assess your level and create a personalized learning plan'}</li>
              <li>{fr ? 'Vous apprenez chaque concept, puis vous l\'expliquez avec vos mots' : 'You learn each concept, then explain it in your own words'}</li>
              <li>{fr ? 'Un "eleve naif" vous pose des questions pour tester votre comprehension' : 'A "naive student" asks questions to test your understanding'}</li>
              <li>{fr ? 'Vous etes evalue et guidez jusqu\'a la maitrise complete' : "You're scored and guided until full mastery"}</li>
            </ol>
          </div>

          <div className="bg-white/80 rounded-xl p-4 border border-amber-200">
            <h3 className="font-semibold text-amber-900 mb-2">
              {fr ? '6 agents IA collaborent pour vous' : '6 AI agents collaborate for you'}
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
              <div><span className="font-medium text-amber-800">{fr ? 'Architecte' : 'Architect'}</span> — {fr ? 'evalue et planifie' : 'assesses & plans'}</div>
              <div><span className="font-medium text-amber-800">{fr ? 'Mentor' : 'Mentor'}</span> — {fr ? 'enseigne et guide' : 'teaches & guides'}</div>
              <div><span className="font-medium text-amber-800">{fr ? 'Challengeur' : 'Challenger'}</span> — {fr ? 'questionne en profondeur' : 'probes deeply'}</div>
              <div><span className="font-medium text-amber-800">{fr ? 'Eleve naif' : 'Naive Student'}</span> — {fr ? 'force la simplification' : 'forces simplification'}</div>
              <div><span className="font-medium text-amber-800">{fr ? 'Evaluateur' : 'Evaluator'}</span> — {fr ? 'mesure la maitrise' : 'measures mastery'}</div>
              <div><span className="font-medium text-amber-800">{fr ? 'Orchestrateur' : 'Orchestrator'}</span> — {fr ? 'coordonne le tout' : 'coordinates all'}</div>
            </div>
          </div>

          <p className="text-xs text-amber-600/70 text-center pt-1">
            {fr ? 'Propulse par Azure AI Foundry — ' : 'Powered by Azure AI Foundry — '}
            <a
              href="https://github.com/pmarmaroli/master-anything"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-amber-800 transition-colors"
            >
              {fr ? 'Open source sur GitHub' : 'Open source on GitHub'}
            </a>
          </p>
        </div>
      </div>
    </dialog>
  );
}
