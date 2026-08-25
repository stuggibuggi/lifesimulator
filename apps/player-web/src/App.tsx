import React, { useEffect } from 'react';
import { useGameStore } from './store/gameStore';
import { WelcomeScreen } from './components/WelcomeScreen';
import { CharacterSetupScreen } from './components/CharacterSetupScreen';
import { GoalSelectionScreen } from './components/GoalSelectionScreen';
import { CareerSelectionScreen } from './components/CareerSelectionScreen';
import { TopNavigation } from './components/TopNavigation';
import { IsometricTown } from './components/IsometricTown';
import { EventModal } from './components/EventModal';
import { BankModal } from './components/BankModal';
import { InsuranceModal } from './components/InsuranceModal';
import { BudgetModal } from './components/BudgetModal';
import { GoalsModal } from './components/GoalsModal';
import { LearningModal } from './components/LearningModal';
import { CareerModal } from './components/CareerModal';
import { MobilityModal } from './components/MobilityModal';
import { HousingModal } from './components/HousingModal';
import { FamilyModal } from './components/FamilyModal';
import { PensionModal } from './components/PensionModal';
import { TaxModal } from './components/TaxModal';
import { ClassroomModal } from './components/ClassroomModal';
import { ScenarioSelectionModal } from './components/ScenarioSelectionModal';
import { TransactionsModal } from './components/TransactionsModal';
import { PhoneModal } from './components/PhoneModal';
import { EvaluationView } from './components/EvaluationView';
import { ClassroomAuthModal } from './components/ClassroomAuthModal';
import { ContentAdminModal } from './components/ContentAdminModal';

