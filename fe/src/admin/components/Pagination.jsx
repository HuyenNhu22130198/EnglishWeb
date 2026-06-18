import {
  ChevronLeftIcon,
  ChevronRightIcon,
} from "./AdminIcons";
import styles from "./Pagination.module.css";

function createPages(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "...", totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [
      1,
      "...",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [
    1,
    "...",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "...",
    totalPages,
  ];
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}) {
  if (totalPages <= 1) return null;

  const pages = createPages(currentPage, totalPages);

  return (
    <div className={styles.pagination}>
      <button
        type="button"
        className={styles.navigationButton}
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        aria-label="Trang trước"
      >
        <ChevronLeftIcon size={18} />
      </button>

      {pages.map((page, index) =>
        page === "..." ? (
          <span className={styles.ellipsis} key={`ellipsis-${index}`}>
            …
          </span>
        ) : (
          <button
            type="button"
            key={page}
            className={`${styles.pageButton} ${
              currentPage === page ? styles.activePage : ""
            }`}
            onClick={() => onPageChange(page)}
          >
            {page}
          </button>
        )
      )}

      <button
        type="button"
        className={styles.navigationButton}
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        aria-label="Trang sau"
      >
        <ChevronRightIcon size={18} />
      </button>
    </div>
  );
}