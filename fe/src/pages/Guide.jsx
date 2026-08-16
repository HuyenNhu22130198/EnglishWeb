import { Link } from 'react-router-dom';
import styles from './Guide.module.css';

const Guide = () => {
  return (
    <main className={styles.guide}>
      <section className={styles.intro}>
        <span className={styles.eyebrow}>Bắt đầu thật dễ dàng</span>
        <h1>Hướng dẫn sử dụng</h1>
        <p>
          Khám phá các công cụ luyện đề và học tập trên EngWise để xây dựng
          lộ trình ôn luyện phù hợp với mục tiêu của bạn.
        </p>
      </section>

      <div className={styles.guideGrid}>
        <section className={styles.card}>
          <div className={styles.cardNumber}>01</div>
          <h2>Luyện đề TOEIC và IELTS</h2>
          <ol>
            <li>Chọn chứng chỉ và đề thi phù hợp.</li>
            <li>Làm bài theo từng phần trong thời gian quy định.</li>
            <li>Nộp bài và xem kết quả để nhận biết nội dung cần cải thiện.</li>
          </ol>
          <div className={styles.actions}>
            <Link to="/exams/toeic">Luyện đề TOEIC</Link>
            <Link to="/exams/ielts">Luyện đề IELTS</Link>
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardNumber}>02</div>
          <h2>Flashcard</h2>
          <ol>
            <li>Mở bộ flashcard từ vựng.</li>
            <li>Lật thẻ để ghi nhớ nghĩa và cách dùng.</li>
            <li>Ôn lại thường xuyên để củng cố vốn từ.</li>
          </ol>
          <Link className={styles.cardLink} to="/flashcard">Ôn từ vựng</Link>
        </section>

        <section className={styles.card}>
          <div className={styles.cardNumber}>03</div>
          <h2>Diễn đàn</h2>
          <ol>
            <li>Đọc các chủ đề đang được cộng đồng quan tâm.</li>
            <li>Đặt câu hỏi về bài tập hoặc kinh nghiệm luyện thi.</li>
            <li>Trao đổi và chia sẻ kiến thức cùng người học khác.</li>
          </ol>
          <Link className={styles.cardLink} to="/forum">Đến diễn đàn</Link>
        </section>

        <section className={styles.card}>
          <div className={styles.cardNumber}>04</div>
          <h2>Từ điển nổi và Chatbot</h2>
          <ol>
            <li>Tìm nút công cụ nổi ở góc phải màn hình.</li>
            <li>Nhấn vào nút từ điển để tra nhanh một từ tiếng Anh.</li>
            <li>Mở Chatbot khi cần hỏi đáp và gợi ý trong quá trình học.</li>
          </ol>
          <p className={styles.hint}>Các công cụ này luôn sẵn sàng trên màn hình học tập.</p>
        </section>

        <section className={`${styles.card} ${styles.accountCard}`}>
          <div className={styles.cardNumber}>05</div>
          <h2>Tài khoản</h2>
          <ol>
            <li>Đăng ký tài khoản bằng thông tin cá nhân của bạn.</li>
            <li>Đăng nhập trước khi luyện đề.</li>
            <li>Theo dõi kết quả và lưu lại tiến độ học tập.</li>
          </ol>
          <div className={styles.actions}>
            <Link to="/register">Đăng ký</Link>
            <Link to="/login">Đăng nhập</Link>
          </div>
        </section>
      </div>
    </main>
  );
};

export default Guide;