export const App: React.FC = () => {
  const { gamePhase, gameState, activeModal, eventChoiceFeedback, setActiveModal, closeModal, loadPublishedContent } = useGameStore();

  useEffect(() => {
    void loadPublishedContent();
  }, [loadPublishedContent]);

  useEffect(() => {
    try {
      if (new URLSearchParams(window.location.search).get('join')) {
        setActiveModal('JOIN_CLASS_MODAL');
      }
    } catch {
      // ignore malformed URLs in embedded contexts
    }
  }, [setActiveModal]);

  return (
    <div className="min-h-screen bg-[#fdfbf7] flex flex-col font-sans">
      {/* 1. Welcome Screen */}
      {gamePhase === 'WELCOME' && <WelcomeScreen />}

      {/* Scenario picker must work from welcome, not only during PLAYING */}
      {activeModal === 'SCENARIO_SELECTION_MODAL' && <ScenarioSelectionModal />}
      {activeModal === 'JOIN_CLASS_MODAL' && (
        <ClassroomAuthModal mode="JOIN" onClose={closeModal} />
      )}
      {activeModal === 'TEACHER_AUTH_MODAL' && (
        <ClassroomAuthModal mode="TEACHER" onClose={closeModal} />
      )}
      {activeModal === 'CONTENT_ADMIN_MODAL' && <ContentAdminModal />}

      {/* 2. Character Setup Screen */}
      {gamePhase === 'CHARACTER_CREATION' && <CharacterSetupScreen />}

      {/* 3. Life Goals Selection */}
      {gamePhase === 'GOAL_SELECTION' && <GoalSelectionScreen />}

      {/* 4. Career / Education Selection */}
      {gamePhase === 'CAREER_SELECTION' && <CareerSelectionScreen />}

      {/* 5. Main Game Loop / Playing View */}
      {gamePhase === 'PLAYING' && gameState && (
        <div className="flex-1 flex flex-col">
          {/* Top HUD with non-overlapping metrics and tooltips */}
          <TopNavigation />

          {/* Main Town Map & Management Canvas */}
          <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 flex flex-col gap-4">
            {/* Interactive Zoomable & Pannable Town Map */}
            <IsometricTown />

            {/* Quick Location Action Dock */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-10 gap-2">
              <button
                onClick={() => setActiveModal('PHONE_MODAL')}
                className="p-3 rounded-2xl bg-white hover:bg-skyline-50/60 border-2 border-skyline-300 hover:border-skyline-500 shadow-xs transition-all flex flex-col items-center gap-1 text-center active:scale-95 cursor-pointer"
              >
                <div className="w-8 h-8 rounded-xl bg-skyline-100 text-skyline-700 flex items-center justify-center text-base shadow-xs">
                  📱
                </div>
                <span className="font-extrabold text-xs text-skyline-900">Handy</span>
                <span className="text-[10px] text-skyline-600 font-bold">Chats & Anrufe</span>
              </button>

              <button
                onClick={() => setActiveModal('BANK')}
                className="p-3 rounded-2xl bg-white hover:bg-matcha-50/60 border-2 border-cozy-border hover:border-matcha-500 shadow-xs transition-all flex flex-col items-center gap-1 text-center active:scale-95 cursor-pointer"
              >
                <div className="w-8 h-8 rounded-xl bg-matcha-100 text-matcha-800 flex items-center justify-center text-base shadow-xs">
                  🏦
                </div>
                <span className="font-extrabold text-xs text-gray-800">Sparkasse</span>
                <span className="text-[10px] text-gray-400 font-bold">Konto & ETF</span>
              </button>

              <button
                onClick={() => setActiveModal('TAX_MODAL')}
                className="p-3 rounded-2xl bg-white hover:bg-amber-50/60 border-2 border-cozy-border hover:border-amber-500 shadow-xs transition-all flex flex-col items-center gap-1 text-center active:scale-95 cursor-pointer"
              >
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center text-base shadow-xs">
                  🧾
                </div>
                <span className="font-extrabold text-xs text-gray-800">Steuern</span>
                <span className="text-[10px] text-gray-400 font-bold">Brutto/Netto</span>
              </button>

              <button
                onClick={() => setActiveModal('INSURANCE_OFFICE')}
                className="p-3 rounded-2xl bg-white hover:bg-skyline-50/60 border-2 border-cozy-border hover:border-skyline-400 shadow-xs transition-all flex flex-col items-center gap-1 text-center active:scale-95 cursor-pointer"
              >
                <div className="w-8 h-8 rounded-xl bg-skyline-100 text-skyline-700 flex items-center justify-center text-base shadow-xs">
                  🛡️
                </div>
                <span className="font-extrabold text-xs text-gray-800 truncate max-w-full">Versicherungsschutz</span>
                <span className="text-[10px] text-gray-400 font-bold">Policen & Risiken</span>
              </button>

              <button
                onClick={() => setActiveModal('PENSION_MODAL')}
                className="p-3 rounded-2xl bg-white hover:bg-indigo-50/60 border-2 border-cozy-border hover:border-indigo-400 shadow-xs transition-all flex flex-col items-center gap-1 text-center active:scale-95 cursor-pointer"
              >
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-base shadow-xs">
                  🏖️
                </div>
                <span className="font-extrabold text-xs text-gray-800">Rente</span>
                <span className="text-[10px] text-gray-400 font-bold">bAV & 3-Säulen</span>
              </button>

              <button
                onClick={() => setActiveModal('PARK_SHRINE')}
                className="p-3 rounded-2xl bg-white hover:bg-rose-50/60 border-2 border-cozy-border hover:border-rose-400 shadow-xs transition-all flex flex-col items-center gap-1 text-center active:scale-95 cursor-pointer"
              >
                <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center text-base shadow-xs">
                  ❤️
                </div>
                <span className="font-extrabold text-xs text-gray-800">Familie</span>
                <span className="text-[10px] text-gray-400 font-bold">Partner/Kinder</span>
              </button>

              <button
                onClick={() => setActiveModal('MARKET')}
                className="p-3 rounded-2xl bg-white hover:bg-emerald-50/60 border-2 border-cozy-border hover:border-emerald-400 shadow-xs transition-all flex flex-col items-center gap-1 text-center active:scale-95 cursor-pointer"
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-base shadow-xs">
                  🚗
                </div>
                <span className="font-extrabold text-xs text-gray-800">Mobilität</span>
                <span className="text-[10px] text-gray-400 font-bold">Auto & ÖPNV</span>
              </button>

              <button
                onClick={() => setActiveModal('BUDGET_MODAL')}
                className="p-3 rounded-2xl bg-white hover:bg-terracotta-50/60 border-2 border-cozy-border hover:border-terracotta-400 shadow-xs transition-all flex flex-col items-center gap-1 text-center active:scale-95 cursor-pointer"
              >
                <div className="w-8 h-8 rounded-xl bg-terracotta-100 text-terracotta-700 flex items-center justify-center text-base shadow-xs">
                  📊
                </div>
                <span className="font-extrabold text-xs text-gray-800">Budgetplan</span>
                <span className="text-[10px] text-gray-400 font-bold">50-30-20</span>
              </button>

              <button
                onClick={() => setActiveModal('CLASSROOM_MODAL')}
                className="p-3 rounded-2xl bg-white hover:bg-indigo-50/60 border-2 border-cozy-border hover:border-indigo-400 shadow-xs transition-all flex flex-col items-center gap-1 text-center active:scale-95 cursor-pointer"
              >
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-base shadow-xs">
                  🎓
                </div>
                <span className="font-extrabold text-xs text-gray-800">Klasse</span>
                <span className="text-[10px] text-gray-400 font-bold">Dashboard/Code</span>
              </button>

              <button
                onClick={() => setActiveModal('LEARNING_MODAL')}
                className="p-3 rounded-2xl bg-white hover:bg-indigo-50/60 border-2 border-cozy-border hover:border-indigo-400 shadow-xs transition-all flex flex-col items-center gap-1 text-center active:scale-95 cursor-pointer"
              >
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-base shadow-xs">
                  💡
                </div>
                <span className="font-extrabold text-xs text-gray-800">Wissen</span>
                <span className="text-[10px] text-gray-400 font-bold">Lernkarten</span>
              </button>
            </div>
          </main>

          {/* Active Event Dilemma Modal (only triggers when running and unpaused) */}
          {(gameState.activeEvent || eventChoiceFeedback) && <EventModal />}

          {/* Location / Action Modals */}
          {activeModal === 'PHONE_MODAL' && <PhoneModal />}
          {activeModal === 'BANK' && <BankModal />}
          {activeModal === 'INSURANCE_OFFICE' && <InsuranceModal />}
          {activeModal === 'WORK' && <CareerModal />}
          {activeModal === 'SCHOOL_UNI' && <CareerModal />}
          {activeModal === 'HOME' && <HousingModal />}
          {activeModal === 'HOUSING_MODAL' && <HousingModal />}
          {activeModal === 'PARK_SHRINE' && <FamilyModal />}
          {activeModal === 'FAMILY_MODAL' && <FamilyModal />}
          {activeModal === 'PENSION_MODAL' && <PensionModal />}
          {activeModal === 'TAX_MODAL' && <TaxModal />}
          {activeModal === 'CLASSROOM_MODAL' && <ClassroomModal />}
          {activeModal === 'MARKET' && <MobilityModal />}
          {activeModal === 'MOBILITY_MODAL' && <MobilityModal />}
          {activeModal === 'BUDGET_MODAL' && <BudgetModal />}
          {activeModal === 'GOALS_MODAL' && <GoalsModal />}
          {activeModal === 'LEARNING_MODAL' && <LearningModal />}
          {activeModal === 'TRANSACTIONS_MODAL' && <TransactionsModal />}
        </div>
      )}

      {/* 6. End of Life Evaluation Screen */}
      {gamePhase === 'EVALUATION' && <EvaluationView />}
    </div>
  );
};
