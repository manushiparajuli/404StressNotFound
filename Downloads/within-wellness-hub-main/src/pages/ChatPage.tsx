import { useState, useRef, useEffect } from "react";
import { Send, Mic, Video, Smile, BookOpen, AlertTriangle, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FacialCoordinates } from "@/components/saathi/FacialCoordinates";
import buddyImg from "@/assets/buddy-puppy.png";

interface Message {
  id: number;
  role: "user" | "buddy";
  text: string;
  emotion?: string;
  timestamp: Date;
  suggestion?: { label: string; route: string };
  alert?: boolean;
}

const crisisWords = ["suicide", "kill myself", "want to die", "end my life", "self-harm", "no reason to live", "hopeless", "give up"];

type BuddyResponse = { text: string; emotion: string; suggestion?: { label: string; route: string } };

const responseBank: Record<string, BuddyResponse[]> = {
  stress: [
    { text: "It sounds like you're carrying a lot right now. 😔 When did things start feeling this overwhelming?", emotion: "🥺" },
    { text: "Stress can really build up, especially when there's no clear end in sight. What's the biggest thing weighing on you today?", emotion: "😌", suggestion: { label: "Try breathing exercise", route: "/breathing" } },
    { text: "I hear how stressed you are. 🧡 Even one small break — a walk, a breath, a cup of tea — can shift things a little. Want to try a quick breathing reset?", emotion: "😊", suggestion: { label: "Breathing reset", route: "/breathing" } },
    { text: "That sounds really intense. You're not weak for feeling stressed — it means you care. How long have you been feeling this way?", emotion: "🥺" },
    { text: "Stress is your body's alarm system, but sometimes it gets stuck on. Let's try to turn the volume down a little. 🌿", emotion: "😌", suggestion: { label: "Guided relaxation", route: "/resources" } },
  ],
  anxiety: [
    { text: "Anxiety can feel so loud and constant. What's been going through your mind the most lately?", emotion: "🥺" },
    { text: "When anxiety hits, grounding techniques can really help. Try naming 5 things you can see right now. 👀", emotion: "😌", suggestion: { label: "Grounding exercises", route: "/resources" } },
    { text: "I'm here with you. 🧡 Anxiety lies — it makes things feel permanent when they're not. What feels most uncertain right now?", emotion: "😊" },
    { text: "Feeling anxious is exhausting. Have you been able to sleep okay, or is that being affected too?", emotion: "🥺" },
    { text: "You're not alone in this — so many people feel exactly what you're describing. Would it help to talk through what's triggering it?", emotion: "😊" },
  ],
  sad: [
    { text: "I'm really sorry you're feeling this way. 💙 Sadness deserves space — you don't have to rush through it. What's on your heart right now?", emotion: "🥺" },
    { text: "Thank you for trusting me with this. Sometimes the hardest thing is just admitting we feel sad. How long has this been building up?", emotion: "😌" },
    { text: "Sadness can feel very heavy and very lonely. You don't have to carry it alone — I'm right here with you. 🧡", emotion: "🥺" },
    { text: "It's okay to not be okay. You showed up today, and that takes real courage. What do you think is underneath that sadness?", emotion: "😊" },
    { text: "I hear you. 💙 Sometimes just naming the feeling out loud helps. Is there anything small that brought you even a tiny bit of comfort recently?", emotion: "😌", suggestion: { label: "View resources", route: "/resources" } },
  ],
  sleep: [
    { text: "Sleep struggles can make everything else so much harder. Is it falling asleep, staying asleep, or both?", emotion: "😌" },
    { text: "When you're not sleeping well, even small things feel massive. What does your mind usually do when you're trying to fall asleep?", emotion: "🥺" },
    { text: "Poor sleep and stress really feed each other. 🌙 Let's try to break that cycle — have you tried a wind-down routine?", emotion: "😌", suggestion: { label: "Relaxation resources", route: "/resources" } },
    { text: "How many nights has sleep been hard? I want to understand what you're dealing with. 🧡", emotion: "😊" },
    { text: "Your body and mind need rest to heal. 🌿 Even small changes — no screens 30 mins before bed, cooler room — can make a real difference. Want some tips?", emotion: "😌", suggestion: { label: "Sleep tips", route: "/resources" } },
  ],
  work: [
    { text: "Work pressure can spill into every part of life. What's the hardest part of your workload right now?", emotion: "🥺" },
    { text: "It sounds like your plate is overfull. 😔 When did work start feeling like too much rather than manageable?", emotion: "😌" },
    { text: "It's okay to set limits, even at work. Your wellbeing matters more than any deadline. How are you holding up day to day?", emotion: "😊" },
    { text: "Burnout can creep up quietly. Are you taking any breaks during the day, or does it feel like there's no space for that?", emotion: "🥺", suggestion: { label: "Breathing break", route: "/breathing" } },
    { text: "You're working so hard. 🧡 What would feel like a win for you today, even a small one?", emotion: "🤩" },
  ],
  school: [
    { text: "Academic pressure is so real. What subject or deadline is stressing you out the most right now?", emotion: "🥺" },
    { text: "It's tough when you feel like you have to be on top of everything all the time. What's the biggest challenge this week?", emotion: "😌" },
    { text: "You're putting in the effort — that matters, even when results don't feel good yet. What do you need most right now?", emotion: "😊" },
    { text: "Feeling stuck with studying can be really frustrating. 📚 Sometimes a short break to reset works better than pushing through. How long have you been at it?", emotion: "🥺", suggestion: { label: "Take a breathing break", route: "/breathing" } },
    { text: "I believe in you. 🐾 What's one thing you can focus on today instead of the whole mountain at once?", emotion: "🤩" },
  ],
  lonely: [
    { text: "Loneliness is one of the hardest feelings. I want you to know — right now, you're not alone. I'm here. 🧡 What's been making you feel disconnected?", emotion: "🥺" },
    { text: "Feeling isolated is really painful. Do you have anyone you feel comfortable opening up to, even a little?", emotion: "😌" },
    { text: "Sometimes loneliness comes even when we're surrounded by people. Which kind is this for you?", emotion: "🥺" },
    { text: "Thank you for reaching out to me. That took something. 💙 You deserve connection — what does that look like for you right now?", emotion: "😊" },
    { text: "I hear you. 🧡 Loneliness can make it feel like the world is moving without you. What would make today feel a little less empty?", emotion: "😌", suggestion: { label: "Community resources", route: "/resources" } },
  ],
  happy: [
    { text: "That's so great to hear! 🎉 What's been making things feel good lately? I want to celebrate with you!", emotion: "🤩" },
    { text: "Love this energy! 🐾🧡 Positive moments deserve attention too — what's been your highlight?", emotion: "🤩" },
    { text: "You're glowing! ✨ What's the main thing that's brought you this good feeling?", emotion: "🤩" },
    { text: "It makes me so happy to hear you're doing well! What's one thing you're most grateful for today?", emotion: "😊" },
    { text: "Keep riding that wave! 🌊🎉 What's something you want to hold onto from today?", emotion: "🤩" },
  ],
  angry: [
    { text: "Anger is a real, valid feeling — it usually means something important to you was crossed. What happened?", emotion: "😌" },
    { text: "That sounds genuinely infuriating. 😤 I'm not going to tell you not to feel it. Can you tell me more about what's going on?", emotion: "🥺" },
    { text: "When anger feels this intense, it can be hard to think clearly. 🌿 Let's take one breath together before diving in — in... and out... What set this off?", emotion: "😌", suggestion: { label: "Breathing exercise", route: "/breathing" } },
    { text: "You have every right to feel angry. What would it take for you to feel heard in this situation?", emotion: "🥺" },
    { text: "I'm listening. 🧡 What do you need right now — to vent, to problem-solve, or just to feel understood?", emotion: "😊" },
  ],
  tired: [
    { text: "Being exhausted makes everything harder. Is this physical tiredness, emotional exhaustion, or both?", emotion: "🥺" },
    { text: "Your body and mind are telling you something. 🌿 When's the last time you really rested — not just slept, but truly rested?", emotion: "😌" },
    { text: "Emotional fatigue is just as real as physical fatigue. What's been draining your energy the most?", emotion: "🥺", suggestion: { label: "Relaxation resources", route: "/resources" } },
    { text: "You're allowed to slow down. 🧡 What would it feel like to give yourself permission to rest today?", emotion: "😌" },
    { text: "Sometimes 'tired' is carrying a lot more than just sleep debt. What's really behind that exhaustion?", emotion: "😊" },
  ],
  family: [
    { text: "Family dynamics can be really complicated. What's been going on at home?", emotion: "🥺" },
    { text: "The people closest to us can sometimes cause the deepest stress. I'm here to listen — what happened?", emotion: "😌" },
    { text: "It sounds like there's tension at home. How are you managing that alongside everything else?", emotion: "🥺" },
    { text: "Family relationships can be such a source of both love and pain. What feeling is strongest for you right now?", emotion: "😊" },
    { text: "You don't have to carry family stress alone. 🧡 What do you need right now — support, advice, or just a space to vent?", emotion: "😌", suggestion: { label: "View resources", route: "/resources" } },
  ],
  generic: [
    { text: "I hear you. 🧡 Tell me more — what's been going on for you lately?", emotion: "😊" },
    { text: "Thanks for sharing that with me. How long have you been feeling this way?", emotion: "😌" },
    { text: "I'm really glad you're talking to me. What feels most heavy right now?", emotion: "🥺" },
    { text: "It takes courage to open up. 🐾 What would feel most helpful — just venting, or figuring out next steps together?", emotion: "😊" },
    { text: "You matter, and so does what you're going through. What do you most need from me right now?", emotion: "😌" },
    { text: "I'm all ears and no judgment. 🧡 Walk me through what's been happening.", emotion: "😊" },
    { text: "That's a lot to be sitting with. What part of it feels the hardest to deal with?", emotion: "🥺" },
    { text: "How are you really doing? Not just the surface answer — the real one. 💙", emotion: "😌" },
  ],
};

