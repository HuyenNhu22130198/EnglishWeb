import { useEffect, useRef, useState } from 'react';
import { chatbotAPI } from '../services/chatbotService';
import { useExamSession } from '../contexts/ExamSessionContext';
import { dictionaryAPI } from '../services/dictionaryService';
import styles from './FloatingDictionary.module.css';

const initialChatMessages = [
  {
    id: 'welcome',
    role: 'bot',
    text: 'Hãy copy câu hỏi trên đề bài, mình sẽ tìm đáp án và giải thích trong ngân hàng đề. Khi đang làm đề, bạn chỉ cần gõ số câu (vd "câu 1") để tra nhanh.',
  },
];

const formatExamContextLabel = (examContext) => {
  if (!examContext) {
    return '';
  }
  const name = examContext.examName || examContext.examCode || 'Đề đang làm';
  const scope = examContext.skill
    ? String(examContext.skill).toUpperCase()
    : examContext.partNo != null
      ? `Part ${examContext.partNo}`
      : '';
  return scope ? `${name} — ${scope}` : name;
};

const faqCategories = [
  {
    id: 'chung',
    label: 'Chung',
    description: 'So sánh & định hướng IELTS/TOEIC',
    items: [
      {
        question: 'IELTS và TOEIC khác nhau như thế nào?',
        answer:
          'IELTS đánh giá tiếng Anh học thuật/định cư với đủ 4 kỹ năng Nghe – Nói – Đọc – Viết, chấm theo band 0–9, thường dùng để du học và định cư. TOEIC (bản phổ biến là Listening & Reading) tập trung tiếng Anh giao tiếp trong môi trường công sở, chấm theo thang điểm 10–990, thường dùng để tuyển dụng và đánh giá nhân sự.',
      },
      {
        question: 'Tôi nên chọn thi IELTS hay TOEIC?',
        answer:
          'Chọn theo mục tiêu: du học, định cư hoặc học chương trình quốc tế thì thi IELTS. Xin việc, thăng tiến hoặc đáp ứng chuẩn đầu ra tiếng Anh của công ty/doanh nghiệp thì TOEIC thường phù hợp và tiết kiệm chi phí hơn. Hãy kiểm tra yêu cầu cụ thể của trường/công ty trước khi quyết định.',
      },
      {
        question: 'Điểm IELTS và TOEIC có hiệu lực trong bao lâu?',
        answer:
          'Cả chứng chỉ IELTS và TOEIC thường có giá trị 2 năm kể từ ngày thi. Sau thời gian này, nhiều trường và nhà tuyển dụng sẽ yêu cầu chứng chỉ mới, nên bạn nên thi gần thời điểm cần dùng.',
      },
      {
        question: 'Có thể thi trên máy tính hay chỉ thi trên giấy?',
        answer:
          'IELTS có cả hai hình thức: thi trên giấy (paper-based) và thi trên máy (computer-delivered); riêng phần Speaking luôn phỏng vấn trực tiếp với giám khảo. TOEIC phổ biến ở dạng thi trên giấy, một số nơi có thi trên máy. Website này giúp bạn luyện tập theo định dạng đề tương tự để làm quen trước khi thi thật.',
      },
      {
        question: 'Bao lâu sau khi thi thì có kết quả?',
        answer:
          'Với IELTS, kết quả thi trên máy thường có sau 3–5 ngày, thi trên giấy khoảng 13 ngày. Với TOEIC, kết quả thường có sau vài ngày đến khoảng 1–2 tuần tùy đơn vị tổ chức. Thời gian cụ thể do đơn vị khảo thí công bố.',
      },
      {
        question: 'Cần đạt bao nhiêu điểm để du học hoặc xin việc?',
        answer:
          'Không có mức chung: du học đại học thường yêu cầu IELTS 6.0–6.5 trở lên, nhiều chương trình cao hơn. Với công việc, yêu cầu TOEIC dao động khá rộng (ví dụ 450–600 cho vị trí phổ thông, 700+ cho vị trí cần giao tiếp nhiều). Hãy đối chiếu đúng yêu cầu của nơi bạn nộp hồ sơ.',
      },
    ],
  },
  {
    id: 'ielts',
    label: 'IELTS',
    description: 'Cấu trúc, band điểm & mẹo làm bài',
    items: [
      {
        question: 'Bài thi IELTS gồm những phần nào và kéo dài bao lâu?',
        answer:
          'IELTS gồm 4 kỹ năng: Listening (~30 phút + thời gian chép đáp án), Reading (60 phút), Writing (60 phút) và Speaking (11–14 phút). Ba kỹ năng Nghe – Đọc – Viết thi liên tục trong cùng một buổi, còn Speaking có thể thi cùng ngày hoặc lệch vài ngày.',
      },
      {
        question: 'Band điểm IELTS được tính như thế nào?',
        answer:
          'Mỗi kỹ năng được chấm theo band từ 0 đến 9 (bước 0.5). Điểm Overall là trung bình cộng của 4 kỹ năng, làm tròn về mốc 0.5 gần nhất (ví dụ trung bình 6.25 làm tròn thành 6.5, 6.75 thành 7.0).',
      },
      {
        question: 'IELTS Academic và General Training khác nhau ra sao?',
        answer:
          'Phần Listening và Speaking giống nhau ở cả hai. Khác biệt nằm ở Reading và Writing: Academic dùng văn bản học thuật và Writing Task 1 mô tả biểu đồ/bảng số liệu, phù hợp du học; General Training dùng ngữ cảnh đời sống/công việc và Writing Task 1 là viết thư, phù hợp định cư và lao động.',
      },
      {
        question: 'Phần Listening và Reading có cấu trúc thế nào?',
        answer:
          'Listening có 4 phần, tổng 40 câu, nội dung từ hội thoại đời sống đến bài giảng học thuật, chỉ được nghe một lần. Reading có 3 đoạn văn dài, tổng 40 câu, với nhiều dạng câu hỏi như True/False/Not Given, nối thông tin, điền từ, trắc nghiệm. Bạn có thể luyện đúng các dạng này trong phần đề IELTS của website.',
      },
      {
        question: 'Writing và Speaking được đánh giá theo tiêu chí gì?',
        answer:
          'Writing chấm theo 4 tiêu chí: hoàn thành yêu cầu đề, tính mạch lạc & liên kết, vốn từ vựng, và độ chính xác ngữ pháp. Speaking chấm theo: độ trôi chảy & mạch lạc, từ vựng, ngữ pháp, và phát âm. Task 2 (Writing) có trọng số cao hơn Task 1, nên cần đầu tư kỹ hơn.',
      },
      {
        question: 'Có mẹo nào để cải thiện điểm IELTS không?',
        answer:
          'Luyện nghe/đọc mỗi ngày với đề bấm giờ để quen áp lực thời gian; học từ vựng theo chủ đề và ghi vào flashcard; với Writing hãy viết đúng bố cục và trả lời trọng tâm đề; với Speaking hãy tập nói thành câu hoàn chỉnh, tránh trả lời cụt. Sau khi làm đề trên website, hãy xem lại đáp án và giải thích để rút kinh nghiệm.',
      },
    ],
  },
  {
    id: 'toeic',
    label: 'TOEIC',
    description: 'Định dạng, thang điểm & mẹo làm bài',
    items: [
      {
        question: 'Bài thi TOEIC Listening & Reading gồm những gì?',
        answer:
          'TOEIC Listening & Reading kéo dài khoảng 2 giờ với 200 câu trắc nghiệm: 100 câu Listening (~45 phút) và 100 câu Reading (75 phút). Điểm được quy về thang 10–990. Đây là bài thi phổ biến nhất khi nói đến "thi TOEIC".',
      },
      {
        question: '7 phần (Part) của TOEIC là những phần nào?',
        answer:
          'Part 1: Mô tả tranh; Part 2: Hỏi – đáp; Part 3: Đoạn hội thoại; Part 4: Bài nói ngắn (4 phần này thuộc Listening). Part 5: Hoàn thành câu; Part 6: Hoàn thành đoạn văn; Part 7: Đọc hiểu đơn & nhiều đoạn (3 phần này thuộc Reading). Trên website, bạn có thể chọn luyện từng Part riêng.',
      },
      {
        question: 'TOEIC Speaking & Writing có khác không?',
        answer:
          'Có. Ngoài bài Listening & Reading, TOEIC còn bài Speaking & Writing riêng, đánh giá kỹ năng nói và viết trong ngữ cảnh công sở, chấm theo thang điểm và cấp độ riêng. Nhiều đơn vị chỉ yêu cầu bản Listening & Reading, nên hãy xác nhận yêu cầu trước khi đăng ký.',
      },
      {
        question: 'Điểm TOEIC tương ứng với trình độ nào?',
        answer:
          'Về cơ bản: 10–250 là sơ cấp, 255–400 sơ – trung cấp, 405–600 trung cấp giao tiếp cơ bản, 605–780 khá tốt, 785–900 tốt, 905–990 gần như thành thạo. Đây là mức tham khảo; yêu cầu cụ thể tùy trường học và nhà tuyển dụng.',
      },
      {
        question: 'Có mẹo làm nhanh Part 5 và Part 7 không?',
        answer:
          'Part 5 chủ yếu kiểm tra ngữ pháp và từ vựng: hãy nhìn nhanh loại từ cần điền (danh/động/tính/trạng từ) và các dấu hiệu ngữ pháp để chọn, tránh sa đà dịch cả câu. Part 7 nhiều bài đọc: đọc câu hỏi trước rồi quét (scan) thông tin trong bài, quản lý thời gian để không mắc kẹt ở một bài quá lâu.',
      },
      {
        question: 'Bài thi TOEIC kéo dài bao lâu?',
        answer:
          'Bản Listening & Reading kéo dài khoảng 2 giờ làm bài (chưa kể thời gian điền thông tin và hướng dẫn). Khi luyện trên website, bạn nên bật bộ đếm giờ và làm trọn bộ để tập quản lý thời gian sát với thi thật.',
      },
    ],
  },
  {
    id: 'tai-khoan-luyen-tap',
    label: 'Tài khoản & Luyện tập',
    description: 'Đăng nhập, làm đề, nộp bài & xem kết quả',
    items: [
      {
        question: 'Làm sao để đăng ký hoặc đăng nhập tài khoản?',
        answer:
          'Bạn có thể đăng ký bằng email và mật khẩu, hoặc đăng nhập nhanh bằng tài khoản Google hoặc Facebook. Nên đăng nhập trước khi luyện để hệ thống lưu kết quả và tiến trình học của bạn.',
      },
      {
        question: 'Tôi quên mật khẩu thì phải làm gì?',
        answer:
          'Tại trang đăng nhập, chọn "Quên mật khẩu", nhập email đã đăng ký để nhận liên kết đặt lại mật khẩu, rồi tạo mật khẩu mới. Nếu không thấy email, hãy kiểm tra hộp thư rác/spam.',
      },
      {
        question: 'Làm thế nào để bắt đầu luyện một đề thi?',
        answer:
          'Vào mục TOEIC hoặc IELTS, chọn đề bạn muốn làm và bấm bắt đầu. Với TOEIC bạn có thể chọn luyện từng Part hoặc làm full test; với IELTS bạn chọn kỹ năng (Listening, Reading, Writing, Speaking) để luyện.',
      },
      {
        question: 'Chọn Part (TOEIC) hoặc kỹ năng (IELTS) như thế nào?',
        answer:
          'Ở trang chi tiết đề, TOEIC cho phép tích chọn các Part muốn luyện (ví dụ chỉ Part 5, 6) hoặc chọn full test; IELTS cho phép chọn kỹ năng cần luyện. Sau khi chọn, hệ thống chỉ tải đúng phần đề tương ứng để bạn tập trung.',
      },
      {
        question: 'Nộp bài và xem kết quả ở đâu?',
        answer:
          'Sau khi làm xong, bấm nộp bài; hệ thống chấm tự động với các câu Nghe/Đọc trắc nghiệm và đưa bạn tới trang kết quả kèm đáp án đúng, giải thích và thống kê theo phần. Bạn có thể xem lại để biết mình sai ở đâu.',
      },
      {
        question: 'Tôi có thể làm lại một đề đã làm không?',
        answer:
          'Có. Bạn có thể quay lại đề bất kỳ và làm lại nhiều lần để cải thiện. Mỗi lần làm là một lượt riêng, giúp bạn theo dõi tiến bộ qua thời gian.',
      },
      {
        question: 'Công cụ tô sáng (highlight) và bộ đếm giờ dùng ra sao?',
        answer:
          'Trong lúc làm bài, bạn có thể bật chế độ tô sáng để đánh dấu từ/câu quan trọng trong đề, và theo dõi thời gian đã làm qua bộ đếm giờ. Những công cụ này giúp bạn luyện thói quen quản lý thời gian và ghi chú như khi thi thật.',
      },
    ],
  },
  {
    id: 'cong-cu',
    label: 'Công cụ',
    description: 'Chatbot, từ điển & flashcard',
    items: [
      {
        question: 'Chatbot tra đáp án câu hỏi hoạt động thế nào?',
        answer:
          'Mở tab "Giải thích câu hỏi". Khi bạn đang làm một đề, chỉ cần gõ số câu (ví dụ "câu 1") là chatbot tự tìm đáp án và giải thích của đúng câu đó trong đề bạn đang làm. Ngoài ra bạn vẫn có thể dán nguyên câu hỏi để hệ thống đối chiếu với ngân hàng đề.',
      },
      {
        question: 'Vì sao tôi chỉ cần gõ số câu là ra đáp án?',
        answer:
          'Vì khi bạn mở một đề để luyện, hệ thống đã ghi nhận ngữ cảnh (đề nào, phần/kỹ năng nào). Nhờ đó chỉ cần số câu là chatbot xác định đúng câu hỏi. Nếu bạn không đang ở trang làm đề, hãy mở đề rồi gõ số câu, hoặc dán nguyên câu hỏi.',
      },
      {
        question: 'Vì sao chatbot không tìm thấy câu hỏi?',
        answer:
          'Nếu bạn dán câu hỏi nhưng chỉ vài từ khóa quá chung chung, hệ thống có thể không đủ dữ liệu để xác định đúng câu. Hãy sao chép sát nội dung câu hỏi trong đề, hoặc nếu đang làm đề thì gõ số câu để tra chính xác hơn.',
      },
      {
        question: 'Chatbot có chấm bài Writing hoặc Speaking không?',
        answer:
          'Chatbot tập trung tra cứu đáp án và giải thích các câu hỏi có sẵn trong ngân hàng đề (chủ yếu là Nghe/Đọc). Các bài Writing và Speaking được hỗ trợ ở phần luyện riêng, không tra qua tab câu hỏi thường gặp này.',
      },
      {
        question: 'Từ điển Anh–Việt dùng như thế nào?',
        answer:
          'Bấm nút công cụ nổi bên phải để mở từ điển, nhập từ cần tra để xem nghĩa, phiên âm và ví dụ. Rất tiện khi bạn gặp từ mới trong lúc làm đề mà không muốn rời trang.',
      },
      {
        question: 'Flashcard giúp gì cho việc học từ vựng?',
        answer:
          'Bạn có thể lưu các từ mới vào flashcard theo bộ và ôn lại sau. Kết hợp học từ theo chủ đề với luyện đề sẽ giúp bạn nhớ lâu và dùng từ chính xác hơn trong bài thi.',
      },
    ],
  },
];

