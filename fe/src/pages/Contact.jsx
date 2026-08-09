import { useState } from 'react';
import styles from './Contact.module.css';

const initialForm = {
  fullName: '',
  email: '',
  message: '',
};

const Contact = () => {
  const [formData, setFormData] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: '' }));
    setSuccess('');
  };

  const validate = () => {
    const nextErrors = {};
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!formData.fullName.trim()) nextErrors.fullName = 'Vui lòng nhập họ tên.';
    if (!formData.email.trim()) {
      nextErrors.email = 'Vui lòng nhập email.';
    } else if (!emailPattern.test(formData.email.trim())) {
      nextErrors.email = 'Email chưa đúng định dạng.';
    }
    if (!formData.message.trim()) nextErrors.message = 'Vui lòng nhập nội dung liên hệ.';

    return nextErrors;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextErrors = validate();

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setSuccess('');
      return;
    }

    const subject = encodeURIComponent(`Liên hệ StudyEnglishWithNhu từ ${formData.fullName.trim()}`);
    const body = encodeURIComponent(
      `Họ tên: ${formData.fullName.trim()}\nEmail: ${formData.email.trim()}\n\nNội dung:\n${formData.message.trim()}`,
    );

    setErrors({});
    setSuccess('Thông tin hợp lệ. Ứng dụng email của bạn đang được mở.');
    window.location.href = `mailto:contact@studyenglishwithnhu.edu.vn?subject=${subject}&body=${body}`;
  };

  return (
    <main className={styles.contactPage}>
      <section className={styles.intro}>
        <span>StudyEnglishWithNhu</span>
        <h1>Liên hệ với chúng tôi</h1>
        <p>Gửi câu hỏi hoặc góp ý để cùng hoàn thiện trải nghiệm luyện tiếng Anh.</p>
      </section>

      <div className={styles.contactGrid}>
        <section className={styles.information}>
          <h2>Thông tin liên hệ</h2>
          <p>
            StudyEnglishWithNhu là đồ án tốt nghiệp xây dựng nền tảng luyện đề tiếng Anh,
            hỗ trợ người học ôn tập chủ động và theo dõi tiến độ.
          </p>
          <dl>
            <div>
              <dt>Email</dt>
              <dd>
                <a href="mailto:contact@studyenglishwithnhu.edu.vn">
                  contact@studyenglishwithnhu.edu.vn
                </a>
              </dd>
            </div>
            <div>
              <dt>Hotline</dt>
              <dd>0123 456 789</dd>
            </div>
            <div>
              <dt>Facebook</dt>
              <dd><a href="#" aria-label="Facebook">Facebook</a></dd>
            </div>
            <div>
              <dt>YouTube</dt>
              <dd><a href="#" aria-label="YouTube">YouTube</a></dd>
            </div>
          </dl>
        </section>

        <section className={styles.formPanel}>
          <h2>Gửi lời nhắn</h2>
          <form onSubmit={handleSubmit} noValidate>
            <div className={styles.field}>
              <label htmlFor="fullName">Họ tên</label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                value={formData.fullName}
                onChange={handleChange}
                aria-invalid={Boolean(errors.fullName)}
                aria-describedby={errors.fullName ? 'fullName-error' : undefined}
              />
              {errors.fullName && <span id="fullName-error" className={styles.error}>{errors.fullName}</span>}
            </div>

            <div className={styles.field}>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? 'email-error' : undefined}
              />
              {errors.email && <span id="email-error" className={styles.error}>{errors.email}</span>}
            </div>

            <div className={styles.field}>
              <label htmlFor="message">Nội dung</label>
              <textarea
                id="message"
                name="message"
                rows="6"
                value={formData.message}
                onChange={handleChange}
                aria-invalid={Boolean(errors.message)}
                aria-describedby={errors.message ? 'message-error' : undefined}
              />
              {errors.message && <span id="message-error" className={styles.error}>{errors.message}</span>}
            </div>

            <button type="submit">Mở ứng dụng email</button>
            {success && <p className={styles.success} role="status">{success}</p>}
          </form>
        </section>
      </div>
    </main>
  );
};

export default Contact;
