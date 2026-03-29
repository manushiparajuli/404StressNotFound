import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Video, Mic, Type, Send, AlertTriangle, Stethoscope } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useGamification } from "@/hooks/useGamification";
import { BuddyAvatar } from "@/components/BuddyAvatar";
import { FacialCoordinates } from "@/components/saathi/FacialCoordinates";
import { AnalysisScreen } from "@/components/saathi/AnalysisScreen";
import { ResultsScreen } from "@/components/saathi/ResultsScreen";

const stressorCards = [
  { id: "abroad", label: "Abroad ko Tension", emoji: "🌏" },
  { id: "ghar", label: "Ghar ko Pressure", emoji: "🏠" },
  { id: "exam", label: "Exam Season", emoji: "📚" },
  { id: "remittance", label: "Remittance Burden", emoji: "💸" },
  { id: "work", label: "Work Burnout", emoji: "💼" },
  { id: "health", label: "Health Anxiety", emoji: "🏥" },
];

const journalPrompts = [
  "How are you feeling right now? Let it all out...",
  "What's been on your mind today? No judgment here.",
  "Describe your day in three words, then expand...",
  "What would make tomorrow better than today?",
  "If your feelings were weather, what would today be?",
];

type Mode = "video" | "audio" | "text";
type Screen = "checkin" | "analyzing" | "results";

function analyzeJournal(text: string, stressors: string[]) {
  const lower = text.toLowerCase();
  const negativeWords = ["hopeless", "can't", "worthless", "die", "kill", "end it", "give up", "no point", "alone", "hurt", "pain", "suffering", "cry", "depressed", "anxiety", "panic", "scared", "terrified", "overwhelmed"];
  const positiveWords = ["happy", "grateful", "good", "better", "hope", "love", "calm", "peaceful", "excited", "proud", "strong"];
  const crisisWords = ["suicide", "kill myself", "end my life", "want to die", "self-harm", "cut myself", "no reason to live"];

  let negScore = 0, posScore = 0;
  let crisisDetected = false;

  negativeWords.forEach(w => { if (lower.includes(w)) negScore += 10; });
  positiveWords.forEach(w => { if (lower.includes(w)) posScore += 10; });
  crisisWords.forEach(w => { if (lower.includes(w)) crisisDetected = true; });

  const stressorWeight = stressors.length * 8;
  const rawScore = Math.max(0, Math.min(100, 65 - negScore + posScore - stressorWeight));
  const wellbeingScore = crisisDetected ? Math.min(15, rawScore) : rawScore;

  let risk: "low" | "medium" | "high" | "critical" = "low";
  if (crisisDetected) risk = "critical";
  else if (wellbeingScore < 30) risk = "high";
  else if (wellbeingScore < 50) risk = "medium";

  const clinicAlert = risk === "critical" || risk === "high";

  const emotions = [
    { name: "Stress", score: Math.min(100, 40 + negScore + stressorWeight), emoji: "😰" },
    { name: "Anxiety", score: Math.min(100, 30 + negScore * 0.8), emoji: "😟" },
    { name: "Sadness", score: Math.min(100, 20 + negScore * 0.6), emoji: "😢" },
    { name: "Hope", score: Math.min(100, 20 + posScore), emoji: "🌱" },
  ].sort((a, b) => b.score - a.score);

  const prediction = wellbeingScore < 30
    ? "⚠️ ML model predicts escalating distress pattern over next 48hrs."
    : wellbeingScore < 50
      ? "📊 Predictive model shows moderate risk trajectory."
      : "📈 Positive trajectory detected. Keep up current coping patterns.";

  const aiSummary = risk === "critical"
    ? `⚠️ CRITICAL: High-risk indicators detected. Immediate clinical review recommended. Report auto-sent to care team.`
    : risk === "high"
      ? `🔴 HIGH RISK: Significant distress across ${stressors.length} areas. Score ${wellbeingScore}/100. Clinical notification triggered.`
      : risk === "medium"
        ? `🟡 Score ${wellbeingScore}/100. Moderate stress. Consider breathing exercises.`
        : `🟢 Score ${wellbeingScore}/100. You're managing well! Keep it up.`;

  return { wellbeingScore, emotions, risk, clinicAlert, aiSummary, prediction };
}

