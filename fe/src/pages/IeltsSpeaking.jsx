import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';
import { useAuth } from '../contexts/AuthContext';
import { ieltsAPI } from '../services/ieltsService';
import styles from './IeltsSpeaking.module.css';

const MAX_RECORDING_MS = 30000;
const UNSUPPORTED_SPEECH = 'Trình duyệt chưa hỗ trợ nhận diện giọng nói. Vui lòng dùng Chrome hoặc Microsoft Edge.';

const parseResult = (resultJson) => {
  try { return typeof resultJson === 'string' ? JSON.parse(resultJson) : (resultJson || {}); }
  catch { return {}; }
};

const microphoneMessage = (error) => {
  const code = error?.error || error?.name;
  if (code === 'not-allowed' || code === 'service-not-allowed' || code === 'NotAllowedError' || code === 'PermissionDeniedError') {
    return 'Bạn đã từ chối quyền microphone. Hãy bật quyền microphone trong cài đặt trình duyệt rồi thử lại.';
  }
  if (code === 'no-speech') return 'Không nghe thấy giọng nói. Hãy nói rõ hơn và thử lại.';
  if (code === 'network') return 'Dịch vụ nhận diện của trình duyệt đang không khả dụng. Vui lòng thử lại sau.';
  if (code === 'audio-capture' || code === 'NotFoundError') return 'Không tìm thấy microphone khả dụng trên thiết bị.';
  return error?.message || 'Không thể sử dụng microphone. Hãy kiểm tra thiết bị và quyền truy cập rồi thử lại.';
};

const BrowserResult = ({ result }) => {
  const detail = parseResult(result.resultJson);
  return <section className={styles.result}>
    <h3>Kết quả so khớp giọng đọc</h3>
    <div className={styles.scoreGrid}>
      {[['Độ khớp khi đọc', detail.readingMatchScore], ['Từ đọc đúng', detail.matchedWordCount], ['Từ bỏ sót', detail.missingWordCount], ['Từ đọc thêm', detail.extraWordCount]].map(([label, value]) =>
        <div key={label}><span>{label}</span><strong>{Number(value ?? 0).toFixed(label === 'Độ khớp khi đọc' ? 2 : 0)}</strong></div>)}
    </div>
    <p><span>Trình duyệt nhận diện:</span> {result.recognizedText || detail.recognizedText || 'Không có transcript.'}</p>
    <div className={styles.wordResults}>{(detail.wordResults || []).map((item, index) =>
      <span key={`${item.word}-${index}`} className={styles[String(item.status || '').toLowerCase()]}>{item.word}</span>)}</div>
    <p className={styles.disclaimer}>Kết quả này dựa trên khả năng nhận diện lời đọc của trình duyệt và mức độ khớp với bài mẫu, không phải điểm phát âm IELTS.</p>
  </section>;
};

const AzureResult = ({ result }) => <section className={styles.result}>
  <h3>Kết quả phát âm Azure</h3><div className={styles.scoreGrid}>
    {[['PronScore', result.pronunciationScore], ['Accuracy', result.accuracyScore], ['Fluency', result.fluencyScore], ['Completeness', result.completenessScore], ...(result.prosodyScore == null ? [] : [['Prosody', result.prosodyScore]])]
      .filter(([, value]) => value != null).map(([label, value]) => <div key={label}><span>{label}</span><strong>{Number(value).toFixed(1)}</strong></div>)}
  </div><p><span>Azure nhận diện:</span> {result.recognizedText || 'Không có transcript.'}</p>
</section>;