const formatPercent = (value) => {
  if (typeof value !== 'number') {
    return '';
  }

  return `${Math.round(value * 100)}%`;
};

const formatAnswerValue = (answer) => {
  if (!answer) {
    return '';
  }

  return [answer.key, answer.text].filter(Boolean).join(' - ');
};

const FloatingDictionary = () => {
  const { examContext } = useExamSession();
  const [isOpen, setIsOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [wordData, setWordData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [playingAudio, setPlayingAudio] = useState(false);
  const [activeChatTab, setActiveChatTab] = useState('faq');
  const [faqCategory, setFaqCategory] = useState(null);
  const [openFaqQuestion, setOpenFaqQuestion] = useState(null);
  const [chatMessage, setChatMessage] = useState('');
  const [chatMessages, setChatMessages] = useState(initialChatMessages);
  const [chatLoading, setChatLoading] = useState(false);

  const audioRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const lookupWord = async (keyword) => {
    if (abortRef.current) {
      abortRef.current.abort();
    }

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setLoading(true);
      setError('');
      setCopied(false);

      const data = await dictionaryAPI.lookupWord(keyword, controller.signal);
      setWordData(data);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setWordData(null);
        setError(err.message || 'Không thể tải dữ liệu từ điển.');
      }
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }

      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();

    const keyword = searchTerm.trim();

    if (!keyword) return;

    setIsOpen(true);
    setIsChatOpen(false);
    lookupWord(keyword);
  };

  const handlePlayAudio = () => {
    if (!wordData?.audioUrl) return;

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(wordData.audioUrl);
    audioRef.current = audio;

    setPlayingAudio(true);

    audio.onended = () => setPlayingAudio(false);
    audio.onerror = () => setPlayingAudio(false);

    audio.play().catch(() => {
      setPlayingAudio(false);
    });
  };

  const handleCopyWord = async () => {
    if (!wordData?.word) return;

    try {
      await navigator.clipboard.writeText(wordData.word);
      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1600);
    } catch {
      setCopied(false);
    }
  };

  const handleSynonymClick = (synonym) => {
    setSearchTerm(synonym);
    setIsOpen(true);
    setIsChatOpen(false);
    lookupWord(synonym);
  };

  const openDictionary = () => {
    setIsOpen(true);
    setIsChatOpen(false);
  };

  const openChatbot = () => {
    setIsChatOpen(true);
    setIsOpen(false);
  };

  const clearChat = () => {
    setChatMessages(initialChatMessages);
    setChatMessage('');
  };

  const openFaqCategory = (categoryId) => {
    setFaqCategory(categoryId);
    setOpenFaqQuestion(null);
  };

  const backToFaqCategories = () => {
    setFaqCategory(null);
    setOpenFaqQuestion(null);
  };

  const toggleFaqQuestion = (questionId) => {
    setOpenFaqQuestion((current) => (current === questionId ? null : questionId));
  };

  const activeFaqCategory = faqCategories.find((category) => category.id === faqCategory) || null;

  const handleChatSubmit = async (event) => {
    event.preventDefault();

    const trimmedMessage = chatMessage.trim();

    if (!trimmedMessage || chatLoading) {
      return;
    }

    setChatMessages((current) => [
      ...current,
      {
        id: `user-${Date.now()}`,
        role: 'user',
        text: trimmedMessage,
      },
    ]);
    setChatMessage('');
    setChatLoading(true);

    try {
      const response = await chatbotAPI.ask(trimmedMessage, examContext);
      const data = response?.data;

      setChatMessages((current) => [
        ...current,
        {
          id: `bot-${Date.now()}`,
          role: 'bot',
          text: data?.message || response?.message || 'Đã nhận câu hỏi.',
          result: data,
        },
      ]);
    } catch (err) {
      setChatMessages((current) => [
        ...current,
        {
          id: `bot-error-${Date.now()}`,
          role: 'bot',
          text: err.message || 'Không thể tra cứu câu hỏi lúc này.',
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const hasPronunciation = Boolean(wordData?.phonetic || wordData?.audioUrl);
  const hasWordTypes = wordData?.wordTypes?.length > 0;
  const hasWordForms = wordData?.wordForms?.length > 0;
  const hasSynonyms = wordData?.synonyms?.length > 0;
  const hasExample = Boolean(wordData?.example?.en || wordData?.example?.vi);

  return (
    <div className={styles.floatingDictionary}>
      {isOpen ? (
        <aside className={styles.panel} aria-label="Từ điển">
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.panelKicker}>Anh-Việt</p>
              <h2>Dictionary</h2>
            </div>

            <button
              type="button"
              className={styles.closeButton}
              onClick={() => setIsOpen(false)}
              aria-label="Đóng từ điển"
            >
              x
            </button>
          </div>

          <form onSubmit={handleSearch} className={styles.searchForm}>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Nhập từ cần tra"
              className={styles.searchInput}
            />

            <button type="submit" className={styles.searchButton} disabled={loading}>
              {loading ? 'Đang tra...' : 'Tra từ'}
            </button>
          </form>

          <div className={styles.panelBody}>
            {loading ? (
              <div className={styles.stateBox}>
                <div className={styles.spinner} />
                <p>Đang tra cứu...</p>
              </div>
            ) : error ? (
              <div className={styles.stateBox}>
                <h3>Không tìm thấy kết quả</h3>
                <p>{error}</p>
              </div>
            ) : wordData ? (
              <article className={styles.result}>
                <header className={styles.wordHeader}>
                  <div className={styles.wordMain}>
                    <span>Từ đang tra</span>
                    <h3>{wordData.word}</h3>

                    {hasWordTypes ? (
                      <div className={styles.wordTypes}>
                        {wordData.wordTypes.map((type, index) => (
                          <span key={`${type.label}-${index}`}>{type.label}</span>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className={styles.actions}>
                    <button type="button" onClick={handleCopyWord}>
                      {copied ? 'Đã copy' : 'Copy'}
                    </button>

                    {wordData.audioUrl ? (
                      <button type="button" onClick={handlePlayAudio}>
                        {playingAudio ? 'Đang phát...' : 'Nghe'}
                      </button>
                    ) : null}
                  </div>
                </header>

                <section className={styles.infoStack}>
                  <div className={styles.infoBlock}>
                    <h4>Nghĩa tiếng Việt</h4>
                    <p className={styles.mainMeaning}>{wordData.vietnameseMeaning}</p>
                  </div>

                  <div className={styles.infoBlock}>
                    <h4>Nghĩa tiếng Anh</h4>
                    <p>{wordData.englishMeaning}</p>
                  </div>

                  <div className={styles.infoBlock}>
                    <h4>Phát âm</h4>

                    {hasPronunciation ? (
                      <div className={styles.pronunciation}>
                        {wordData.phonetic ? <span>{wordData.phonetic}</span> : null}

                        {wordData.audioUrl ? (
                          <button type="button" onClick={handlePlayAudio}>
                            {playingAudio ? 'Đang phát...' : 'Phát âm'}
                          </button>
                        ) : null}
                      </div>
                    ) : (
                      <p className={styles.muted}>Chưa có dữ liệu.</p>
                    )}
                  </div>

                  <div className={styles.infoBlock}>
                    <h4>Word forms</h4>

                    {hasWordForms ? (
                      <ul className={styles.wordForms}>
                        {wordData.wordForms.map((form, index) => (
                          <li key={`${form.word}-${index}`}>
                            <strong>{form.word}</strong>
                            {form.code ? <span> ({form.code})</span> : null}
                            {form.vietnameseMeaning ? (
                              <em>: {form.vietnameseMeaning}</em>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className={styles.muted}>Chưa có dữ liệu.</p>
                    )}
                  </div>

                  <div className={styles.infoBlock}>
                    <h4>Từ đồng nghĩa</h4>

                    {hasSynonyms ? (
                      <div className={styles.chips}>
                        {wordData.synonyms.slice(0, 16).map((synonym) => (
                          <button
                            key={synonym}
                            type="button"
                            onClick={() => handleSynonymClick(synonym)}
                          >
                            {synonym}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className={styles.muted}>Chưa có dữ liệu.</p>
                    )}
                  </div>

                  <div className={styles.infoBlock}>
                    <h4>Ví dụ minh họa</h4>

                    {hasExample ? (
                      <div className={styles.example}>
                        {wordData.example.en ? <p>{wordData.example.en}</p> : null}
                        {wordData.example.vi ? <span>{wordData.example.vi}</span> : null}
                      </div>
                    ) : (
                      <p className={styles.muted}>Chưa có dữ liệu.</p>
                    )}
                  </div>
                </section>
              </article>
            ) : (
              <div className={styles.stateBox}>
                <h3>Nhập từ bạn muốn tra cứu</h3>
                <p>Ví dụ: success, environment, look after.</p>
              </div>
            )}
          </div>
        </aside>
      ) : null}

      {isChatOpen ? (
        <aside className={`${styles.panel} ${styles.chatPanel}`} aria-label="Chatbot">
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.panelKicker}>TOEIC / IELTS</p>
              <h2>Chatbot</h2>
            </div>

            <div className={styles.panelActions}>
              <button
                type="button"
                className={styles.toolButton}
                onClick={clearChat}
                aria-label="Làm mới hội thoại"
              >
                ↻
              </button>

              <button
                type="button"
                className={styles.closeButton}
                onClick={() => setIsChatOpen(false)}
                aria-label="Đóng chatbot"
              >
                x
              </button>
            </div>
          </div>

          <div className={styles.chatTabs} role="tablist" aria-label="Chatbot tabs">
            <button
              type="button"
              className={activeChatTab === 'faq' ? styles.activeChatTab : ''}
              onClick={() => setActiveChatTab('faq')}
              role="tab"
              aria-selected={activeChatTab === 'faq'}
            >
              Câu hỏi thường gặp
            </button>

            <button
              type="button"
              className={activeChatTab === 'explain' ? styles.activeChatTab : ''}
              onClick={() => setActiveChatTab('explain')}
              role="tab"
              aria-selected={activeChatTab === 'explain'}
            >
              Giải thích câu hỏi
            </button>
          </div>

          {activeChatTab === 'faq' ? (
            <div className={styles.faqList}>
              {activeFaqCategory ? (
                <>
                  <button
                    type="button"
                    className={styles.faqBackButton}
                    onClick={backToFaqCategories}
                  >
                    ← Quay lại chủ đề
                  </button>

                  <h3 className={styles.faqCategoryTitle}>{activeFaqCategory.label}</h3>

                  <div className={styles.faqQuestionList}>
                    {activeFaqCategory.items.map((item, index) => {
                      const questionId = `${activeFaqCategory.id}-${index}`;
                      const isOpen = openFaqQuestion === questionId;

                      return (
                        <article className={styles.faqItem} key={questionId}>
                          <button
                            type="button"
                            className={`${styles.faqQuestionButton} ${
                              isOpen ? styles.faqQuestionOpen : ''
                            }`}
                            onClick={() => toggleFaqQuestion(questionId)}
                            aria-expanded={isOpen}
                          >
                            <span>{item.question}</span>
                            <span className={styles.faqChevron} aria-hidden="true">
                              {isOpen ? '−' : '+'}
                            </span>
                          </button>

                          {isOpen ? <p className={styles.faqAnswer}>{item.answer}</p> : null}
                        </article>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className={styles.faqCategoryGrid}>
                  {faqCategories.map((category) => (
                    <button
                      type="button"
                      key={category.id}
                      className={styles.faqCategoryButton}
                      onClick={() => openFaqCategory(category.id)}
                    >
                      <strong>{category.label}</strong>
                      <span>{category.description}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {activeChatTab === 'explain' && examContext ? (
            <div className={styles.examContextBadge}>
              <span className={styles.examContextDot} aria-hidden="true" />
              Đang làm: {formatExamContextLabel(examContext)}
            </div>
          ) : null}

          <div
            className={`${styles.chatMessages} ${
              activeChatTab === 'explain' ? '' : styles.hiddenPanel
            }`}
          >
            {chatMessages.map((item) => (
              <article
                key={item.id}
                className={`${styles.chatMessage} ${
                  item.role === 'user' ? styles.userMessage : styles.botMessage
                }`}
              >
                <p>{item.text}</p>

                {item.result?.found ? (
                  <div className={styles.answerCard}>
                    <div className={styles.metaRow}>
                      <span>{item.result.examType}</span>
                      <span>{item.result.examCode}</span>
                      {item.result.skill ? <span>{item.result.skill}</span> : null}
                      {item.result.partNo ? <span>Part {item.result.partNo}</span> : null}
                      {item.result.matchScore ? (
                        <span>Match {formatPercent(item.result.matchScore)}</span>
                      ) : null}
                    </div>

                    <h3>Câu {item.result.questionNo || item.result.questionId}</h3>

                    {item.result.questionText ? (
                      <p className={styles.questionText}>{item.result.questionText}</p>
                    ) : null}

                    <div className={styles.answerLine}>
                      <strong>Đáp án:</strong>
                      {item.result.answers?.length ? (
                        <div className={styles.answerValues}>
                          {item.result.answers.map((answer, index) => (
                            <span key={`${item.id}-answer-${answer.key || answer.text || index}`}>
                              {formatAnswerValue(answer)}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span>
                          {[item.result.answer, item.result.answerText]
                            .filter(Boolean)
                            .join(' - ')}
                        </span>
                      )}
                    </div>

                    {item.result.options?.length ? (
                      <ul className={styles.optionList}>
                        {item.result.options.map((option) => (
                          <li
                            key={`${item.id}-${option.label}`}
                            className={option.correct ? styles.correctOption : ''}
                          >
                            <strong>{option.label}.</strong> {option.text}
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    {item.result.explanation ? (
                      <div className={styles.detailBlock}>
                        <strong>Giải thích</strong>
                        <p>{item.result.explanation}</p>
                      </div>
                    ) : null}

                    {item.result.transcriptText ? (
                      <div className={styles.detailBlock}>
                        <strong>Transcript</strong>
                        <p>{item.result.transcriptText}</p>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </article>
            ))}

            {chatLoading ? (
              <div className={`${styles.chatMessage} ${styles.botMessage}`}>
                <p>Đang tìm trong ngân hàng câu hỏi...</p>
              </div>
            ) : null}
          </div>

          <form
            className={`${styles.chatForm} ${
              activeChatTab === 'explain' ? '' : styles.hiddenPanel
            }`}
            onSubmit={handleChatSubmit}
          >
            <textarea
              value={chatMessage}
              onChange={(event) => setChatMessage(event.target.value)}
              placeholder={
                examContext
                  ? 'Gõ số câu (vd "câu 1") hoặc dán nguyên câu hỏi...'
                  : 'Paste câu hỏi cần hỏi...'
              }
              rows={3}
            />
            <button type="submit" disabled={chatLoading || !chatMessage.trim()}>
              Gửi
            </button>
          </form>
        </aside>
      ) : null}

      <div className={styles.sideDock}>
        <button
          type="button"
          className={styles.dictionaryTab}
          onClick={openDictionary}
          aria-label="Mở từ điển"
        >
          <span className={styles.bookIcon}>
            <svg viewBox="0 0 576 512" fill="currentColor" aria-hidden="true">
              <path d="M249.6 471.5c10.8 3.8 22.4-4.1 22.4-15.5l0-377.4c0-4.2-1.6-8.4-5-11C247.4 52 202.4 32 144 32C93.5 32 46.3 45.3 18.1 56.1C6.8 60.5 0 71.7 0 83.8L0 454.1c0 11.9 12.8 20.2 24.1 16.5C55.6 460.1 105.5 448 144 448c33.9 0 79 14 105.6 23.5zm76.8 0C353 462 398.1 448 432 448c38.5 0 88.4 12.1 119.9 22.6c11.3 3.8 24.1-4.6 24.1-16.5l0-370.3c0-12.1-6.8-23.3-18.1-27.6C529.7 45.3 482.5 32 432 32c-58.4 0-103.4 20-123 35.6c-3.3 2.6-5 6.8-5 11L304 456c0 11.4 11.7 19.3 22.4 15.5z" />
            </svg>
          </span>
          <span>Từ điển</span>
        </button>

        <button
          type="button"
          className={styles.dictionaryTab}
          onClick={openChatbot}
          aria-label="Mở chatbot"
        >
          <span className={styles.chatIcon}>
            <svg viewBox="0 0 640 512" fill="currentColor" aria-hidden="true">
              <path d="M320 0c17.7 0 32 14.3 32 32l0 64 120 0c39.8 0 72 32.2 72 72l0 272c0 39.8-32.2 72-72 72l-304 0c-39.8 0-72-32.2-72-72l0-272c0-39.8 32.2-72 72-72l120 0 0-64c0-17.7 14.3-32 32-32zM208 384c-8.8 0-16 7.2-16 16s7.2 16 16 16l32 0c8.8 0 16-7.2 16-16s-7.2-16-16-16l-32 0zm96 0c-8.8 0-16 7.2-16 16s7.2 16 16 16l32 0c8.8 0 16-7.2 16-16s-7.2-16-16-16l-32 0zm96 0c-8.8 0-16 7.2-16 16s7.2 16 16 16l32 0c8.8 0 16-7.2 16-16s-7.2-16-16-16l-32 0zM264 256a40 40 0 1 0 -80 0 40 40 0 1 0 80 0zm152 40a40 40 0 1 0 0-80 40 40 0 1 0 0 80zM48 224l16 0 0 192-16 0c-26.5 0-48-21.5-48-48l0-96c0-26.5 21.5-48 48-48zm544 0c26.5 0 48 21.5 48 48l0 96c0 26.5-21.5 48-48 48l-16 0 0-192 16 0z" />
            </svg>
          </span>
          <span>Chatbot</span>
        </button>

        <button
          type="button"
          className={styles.topButton}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Lên đầu trang"
        >
          <svg viewBox="0 0 384 512" fill="currentColor" aria-hidden="true">
            <path d="M214.6 41.4c-12.5-12.5-32.8-12.5-45.3 0l-160 160c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L160 141.2 160 448c0 17.7 14.3 32 32 32s32-14.3 32-32l0-306.7L329.4 246.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3l-160-160z" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default FloatingDictionary;