const CheckInPage = () => {
  const [mode, setMode] = useState<Mode>("text");
  const [selectedStressors, setSelectedStressors] = useState<string[]>([]);
  const [journalText, setJournalText] = useState("");
  const [screen, setScreen] = useState<Screen>("checkin");
  const [isRecording, setIsRecording] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ReturnType<typeof analyzeJournal> | null>(null);
  const [currentPrompt] = useState(() => journalPrompts[Math.floor(Math.random() * journalPrompts.length)]);
  const [liveEmotion, setLiveEmotion] = useState({ stress: 0, anxiety: 0 });
  const { completeCheckin, addXp } = useGamification();
  const navigate = useNavigate();

  // Simulate audio transcription
  const [audioTranscript, setAudioTranscript] = useState("");
  useEffect(() => {
    if (mode === "audio" && isRecording) {
      const phrases = [
        "I've been feeling really stressed lately",
        "... my workload keeps increasing",
        "... I can't seem to sleep well anymore",
      ];
      let idx = 0;
      let text = "";
      const interval = setInterval(() => {
        if (idx < phrases.length) {
          text += (text ? " " : "") + phrases[idx];
          setAudioTranscript(text);
          setJournalText(text);
          idx++;
        } else {
          setIsRecording(false);
          clearInterval(interval);
        }
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [mode, isRecording]);

  // Simulate video transcription
  useEffect(() => {
    if (mode === "video" && isRecording) {
      const phrases = [
        "I've been feeling overwhelmed with my thesis",
        "... haven't been sleeping well",
        "... everything feels like too much",
      ];
      let idx = 0;
      let text = "";
      const interval = setInterval(() => {
        if (idx < phrases.length) {
          text += (text ? " " : "") + phrases[idx];
          setJournalText(text);
          idx++;
        } else {
          setIsRecording(false);
          clearInterval(interval);
        }
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [mode, isRecording]);

  useEffect(() => {
    if (journalText.length > 10) {
      const result = analyzeJournal(journalText, selectedStressors);
      setLiveEmotion({
        stress: result.emotions.find(e => e.name === "Stress")?.score ?? 0,
        anxiety: result.emotions.find(e => e.name === "Anxiety")?.score ?? 0,
      });
    }
  }, [journalText, selectedStressors]);

  const toggleStressor = (id: string) => {
    setSelectedStressors(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleSubmit = () => {
    const result = analyzeJournal(journalText || "feeling a bit overwhelmed today", selectedStressors);
    setAnalysisResult(result);
    completeCheckin();
    addXp(30);
    setScreen("analyzing");
  };

  if (screen === "analyzing") {
    return <AnalysisScreen onComplete={() => setScreen("results")} />;
  }

  if (screen === "results" && analysisResult) {
    return <ResultsScreen
      stressors={selectedStressors}
      analysis={analysisResult}
      onHome={() => { setScreen("checkin"); navigate("/"); }}
      onResources={() => { setScreen("checkin"); navigate("/resources"); }}
    />;
  }

  return (
    <div className="min-h-screen pb-24 bg-background">
      <div className="dhaka-stripe" />

      {/* Header with Buddy */}
      <div className="px-5 pt-5 pb-3 flex items-center gap-3">
        <BuddyAvatar size="sm" mood={liveEmotion.stress > 60 ? "concerned" : "happy"} animate />
        <div>
          <h1 className="text-lg font-bold text-foreground">Journal Check-In</h1>
          <p className="text-[11px] text-muted-foreground">Your safe space to express how you feel</p>
        </div>
      </div>

      {/* Mode Tabs */}
      <div className="px-5 mb-3">
        <div className="flex bg-card rounded-xl p-1 gap-1">
          {([
            { id: "video" as Mode, icon: Video, label: "Video" },
            { id: "audio" as Mode, icon: Mic, label: "Audio" },
            { id: "text" as Mode, icon: Type, label: "Text" },
          ]).map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => { setMode(id); setIsRecording(false); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                mode === id ? "gradient-purple text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 space-y-3">
        {/* Stressor Cards */}
        <div>
          <h2 className="text-xs font-semibold text-foreground mb-2">What's weighing on you?</h2>
          <div className="flex flex-wrap gap-2">
            {stressorCards.map(card => (
              <motion.button
                key={card.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => toggleStressor(card.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  selectedStressors.includes(card.id)
                    ? "bg-primary text-primary-foreground shadow-purple"
                    : "bg-card text-muted-foreground border border-border hover:border-primary/30"
                }`}
              >
                <span>{card.emoji}</span>
                {card.label}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Video Mode with Facial Coordinates */}
        {mode === "video" && (
          <div className="rounded-2xl bg-card p-4 shadow-card space-y-3">
            <FacialCoordinates active={isRecording} />

            <div className="flex items-center justify-center gap-4">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsRecording(!isRecording)}
                className={`w-14 h-14 rounded-full flex items-center justify-center ${
                  isRecording ? "bg-destructive animate-pulsing-alert" : "gradient-purple"
                }`}
              >
                <div className={`w-5 h-5 ${isRecording ? "rounded-sm bg-primary-foreground" : "rounded-full bg-primary-foreground"}`} />
              </motion.button>
            </div>

            <p className="text-[10px] text-muted-foreground text-center">
              {isRecording ? "Recording... AI analyzing facial expressions & voice" : "Tap to start — face coordinates tracked in real-time"}
            </p>

            {journalText && mode === "video" && (
              <div className="rounded-xl bg-secondary/50 p-2.5 text-xs text-muted-foreground italic border border-border">
                🎙️ "{journalText}"
              </div>
            )}
          </div>
        )}

        {/* Audio Mode */}
        {mode === "audio" && (
          <div className="rounded-2xl bg-card p-4 shadow-card text-center space-y-3">
            {/* Waveform */}
            <div className="flex justify-center gap-0.5 h-16 items-center">
              {Array.from({ length: 40 }).map((_, i) => (
                <motion.div
                  key={i}
                  animate={isRecording ? { height: [4, Math.random() * 50 + 8, 4] } : { height: 4 }}
                  transition={{ duration: 0.4, repeat: Infinity, delay: i * 0.03 }}
                  className="w-1 bg-primary/60 rounded-full"
                />
              ))}
            </div>

            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                setIsRecording(!isRecording);
                if (!isRecording) setAudioTranscript("");
              }}
              className={`w-14 h-14 rounded-full mx-auto flex items-center justify-center ${
                isRecording ? "bg-destructive animate-pulsing-alert" : "gradient-purple"
              }`}
            >
              <Mic className="w-6 h-6 text-primary-foreground" />
            </motion.button>

            <p className="text-[10px] text-muted-foreground">
              {isRecording ? "Analyzing vocal biomarkers & transcribing..." : "Tap to speak — voice analysis begins instantly"}
            </p>

            {audioTranscript && (
              <div className="rounded-xl bg-secondary/50 p-2.5 text-xs text-muted-foreground italic border border-border text-left">
                🎙️ "{audioTranscript}"
              </div>
            )}
          </div>
        )}

        {/* Text Mode */}
        {mode === "text" && (
          <div className="rounded-2xl bg-card p-3 shadow-card">
            <p className="text-[11px] text-primary font-semibold mb-2 italic">✨ {currentPrompt}</p>
            <textarea
              value={journalText}
              onChange={e => setJournalText(e.target.value)}
              placeholder="Start writing here..."
              className="w-full h-28 bg-secondary rounded-xl p-3 text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none border border-border focus:border-primary/50 transition-colors"
            />
          </div>
        )}

        {/* Live AI Indicators */}
        {journalText.length > 10 && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 px-1 text-[11px]"
          >
            <span className="text-muted-foreground">🧠 Live AI:</span>
            <span className="text-warning font-semibold">Stress {liveEmotion.stress}%</span>
            <span className="text-primary font-semibold">Anxiety {liveEmotion.anxiety}%</span>
            {liveEmotion.stress > 70 && (
              <span className="text-destructive font-semibold flex items-center gap-0.5">
                <AlertTriangle className="w-3 h-3" /> High
              </span>
            )}
          </motion.div>
        )}

        {/* Clinic Escalation Notice */}
        {liveEmotion.stress > 70 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-xl bg-destructive/10 p-2.5 border border-destructive/20 flex items-start gap-2"
          >
            <Stethoscope className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
            <p className="text-[10px] text-destructive leading-relaxed">
              <span className="font-bold">Clinical Alert:</span> High distress detected. 
              Upon submission, an anonymized report will be sent to your care team.
            </p>
          </motion.div>
        )}

        {/* Submit */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleSubmit}
          disabled={!journalText && !isRecording && selectedStressors.length === 0}
          className="w-full py-3 rounded-xl gradient-purple text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40 shadow-purple"
        >
          <Send className="w-4 h-4" />
          Analyze & Submit
        </motion.button>
      </div>
    </div>
  );
};

export default CheckInPage;
