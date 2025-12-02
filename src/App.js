import React, { useState, useEffect, useRef } from "react";
import {
  BookOpen,
  Check,
  ArrowRight,
  Edit3,
  Settings,
  Play,
  Layers,
  RotateCcw,
} from "lucide-react";

/**
 * ------------------------------------------------------------------
 * 莫兰迪配色系统
 * ------------------------------------------------------------------
 */
const COLORS = {
  bg: "bg-[#FDFcf8]",
  text: "text-[#5E5A55]",
  subText: "text-[#9E978E]",
  primary: "bg-[#8FA9A6]",
  primaryHover: "hover:bg-[#7A9592]",

  // 单词块颜色
  verb: {
    bg: "bg-[#EBCBCB]",
    border: "border-[#D4A5A5]",
    text: "text-[#8C5E5E]",
  },
  noun: {
    bg: "bg-[#C4D7E5]",
    border: "border-[#9FBED8]",
    text: "text-[#5B7893]",
  },
  adj: {
    bg: "bg-[#F2E6C2]",
    border: "border-[#E0CE95]",
    text: "text-[#96834A]",
  },
  prep: {
    bg: "bg-[#C8DBC3]",
    border: "border-[#A3C29D]",
    text: "text-[#617A5D]",
  },
};

/**
 * ------------------------------------------------------------------
 * 简易词性词库 (用于自动上色)
 * ------------------------------------------------------------------
 */
const POS_DB = {
  verbs: [
    "go",
    "do",
    "make",
    "take",
    "get",
    "have",
    "has",
    "had",
    "did",
    "made",
    "took",
    "got",
    "be",
    "is",
    "am",
    "are",
    "was",
    "were",
    "play",
    "watch",
    "look",
    "see",
    "saw",
    "went",
    "study",
    "learn",
    "eat",
    "ate",
    "drink",
    "drank",
    "run",
    "ran",
    "walk",
    "swim",
    "write",
    "wrote",
    "read",
    "listen",
    "speak",
    "spoke",
    "come",
    "came",
    "buy",
    "bought",
    "sell",
    "sold",
    "think",
    "thought",
    "know",
    "knew",
    "want",
    "needed",
    "loved",
    "liked",
    "help",
    "call",
    "ask",
    "answer",
    "wait",
    "visit",
    "start",
    "finish",
    "open",
    "close",
    "wash",
    "clean",
    "push",
    "spend",
    "collect",
    "turn",
    "check",
    "perform",
    "encounter",
    "realize",
    "face",
    "give",
    "chase",
    "prepare",
    "sort",
    "add",
    "involve",
    "lose",
    "deal",
  ],
  preps: [
    "in",
    "on",
    "at",
    "of",
    "for",
    "with",
    "about",
    "to",
    "from",
    "up",
    "down",
    "into",
    "out",
    "over",
    "under",
    "after",
    "before",
    "by",
    "between",
    "through",
  ],
  adjs: [
    "good",
    "bad",
    "big",
    "small",
    "long",
    "short",
    "happy",
    "sad",
    "nice",
    "fine",
    "great",
    "late",
    "early",
    "hard",
    "easy",
    "busy",
    "free",
    "fast",
    "slow",
    "hot",
    "cold",
    "warm",
    "cool",
    "beautiful",
    "interesting",
    "boring",
    "difficult",
    "popular",
    "healthy",
    "different",
    "same",
    "similar",
    "wrong",
    "angry",
    "funny",
    "deep",
    "messy",
    "personal",
    "tough",
  ],
};

const getWordType = (word) => {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (POS_DB.verbs.includes(w)) return "verb";
  if (POS_DB.preps.includes(w)) return "prep";
  if (POS_DB.adjs.includes(w)) return "adj";
  return "noun";
};

/**
 * ------------------------------------------------------------------
 * 主应用组件
 * ------------------------------------------------------------------
 */
