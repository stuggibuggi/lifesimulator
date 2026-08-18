import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { sound } from '../audio/soundSynth';
import {
  X,
  MessageSquare,
  Phone,
  Bell,
  Send,
  PhoneCall,
  PhoneOff,
  User,
  ShieldCheck,
  Building,
  Receipt,
  Home,
  CheckCircle2,
  Sparkles,
  Wifi,
  Battery,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'THEM' | 'ME';
  text: string;
  time: string;
}

interface ChatContact {
  id: string;
  name: string;
  role: string;
  avatar: string;
  status: string;
  unreadCount?: number;
  messages: ChatMessage[];
  quickReplies: { text: string; response: string; knowledgeGain?: number; happinessGain?: number }[];
}

interface AdvisorContact {
  id: string;
  name: string;
  role: string;
  icon: string;
  color: string;
  phone: string;
  faqs: {
    question: string;
    answer: string;
    learningTip: string;
  }[];
}

const INITIAL_CHATS: ChatContact[] = [
  {
    id: 'robin',
    name: 'Robin',
    role: 'Bester Freund',
    avatar: '🎒',
    status: 'Online',
    unreadCount: 1,
    messages: [
      {
        id: 'm1',
        sender: 'THEM',
        text: 'Hey! Wie läuft dein Budget diesen Monat? Wollen wir am Wochenende ins Kino gehen oder lieber zusammen kochen?',
        time: '14:20',
      },
    ],
    quickReplies: [
      {
        text: 'Lass uns zusammen kochen! Das spart locker 25 € für den Notgroschen 🍳',
        response: 'Mega Idee! Ich bringe die Zutaten mit. Günstig und macht sogar mehr Spaß!',
        knowledgeGain: 5,
        happinessGain: 5,
      },
      {
        text: 'Kino geht klar! Ich habe noch etwas Puffer in meinem 30%-Freizeitbudget 🍿',
        response: 'Super, freue mich schon! Popcorn geht auf mich!',
        happinessGain: 10,
      },
    ],
  },
  {
    id: 'parents',
    name: 'Mama & Papa',
    role: 'Familie',
    avatar: '🏡',
    status: 'Zuletzt online vor 10 Min.',
    messages: [
      {
        id: 'p1',
        sender: 'THEM',
        text: 'Hallo mein Schatz! Denk bitte daran: Schließe niemals teure Abos am Telefon ab und behalte immer deinen Notgroschen im Auge. Wir sind stolz auf dich!',
        time: 'Gestern',
      },
    ],
    quickReplies: [
      {
        text: 'Danke euch! Mein Notgroschen wächst jeden Monat auf dem Tagesgeldkonto ❤️',
        response: 'Das hören wir gerne! Du machst das wirklich vorbildlich.',
        knowledgeGain: 5,
        happinessGain: 5,
      },
    ],
  },
  {
    id: 'leo',
    name: 'Leo',
    role: 'Ausbildungs- & Studienkollege',
    avatar: '💻',
    status: 'Online',
    messages: [
      {
        id: 'l1',
        sender: 'THEM',
        text: 'Hast du schon von der betrieblichen Altersvorsorge (bAV) gehört? Mein Chef zahlt 15% Zuschuss dazu. Hast du das schon bei dir aktiviert?',
        time: '11:05',
      },
    ],
    quickReplies: [
      {
        text: 'Ja, die 15% Chefzuschuss nehme ich auf jeden Fall mit! Spart direkt Steuern 📈',
        response: 'Genau so! Verschenktes Geld sollte man nie liegen lassen.',
        knowledgeGain: 5,
        happinessGain: 5,
      },
      {
        text: 'Ich schaue gleich mal im Spiel unter "Rente" nach, danke für den Tipp! 👍',
        response: 'Lohnt sich wirklich, schau es dir unbedingt an!',
        knowledgeGain: 5,
      },
    ],
  },
];