let lastResponseKey = "";
let lastResponseIndex = -1;

const getBuddyResponse = (userText: string): BuddyResponse => {
  const lower = userText.toLowerCase();

  const topicMap: [string, string[]][] = [
    ["stress", ["stress", "stressed", "overwhelming", "overwhelm", "pressure", "too much", "can't handle", "falling apart"]],
    ["anxiety", ["anxious", "anxiety", "panic", "nervous", "worry", "worried", "fear", "scared", "dread"]],
    ["sad", ["sad", "sadness", "depressed", "depression", "crying", "cry", "empty", "numb", "broken", "hurt"]],
    ["sleep", ["sleep", "insomnia", "tired", "can't sleep", "awake", "nightmares", "rest", "exhausted", "fatigue"]],
    ["work", ["work", "job", "boss", "coworker", "deadline", "office", "career", "workload", "burnout", "employed"]],
    ["school", ["school", "class", "exam", "study", "homework", "professor", "grade", "assignment", "thesis", "college", "university"]],
    ["lonely", ["lonely", "alone", "isolated", "no one", "nobody", "disconnected", "left out", "invisible", "friendless"]],
    ["happy", ["happy", "great", "excited", "wonderful", "amazing", "good", "fantastic", "joy", "grateful", "thankful", "better", "well"]],
    ["angry", ["angry", "anger", "furious", "frustrated", "annoyed", "mad", "rage", "irritated", "hate"]],
    ["tired", ["tired", "drained", "exhausted", "no energy", "worn out", "fatigued", "burnt out", "depleted"]],
    ["family", ["family", "mom", "dad", "parent", "brother", "sister", "sibling", "home", "relationship", "partner", "spouse"]],
  ];

  let matchedKey = "generic";
  for (const [key, keywords] of topicMap) {
    if (keywords.some(kw => lower.includes(kw))) {
      matchedKey = key;
      break;
    }
  }

  const pool = responseBank[matchedKey];
  let idx: number;
  do {
    idx = Math.floor(Math.random() * pool.length);
  } while (pool.length > 1 && matchedKey === lastResponseKey && idx === lastResponseIndex);

  lastResponseKey = matchedKey;
  lastResponseIndex = idx;
  return pool[idx];
};

