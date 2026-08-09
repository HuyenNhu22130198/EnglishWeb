import styles from './ExamDetailHeader.module.css';

const ExamDetailHeader = ({
  onBack,
  backLabel = 'Quay lại kho đề',
  eyebrow,
  title,
  description,
}) => {
  return (
    <section className={styles.header}>
      <button type="button" className={styles.backButton} onClick={onBack}>
        <span aria-hidden="true">←</span>
        {backLabel}
      </button>

      {eyebrow ? <span className={styles.eyebrow}>{eyebrow}</span> : null}
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
    </section>
  );
};

export default ExamDetailHeader;