const ADVISORS: AdvisorContact[] = [
  {
    id: 'bank',
    name: 'Herr Weber',
    role: 'Finanzberater (Stadt-Sparkasse)',
    icon: '🏦',
    color: 'bg-amber-100 text-amber-800 border-amber-300',
    phone: '0800 - 555 11 00',
    faqs: [
      {
        question: 'Wie hoch sollte mein Notgroschen sein?',
        answer:
          'Als solide Faustregel gelten 3 monatliche Gesamtausgaben auf einem separaten Tagesgeldkonto. Damit bist du gegen plötzliche Reparaturen oder Kautionen geschützt, ohne teure Dispozinsen zahlen zu müssen.',
        learningTip: 'Notgroschen immer auf Tagesgeld parken (2,5 % Zinsen), nicht auf dem Girokonto liegen lassen!',
      },
      {
        question: 'Was mache ich, wenn ich im Dispo feststecke?',
        answer:
          'Der Dispo kostet ca. 12,5 % Zinsen p. a. Die schnellste Lösung: Nutze den 1-Klick Umschuldungs-Assistenten in der Sparkasse, um den Dispo durch einen fairen Ratenkredit zu ca. 6,5 % abzulösen und viel Geld zu sparen.',
        learningTip: 'Umschuldung halbiert deine monatlichen Zinskosten und gibt dir einen klaren Tilgungsplan.',
      },
      {
        question: 'Lohnt sich ein ETF-Sparplan schon ab 25 € im Monat?',
        answer:
          'Absolut! Durch den Zinseszins-Effekt wachsen selbst kleine Beträge über 20–30 Jahre enorm an. Bei ca. 6 % historischer Rendite p. a. vermehrt sich dein Erspartes exponentiell.',
        learningTip: 'Je früher du beginnst, desto stärker arbeitet die Zeit für dich.',
      },
    ],
  },
  {
    id: 'tax',
    name: 'Frau Schmidt',
    role: 'Steuerberaterin (Kanzlei Schmidt & Partner)',
    icon: '🧾',
    color: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    phone: '0800 - 555 22 00',
    faqs: [
      {
        question: 'Was ist der Unterschied zwischen Brutto und Netto?',
        answer:
          'Brutto ist das vertraglich vereinbarte Gehalt vor Abzügen. Davon zieht der Arbeitgeber ca. 20 % Sozialversicherungsbeiträge (Renten-, Kranken-, Pflege- und Arbeitslosenversicherung) sowie die Lohnsteuer ab. Netto ist das, was auf deinem Konto landet.',
        learningTip: 'Bei einem Minijob bis 538 € gilt: Brutto = Netto (komplett abgabenfrei).',
      },
      {
        question: 'Welche Steuerklasse ist für mich optimal?',
        answer:
          'Als Single bist du automatisch in Steuerklasse I. Verheiratete Paare können zwischen IV/IV (bei ähnlichem Gehalt) oder III/V (wenn einer deutlich mehr verdient) wählen.',
        learningTip: 'Im Steuern-Menü kannst du deine Steuerklasse interaktiv ausprobieren.',
      },
      {
        question: 'Wie spart die bAV Steuern?',
        answer:
          'Deine bAV-Beiträge werden direkt vom Bruttogehalt abgezogen (Entgeltumwandlung). Dadurch sinkt dein zu versteuerndes Einkommen – du zahlst weniger Steuern und Sozialabgaben!',
        learningTip: 'Dein Arbeitgeber ist gesetzlich verpflichtet, mindestens 15 % Zuschuss dazuzugeben.',
      },
    ],
  },
  {
    id: 'insurance',
    name: 'Herr Bauer',
    role: 'Versicherungsberater (Versicherungsbüro)',
    icon: '🛡️',
    color: 'bg-skyline-100 text-skyline-800 border-skyline-300',
    phone: '0800 - 555 33 00',
    faqs: [
      {
        question: 'Welche Versicherung ist die wichtigste Pflicht?',
        answer:
          'Die Privathaftpflichtversicherung! Nach § 823 BGB haftest du für Schäden, die du anderen versehentlich zufügst, mit deinem gesamten aktuellen und zukünftigen Vermögen unbegrenzt.',
        learningTip: 'Eine Privathaftpflicht kostet nur ca. 4–5 € im Monat und schützt dein ganzes Leben.',
      },
      {
        question: 'Brauche ich wirklich eine Berufsunfähigkeitsversicherung (BU)?',
        answer:
          'Ja, die BU sichert dein wertvollstes Gut: deine Arbeitskraft. Wenn du durch Krankheit oder Unfall deinen Beruf nicht mehr ausüben kannst, zahlt sie eine monatliche Rente.',
        learningTip: 'Je jünger du die BU abschließt, desto günstiger sind die Monatsbeiträge.',
      },
      {
        question: 'Lohnen sich Handy- oder Brillenversicherungen?',
        answer:
          'Meistens nein! Diese Policen haben oft schlechte Konditionen und hohe Selbstbeteiligungen. Faustregel: Nur existenzbedrohende Risiken versichern, kleine Schäden aus dem Notgroschen zahlen.',
        learningTip: 'Halte dich an die Versicherungs-Pyramide im Schutzbüro.',
      },
    ],
  },
  {
    id: 'housing',
    name: 'Frau Müller',
    role: 'Immobilien- & Bausparexpertin',
    icon: '🏡',
    color: 'bg-matcha-100 text-matcha-800 border-matcha-300',
    phone: '0800 - 555 44 00',
    faqs: [
      {
        question: 'Wie viel Eigenkapital brauche ich für Wohneigentum?',
        answer:
          'Du solltest mindestens die ca. 10 % Kaufnebenkosten (Grunderwerbsteuer, Notar, Grundbuch) sowie idealerweise 10–20 % des Kaufpreises aus eigenem Ersparten einbringen können.',
        learningTip: 'Kaufnebenkosten werden von Banken nicht mitfinanziert und müssen aus Eigenkapital bezahlt werden.',
      },
      {
        question: 'Wie hilft mir ein Bausparvertrag?',
        answer:
          'Mit einem Bausparer sicherst du dir schon heute feste, niedrige Darlehenszinsen für die Zukunft und baust strukturiert Eigenkapital für eine Immobilie oder Renovierung auf.',
        learningTip: 'Sobald ca. 40 % der Bausparsumme angespart sind, wird der Vertrag zuteilungsreif.',
      },
    ],
  },
];