export default function App() {
  const [mode, setMode] = useState("setup"); // 'setup' | 'learning'
  const [rawInput, setRawInput] = useState(DEFAULT_TEXT);
  const [sentences, setSentences] = useState([]);

  // 进度控制
  const [currentSentIdx, setCurrentSentIdx] = useState(-1);
  const [currentDrillIdx, setCurrentDrillIdx] = useState(0); // 当前句子内的第几个练习

  // 练习交互状态
  const [shuffledBlocks, setShuffledBlocks] = useState([]);
  const [userOrder, setUserOrder] = useState([]);
  const [userInput, setUserInput] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState("idle"); // 'idle', 'shake', 'success'

  const bottomRef = useRef(null);

  // 开始学习：解析文本
  const handleStart = () => {
    const parsed = parseText(rawInput);
    setSentences(parsed);
    setMode("learning");
    setCurrentSentIdx(-1);
    setCurrentDrillIdx(0);
    setFeedbackStatus("idle");
  };

  // 下一句 / 下一个练习
  const handleNext = () => {
    // 1. 如果还没开始，进入第一句
    if (currentSentIdx === -1) {
      setCurrentSentIdx(0);
      setCurrentDrillIdx(0);
      initDrillIfAvailable(0, 0, sentences);
      return;
    }

    const currentSentence = sentences[currentSentIdx];

    // 2. 检查当前句是否还有未完成的 Drill
    if (
      currentSentence.drills &&
      currentDrillIdx < currentSentence.drills.length - 1
    ) {
      // 还有下一个空没填，不做操作 (逻辑上由 checkAnswer 触发切换，这里 Next 按钮主要用于切句)
      // 但为了防止卡死，如果用户强行点 Next，我们可以跳过当前空?
      // 为了教学严谨，这里 Next 按钮仅用于“句子完成后的切换”。
      return;
    }

    // 3. 切换到下一句
    if (currentSentIdx < sentences.length - 1) {
      const nextSentIdx = currentSentIdx + 1;
      setCurrentSentIdx(nextSentIdx);
      setCurrentDrillIdx(0);
      initDrillIfAvailable(nextSentIdx, 0, sentences);

      // 滚动跟进
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 100);
    }
  };

  // 如果目标位置有练习题，初始化积木
  const initDrillIfAvailable = (sentIdx, drillIdx, sentenceList) => {
    const sent = sentenceList[sentIdx];
    if (sent && sent.drills && sent.drills[drillIdx]) {
      const drill = sent.drills[drillIdx];
      const words = drill.base.split(/\s+/).map((w, i) => ({
        id: i,
        text: w,
        type: getWordType(w),
      }));
      setShuffledBlocks([...words].sort(() => Math.random() - 0.5));
      setUserOrder([]);
      setUserInput("");
      setFeedbackStatus("idle");
    }
  };

  // 积木点击逻辑
  const toggleBlock = (block, fromZone) => {
    if (feedbackStatus === "success") return;
    if (fromZone === "pool") {
      setShuffledBlocks((prev) => prev.filter((b) => b.id !== block.id));
      setUserOrder((prev) => [...prev, block]);
    } else {
      setUserOrder((prev) => prev.filter((b) => b.id !== block.id));
      setShuffledBlocks((prev) => [...prev, block]);
    }
  };

  // 提交答案
  const checkAnswer = () => {
    const currentSent = sentences[currentSentIdx];
    if (!currentSent || !currentSent.drills) return;

    const currentDrill = currentSent.drills[currentDrillIdx];
    const targetCorrect = currentDrill.correct;

    // 1. 检查积木是否用完
    if (shuffledBlocks.length > 0) {
      triggerShake();
      return;
    }

    // 2. 宽松比对：去除非字母数字字符
    const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, "");
    const cleanUser = normalize(userInput);
    const cleanTarget = normalize(targetCorrect);

    if (cleanUser === cleanTarget) {
      setFeedbackStatus("success");

      // 延迟后进入下一个状态
      setTimeout(() => {
        // 如果当前句还有下一个空
        if (currentDrillIdx < currentSent.drills.length - 1) {
          const nextDrillIdx = currentDrillIdx + 1;
          setCurrentDrillIdx(nextDrillIdx);
          initDrillIfAvailable(currentSentIdx, nextDrillIdx, sentences);
        } else {
          // 当前句所有空填完了，关闭练习区
          setCurrentDrillIdx(currentDrillIdx + 1); // 溢出索引表示完成
        }
      }, 1200);
    } else {
      triggerShake();
    }
  };

  const triggerShake = () => {
    setFeedbackStatus("shake");
    setTimeout(() => setFeedbackStatus("idle"), 500);
  };

  // 判断当前是否正在做题
  const isSentenceActive = (idx) => idx === currentSentIdx;
  const isSentenceDone = (idx) => idx < currentSentIdx;

  const currentSentenceObj = sentences[currentSentIdx];
  const isCurrentSentenceFinished = currentSentenceObj
    ? !currentSentenceObj.drills ||
      currentDrillIdx >= currentSentenceObj.drills.length
    : true;

  // Next 按钮是否可用
  const canGoNext =
    currentSentIdx === -1 ||
    (isSentenceActive(currentSentIdx) &&
      isCurrentSentenceFinished &&
      currentSentIdx < sentences.length - 1);

  return (
    <div className={`min-h-screen ${COLORS.bg} ${COLORS.text} font-sans pb-32`}>
      {/* 顶部导航 */}
      <nav className="sticky top-0 z-30 bg-[#FDFcf8]/95 backdrop-blur border-b border-stone-100 p-4 shadow-sm">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-[#8FA9A6]" />
            <span className="font-bold text-lg text-[#5E5A55]">
              Phrase Master{" "}
              <span className="text-xs bg-[#8FA9A6] text-white px-1.5 py-0.5 rounded ml-1">
                Pro
              </span>
            </span>
          </div>
          {mode === "learning" && (
            <button
              onClick={() => setMode("setup")}
              className="p-2 rounded-full hover:bg-stone-100 text-stone-400 transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
          )}
        </div>
      </nav>

      <main className="max-w-2xl mx-auto p-4">
        {/* SETUP MODE */}
        {mode === "setup" && (
          <div className="animate-fade-in pt-2 space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100">
              <h2 className="font-bold text-lg mb-2 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-[#8FA9A6]" />
                课程编辑器
              </h2>
              <div className="bg-orange-50 text-orange-800 p-3 rounded-xl text-sm mb-4">
                <strong>提示：</strong> 支持一句话多个填空。请确保格式为{" "}
                <code>{`{正确|原型|中文}`}</code>。
              </div>
              <textarea
                className="w-full h-80 p-4 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#8FA9A6]/30 transition-all resize-none leading-relaxed text-sm font-mono"
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                placeholder="粘贴课文到这里..."
              />
            </div>
            <button
              onClick={handleStart}
              className={`w-full py-4 rounded-2xl ${COLORS.primary} text-white font-bold text-lg shadow-md hover:shadow-lg hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2`}
            >
              <Play className="w-5 h-5 fill-current" /> 生成课程
            </button>
          </div>
        )}

        {/* LEARNING MODE */}
        {mode === "learning" && (
          <div className="space-y-8">
            {sentences.map((sent, idx) => {
              if (idx > currentSentIdx) return null; // 还没到的句子不渲染

              const isActive = isSentenceActive(idx);
              const isDone = isSentenceDone(idx);

              return (
                <div
                  key={idx}
                  className={`transition-all duration-700 ease-out transform
                    ${
                      isActive
                        ? "opacity-100 translate-y-0"
                        : "opacity-50 scale-[0.98] grayscale-[0.5]"
                    }
                  `}
                >
                  <div
                    className={`
                    relative p-6 rounded-3xl border-2 transition-all duration-500 overflow-hidden
                    ${
                      isActive
                        ? "bg-white border-[#8FA9A6] shadow-sm"
                        : "bg-transparent border-transparent"
                    }
                  `}
                  >
                    {/* 句子显示区 */}
                    <div className="text-xl leading-9 font-medium text-justify">
                      <SentenceRenderer
                        sentence={sent}
                        currentDrillIdx={isActive ? currentDrillIdx : 999} // 如果已完成(isActive=false)，索引设为极大，全显示答案
                        isActive={isActive}
                      />
                    </div>

                    {/* 操作区：仅当该句处于激活状态，且还有没做完的 Drill */}
                    {isActive &&
                      sent.drills &&
                      currentDrillIdx < sent.drills.length && (
                        <div className="mt-8 animate-slide-up bg-[#F7F5F2] -mx-6 -mb-6 p-6 border-t border-stone-100">
                          {/* 任务提示 */}
                          <div className="flex items-center gap-3 mb-4">
                            <span className="bg-[#8FA9A6] text-white text-xs font-bold px-2 py-1 rounded-md shadow-sm">
                              Task {currentDrillIdx + 1}/{sent.drills.length}
                            </span>
                            <span className="font-bold text-[#5E5A55] text-lg">
                              {sent.drills[currentDrillIdx].meaning}
                            </span>
                          </div>

                          {/* 排序区 */}
                          <div className="min-h-[64px] bg-white rounded-xl border-2 border-dashed border-stone-200 p-3 mb-4 flex flex-wrap gap-2 transition-colors items-center">
                            {userOrder.length === 0 && (
                              <span className="text-stone-300 text-sm mx-auto select-none">
                                点击下方单词排序
                              </span>
                            )}
                            {userOrder.map((block) => (
                              <Block
                                key={block.id}
                                block={block}
                                onClick={() => toggleBlock(block, "answer")}
                              />
                            ))}
                          </div>

                          {/* 待选区 */}
                          <div className="flex flex-wrap gap-2 mb-6 min-h-[40px]">
                            {shuffledBlocks.map((block) => (
                              <Block
                                key={block.id}
                                block={block}
                                onClick={() => toggleBlock(block, "pool")}
                              />
                            ))}
                          </div>

                          {/* 输入区 */}
                          {shuffledBlocks.length === 0 && (
                            <div className="animate-fade-in space-y-3">
                              <div className="relative">
                                <input
                                  type="text"
                                  value={userInput}
                                  onChange={(e) => {
                                    setUserInput(e.target.value);
                                    setFeedbackStatus("idle");
                                  }}
                                  onKeyDown={(e) =>
                                    e.key === "Enter" && checkAnswer()
                                  }
                                  className={`
                                  w-full p-4 pl-4 pr-12 rounded-xl text-lg font-medium bg-white border-2 outline-none transition-all shadow-sm
                                  ${
                                    feedbackStatus === "shake"
                                      ? "border-red-300 bg-red-50 text-red-500 placeholder-red-300"
                                      : "border-[#E0E8E7] focus:border-[#8FA9A6] focus:ring-4 focus:ring-[#8FA9A6]/10"
                                  }
                                `}
                                  placeholder="输入完整短语..."
                                  autoFocus
                                />
                                {/* 输入框内的状态图标 */}
                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                  {feedbackStatus === "success" && (
                                    <Check className="w-6 h-6 text-green-500 animate-bounce-in" />
                                  )}
                                </div>
                              </div>

                              <button
                                onClick={checkAnswer}
                                disabled={feedbackStatus === "success"}
                                className={`
                                w-full py-3.5 rounded-xl font-bold text-white transition-all active:scale-95 shadow-md
                                ${
                                  feedbackStatus === "success"
                                    ? "bg-green-500"
                                    : COLORS.primary
                                }
                              `}
                              >
                                {feedbackStatus === "success"
                                  ? "Correct!"
                                  : "Confirm"}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                  </div>
                </div>
              );
            })}

            <div ref={bottomRef} className="h-8" />
          </div>
        )}
      </main>

      {/* 底部悬浮控制栏 */}
      {mode === "learning" && (
        <div className="fixed bottom-8 left-0 right-0 flex justify-center z-40 px-4 pointer-events-none">
          <button
            onClick={handleNext}
            disabled={!canGoNext}
            className={`
              pointer-events-auto
              px-8 py-3.5 rounded-full font-bold shadow-xl backdrop-blur-md transition-all
              flex items-center gap-2 text-white text-lg
              ${
                canGoNext
                  ? `${COLORS.primary} hover:scale-105 hover:shadow-2xl active:scale-95`
                  : "bg-stone-300 shadow-none opacity-0" // 不可用时隐藏，避免遮挡
              }
            `}
          >
            {currentSentIdx === -1 ? "Start Class" : "Next Sentence"}
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      )}

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-3px); }
          80% { transform: translateX(3px); }
        }
        .animate-shake { animation: shake 0.4s ease-in-out; }
        .animate-slide-up { animation: slide-up 0.4s ease-out; }
        .animate-fade-in { animation: slide-up 0.4s ease-out; }
        .animate-bounce-in { animation: bounce-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce-in {
          0% { transform: scale(0); }
          60% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

/**
 * ------------------------------------------------------------------
 * 子组件：单词块
 * ------------------------------------------------------------------
 */
function Block({ block, onClick }) {
  const style = COLORS[block.type] || COLORS.noun;
  return (
    <button
      onClick={onClick}
      className={`
        px-3 py-1.5 rounded-lg border-b-[3px] font-medium text-sm shadow-sm transition-all active:scale-95 active:border-b-0 active:translate-y-1 select-none
        ${style.bg} ${style.border} ${style.text}
      `}
    >
      {block.text}
    </button>
  );
}

/**
 * ------------------------------------------------------------------
 * 子组件：复杂的句子渲染器
 * 负责渲染普通文本和空缺位置的状态（当前、已完成、未开始）
 * ------------------------------------------------------------------
 */
function SentenceRenderer({ sentence, currentDrillIdx, isActive }) {
  if (!sentence.tokens) return sentence.content;

  return (
    <>
      {sentence.tokens.map((token, i) => {
        if (token.type === "text") {
          return <span key={i}>{token.content}</span>;
        } else if (token.type === "drill") {
          const drillIndex = token.drillIndex;
          const drillData = sentence.drills[drillIndex];

          // 状态判断
          const isCompleted = drillIndex < currentDrillIdx;
          const isCurrent = isActive && drillIndex === currentDrillIdx;

          if (isCompleted) {
            // 已完成：显示绿色正确答案
            return (
              <span
                key={i}
                className="mx-1 px-1.5 rounded bg-green-100 text-green-700 font-bold border-b-2 border-green-200 animate-bounce-in"
              >
                {drillData.correct}
              </span>
            );
          } else if (isCurrent) {
            // 当前正在做：显示带呼吸效果的挖空
            return (
              <span
                key={i}
                className="inline-flex items-center justify-center min-w-[80px] h-6 mx-1 align-baseline"
              >
                <span className="w-full border-b-2 border-dashed border-[#8FA9A6] animate-pulse"></span>
              </span>
            );
          } else {
            // 未来的空：显示普通下划线，作为占位
            return (
              <span
                key={i}
                className="inline-block w-16 border-b border-stone-300 mx-1 opacity-50"
              ></span>
            );
          }
        }
        return null;
      })}
    </>
  );
}

/**
 * ------------------------------------------------------------------
 * 核心解析逻辑：Pro版
 * 支持单句多空，支持宽松的格式解析
 * ------------------------------------------------------------------
 */
function parseText(text) {
  // 1. 预处理：保护 {} 内容不被分句切断
  // 同时处理可能的中文标点
  let processed = text.replace(/([.?!。？！]+)/g, "$1___SEP___");

  // 按分隔符切分句子，去除空行
  const rawSentences = processed
    .split("___SEP___")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  return rawSentences.map((rawSent) => {
    const tokens = [];
    const drills = [];
    let drillCount = 0;

    // 正则：非贪婪匹配 {...}
    // 能够匹配 { a | b | c } 这种带空格的格式
    // ([^|]+?) 捕获非竖线的字符，非贪婪
    const regex = /\{(.+?)\|(.+?)\|(.+?)\}/g;

    let lastIndex = 0;
    let match;

    while ((match = regex.exec(rawSent)) !== null) {
      // 1. 添加前面的普通文本
      if (match.index > lastIndex) {
        tokens.push({
          type: "text",
          content: rawSent.substring(lastIndex, match.index),
        });
      }

      // 2. 提取并清理 Drill 数据
      const correct = match[1].trim();
      const base = match[2].trim();
      const meaning = match[3].trim();

      drills.push({ correct, base, meaning });

      // 3. 添加 Drill 占位符
      tokens.push({
        type: "drill",
        drillIndex: drillCount,
      });

      drillCount++;
      lastIndex = regex.lastIndex;
    }

    // 4. 添加剩余文本
    if (lastIndex < rawSent.length) {
      tokens.push({
        type: "text",
        content: rawSent.substring(lastIndex),
      });
    }

    // 如果没有 Drill，整句就是一个 text token
    if (tokens.length === 0) {
      tokens.push({ type: "text", content: rawSent });
    }

    return {
      fullText: rawSent,
      tokens: tokens,
      drills: drills.length > 0 ? drills : null,
    };
  });
}

const DEFAULT_TEXT = `Daily Life and Growth in the Project
Last Wednesday, {on a work day|on a work day | 在工作日}, 22-year-old Xiao Chen pushed open the office door—by then, {he had been running a project|run a project | 运作一个项目} for three weeks, and {he had spent a lot of time|spend a lot of time | 花费很多时间} refining its details. 
A few days prior, {he had gone to a film set|go to a film set | 去电影片场} with his team to collect scene references, a trip that taught him practical presentation skills. 
That morning, he {was playing roles in different scenes|play roles in different scenes | 在不同场景中扮演角色} for the project’s demo, and {he had turned to the next page|turn to the next page | 翻到下一页} of his plan list three times to cross-check tasks.
The project required participants to have {high school education and above|high school education and above | 高中及以上学历}, plus {years of special training|years of special training | 多年的特殊训练}—though Xiao Chen lacked the latter, he believed he could perform {as good as|as good as | 和…… 一样好} seasoned professionals {in some way|in some way | 在某种程度上}. 
But when he {encountered a similar problem|a similar problem | 一个相似的问题} that afternoon, he realized {he had done something wrong|do something wrong | 做错事} the day before, leaving him to {face many difficulties|face many difficulties | 面对很多困难} overnight. 
{To be honest|to be honest | 老实说}, he almost {wanted to give up|give up | 放弃} as he stared at his screen, and {he had been feeling angry with|be angry with | 对…… 生气} himself for the oversight.
{After all|after all | 毕竟}, the project included a segment to {help kids deal with their fears|help kids deal with their fears | 帮助孩子们应对恐惧}, and Xiao Chen {was determined to keep Chinese traditions alive|keep Chinese traditions alive | 保持中国传统存活} through it—for example, a colleague would {wear funny costumes|wear funny costumes | 穿着滑稽的服装} to showcase folk customs, and he didn’t want to ruin that. 
He {took a deep breath|deep breath | 深呼吸 (名词词组)} to steady himself; {he would write diaries to calm down|write diaries to calm down | 写日记来冷静} on stressful days, so he jotted down his thoughts quickly, reminding himself {he would carry on|carry on | 继续进行} and {he was chasing his dream|chase one's dream | 追逐梦想}.
First, {he made sure|make sure | 确保} that {a home-cooked meal had been prepared|home-cooked meals | 家常菜} for him (a friend had dropped it off), knowing {it's not easy to do|it's not easy to do | 做某事并不容易} tough work on an empty stomach. 
Then he sat {in a set area|in a set area | 在规定区域内} by the window, {was sorting out|sort out | 整理；分类} messy documents, and recalled that {he had added a personal touch|personal touch | 个人特色} to the proposal’s opening the day before.
Later, the project {involved a segment of hard news|hard news | 硬新闻（严肃新闻）} editing. Xiao Chen {had lost the team’s trust|get back one's trust | 赢回某人的信任} due to his earlier mistake, so {he was trying to get back their trust|get back one's trust | 赢回某人的信任}—{in the team members’ eyes|in one's eyes | 在某人眼里}, {he had been dealing with problems|deal with problems | 处理问题} more carefully lately, and his tasks {took no longer than|not longer than | 不超过} the scheduled time. 
Even though {he had hesitated about signing up for the mascot design competition|sign up for the mascot design competition | 报名参加吉祥物设计比赛} weeks ago, he now felt ready; {the proposal would be polished through careful preparation|through careful preparation | 通过仔细地准备}, and {it’s better not to rush through the process|had better (not) do sth | 最好 (不) 做某事}, he told himself.`;
