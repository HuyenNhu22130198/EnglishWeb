import { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import styles from './Dictionary.module.css';

const Dictionary = () => {
  const [searchTerm, setSearchTerm] = useState('calm (someone) down');
  const [result, setResult] = useState(true); // giả lập đã có kết quả

  const handleSearch = (e) => {
    e.preventDefault();
    // Sau này sẽ gọi API thực tế
    console.log('Tìm kiếm:', searchTerm);
  };

  return (
    <>
        <div className={styles.dictionaryPage}>
        <div className="container" style={{ paddingTop: '100px', paddingBottom: '80px' }}>
          
          {/* Search Bar */}
          <div className={styles.searchSection}>
            <form onSubmit={handleSearch} className={styles.searchForm}>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nhập từ hoặc cụm từ cần tra..."
                className={styles.searchInput}
              />
              <button type="submit" className={styles.searchButton}>
                🔍
              </button>
            </form>
          </div>

          {result && (
            <div className={styles.resultContainer}>
              {/* Word Header */}
              <div className={styles.wordHeader}>
                <h1 className={styles.wordTitle}>calm (someone) down</h1>
                <div className={styles.phonetic}>
                  <span>UK</span> /kɑːm/ <span className={styles.audio}>🔊</span> &nbsp;&nbsp;
                  <span>US</span> /kɑːm/ <span className={styles.audio}>🔊</span>
                </div>
                <div className={styles.wordType}>phrasal verb</div>
              </div>

              {/* Main Definition */}
              <div className={styles.definitionBox}>
                <h3>Ý nghĩa trong tiếng Anh</h3>
                <p className={styles.definition}>
                  to stop feeling upset, angry, or excited, or to stop someone feeling this way
                </p>

                <div className={styles.examples}>
                  <h4>Ví dụ:</h4>
                  <ul>
                    <li>She sat down and took a few deep breaths to calm herself down.</li>
                    <li>He was angry at first but we managed to calm him down.</li>
                    <li>Calm down, for goodness sake. It's nothing to get excited about!</li>
                  </ul>
                </div>
              </div>

              {/* Vietnamese Translation */}
              <div className={styles.translationBox}>
                <h3>Dịch sang tiếng Việt</h3>
                <p className={styles.vietMeaning}>
                  làm cho ai đó bình tĩnh lại, trấn an, xoa dịu
                </p>
              </div>

              {/* Synonyms & Related */}
              <div className={styles.synonymsBox}>
                <h3>Từ đồng nghĩa & Cụm từ liên quan</h3>
                <div className={styles.synonyms}>
                  <span>settle down</span>
                  <span>cool down</span>
                  <span>simmer down</span>
                  <span>relax</span>
                  <span>soothe</span>
                </div>
              </div>

              {/* More Examples */}
              <div className={styles.moreExamples}>
                <h3>Bổ túc các ví dụ</h3>
                <ul>
                  <li>I'd better calm down before I speak to him.</li>
                  <li>We'll talk about this later after you've calmed down.</li>
                  <li>Come on, calm down - we can sort it out.</li>
                </ul>
              </div>
            </div>
          )}

          {!result && (
            <div style={{ textAlign: 'center', padding: '100px 20px' }}>
              <h2>Không tìm thấy kết quả</h2>
              <p>Vui lòng thử từ khác hoặc kiểm tra lại chính tả.</p>
            </div>
          )}
        </div>
      </div>

    </>
  );
};

export default Dictionary;