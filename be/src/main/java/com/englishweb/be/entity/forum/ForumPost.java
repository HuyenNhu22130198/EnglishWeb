package com.englishweb.be.entity.forum;

import com.englishweb.be.entity.User;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "forum_posts")
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ForumPost {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_id", nullable = false)
    private User author;

    @Column(nullable = false, length = 160)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    // Nullable at the DB level on purpose: this column was added after forum_posts already had rows,
    // and ddl-auto=update issues a plain ALTER TABLE ADD COLUMN (no DEFAULT) for new columns, which
    // Postgres rejects as NOT NULL against existing data. Non-null is instead guaranteed by the service
    // (normalizeCategoryOrDefault) for every row written from now on; old rows just read back as null
    // and are treated as "KHAC" when building the response.
    @Column(length = 20)
    @Builder.Default
    private String category = "KHAC";

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
