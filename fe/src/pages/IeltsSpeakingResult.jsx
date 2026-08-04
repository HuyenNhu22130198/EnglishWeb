import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './IeltsSpeakingResult.module.css';

const parseDetail = (json) => { try { return typeof json === 'string' ? JSON.parse(json) : (json || {}); } catch { return {}; } };
const scoreClass = (value) => Number(value) >= 80 ? styles.good : Number(value) >= 60 ? styles.warning : styles.bad;

const BrowserAnswer = ({ answer, detail }) => <>
  <div className={styles.textBlock}><span>Bài mẫu</span><p>{answer.referenceText}</p></div>
  <div className={styles.textBlock}><span>Trình duyệt nhận diện</span><p>{answer.recognizedText || detail.recognizedText || 'Không có transcript.'}</p></div>
  <div className={styles.scores}>{[['Độ khớp khi đọc', detail.readingMatchScore, 2], ['Từ đọc đúng', detail.matchedWordCount, 0], ['Từ bỏ sót', detail.missingWordCount, 0], ['Từ đọc thêm', detail.extraWordCount, 0]].map(([label, value, digits]) =>
    <div key={label}><span>{label}</span><strong>{Number(value ?? 0).toFixed(digits)}</strong></div>)}</div>
  <div className={styles.words} aria-label="Chi tiết so khớp từng từ">{(detail.wordResults || []).map((item, index) =>
    <span className={styles[String(item.status || '').toLowerCase()]} key={`${item.word}-${index}`}>{item.word}</span>)}</div>
  <p className={styles.disclaimer}>Kết quả này dựa trên khả năng nhận diện lời đọc của trình duyệt và mức độ khớp với bài mẫu, không phải điểm phát âm IELTS.</p>
</>;

const AzureAnswer = ({ answer, detail }) => {
  const words = detail?.NBest?.[0]?.Words || [];
  return <><div className={styles.textBlock}><span>Câu mẫu</span><p>{answer.referenceText}</p></div>
    <div className={styles.textBlock}><span>Azure nhận diện</span><p>{answer.recognizedText || 'Không có transcript.'}</p></div>
    <div className={styles.scores}>{[['PronScore', answer.pronunciationScore], ['Accuracy', answer.accuracyScore], ['Fluency', answer.fluencyScore], ['Completeness', answer.completenessScore], ...(answer.prosodyScore == null ? [] : [['Prosody', answer.prosodyScore]])]
      .filter(([, value]) => value != null).map(([label, value]) => <div key={label}><span>{label}</span><strong>{Number(value).toFixed(1)}</strong></div>)}</div>
    {words.length ? <div className={styles.words} aria-label="Chi tiết từng từ">{words.map((word, index) => { const assessment = word.PronunciationAssessment || {};
      const omission = String(assessment.ErrorType || '').toLowerCase() === 'omission';
      return <span title={`${assessment.ErrorType || 'None'} · ${assessment.AccuracyScore ?? 0}`} className={omission ? styles.omission : scoreClass(assessment.AccuracyScore)} key={`${word.Word}-${index}`}>{word.Word}</span>; })}</div>
      : <p className={styles.noWords}>Azure không trả chi tiết từng từ cho lượt đọc này.</p>}</>;
};

const IeltsSpeakingResult = ({ result }) => {
  const navigate = useNavigate();
  const grouped = useMemo(() => (result.answers || []).reduce((groups, answer) => { groups[answer.partNo] = [...(groups[answer.partNo] || []), answer]; return groups; }, {}), [result.answers]);
  const retry = () => navigate(`/practice/ielts/${result.examId}/speaking/free`);
  const browserOnly = result.assessmentSource === 'BROWSER'; const azureOnly = result.assessmentSource === 'AZURE';
  const summary = [...(!azureOnly && result.averageReadingMatchScore != null ? [['Độ khớp khi đọc trung bình', result.averageReadingMatchScore]] : []),
    ...(!browserOnly ? [['Phát âm trung bình', result.averagePronunciationScore], ['Accuracy', result.averageAccuracyScore], ['Fluency', result.averageFluencyScore], ['Completeness', result.averageCompletenessScore]].filter(([, value]) => value != null) : [])];
  return <main className={styles.page}><header className={styles.hero}><span>IELTS SPEAKING RESULT</span><h1>{result.examName}</h1><p>{result.practicedCount}/{result.totalSamples} mẫu đã luyện</p>
    <button onClick={retry}>Luyện lại đề này</button></header>
    <section className={styles.summary}>{summary.map(([label, value]) => <div key={label}><span>{label}</span><strong>{Number(value ?? 0).toFixed(label.includes('Độ khớp') ? 2 : 1)}</strong></div>)}</section>
    {Object.entries(grouped).map(([part, answers]) => <section className={styles.part} key={part}><h2>Part {part}</h2>{answers.map((answer) => { const detail = parseDetail(answer.resultJson); const browser = detail.assessmentSource === 'BROWSER';
      return <article className={styles.answer} key={answer.sampleAnswerId}><div className={styles.answerHeading}><div><h3>{answer.question}</h3>{answer.segmentTitle && Number(part) === 2 ? <h4>{answer.segmentTitle}</h4> : null}</div><b className={browser ? styles.browserBadge : styles.azureBadge}>{browser ? 'So khớp bằng trình duyệt' : 'Đánh giá Azure'}</b></div>
        {browser ? <BrowserAnswer answer={answer} detail={detail} /> : <AzureAnswer answer={answer} detail={detail} />}</article>; })}</section>)}
  </main>;
};
export default IeltsSpeakingResult;