const IeltsSpeaking = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [practice, setPractice] = useState(null);
  const [selectedSampleId, setSelectedSampleId] = useState(null);
  const [practicedIds, setPracticedIds] = useState(new Set());
  const [attemptId, setAttemptId] = useState(null);
  const [speed, setSpeed] = useState(1);
  const [voices, setVoices] = useState([]);
  const [recordingId, setRecordingId] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState({});
  const [mode, setMode] = useState('CHECKING');
  const [azureCredentials, setAzureCredentials] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [completing, setCompleting] = useState(false);
  const recognizerRef = useRef(null);
  const timerRef = useRef(null);
  const recognitionFinishedRef = useRef(false);

  const storageKey = useMemo(() => `ielts-speaking-attempt:${user?.id || user?.email || 'current-user'}:${examId}`, [examId, user]);
  const samples = useMemo(() => (practice?.speakingParts || []).flatMap((part) => {
    const items = new Map((part.items || []).map((item) => [Number(item.itemId), item]));
    return (part.samples || []).map((sample) => ({ ...sample, partNo: part.partNo, topicTitle: part.topicTitle,
      instruction: part.instruction, question: sample.speakingItemId ? items.get(Number(sample.speakingItemId))?.content : part.topicTitle,
      cueItems: part.partNo === 2 ? part.items || [] : [] }));
  }), [practice]);
  const selected = samples.find((sample) => Number(sample.sampleAnswerId) === Number(selectedSampleId)) || samples[0];

  const stopRecognition = () => {
    clearTimeout(timerRef.current); timerRef.current = null;
    const active = recognizerRef.current; recognizerRef.current = null;
    if (active?.kind === 'browser') { try { active.instance.stop(); } catch { /* already stopped */ } }
    if (active?.kind === 'azure') active.instance.close();
    setRecordingId(null);
  };

  useEffect(() => {
    const updateVoices = () => setVoices(window.speechSynthesis?.getVoices?.() || []);
    updateVoices(); window.speechSynthesis?.addEventListener?.('voiceschanged', updateVoices);
    return () => window.speechSynthesis?.removeEventListener?.('voiceschanged', updateVoices);
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [practiceResponse, tokenOutcome] = await Promise.all([
          ieltsAPI.getIeltsPractice(examId, 'SPEAKING'),
          ieltsAPI.getSpeakingToken().then((response) => ({ response })).catch((tokenError) => ({ tokenError })),
        ]);
        if (!practiceResponse.success || !practiceResponse.data) throw new Error(practiceResponse.message || 'Dữ liệu Speaking không hợp lệ.');
        if (!active) return;
        setPractice(practiceResponse.data);
        setSelectedSampleId(practiceResponse.data.speakingParts?.[0]?.samples?.[0]?.sampleAnswerId || null);
        if (tokenOutcome.tokenError) {
          if ([401, 403].includes(tokenOutcome.tokenError.status)) throw tokenOutcome.tokenError;
          setMode('BROWSER'); setAzureCredentials(null);
        } else {
          const token = tokenOutcome.response?.data?.token; const region = tokenOutcome.response?.data?.region;
          if (token && region) { setMode('AZURE'); setAzureCredentials({ token, region }); }
          else { setMode('BROWSER'); setAzureCredentials(null); }
        }
        const stored = window.localStorage.getItem(storageKey);
        if (stored) {
          try {
            const state = await ieltsAPI.getSpeakingAttempt(examId, stored);
            if (state.data?.status === 'IN_PROGRESS') {
              setAttemptId(state.data.attemptId); setPracticedIds(new Set((state.data.practicedSampleIds || []).map(Number)));
            } else window.localStorage.removeItem(storageKey);
          } catch { window.localStorage.removeItem(storageKey); }
        }
      } catch (requestError) { if (active) setError(requestError.message || 'Không thể tải bài Speaking.'); }
      finally { if (active) setLoading(false); }
    };
    load(); return () => { active = false; };
  }, [examId, storageKey]);

  useEffect(() => { stopRecognition(); window.speechSynthesis?.cancel(); }, [selectedSampleId]);
  useEffect(() => () => { stopRecognition(); window.speechSynthesis?.cancel(); }, []);

  const playSample = () => {
    if (!selected || !window.speechSynthesis) { setNotice('Trình duyệt này không hỗ trợ đọc bài mẫu.'); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(selected.answerText);
    utterance.lang = 'en-GB'; utterance.rate = speed;
    utterance.voice = voices.find((voice) => /^en-GB$/i.test(voice.lang)) || voices.find((voice) => /^en/i.test(voice.lang)) || null;
    window.speechSynthesis.speak(utterance);
  };

  const ensureAttempt = async () => {
    if (attemptId) return attemptId;
    const response = await ieltsAPI.startSpeakingAttempt(examId); const id = response.data?.attemptId;
    if (!id) throw new Error('Không thể tạo lượt luyện Speaking.');
    setAttemptId(id); window.localStorage.setItem(storageKey, String(id)); return id;
  };

  const saveRecognized = async (activeAttemptId, sample, recognizedText, startedAt, resultJson, scores = {}) => {
    setProcessing(true);
    try {
      const saved = await ieltsAPI.saveSpeakingAnswer(examId, { attemptId: activeAttemptId, sampleAnswerId: sample.sampleAnswerId,
        recognizedText, durationSeconds: Math.min(30, Math.max(0, Math.round((Date.now() - startedAt) / 1000))), resultJson, ...scores });
      setResults((current) => ({ ...current, [sample.sampleAnswerId]: saved.data }));
      setPracticedIds((current) => new Set([...current, Number(sample.sampleAnswerId)]));
    } catch (saveError) { setNotice(saveError.message || 'Không thể lưu kết quả. Kết quả đã lưu trước đó vẫn được giữ nguyên.'); }
    finally { setProcessing(false); }
  };

  const startBrowser = async (activeAttemptId, sample, startedAt) => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) throw Object.assign(new Error(UNSUPPORTED_SPEECH), { name: 'UnsupportedError' });
    const stream = await navigator.mediaDevices?.getUserMedia?.({ audio: true });
    if (!stream) throw Object.assign(new Error(UNSUPPORTED_SPEECH), { name: 'UnsupportedError' });
    stream.getTracks().forEach((track) => track.stop());
    const recognition = new Recognition();
    recognition.lang = 'en-GB'; recognition.continuous = false; recognition.interimResults = false; recognition.maxAlternatives = 1;
    recognitionFinishedRef.current = false;
    recognition.onstart = () => setRecordingId(sample.sampleAnswerId);
    recognition.onresult = async (event) => {
      recognitionFinishedRef.current = true; const text = event.results?.[0]?.[0]?.transcript?.trim() || '';
      stopRecognition();
      if (!text) { setNotice('Không nghe thấy giọng nói. Hãy nói rõ hơn và thử lại.'); return; }
      await saveRecognized(activeAttemptId, sample, text, startedAt, JSON.stringify({ assessmentSource: 'BROWSER' }));
    };
    recognition.onerror = (event) => { recognitionFinishedRef.current = true; stopRecognition(); setNotice(microphoneMessage(event)); };
    recognition.onend = () => {
      clearTimeout(timerRef.current); timerRef.current = null; recognizerRef.current = null; setRecordingId(null);
      if (!recognitionFinishedRef.current) setNotice('Không nghe thấy giọng nói. Hãy nói rõ hơn và thử lại.');
    };
    recognizerRef.current = { kind: 'browser', instance: recognition }; recognition.start();
  };

  const startAzure = async (activeAttemptId, sample, startedAt) => {
    const stream = await navigator.mediaDevices?.getUserMedia?.({ audio: true });
    if (!stream) throw Object.assign(new Error('Trình duyệt không hỗ trợ microphone.'), { name: 'UnsupportedError' });
    stream.getTracks().forEach((track) => track.stop());
    const speechConfig = SpeechSDK.SpeechConfig.fromAuthorizationToken(azureCredentials.token, azureCredentials.region);
    speechConfig.speechRecognitionLanguage = 'en-GB'; speechConfig.outputFormat = SpeechSDK.OutputFormat.Detailed;
    const recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, SpeechSDK.AudioConfig.fromDefaultMicrophoneInput());
    new SpeechSDK.PronunciationAssessmentConfig(sample.answerText, SpeechSDK.PronunciationAssessmentGradingSystem.HundredMark,
      SpeechSDK.PronunciationAssessmentGranularity.Phoneme, true).applyTo(recognizer);
    recognizerRef.current = { kind: 'azure', instance: recognizer }; setRecordingId(sample.sampleAnswerId);
    recognizer.recognizeOnceAsync(async (result) => {
      stopRecognition();
      if (result.reason !== SpeechSDK.ResultReason.RecognizedSpeech) {
        setNotice(result.reason === SpeechSDK.ResultReason.NoMatch ? 'Azure chưa nhận diện được lời đọc. Hãy nói rõ hơn và thử lại.' : 'Không thể đánh giá lượt đọc này. Vui lòng thử lại.'); return;
      }
      const score = SpeechSDK.PronunciationAssessmentResult.fromResult(result);
      const rawJson = result.properties.getProperty(SpeechSDK.PropertyId.SpeechServiceResponse_JsonResult) || '{}';
      await saveRecognized(activeAttemptId, sample, result.text || '', startedAt, rawJson, { pronunciationScore: score.pronunciationScore,
        accuracyScore: score.accuracyScore, fluencyScore: score.fluencyScore, completenessScore: score.completenessScore,
        ...(Number.isFinite(score.prosodyScore) ? { prosodyScore: score.prosodyScore } : {}) });
    }, (sdkError) => { stopRecognition(); setNotice(`Azure Speech không thể xử lý lượt đọc: ${String(sdkError || 'Vui lòng thử lại.')}`); });
  };

  const startPractice = async () => {
    if (!selected || recordingId || processing || mode === 'CHECKING') return;
    setNotice(''); window.speechSynthesis?.cancel(); const startedAt = Date.now();
    try {
      const activeAttemptId = await ensureAttempt();
      if (mode === 'AZURE') await startAzure(activeAttemptId, selected, startedAt);
      else await startBrowser(activeAttemptId, selected, startedAt);
      timerRef.current = setTimeout(() => { stopRecognition(); setNotice('Lượt đọc đã quá 30 giây. Vui lòng thử lại.'); }, MAX_RECORDING_MS);
    } catch (startError) { stopRecognition(); setProcessing(false); setNotice(startError.name === 'UnsupportedError' ? startError.message : microphoneMessage(startError)); }
  };

  const stopPractice = () => { if (!recognizerRef.current) return; recognitionFinishedRef.current = true; stopRecognition(); setNotice('Đã dừng lượt đọc. Nhấn “Bắt đầu luyện đọc” để thử lại.'); };
  const chooseSample = (id) => { if (!recordingId && !processing) { setSelectedSampleId(id); setNotice(''); } };
  const complete = async () => {
    if (!attemptId || practicedIds.size === 0) { setNotice('Bạn cần luyện ít nhất một câu mẫu trước khi hoàn thành.'); return; }
    try { setCompleting(true); const response = await ieltsAPI.completeSpeakingAttempt(examId, attemptId); window.localStorage.removeItem(storageKey);
      navigate(`/practice/ielts/result/${response.data?.attemptId || attemptId}`); }
    catch (completeError) { setNotice(completeError.message || 'Không thể hoàn thành bài luyện.'); } finally { setCompleting(false); }
  };

  if (loading) return <main className={styles.state}><h2>Đang tải IELTS Speaking...</h2></main>;
  if (error || !practice || !selected) return <main className={styles.state}><h2>Không thể tải IELTS Speaking</h2><p>{error}</p><button onClick={() => navigate(`/exams/ielts/${examId}`)}>Quay lại</button></main>;
  const currentResult = results[selected.sampleAnswerId]; const source = parseResult(currentResult?.resultJson).assessmentSource;
  return <main className={styles.page}>
    <header className={styles.header}><button onClick={() => navigate(`/exams/ielts/${examId}`)}>← Quay lại</button>
      <div><span>IELTS SPEAKING · SCRIPTED PRACTICE</span><h1>{practice.examName}</h1></div>
      <button className={styles.completeButton} disabled={completing || practicedIds.size === 0 || recordingId || processing} onClick={complete}>{completing ? 'Đang hoàn thành...' : 'Hoàn thành bài luyện'}</button></header>
    <div className={styles.layout}><aside className={styles.sidebar}><div className={styles.progress}><strong>{practicedIds.size}/{samples.length}</strong><span>mẫu đã luyện</span></div>
      {(practice.speakingParts || []).map((part) => <section key={part.taskId}><h2>Part {part.partNo}</h2>{(part.samples || []).map((sample) =>
        <button key={sample.sampleAnswerId} disabled={Boolean(recordingId || processing)} className={`${styles.sampleNav} ${Number(selected.sampleAnswerId) === Number(sample.sampleAnswerId) ? styles.active : ''}`} onClick={() => chooseSample(sample.sampleAnswerId)}>
          <span>{part.partNo === 2 ? `Đoạn ${sample.segmentNo}` : `Câu ${sample.displayOrder}`}</span><i className={practicedIds.has(Number(sample.sampleAnswerId)) ? styles.done : ''} /><small>{practicedIds.has(Number(sample.sampleAnswerId)) ? 'Đã luyện' : 'Chưa luyện'}</small></button>)}</section>)}</aside>
      <section className={styles.content}><div className={styles.partBadge}>PART {selected.partNo}</div><h2>{selected.topicTitle}</h2><p className={styles.instruction}>{selected.instruction}</p>
        {selected.partNo === 2 ? <div className={styles.cueCard}><h3>{selected.topicTitle}</h3>{selected.cueItems.filter((item) => Number(item.displayOrder) > 1).map((item) => <p key={item.itemId}>• {item.content}</p>)}</div> : <div className={styles.question}><span>Câu hỏi</span><strong>{selected.question}</strong></div>}
        <article className={styles.sampleCard}><div className={styles.sampleHeading}><div><span>CÂU TRẢ LỜI MẪU</span>{selected.segmentTitle && selected.partNo === 2 ? <h3>{selected.segmentTitle}</h3> : null}</div>
          <div className={styles.ttsControls}><select value={speed} onChange={(e) => setSpeed(Number(e.target.value))}><option value={0.8}>0.8x</option><option value={1}>1x</option></select><button onClick={playSample}>🔊 Nghe bài mẫu</button></div></div>
          <p className={styles.reference}>{selected.answerText}</p><div className={styles.recordControls}><button className={styles.recordButton} disabled={Boolean(recordingId || processing)} onClick={startPractice}>● Bắt đầu luyện đọc</button>
            <button disabled={Number(recordingId) !== Number(selected.sampleAnswerId)} onClick={stopPractice}>■ Dừng</button>{recordingId ? <span className={styles.live}>Đang nghe... tối đa 30 giây</span> : null}{processing ? <span className={styles.loading}>Đang lưu kết quả...</span> : null}</div></article>
        {notice ? <div className={styles.notice} role="alert">{notice}</div> : null}
        {currentResult ? (source === 'BROWSER' ? <BrowserResult result={currentResult} /> : <AzureResult result={currentResult} />) : null}
      </section></div></main>;
};

export default IeltsSpeaking;