export const PhoneModal: React.FC = () => {
  const { gameState, closeModal } = useGameStore();
  const [activeTab, setActiveTab] = useState<'MESSENGER' | 'PHONE' | 'NOTIFICATIONS'>('MESSENGER');

  // Messenger State
  const [chats, setChats] = useState<ChatContact[]>(INITIAL_CHATS);
  const [selectedChatId, setSelectedChatId] = useState<string>('robin');

  // Phone Call State
  const [activeCallAdvisor, setActiveCallAdvisor] = useState<AdvisorContact | null>(null);
  const [callState, setCallState] = useState<'RINGING' | 'CONNECTED' | 'ENDED' | null>(null);
  const [activeFaqAnswer, setActiveFaqAnswer] = useState<{ question: string; answer: string; learningTip: string } | null>(null);

  if (!gameState) return null;

  const currentChat = chats.find((c) => c.id === selectedChatId) || chats[0];

  const handleSendQuickReply = (reply: { text: string; response: string; knowledgeGain?: number; happinessGain?: number }) => {
    sound.playPop();

    const now = new Date();
    const timeStr = `${now.getHours()}:${now.getMinutes() < 10 ? '0' : ''}${now.getMinutes()}`;

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      sender: 'ME',
      text: reply.text,
      time: timeStr,
    };

    const replyMsg: ChatMessage = {
      id: `msg_${Date.now() + 1}`,
      sender: 'THEM',
      text: reply.response,
      time: timeStr,
    };

    setChats((prev) =>
      prev.map((chat) => {
        if (chat.id === currentChat.id) {
          return {
            ...chat,
            messages: [...chat.messages, userMsg, replyMsg],
            quickReplies: chat.quickReplies.filter((r) => r.text !== reply.text),
          };
        }
        return chat;
      })
    );
  };

  const handleStartCall = (advisor: AdvisorContact) => {
    sound.playPop();
    setActiveCallAdvisor(advisor);
    setCallState('RINGING');
    setActiveFaqAnswer(null);

    setTimeout(() => {
      sound.playFanfare();
      setCallState('CONNECTED');
    }, 1200);
  };

  const handleEndCall = () => {
    sound.playPop();
    setCallState('ENDED');
    setTimeout(() => {
      setActiveCallAdvisor(null);
      setCallState(null);
      setActiveFaqAnswer(null);
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-sm animate-fadeIn">
      {/* Smartphone Chassis Frame */}
      <div className="bg-gray-950 rounded-[42px] p-3 sm:p-4 shadow-2xl border-4 border-gray-800 max-w-sm sm:max-w-md w-full relative flex flex-col h-[640px] max-h-[92vh] overflow-hidden select-none">
        {/* Dynamic Island / Speaker Notch & Status Bar */}
        <div className="bg-gray-950 px-6 pt-2 pb-1.5 flex items-center justify-between text-white text-[11px] font-bold shrink-0">
          <span>{new Date().getHours()}:{new Date().getMinutes() < 10 ? '0' : ''}{new Date().getMinutes()}</span>

          {/* Speaker / Dynamic Island */}
          <div className="w-24 h-4 bg-black rounded-full flex items-center justify-center border border-gray-800 shadow-inner">
            <div className="w-2 h-2 rounded-full bg-gray-900 border border-gray-700 mr-2" />
            <div className="w-8 h-1 bg-gray-800 rounded-full" />
          </div>

          <div className="flex items-center gap-1.5 text-gray-300">
            <Wifi className="w-3.5 h-3.5" />
            <Battery className="w-4 h-4 fill-white" />
          </div>
        </div>

        {/* Smartphone Screen Body */}
        <div className="bg-white rounded-[32px] flex-1 flex flex-col overflow-hidden relative shadow-inner border border-gray-200">
          {/* Top In-App Header */}
          <div className="px-4 py-3 bg-white/95 backdrop-blur-md border-b border-gray-100 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xl">📱</span>
              <div>
                <h3 className="text-sm font-black text-gray-900">Mein Smartphone</h3>
                <p className="text-[10px] text-gray-400 font-bold">Chats, SMS & Berater-Hotlines</p>
              </div>
            </div>

            <button
              onClick={closeModal}
              type="button"
              className="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* TAB 1: MESSENGER / CHATS */}
          {activeTab === 'MESSENGER' && (
            <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
              {/* Contact Selector Bar */}
              <div className="flex gap-2 p-2.5 bg-white border-b border-gray-200 overflow-x-auto scrollbar-none shrink-0">
                {chats.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      sound.playPop();
                      setSelectedChatId(c.id);
                    }}
                    className={`px-3 py-1.5 rounded-2xl flex items-center gap-1.5 shrink-0 text-xs font-bold transition-all cursor-pointer ${
                      c.id === currentChat.id
                        ? 'bg-matcha-500 text-white shadow-2xs'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <span>{c.avatar}</span>
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>

              {/* Chat Message Stream */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                <div className="text-center">
                  <span className="text-[10px] bg-gray-200/80 text-gray-600 font-bold px-2.5 py-0.5 rounded-full">
                    Chat mit {currentChat.name} ({currentChat.role})
                  </span>
                </div>

                {currentChat.messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex flex-col ${m.sender === 'ME' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[82%] p-3 rounded-2xl text-xs leading-relaxed font-medium shadow-2xs ${
                        m.sender === 'ME'
                          ? 'bg-matcha-600 text-white rounded-br-xs'
                          : 'bg-white text-gray-800 border border-gray-200 rounded-bl-xs'
                      }`}
                    >
                      {m.text}
                    </div>
                    <span className="text-[9px] text-gray-400 mt-0.5 px-1">{m.time}</span>
                  </div>
                ))}
              </div>

              {/* Quick Reply Suggestions */}
              <div className="p-3 bg-white border-t border-gray-200 shrink-0">
                {currentChat.quickReplies && currentChat.quickReplies.length > 0 ? (
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-gray-400 font-bold uppercase block mb-1">
                      Antwortoptionen:
                    </span>
                    {currentChat.quickReplies.map((reply, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSendQuickReply(reply)}
                        className="w-full text-left p-2 rounded-xl bg-gray-50 hover:bg-matcha-50 text-gray-800 hover:text-matcha-900 border border-gray-200 text-xs font-bold transition-all flex items-center justify-between cursor-pointer"
                      >
                        <span className="truncate pr-2">{reply.text}</span>
                        <Send className="w-3.5 h-3.5 text-matcha-600 shrink-0" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-1 text-xs text-gray-400 font-medium">
                    Keine neuen Nachrichten vorhanden.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: PHONE & ADVISOR CALLS */}
          {activeTab === 'PHONE' && (
            <div className="flex-1 flex flex-col overflow-hidden bg-gray-50 p-4">
              {/* Call Active Screen Modal */}
              {activeCallAdvisor && (
                <div className="absolute inset-0 bg-gray-900 text-white z-40 flex flex-col p-6 animate-fadeIn">
                  <div className="flex-1 flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 rounded-3xl bg-gray-800 flex items-center justify-center text-4xl shadow-xl border border-gray-700 mb-3 animate-pulse">
                      {activeCallAdvisor.icon}
                    </div>

                    <h4 className="text-lg font-black text-white mb-0.5">{activeCallAdvisor.name}</h4>
                    <p className="text-xs text-gray-400 mb-2">{activeCallAdvisor.role}</p>

                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-800 rounded-full text-xs font-bold text-amber-300 mb-6">
                      <Sparkles className="w-3.5 h-3.5" />
                      {callState === 'RINGING' ? 'Wählt... 📞' : 'Verbunden (Kostenlos) 🎙️'}
                    </div>

                    {/* Interactive FAQ Dialogue during Call */}
                    {callState === 'CONNECTED' && (
                      <div className="w-full max-h-[220px] overflow-y-auto space-y-2 text-left custom-scrollbar pr-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                          Frage an {activeCallAdvisor.name} stellen:
                        </span>

                        {activeCallAdvisor.faqs.map((faq, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              sound.playPop();
                              setActiveFaqAnswer(faq);
                            }}
                            className="w-full text-left p-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 text-xs text-gray-200 font-bold transition-all flex items-center justify-between cursor-pointer"
                          >
                            <span className="truncate pr-2">{faq.question}</span>
                            <PhoneCall className="w-3.5 h-3.5 text-matcha-400 shrink-0" />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Display Answer & Pedagogical Tip */}
                    {activeFaqAnswer && (
                      <div className="mt-3 p-3 bg-gray-800/90 rounded-2xl border border-matcha-500/50 text-left text-xs animate-fadeIn">
                        <p className="text-gray-200 leading-relaxed mb-2 font-medium">
                          {activeFaqAnswer.answer}
                        </p>
                        <div className="text-[11px] text-amber-300 font-bold bg-black/40 p-2 rounded-xl border border-amber-500/30">
                          💡 Tipp: {activeFaqAnswer.learningTip}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* End Call Button */}
                  <div className="pt-4 flex justify-center shrink-0">
                    <button
                      onClick={handleEndCall}
                      type="button"
                      className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center text-white shadow-xl active:scale-95 transition-all cursor-pointer"
                    >
                      <PhoneOff className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              )}

              {/* Advisor Directory */}
              <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                <div className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">
                  Experten-Hotlines & Beratung
                </div>

                {ADVISORS.map((adv) => (
                  <div
                    key={adv.id}
                    className="p-3.5 rounded-2xl bg-white border border-gray-200 shadow-2xs flex items-center justify-between gap-3 hover:border-matcha-400 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-2xl ${adv.color} flex items-center justify-center text-xl shadow-xs shrink-0`}>
                        {adv.icon}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-xs text-gray-900 leading-tight">{adv.name}</h4>
                        <p className="text-[10px] text-gray-500">{adv.role}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleStartCall(adv)}
                      className="p-2.5 rounded-xl bg-matcha-50 hover:bg-matcha-100 text-matcha-700 border border-matcha-200 transition-all active:scale-95 cursor-pointer"
                      title={`${adv.name} anrufen`}
                    >
                      <Phone className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: NOTIFICATIONS & BANK SMS */}
          {activeTab === 'NOTIFICATIONS' && (
            <div className="flex-1 flex flex-col overflow-hidden bg-gray-50 p-4">
              <div className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">
                SMS-Postfach & System-Alerts
              </div>

              <div className="space-y-2.5 overflow-y-auto custom-scrollbar flex-1">
                <div className="p-3 bg-white rounded-2xl border border-gray-200 text-xs shadow-2xs">
                  <div className="flex items-center justify-between text-[10px] text-gray-400 font-bold mb-1">
                    <span>Stadt-Sparkasse</span>
                    <span>Heute</span>
                  </div>
                  <p className="text-gray-800 font-bold">
                    Ihr aktueller Kontostand beträgt {Math.round(gameState.bankAccount.giroBalance).toLocaleString('de-DE')} €.
                  </p>
                </div>

                <div className="p-3 bg-white rounded-2xl border border-gray-200 text-xs shadow-2xs">
                  <div className="flex items-center justify-between text-[10px] text-gray-400 font-bold mb-1">
                    <span>GOAL Simulation</span>
                    <span>Vor 2 Tagen</span>
                  </div>
                  <p className="text-gray-800">
                    Herzlich willkommen in deinem selbstständigen Leben! Setze dir kluge Sparziele.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Smartphone App Navigation Bar */}
          <div className="px-4 py-2.5 bg-gray-100 border-t border-gray-200 flex items-center justify-around shrink-0">
            <button
              type="button"
              onClick={() => {
                sound.playPop();
                setActiveTab('MESSENGER');
              }}
              className={`flex flex-col items-center gap-1 text-[10px] font-extrabold transition-all cursor-pointer ${
                activeTab === 'MESSENGER' ? 'text-matcha-700' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <MessageSquare className="w-5 h-5" />
              <span>Chats</span>
            </button>

            <button
              type="button"
              onClick={() => {
                sound.playPop();
                setActiveTab('PHONE');
              }}
              className={`flex flex-col items-center gap-1 text-[10px] font-extrabold transition-all cursor-pointer ${
                activeTab === 'PHONE' ? 'text-matcha-700' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Phone className="w-5 h-5" />
              <span>Anrufe</span>
            </button>

            <button
              type="button"
              onClick={() => {
                sound.playPop();
                setActiveTab('NOTIFICATIONS');
              }}
              className={`flex flex-col items-center gap-1 text-[10px] font-extrabold transition-all cursor-pointer ${
                activeTab === 'NOTIFICATIONS' ? 'text-matcha-700' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Bell className="w-5 h-5" />
              <span>SMS</span>
            </button>
          </div>
        </div>

        {/* Bottom Home Indicator Bar */}
        <div className="w-32 h-1 bg-gray-700 rounded-full mx-auto mt-2 shrink-0" />
      </div>
    </div>
  );
};
