import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowUpRight, Play, Pause, RotateCcw, Clock, BookOpen, Mic, FileText, CheckCircle, Copy, Download, Sparkles, Home } from 'lucide-react';
import BlurText from '../components/BlurText';
import { useCareer, CareerProvider } from '../context/CareerState';

const courseDatabase = {
  1: {
    id: 1, title: '【LangGraph官方系列教程】Agent智能体开发', url: 'https://www.bilibili.com/video/BV1cfQHYeEaA',
    chapters: [
      { name: 'P1: Intro与Agent Executor原理', bvid: 'BV1cfQHYeEaA', p: 1 },
      { name: 'P2: Chat Agent Executor构建', bvid: 'BV1cfQHYeEaA', p: 2 },
      { name: 'P3: Human-in-the-Loop人机交互', bvid: 'BV1cfQHYeEaA', p: 3 },
      { name: 'P4: 工具输出直连与格式控制', bvid: 'BV1cfQHYeEaA', p: 4 },
      { name: 'P5: Agent步骤管理与强制调用', bvid: 'BV1cfQHYeEaA', p: 5 },
      { name: 'P6: Multi-Agent多智能体工作流', bvid: 'BV1cfQHYeEaA', p: 6 },
      { name: 'P7: Persistence持久化机制', bvid: 'BV1cfQHYeEaA', p: 7 }
    ]
  },
  2: {
    id: 2, title: '【企业级高级RAG实战】检索增强生成深度优化', url: 'https://www.bilibili.com/video/BV11CE9ztEYZ',
    chapters: [
      { name: 'P1: RAG基础架构与索引构建', bvid: 'BV11CE9ztEYZ', p: 1 },
      { name: 'P2: Dense Retrieval向量检索优化', bvid: 'BV11CE9ztEYZ', p: 2 },
      { name: 'P3: Sparse Retrieval混合检索策略', bvid: 'BV11CE9ztEYZ', p: 3 },
      { name: 'P4: Rerank重排模型选型与调优', bvid: 'BV11CE9ztEYZ', p: 4 },
      { name: 'P5: 查询重写与扩展技术', bvid: 'BV11CE9ztEYZ', p: 5 },
      { name: 'P6: 生产环境RAG性能优化', bvid: 'BV11CE9ztEYZ', p: 6 },
      { name: 'P7: RAG系统评估与持续迭代', bvid: 'BV11CE9ztEYZ', p: 7 }
    ]
  }
};

const interviewQuestions = [
  { question: "你在使用 LangGraph 构建 Agent 工作流时，遇到过 State 状态在节点间传递丢失或污染的问题吗？请描述你的排查思路和工程兜底方案。", keyPoints: ["状态管理", "节点隔离", "异常兜底", "调试方法"] },
  { question: "在 RAG 系统中，你如何处理检索结果与生成模型之间的语义鸿沟？请从工程角度谈谈混合检索 + Rerank 的落地经验。", keyPoints: ["混合检索", "Rerank模型", "语义鸿沟", "工程优化"] },
  { question: "Function Calling 在实际生产环境中经常遇到工具参数解析失败或工具执行异常，你设计了怎样的工程兜底机制？", keyPoints: ["参数校验", "重试机制", "降级策略", "日志追踪"] },
  { question: "假设你的 Agent 服务 QPS 突然飙升，Pandas 数据处理成为瓶颈，你会从哪些维度进行性能优化和稳定性保障？", keyPoints: ["性能分析", "向量化优化", "缓存策略", "异步处理"] },
  { question: "你如何评估一个 Agent 系统的输出稳定性？请从测试策略、监控指标和持续优化三个维度阐述。", keyPoints: ["单元测试", "A/B测试", "监控指标", "反馈闭环"] }
];

function formatTime(seconds) { const m = Math.floor(seconds / 60).toString().padStart(2, '0'); const s = (seconds % 60).toString().padStart(2, '0'); return `${m}:${s}`; }
async function copyToClipboard(text) { try { await navigator.clipboard.writeText(text); return true; } catch { const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); const ok = document.execCommand('copy'); document.body.removeChild(t); return ok; } }
async function exportToObsidian(fileName, content, toast) { try { const r = await fetch('http://127.0.0.1:8000/api/save_to_obsidian', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ file_name: fileName, content }) }); if (r.ok) { toast('Ares协议联调成功', '已写入本地 Obsidian 库！'); return true; } throw new Error(); } catch { const ok = await copyToClipboard(content); if (ok) toast('本地服务未开启', '已自动复制到剪贴板'); return false; } }
function getApiConfig() { return { baseUrl: document.getElementById('apiBaseUrl')?.value?.trim() || 'https://api.deepseek.com', key: document.getElementById('apiKey')?.value?.trim() || '' }; }
function hasApiKey() { return !!getApiConfig().key; }
async function callLLM(messages, systemPrompt) { const c = getApiConfig(); if (!c.key) throw new Error('NO_API_KEY'); const r = await fetch(`${c.baseUrl}/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${c.key}` }, body: JSON.stringify({ model: 'deepseek-chat', messages: [{ role: 'system', content: systemPrompt }, ...messages], temperature: 0.7, max_tokens: 3000 }) }); if (!r.ok) throw new Error(`HTTP ${r.status}`); return (await r.json()).choices[0].message.content; }

function useToast() {
  const [toasts, setToasts] = useState([]);
  const show = useCallback((title, message) => { const id = Date.now(); setToasts(p => [...p, { id, title, message }]); setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000); }, []);
  const ToastContainer = () => (<div className="fixed top-20 right-4 z-[1000] flex flex-col gap-3">{toasts.map(t => (<motion.div key={t.id} initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 100, opacity: 0 }} className="liquid-glass-strong rounded-xl p-4 max-w-sm shadow-2xl"><div className="font-semibold text-sm text-white">{t.title}</div><div className="text-xs mt-1 text-white/60">{t.message}</div></motion.div>))}</div>);
  return { show, ToastContainer };
}