const fakeEmotionScores = () => ({
  facial: Math.floor(Math.random() * 40 + 50),
  voice: Math.floor(Math.random() * 40 + 40),
  gesture: Math.floor(Math.random() * 40 + 45),
});

type InputMode = "text" | "audio" | "video";

const ChatPage = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([
    { id: 0, role: "buddy", text: "Hey there! 🐾 I'm Buddy, your wellness companion. How are you feeling today? You can type, record audio, or even show me through video!", timestamp: new Date() },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [emotions, setEmotions] = useState(fakeEmotionScores());
  const [inputMode, setInputMode] = useState<InputMode>("text");
  const [isRecording, setIsRecording] = useState(false);
  const [showFacialCoords, setShowFacialCoords] = useState(false);
  const [clinicAlerted, setClinicAlerted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const checkCrisis = (text: string) => {
    const lower = text.toLowerCase();
    return crisisWords.some(w => lower.includes(w));
  };

  const sendMessage = (overrideText?: string) => {
    const text = overrideText || input;
    if (!text.trim()) return;
    
    const isCrisis = checkCrisis(text);
    const userMsg: Message = { id: Date.now(), role: "user", text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);
    setEmotions(fakeEmotionScores());

    if (isCrisis && !clinicAlerted) {
      setClinicAlerted(true);
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: Date.now() + 1, role: "buddy",
          text: "⚠️ I noticed you're going through something really difficult. I care about your safety. I've notified your care team so they can reach out. You're not alone in this. 💚",
          emotion: "🥺", timestamp: new Date(), alert: true,
          suggestion: { label: "🚨 Talk to someone now", route: "/resources" },
        }]);
        setIsTyping(false);
      }, 1000);
      return;
    }

    setTimeout(() => {
      const resp = getBuddyResponse(text);
      setMessages(prev => [...prev, {
        id: Date.now() + 1, role: "buddy", text: resp.text, emotion: resp.emotion, timestamp: new Date(),
        suggestion: resp.suggestion,
      }]);
      setIsTyping(false);
    }, 1500 + Math.random() * 1000);
  };

  // Simulated audio recording
  const toggleAudioRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      sendMessage("I've been feeling really stressed lately... my workload keeps increasing and I can't seem to sleep well anymore.");
    } else {
      setIsRecording(true);
      setTimeout(() => {
        setIsRecording(false);
        sendMessage("I've been feeling really stressed lately... my workload keeps increasing and I can't seem to sleep well anymore.");
      }, 4000);
    }
  };

  // Simulated video
  const toggleVideo = () => {
    setShowFacialCoords(!showFacialCoords);
    if (!showFacialCoords) {
      setIsRecording(true);
      setTimeout(() => {
        setShowFacialCoords(false);
        setIsRecording(false);
        sendMessage("I've been feeling overwhelmed with my thesis... everything feels like too much right now.");
      }, 5000);
    } else {
      setIsRecording(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background pb-20">
      {/* Header */}
      <div className="gradient-buddy px-5 pt-5 pb-3 flex items-center gap-3 shadow-buddy rounded-b-3xl">
        <img src={buddyImg} alt="Buddy" className="w-10 h-10 object-contain" />
        <div className="flex-1">
          <h2 className="font-bold text-primary-foreground text-sm">Buddy</h2>
          <p className="text-[10px] text-primary-foreground/70">{isTyping ? "typing..." : isRecording ? "listening..." : "Online 🐾"}</p>
        </div>
        {/* Mode toggle */}
        <div className="flex gap-1">
          {[
            { mode: "text" as InputMode, icon: Smile },
            { mode: "audio" as InputMode, icon: Mic },
            { mode: "video" as InputMode, icon: Camera },
          ].map(({ mode, icon: Icon }) => (
            <button
              key={mode}
              onClick={() => setInputMode(mode)}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                inputMode === mode ? "bg-white/30" : "bg-white/10 hover:bg-white/20"
              }`}
            >
              <Icon className="w-4 h-4 text-primary-foreground" />
            </button>
          ))}
        </div>
      </div>

      {/* Emotion bar */}
      <div className="flex gap-3 px-5 py-1.5 bg-muted/50 text-[10px] font-semibold text-muted-foreground">
        <span>😊 Face: {emotions.facial}</span>
        <span>🗣️ Voice: {emotions.voice}</span>
        <span>👀 Gesture: {emotions.gesture}</span>
      </div>

      {/* Clinic alert banner */}
      <AnimatePresence>
        {clinicAlerted && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-destructive/10 border-b border-destructive/20 px-5 py-2 flex items-center gap-2"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
            <p className="text-[10px] text-destructive font-semibold">Clinical report sent to your care team</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Video facial coordinates overlay */}
      <AnimatePresence>
        {showFacialCoords && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 220, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 py-2 bg-card border-b border-border"
          >
            <FacialCoordinates active={isRecording} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
        {messages.map((msg) => (
          <div key={msg.id}>
            <div className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-slide-up`}>
              {msg.role === "buddy" && (
                <img src={buddyImg} alt="Buddy" className="w-8 h-8 object-contain mr-2 mt-1 flex-shrink-0" />
              )}
              <div
                className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "gradient-buddy text-primary-foreground rounded-br-md"
                    : msg.alert
                      ? "bg-destructive/10 text-foreground rounded-bl-md shadow-card border border-destructive/20"
                      : "bg-card text-foreground rounded-bl-md shadow-card"
                }`}
              >
                {msg.text}
                {msg.emotion && <span className="ml-1">{msg.emotion}</span>}
              </div>
            </div>
            {msg.suggestion && (
              <div className="ml-12 mt-1">
                <button
                  onClick={() => navigate(msg.suggestion!.route)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-[11px] font-semibold hover:bg-primary/20 transition-colors"
                >
                  <BookOpen className="w-3 h-3" />
                  {msg.suggestion.label}
                </button>
              </div>
            )}
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start animate-slide-up">
            <img src={buddyImg} alt="Buddy" className="w-8 h-8 object-contain mr-2 mt-1 flex-shrink-0" />
            <div className="bg-card px-4 py-3 rounded-2xl rounded-bl-md shadow-card">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse-soft" />
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse-soft" style={{ animationDelay: "0.2s" }} />
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse-soft" style={{ animationDelay: "0.4s" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Journal Quick Entry */}
      <div className="px-4 pb-1">
        <button
          onClick={() => navigate("/journal")}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-accent/50 border border-border text-xs font-semibold text-accent-foreground hover:bg-accent transition-colors"
        >
          <span>📓</span> Open full journal for deeper check-in
          <span className="ml-auto text-muted-foreground">→</span>
        </button>
      </div>

      {/* Input */}
      <div className="px-4 pb-3 pt-2 bg-card border-t border-border">
        {inputMode === "text" && (
          <div className="flex items-center gap-2 bg-muted rounded-2xl px-3 py-2">
            <input
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              placeholder="Tell Buddy how you feel..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <Button size="icon" className="rounded-full w-8 h-8 gradient-buddy" onClick={() => sendMessage()} disabled={!input.trim()}>
              <Send className="w-4 h-4 text-primary-foreground" />
            </Button>
          </div>
        )}

        {inputMode === "audio" && (
          <div className="flex items-center gap-3 justify-center">
            {isRecording && (
              <div className="flex gap-0.5 items-center h-8">
                {Array.from({ length: 20 }).map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ height: [3, Math.random() * 24 + 4, 3] }}
                    transition={{ duration: 0.3, repeat: Infinity, delay: i * 0.03 }}
                    className="w-1 bg-primary/60 rounded-full"
                  />
                ))}
              </div>
            )}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={toggleAudioRecording}
              className={`w-14 h-14 rounded-full flex items-center justify-center ${
                isRecording ? "bg-destructive animate-pulsing-alert" : "gradient-buddy shadow-buddy"
              }`}
            >
              <Mic className="w-6 h-6 text-primary-foreground" />
            </motion.button>
            <p className="text-[10px] text-muted-foreground">{isRecording ? "Listening..." : "Tap to speak"}</p>
          </div>
        )}

        {inputMode === "video" && (
          <div className="flex items-center gap-3 justify-center">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={toggleVideo}
              className={`w-14 h-14 rounded-full flex items-center justify-center ${
                showFacialCoords ? "bg-destructive animate-pulsing-alert" : "gradient-purple shadow-purple"
              }`}
            >
              <Video className="w-6 h-6 text-primary-foreground" />
            </motion.button>
            <p className="text-[10px] text-muted-foreground">{showFacialCoords ? "Reading expressions..." : "Tap to start video"}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;