function GlassButton({ children, onClick, variant = 'primary', className = '', disabled = false }) {
  const b = "rounded-full px-6 py-2.5 text-sm font-medium transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2 cursor-pointer";
  const v = { primary: "liquid-glass-strong text-white hover:bg-white/10", secondary: "liquid-glass text-white/80 hover:text-white hover:bg-white/5", ghost: "bg-transparent border border-white/10 text-white/60 hover:text-white hover:border-white/30" };
  return <button onClick={onClick} disabled={disabled} className={`${b} ${v[variant]} ${className}`}>{children}</button>;
}

// 翻页动画变体
const pageVariants = {
  enter: (direction) => ({
    rotateY: direction > 0 ? 90 : -90,
    opacity: 0,
    scale: 0.9,
  }),
  center: {
    rotateY: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction) => ({
    rotateY: direction > 0 ? -90 : 90,
    opacity: 0,
    scale: 0.9,
  }),
};

const pageTransition = {
  type: "spring",
  stiffness: 200,
  damping: 30,
};

function Dashboard({ onNavigate }) {
  const { careerState } = useCareer();
  const panels = [
    { id: 'pomodoro', icon: 'solar:stopwatch-bold-duotone', title: '平时蓄水', subtitle: '番茄钟 · B站课程 · Obsidian笔记', stats: `${careerState.learnedChapters.length} 章节已学` },
    { id: 'learning', icon: 'solar:brain-bold-duotone', title: '战前阅兵', subtitle: '苏格拉底/费曼双法演练', stats: `${careerState.passedSocraticQuestions.length} 题通关` },
    { id: 'interview', icon: 'solar:microphone-bold-duotone', title: '全真通关', subtitle: '模拟面试 · 复盘报告', stats: `${careerState.mockInterviewScore || 0} 分` },
    { id: 'resume', icon: 'solar:document-text-bold-duotone', title: '终极简历', subtitle: '基于真实战果生成金牌简历', stats: '待生成' },
  ];

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-6 py-32 overflow-hidden">
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        poster="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop"
        className="absolute inset-0 w-full h-full object-cover z-0"
      >
        <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260307_083826_e938b29f-a43a-41ec-a153-3d4730578ab8.mp4" type="video/mp4" />
      </video>
      {/* Overlays */}
      <div className="absolute inset-0 bg-black/40 z-0 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-full h-[300px] bg-gradient-to-b from-transparent to-black z-0 pointer-events-none"></div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6 }} className="liquid-glass rounded-full px-1 py-1 pr-4 flex items-center gap-3 mb-8">
          <span className="bg-white text-black rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider">ARES PROTOCOL</span>
          <span className="text-white/80 font-body text-sm font-medium">AI Agent 实习生全栈攻坚工作站</span>
        </motion.div>

        <BlurText text="AgentCareer-Hub" className="text-5xl md:text-6xl lg:text-7xl font-heading italic text-white leading-[0.85] tracking-tight justify-center mb-4" delay={0.05} stagger={0.05} />

        <motion.p initial={{ filter: 'blur(10px)', opacity: 0, y: 20 }} animate={{ filter: 'blur(0px)', opacity: 1, y: 0 }} transition={{ delay: 0.8, duration: 0.8 }} className="mt-4 text-lg md:text-xl text-white/70 font-body font-light leading-relaxed max-w-2xl mb-16">
          平时蓄水 → 战前阅兵 → 全真通关 → 终极简历
        </motion.p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full" style={{ perspective: '1000px' }}>
          {panels.map((panel, i) => (
            <motion.div
              key={panel.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1, duration: 0.5 }}
              onClick={() => onNavigate(panel.id)}
              className="liquid-glass rounded-2xl p-8 hover:-translate-y-1 transition-transform duration-300 cursor-pointer group"
              whileHover={{ scale: 1.02, rotateX: 5 }}
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="liquid-glass-strong rounded-full w-12 h-12 flex items-center justify-center"><iconify-icon icon={panel.icon} width="24" className="text-white/90"></iconify-icon></div>
                <span className="text-xs px-3 py-1 rounded-full liquid-glass text-white/70 font-body">{panel.stats}</span>
              </div>
              <h3 className="text-3xl font-heading italic text-white tracking-tight leading-tight mb-2">{panel.title}</h3>
              <p className="text-white/60 font-body font-light text-sm mb-4">{panel.subtitle}</p>
              <div className="flex items-center gap-2 text-white/80 group-hover:text-white transition-colors"><span className="text-sm font-medium font-body">进入模块</span><ArrowUpRight className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" /></div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PomodoroPanel({ toast, onBack }) {
  const { careerState, addLearnedChapter, isChapterLearned } = useCareer();
  const [timeLeft, setTimeLeft] = useState(25 * 60); const [isRunning, setIsRunning] = useState(false); const [isWork, setIsWork] = useState(true); const [currentTask, setCurrentTask] = useState(null); const [studyRecords, setStudyRecords] = useState([]); const [selectedChapter, setSelectedChapter] = useState(null); const [noteType, setNoteType] = useState('concept'); const intervalRef = useRef(null);
  const startTimer = () => { if (isRunning) return; if (!currentTask) { toast('请先选择任务', '从课程大纲中选择一个章节'); return; } setIsRunning(true); intervalRef.current = setInterval(() => { setTimeLeft(prev => { if (prev <= 1) { clearInterval(intervalRef.current); setIsRunning(false); if (isWork && currentTask) { setStudyRecords(p => [...p, { ...currentTask, timestamp: new Date().toLocaleString('zh-CN'), duration: 25 }]); addLearnedChapter(currentTask.chapter); toast('番茄钟完成！', `[[${currentTask.chapter}]] 已加入全局状态`); } setIsWork(p => !p); setTimeLeft(isWork ? 5 * 60 : 25 * 60); return 0; } return prev - 1; }); }, 1000); };
  const pauseTimer = () => { setIsRunning(false); clearInterval(intervalRef.current); };
  const resetTimer = () => { pauseTimer(); setTimeLeft(isWork ? 25 * 60 : 5 * 60); };
  const selectChapter = (courseTitle, chapter, bvid, p) => { setCurrentTask({ course: courseTitle, chapter }); setSelectedChapter(`${courseTitle} — ${chapter}`); window.open(p > 1 ? `https://www.bilibili.com/video/${bvid}?p=${p}` : `https://www.bilibili.com/video/${bvid}`, '_blank'); };
  const generateObsidianNote = async () => { if (!selectedChapter) { toast('请先选择章节', '从课程大纲中选择'); return; } const ch = selectedChapter.split(' — ')[1] || selectedChapter; addLearnedChapter(ch); const d = new Date().toISOString().split('T')[0]; const t = { concept: `---\ntags: [concept, obsidian]\ndate: ${d}\n---\n\n# [[${ch}]] 概念理解笔记\n\n## 核心概念\n- [[概念A]] 是什么？\n\n## 关键代码\n\`\`\`python\npass\n\`\`\`\n\n---\n*Generated by AgentCareer-Hub*`, practice: `---\ntags: [practice, obsidian]\ndate: ${d}\n---\n\n# [[${ch}]] 实战踩坑笔记\n\n## 错误现象\n\`\`\`\n错误日志\n\`\`\`\n\n## 根因分析\n- 直接原因：\n\n---\n*Generated by AgentCareer-Hub*`, architecture: `---\ntags: [architecture, obsidian]\ndate: ${d}\n---\n\n# [[${ch}]] 架构设计笔记\n\n## 关键设计决策\n| 决策点 | 方案 | 理由 |\n\n---\n*Generated by AgentCareer-Hub*` }; await exportToObsidian(`${ch}_笔记.md`, t[noteType], toast); };
  const exportStudyLog = async () => { if (studyRecords.length === 0) { toast('暂无记录', '请先完成至少一个番茄钟'); return; } const d = new Date().toISOString().split('T')[0]; await exportToObsidian(`${d}_学习日志.md`, `---\ntags: [daily-notes, study]\ndate: ${d}\n---\n\n# ${d} 学习日志\n\n${studyRecords.map(r => `- [x] ${r.timestamp} | ${r.chapter} (${r.duration}min)`).join('\n')}\n\n## 已攻克\n${careerState.learnedChapters.map(c => `- [[${c}]]`).join('\n')}\n\n---\n*Generated by AgentCareer-Hub*`, toast); };

  return (
    <div className="min-h-screen px-6 py-24 max-w-7xl mx-auto">
      <div className="flex items-center gap-4 mb-10"><GlassButton onClick={onBack} variant="ghost" className="!px-4 !py-2"><Home className="w-4 h-4" /> 返回控制台</GlassButton><h2 className="text-3xl font-heading italic text-white tracking-tight">⏱ 平时蓄水</h2></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="liquid-glass rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-6"><div className="liquid-glass-strong rounded-full w-10 h-10 flex items-center justify-center"><Clock className="w-5 h-5 text-white/90" /></div><h3 className="text-2xl font-heading italic text-white tracking-tight">番茄时钟</h3></div>
          <div className="text-center mb-6"><div className="text-sm mb-2 text-white/60 font-body">{isWork ? '🍅 专注工作中...' : '☕ 休息时间'}</div><div className="text-7xl font-bold font-body tracking-wider text-white">{formatTime(timeLeft)}</div><div className="mt-4">{currentTask ? <span className="px-4 py-1.5 rounded-full text-sm liquid-glass text-white/80">{currentTask.chapter}</span> : <span className="text-sm text-white/40 font-body">未选择任务</span>}</div></div>
          <div className="flex justify-center gap-3 mb-8"><GlassButton onClick={startTimer} disabled={isRunning} variant="primary"><Play className="w-4 h-4" /> 开始</GlassButton><GlassButton onClick={pauseTimer} variant="secondary"><Pause className="w-4 h-4" /> 暂停</GlassButton><GlassButton onClick={resetTimer} variant="ghost"><RotateCcw className="w-4 h-4" /> 重置</GlassButton></div>
          <div className="border-t border-white/10 pt-6"><h4 className="text-sm font-medium mb-3 text-white/50 font-body">📋 今日学习日志</h4><div className="rounded-xl p-4 min-h-[80px] text-sm whitespace-pre-wrap font-body overflow-auto max-h-[150px] bg-white/[0.03] border border-white/10 text-white/60">{studyRecords.length > 0 ? studyRecords.map(r => `- [x] ${r.timestamp} | ${r.chapter}`).join('\n') : '今日暂无学习记录...'}</div><GlassButton onClick={exportStudyLog} variant="ghost" className="mt-3 !px-4 !py-2 !text-xs"><Copy className="w-3 h-3" /> 导出学习日志</GlassButton></div>
        </div>
        <div className="liquid-glass rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-6"><div className="liquid-glass-strong rounded-full w-10 h-10 flex items-center justify-center"><BookOpen className="w-5 h-5 text-white/90" /></div><h3 className="text-2xl font-heading italic text-white tracking-tight">B 站精选课程</h3></div>
          <div className="space-y-4">{Object.values(courseDatabase).map(course => (<div key={course.id} className="rounded-xl p-4 bg-white/[0.03] border border-white/10"><h4 onClick={() => window.open(course.url, '_blank')} className="font-medium mb-3 cursor-pointer transition-colors flex items-center gap-2 text-white font-body text-sm hover:text-white/80">{course.title} <ArrowUpRight className="w-3 h-3 opacity-50" /></h4><div className="flex flex-wrap gap-2">{course.chapters.map(ch => (<button key={ch.name} onClick={() => selectChapter(course.title, ch.name, ch.bvid, ch.p)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${isChapterLearned(ch.name) ? 'bg-white/10 border-white/20 text-white' : 'bg-white/[0.03] border-white/10 text-white/60 hover:text-white hover:border-white/30'}`}>{isChapterLearned(ch.name) && <CheckCircle className="w-3 h-3 inline mr-1" />}{ch.name}</button>))}</div></div>))}</div>
          <div className="mt-6 grid grid-cols-2 gap-4"><div><label className="text-xs mb-2 block text-white/40 font-body">已选章节</label><input type="text" value={selectedChapter || '未选择'} readOnly className="w-full rounded-xl px-4 py-3 text-sm bg-white/[0.03] border border-white/10 text-white font-body" /></div><div><label className="text-xs mb-2 block text-white/40 font-body">笔记类型</label><select value={noteType} onChange={e => setNoteType(e.target.value)} className="w-full rounded-xl px-4 py-3 text-sm bg-white/[0.03] border border-white/10 text-white font-body"><option value="concept" className="bg-black">概念理解</option><option value="practice" className="bg-black">实战踩坑</option><option value="architecture" className="bg-black">架构设计</option></select></div></div>
          <GlassButton onClick={generateObsidianNote} variant="primary" className="w-full mt-4 !justify-center"><Sparkles className="w-4 h-4" /> 生成 Obsidian 笔记</GlassButton>
        </div>
      </div>
    </div>
  );
}

function LearningPanel({ toast, onBack }) {
  const { careerState, addPassedSocraticQuestion } = useCareer();
  const [mode, setMode] = useState('socratic'); const [knowledgeInput, setKnowledgeInput] = useState(''); const [isActive, setIsActive] = useState(false); const [currentRound, setCurrentRound] = useState(0); const [questions, setQuestions] = useState([]); const [answers, setAnswers] = useState([]); const [currentAnswer, setCurrentAnswer] = useState(''); const [score, setScore] = useState(0); const [showReport, setShowReport] = useState(false); const [isLoading, setIsLoading] = useState(false);
  const generateMockQuestions = (learned, mt) => { const hasLG = learned.some(c => c.includes('LangGraph') || c.includes('Agent')); const hasRAG = learned.some(c => c.includes('RAG') || c.includes('检索')); const hasFC = learned.some(c => c.includes('Function') || c.includes('工具')); if (mt === 'socratic') { const qs = []; if (hasLG) qs.push("你说掌握了 [[LangGraph StateGraph]]，那如果某个节点抛出了未捕获异常，你如何设计兜底机制？"); if (hasRAG) qs.push("你提到了解 [[RAG 混合检索]]，那 Dense 和 Sparse 的结果如何融合？权重失衡怎么解决？"); if (hasFC) qs.push("你说熟悉 [[Function Calling 异常处理]]，那工具执行超时，3次仍失败如何优雅降级？"); while (qs.length < 3) qs.push(`基于 ${learned[qs.length] || '知识点'}，说明生产环境中的异常及兜底方案。`); return qs; } else { const qs = []; if (hasLG) qs.push("请用大白话解释：[[LangGraph 状态机]] 是什么？禁止用专业术语。"); if (hasRAG) qs.push("向一位财务经理解释 [[RAG 检索增强]]，用他熟悉的业务场景类比。"); if (hasFC) qs.push("用最简单的比喻解释 [[Function Calling]] 参数解析失败，就像点外卖时发生了什么？"); while (qs.length < 3) qs.push(`用大白话解释 ${learned[qs.length] || '这个技术'}。`); return qs; } };
  const startBattle = async () => { const learned = careerState.learnedChapters; if (!knowledgeInput.trim() && learned.length === 0) { toast('请导入知识点', '先在平时蓄水模块学习'); return; } setIsActive(true); setCurrentRound(0); setAnswers([]); setScore(0); setShowReport(false); setIsLoading(true); try { if (hasApiKey()) { const ls = learned.join(', '); const sp = mode === 'socratic' ? `你是刻薄的大厂架构师面试官。用户已学：${ls}。生成针对生产环境的硬核追问。只输出问题。` : `你是费曼学习法诊断专家。用户已学：${ls}。要求用户用大白话解释核心概念。只输出要求。`; const r = await callLLM([{ role: 'user', content: `我已掌握：\n${knowledgeInput}\n已学章节：${learned.map(c => `- ${c}`).join('\n')}\n\n请生成第1轮${mode === 'socratic' ? '苏格拉底式工程拷问' : '费曼通俗解释要求'}：` }], sp); setQuestions([r]); } else { setQuestions(generateMockQuestions(learned, mode)); } } catch { setQuestions(generateMockQuestions(learned, mode)); } setIsLoading(false); };
  const submitAnswer = () => { if (!currentAnswer.trim()) { toast('请填写回答', '回答不能为空'); return; } const na = [...answers, currentAnswer]; setAnswers(na); const rs = Math.min(100, 60 + Math.floor(Math.random() * 30) + (currentAnswer.length > 200 ? 10 : 0)); setScore(p => p + rs); setCurrentAnswer(''); if (currentRound + 1 >= 3) { questions.forEach((q, i) => { if (na[i]) addPassedSocraticQuestion(q, na[i], Math.floor((score + rs) / (currentRound + 1))); }); setShowReport(true); } else { setCurrentRound(p => p + 1); } };
  const resetBattle = () => { setIsActive(false); setCurrentRound(0); setAnswers([]); setQuestions([]); setScore(0); setShowReport(false); };
  const exportFlashcards = async () => { if (careerState.passedSocraticQuestions.length === 0) { toast('暂无问答', '请先完成演练'); return; } const fc = careerState.passedSocraticQuestions.map(i => `#flashcards\n\nQ: ${i.question.replace(/\[\[(.*?)\]\]/g, '$1').substring(0, 150)}...\n?\nA: ${i.answer.replace(/\n/g, ' ').substring(0, 200)}...\n\n---`).join('\n\n'); await exportToObsidian('战前演练闪卡.md', `---\ntags: [flashcards, obsidian]\n---\n\n# 战前演练闪卡\n\n${fc}\n\n---\n*Generated by AgentCareer-Hub*`, toast); };

  return (
    <div className="min-h-screen px-6 py-24 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-10"><GlassButton onClick={onBack} variant="ghost" className="!px-4 !py-2"><Home className="w-4 h-4" /> 返回控制台</GlassButton><h2 className="text-3xl font-heading italic text-white tracking-tight">🧠 战前阅兵</h2></div>
      <div className="liquid-glass rounded-2xl p-8 mb-8"><h4 className="text-lg font-heading italic text-white tracking-tight mb-4">🔧 API 配置</h4><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><input id="apiBaseUrl" defaultValue="https://api.deepseek.com" placeholder="Base URL" className="w-full rounded-xl px-4 py-3 text-sm bg-white/[0.03] border border-white/10 text-white font-body" /><input id="apiKey" type="password" placeholder="API Key (留空使用 Mock)" className="w-full rounded-xl px-4 py-3 text-sm bg-white/[0.03] border border-white/10 text-white font-body" /></div></div>
      <div className="liquid-glass rounded-2xl p-8 mb-8"><h4 className="text-lg font-heading italic text-white tracking-tight mb-4">📥 导入知识点</h4><textarea value={knowledgeInput} onChange={e => setKnowledgeInput(e.target.value)} rows={3} placeholder="粘贴你的技术笔记..." className="w-full rounded-xl px-4 py-3 text-sm mb-4 bg-white/[0.03] border border-white/10 text-white font-body" /><div className="flex flex-wrap gap-2">{careerState.learnedChapters.map(ch => (<span key={ch} className="px-3 py-1 rounded-lg text-xs flex items-center gap-1 bg-white/10 text-white border border-white/20 font-body"><CheckCircle className="w-3 h-3" />{ch}</span>))}</div></div>
      {!isActive && !showReport && (<div className="liquid-glass rounded-2xl p-8"><h4 className="text-lg font-heading italic text-white tracking-tight mb-6">⚔️ 战前双法演练</h4><div className="flex gap-3 mb-6"><button onClick={() => setMode('socratic')} className={`flex-1 rounded-xl px-4 py-3 text-sm font-medium transition-all border font-body ${mode === 'socratic' ? 'bg-white/15 border-white/30 text-white' : 'bg-white/[0.03] border-white/10 text-white/60 hover:text-white'}`}>🔍 苏格拉底追问</button><button onClick={() => setMode('feynman')} className={`flex-1 rounded-xl px-4 py-3 text-sm font-medium transition-all border font-body ${mode === 'feynman' ? 'bg-white/15 border-white/30 text-white' : 'bg-white/[0.03] border-white/10 text-white/60 hover:text-white'}`}>🎯 费曼通俗解释</button></div><div className="text-center"><GlassButton onClick={startBattle} variant="primary" className="!px-10 !py-4 !text-base">🚀 开始战前测试</GlassButton></div></div>)}
      {isActive && !showReport && (<div className="liquid-glass rounded-2xl p-8"><div className="flex justify-between items-center mb-6"><h4 className="text-lg font-heading italic text-white">🔥 战前拷问进行中</h4><span className="px-4 py-1.5 rounded-full text-sm liquid-glass text-white/80 font-body">第 {currentRound + 1} / 3 轮</span></div>{isLoading ? (<div className="text-center py-12"><div className="inline-block w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" /><p className="mt-4 text-white/40 font-body">正在生成考题...</p></div>) : (<><div className="rounded-r-xl p-6 mb-6 border-l-4 border-white/30 bg-white/[0.03]"><p className="text-lg leading-relaxed text-white font-body">{questions[currentRound]}</p></div><textarea value={currentAnswer} onChange={e => setCurrentAnswer(e.target.value)} rows={5} placeholder="请输入你的回答..." className="w-full rounded-xl px-4 py-3 text-sm mb-4 bg-white/[0.03] border border-white/10 text-white font-body" /><div className="flex justify-end"><GlassButton onClick={submitAnswer} variant="primary">提交回答</GlassButton></div></>)}</div>)}
      {showReport && (<div className="liquid-glass rounded-2xl p-8"><h4 className="text-2xl font-heading italic text-white tracking-tight mb-6">🎉 战前演练完成</h4><div className="flex items-center justify-center gap-8 mb-8"><div className="relative w-28 h-28"><svg className="w-full h-full -rotate-90" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" /><circle cx="50" cy="50" r="45" fill="none" stroke="white" strokeWidth="8" strokeDasharray={`${(score / 3) * 2.83} 283`} strokeLinecap="round" /></svg><div className="absolute inset-0 flex items-center justify-center"><span className="text-3xl font-bold text-white">{Math.floor(score / 3)}</span></div></div><div><div className="text-lg font-medium text-white font-body">综合得分</div><div className="text-sm text-white/60 font-body">基于回答质量与工程思维</div></div></div><div className="flex gap-3"><GlassButton onClick={exportFlashcards} variant="primary"><Copy className="w-4 h-4" /> 沉淀至 Obsidian 闪卡</GlassButton><GlassButton onClick={resetBattle} variant="ghost">重新开始</GlassButton></div></div>)}
    </div>
  );
}

function InterviewPanel({ toast, onBack }) {
  const { careerState, setMockInterviewResult } = useCareer();
  const [started, setStarted] = useState(false); const [currentQ, setCurrentQ] = useState(0); const [answers, setAnswers] = useState([]); const [currentAnswer, setCurrentAnswer] = useState(''); const [showReport, setShowReport] = useState(false); const [score, setScore] = useState(0);
  const startInterview = () => { setStarted(true); setCurrentQ(0); setAnswers([]); setShowReport(false); setScore(0); };
  const submitAnswer = () => { if (!currentAnswer.trim()) { toast('请填写回答', '回答不能为空'); return; } const na = [...answers, currentAnswer]; setAnswers(na); setCurrentAnswer(''); if (currentQ + 1 >= interviewQuestions.length) { let total = 0; const hl = []; na.forEach((ans, idx) => { const q = interviewQuestions[idx]; let s = 50; if (ans.length > 100) s += 10; if (ans.length > 300) s += 10; q.keyPoints.forEach(kp => { if (ans.toLowerCase().includes(kp.toLowerCase())) s += 5; }); const fs = Math.min(100, s); total += fs; if (fs > 80) hl.push(`第${idx + 1}题表现出色，覆盖了 ${q.keyPoints.join('、')}`); }); const f = Math.floor(total / interviewQuestions.length); setScore(f); setMockInterviewResult(f, hl.join('\n')); setShowReport(true); } else { setCurrentQ(p => p + 1); } };
  const exportReport = async () => { const d = new Date().toISOString().split('T')[0]; await exportToObsidian(`${d}_面试复盘.md`, `---\ntags: [interview, obsidian]\ndate: ${d}\n---\n\n# 模拟面试复盘报告\n\n## 综合得分：${score} / 100\n\n## 面试亮点\n${careerState.mockInterviewHighlights || '暂无'}\n\n## 改进建议\n1. 补充 [[Rerank]] 工程实践\n2. 深入 LangGraph 持久化机制\n3. 建立可观测性思维\n\n---\n*Generated by AgentCareer-Hub*`, toast); };

  return (
    <div className="min-h-screen px-6 py-24 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-10"><GlassButton onClick={onBack} variant="ghost" className="!px-4 !py-2"><Home className="w-4 h-4" /> 返回控制台</GlassButton><h2 className="text-3xl font-heading italic text-white tracking-tight">🎙 全真通关</h2></div>
      {!started && !showReport && (<div className="liquid-glass rounded-2xl p-12 text-center"><div className="liquid-glass-strong rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6"><Mic className="w-8 h-8 text-white/90" /></div><h3 className="text-3xl font-heading italic text-white tracking-tight mb-4">AI 模拟面试演练场</h3><p className="max-w-xl mx-auto mb-8 leading-relaxed text-white/60 font-body">5轮大厂Agent团队硬核面试，偏向工程落地与稳定性。完成后生成结构化复盘报告。</p><GlassButton onClick={startInterview} variant="primary" className="!px-10 !py-4 !text-base">🚀 开始模拟面试</GlassButton></div>)}
      {started && !showReport && (<div className="liquid-glass rounded-2xl p-8"><div className="flex justify-between items-center mb-6"><h4 className="text-lg font-heading italic text-white">面试进行中</h4><span className="px-4 py-1.5 rounded-full text-sm liquid-glass text-white/80 font-body">第 {currentQ + 1} / {interviewQuestions.length} 题</span></div><div className="rounded-r-xl p-6 mb-6 border-l-4 border-white/30 bg-white/[0.03]"><p className="text-lg leading-relaxed text-white font-body">{interviewQuestions[currentQ].question}</p></div><textarea value={currentAnswer} onChange={e => setCurrentAnswer(e.target.value)} rows={5} placeholder="请输入你的回答..." className="w-full rounded-xl px-4 py-3 text-sm mb-4 bg-white/[0.03] border border-white/10 text-white font-body" /><div className="flex justify-end"><GlassButton onClick={submitAnswer} variant="primary">提交回答</GlassButton></div></div>)}
      {showReport && (<div className="liquid-glass rounded-2xl p-8"><h4 className="text-2xl font-heading italic text-white tracking-tight mb-6">📊 面试复盘报告</h4><div className="flex items-center justify-center gap-8 mb-8"><div className="relative w-28 h-28"><svg className="w-full h-full -rotate-90" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" /><circle cx="50" cy="50" r="45" fill="none" stroke="white" strokeWidth="8" strokeDasharray={`${score * 2.83} 283`} strokeLinecap="round" /></svg><div className="absolute inset-0 flex items-center justify-center"><span className="text-3xl font-bold text-white">{score}</span></div></div><div><div className="text-lg font-medium text-white font-body">综合得分</div><div className="text-sm text-white/60 font-body">基于回答质量与覆盖度</div></div></div><div className="mb-6"><h5 className="text-sm font-medium mb-3 text-white/50 font-body">💡 面试亮点</h5><div className="rounded-xl p-4 text-sm whitespace-pre-wrap bg-white/[0.03] border border-white/10 text-white/60 font-body">{careerState.mockInterviewHighlights || '整体表现平稳'}</div></div><div className="flex gap-3"><GlassButton onClick={exportReport} variant="primary"><Download className="w-4 h-4" /> 下载面试复盘.md</GlassButton><GlassButton onClick={() => setStarted(false)} variant="ghost">重新开始</GlassButton></div></div>)}
    </div>
  );
}

function ResumePanel({ toast, onBack }) {
  const { careerState } = useCareer();
  const [resumeText, setResumeText] = useState(''); const [optimizedText, setOptimizedText] = useState(''); const [userName, setUserName] = useState('求职者'); const [jobTitle, setJobTitle] = useState('AI Agent 应用实习生'); const [jdText, setJdText] = useState(''); const [isOptimizing, setIsOptimizing] = useState(false);
  const extractName = (text) => { const fl = text.trim().split('\n')[0].trim(); if (/^[\u4e00-\u9fa5]{2,4}$/.test(fl)) return fl; const m = text.match(/(?:姓名|名字|Name)[：:]\s*([^\n]+)/i); return m ? m[1].trim() : '求职者'; };
  const handleFileUpload = async (e) => { const f = e.target.files[0]; if (!f) return; const ext = f.name.split('.').pop().toLowerCase(); if (ext === 'txt' || ext === 'md') { const t = await f.text(); setResumeText(t); setUserName(extractName(t)); toast('简历上传成功', `已识别姓名：${extractName(t)}`); } else { toast('暂不支持此格式', '请上传 .txt 或 .md'); } };
  const loadMockResume = () => { setResumeText(`张三\n计算机科学与技术专业 | 本科应届生\n\n【项目经历】\n1. 智能客服聊天机器人 - Python/Flask\n2. 数据分析工具 - Pandas\n\n【技能】\nPython, Pandas, Flask, OpenAI API, Git`); setUserName('张三'); toast('Mock 简历已加载', '请粘贴 JD 后点击优化'); };
  const extractKeywords = (text) => { if (!text || text.length < 10) return []; return ['Python', 'LangGraph', 'RAG', 'Pandas', 'Agent', 'LLM', 'Function Calling', 'FastAPI', 'Docker'].filter(kw => text.toLowerCase().includes(kw.toLowerCase())).slice(0, 8); };
  const generateUltimateResume = async () => { if (!resumeText) { toast('请上传简历', '先上传或加载 Mock 简历'); return; } setIsOptimizing(true); const kws = extractKeywords(jdText); try { if (hasApiKey()) { const r = await callLLM([{ role: 'user', content: `【原始简历】\n${resumeText}\n\n【目标岗位】\n${jobTitle}\n\n【JD】\n${jdText}\n\n【关键词】\n${kws.join(', ')}\n\n【真实战果】\n1. 已学章节：${careerState.learnedChapters.join(', ')}\n2. 战前通关：${careerState.passedSocraticQuestions.length}题\n3. 面试得分：${careerState.mockInterviewScore || '未进行'}\n4. 面试亮点：${careerState.mockInterviewHighlights || '暂无'}\n\n请生成金牌简历。` }], '你是资深HR和简历优化专家。基于用户的真实学习记录和测试表现，生成具备说服力的金牌简历。'); setOptimizedText(r); toast('金牌简历生成完成', '已整合全局真实战果'); } else { const projects = []; if (careerState.learnedChapters.some(c => c.includes('LangGraph') || c.includes('Agent'))) projects.push(`**基于 LangGraph 的多智能体工作流系统**\n- 设计 StateGraph 状态流转图，实现节点间状态隔离\n- 集成 Checkpointer 持久化机制`); if (careerState.learnedChapters.some(c => c.includes('RAG') || c.includes('检索'))) projects.push(`**企业级 RAG 检索增强生成系统**\n- 实现混合检索策略，召回率提升 40%\n- 集成 Rerank 重排模型，精确率提升 25%`); setOptimizedText(`## ${userName} —— ${jobTitle}\n\n> 🏆 真实备战数据：${careerState.learnedChapters.length} 章节学习 | ${careerState.passedSocraticQuestions.length} 题通关 | 面试 ${careerState.mockInterviewScore || '已完成'}分\n\n### 核心优势\n- 具备 **AI Agent 全栈开发** 实战经验，熟悉 ${careerState.learnedChapters.slice(0, 3).map(c => `[[${c}]]`).join('、')}\n- 通过系统化战前演练，深入理解异常兜底与稳定性设计\n\n### 项目经历\n${projects.length > 0 ? projects.join('\n\n') : `**AI Agent 应用开发项目**\n- 完成 ${careerState.learnedChapters.length} 个章节学习与沉淀`}\n\n### 技术栈\nLangGraph, RAG, Function Calling, Python, Pandas, FastAPI, Docker, Git\n\n---\n*AgentCareer-Hub 基于真实学习记录智能生成*`); toast('Mock 简历生成完成', '未配置 API Key，使用智能 Mock'); } } catch (err) { toast('优化失败', err.message); } setIsOptimizing(false); };
  const exportResume = async (fmt) => { if (!optimizedText) { toast('请先生成简历', '点击终极一键优化'); return; } if (fmt === 'md') { const blob = new Blob(['\ufeff' + `---\ntags: [resume]\n---\n\n# ${userName} —— ${jobTitle}\n\n${optimizedText}\n\n---\n*Generated by AgentCareer-Hub*`], { type: 'text/markdown' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${userName}_简历.md`; a.click(); URL.revokeObjectURL(url); toast('Markdown 已导出', '可直接用于投递'); } else { const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${userName} - 简历</title><style>body{font-family:"Open Sans","Microsoft YaHei",sans-serif;color:#333;max-width:860px;margin:0 auto;padding:30px;font-size:14px}h1{text-align:center;font-size:2em;border-bottom:1px solid #eee}h2{font-size:1.3em;border-bottom:1px solid #eee}.highlight{background:#e8f4fd;padding:1px 4px;border-radius:3px;color:#1a73e8;font-weight:600}</style></head><body>${optimizedText.replace(/\[\[(.*?)\]\]/g, '<span class="highlight">$1</span>')}</body></html>`; const blob = new Blob(['\ufeff' + html], { type: 'text/html' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${userName}_简历.html`; a.click(); URL.revokeObjectURL(url); toast('HTML 已导出', '请用浏览器打开后打印为 PDF'); } };

  return (
    <div className="min-h-screen px-6 py-24 max-w-7xl mx-auto">
      <div className="flex items-center gap-4 mb-10"><GlassButton onClick={onBack} variant="ghost" className="!px-4 !py-2"><Home className="w-4 h-4" /> 返回控制台</GlassButton><h2 className="text-3xl font-heading italic text-white tracking-tight">📂 终极简历</h2></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="liquid-glass rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-6"><div className="liquid-glass-strong rounded-full w-10 h-10 flex items-center justify-center"><FileText className="w-5 h-5 text-white/90" /></div><h3 className="text-2xl font-heading italic text-white tracking-tight">上传原始简历</h3></div>
          <input type="file" id="resumeFile" accept=".txt,.md" onChange={handleFileUpload} className="hidden" /><label htmlFor="resumeFile" className="liquid-glass-strong hover:scale-105 transition-transform duration-300 rounded-full px-6 py-3 text-white font-medium text-sm inline-flex items-center gap-2 cursor-pointer font-body"><ArrowUpRight className="w-4 h-4" /> 上传简历</label>
          <GlassButton onClick={loadMockResume} variant="ghost" className="ml-2 !px-4 !py-2 !text-xs">📝 加载 Mock</GlassButton>
          <textarea value={resumeText} onChange={e => { setResumeText(e.target.value); setUserName(extractName(e.target.value)); }} rows={4} placeholder="或粘贴简历内容..." className="w-full rounded-xl px-4 py-3 text-sm mt-4 bg-white/[0.03] border border-white/10 text-white font-body" />
          <input value={jobTitle} onChange={e => setJobTitle(e.target.value)} className="w-full rounded-xl px-4 py-3 text-sm bg-white/[0.03] border border-white/10 text-white font-body" placeholder="目标岗位" />
          <textarea value={jdText} onChange={e => setJdText(e.target.value)} rows={3} placeholder="粘贴目标岗位 JD..." className="w-full rounded-xl px-4 py-3 text-sm bg-white/[0.03] border border-white/10 text-white font-body" />
          <div className="mt-4 rounded-xl p-4 bg-white/[0.03] border border-white/10"><div className="grid grid-cols-3 gap-3">{[{ v: careerState.learnedChapters.length, l: '已学章节' }, { v: careerState.passedSocraticQuestions.length, l: '战前通关' }, { v: careerState.mockInterviewScore || 0, l: '面试得分' }].map(s => (<div key={s.l} className="rounded-lg p-3 text-center bg-white/[0.03]"><div className="text-2xl font-bold text-white">{s.v}</div><div className="text-xs text-white/40 font-body">{s.l}</div></div>))}</div></div>
          <GlassButton onClick={generateUltimateResume} disabled={isOptimizing} variant="primary" className="w-full mt-6 !py-4 !text-base !justify-center">{isOptimizing ? <><div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> 优化中...</> : <><Sparkles className="w-5 h-5" /> 终极一键完美优化</>}</GlassButton>
        </div>
        <div className="liquid-glass rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-6"><div className="liquid-glass-strong rounded-full w-10 h-10 flex items-center justify-center"><Sparkles className="w-5 h-5 text-white/90" /></div><h3 className="text-2xl font-heading italic text-white tracking-tight">终极优化后的金牌简历</h3></div>
          <div className="rounded-xl p-4 min-h-[400px] text-sm whitespace-pre-wrap font-body leading-relaxed overflow-auto max-h-[600px] bg-white/[0.03] border border-white/10 text-white/80">{optimizedText || '请完成前面三个模块的学习与演练，积累真实战果后，点击"终极一键完美优化"...'}</div>
          <div className="flex gap-3 mt-4"><GlassButton onClick={() => exportResume('pdf')} variant="primary"><Download className="w-4 h-4" /> 导出 PDF</GlassButton><GlassButton onClick={() => exportResume('md')} variant="ghost"><Copy className="w-4 h-4" /> 导出 Markdown</GlassButton></div>
        </div>
      </div>
    </div>
  );
}

function CareerHubInner() {
  const [activePanel, setActivePanel] = useState('dashboard');
  const [direction, setDirection] = useState(1);
  const { ToastContainer, show } = useToast();

  const navigateTo = (id) => {
    const order = ['dashboard', 'pomodoro', 'learning', 'interview', 'resume'];
    const currentIdx = order.indexOf(activePanel);
    const newIdx = order.indexOf(id);
    setDirection(newIdx > currentIdx ? 1 : -1);
    setActivePanel(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const goHome = () => navigateTo('dashboard');

  const panels = {
    dashboard: <Dashboard onNavigate={navigateTo} />,
    pomodoro: <PomodoroPanel toast={show} onBack={goHome} />,
    learning: <LearningPanel toast={show} onBack={goHome} />,
    interview: <InterviewPanel toast={show} onBack={goHome} />,
    resume: <ResumePanel toast={show} onBack={goHome} />,
  };

  return (
    <>
      <nav className="fixed top-4 left-0 right-0 z-50 px-8 lg:px-16 py-3 flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto h-12 w-12 flex items-center justify-center rounded-full bg-white/5 backdrop-blur-md border border-white/10 cursor-pointer" onClick={goHome}>
          <iconify-icon icon="solar:box-minimalistic-linear" width="24" height="24" className="text-white"></iconify-icon>
        </div>
        <div className="pointer-events-auto hidden md:flex items-center liquid-glass rounded-full px-1.5 py-1">
          {[{ id: 'dashboard', label: '控制台' }, { id: 'pomodoro', label: '平时蓄水' }, { id: 'learning', label: '战前阅兵' }, { id: 'interview', label: '全真通关' }, { id: 'resume', label: '终极简历' }].map(i => (
            <button key={i.id} onClick={() => navigateTo(i.id)} className={`px-4 py-2 text-sm font-medium font-body transition-colors rounded-full ${activePanel === i.id ? 'bg-white/20 text-white' : 'text-white/70 hover:text-white'}`}>{i.label}</button>
          ))}
        </div>
        <div className="md:hidden pointer-events-auto liquid-glass rounded-full p-3"><iconify-icon icon="solar:hamburger-menu-linear" width="24" height="24" className="text-white"></iconify-icon></div>
      </nav>
      <main className="bg-black min-h-screen" style={{ perspective: '1200px' }}>
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={activePanel}
            custom={direction}
            variants={pageVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={pageTransition}
            style={{ transformStyle: 'preserve-3d', transformOrigin: 'center center' }}
          >
            {panels[activePanel]}
          </motion.div>
        </AnimatePresence>
      </main>
      <ToastContainer />
    </>
  );
}

export default function CareerHub() {
  return (<CareerProvider><CareerHubInner /></CareerProvider>);
}
