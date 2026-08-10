package com.englishweb.be.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "users")
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(unique = true, nullable = false, length = 255)
    private String email;

    @Column(unique = true, nullable = false, length = 50)
    private String username;

    @Column(nullable = false, length = 255)
    @JsonIgnore
    private String password;

    @Column(name = "full_name", nullable = false, length = 120)
    private String fullName;

    @Column(name = "phone_number", length = 20)
    private String phoneNumber;

    @Column(name = "birth_date")
    private LocalDate birthDate;

    @Column(length = 20)
    private String gender;

    @Column(name = "learning_goal", length = 120)
    private String learningGoal;

    @Column(name = "target_exam_type", length = 10)
    private String targetExamType;

    @Column(name = "target_score")
    private Integer targetScore;

    @Column(name = "target_band_score", precision = 3, scale = 1)
    private BigDecimal targetBandScore;

    @Column(name = "current_level", length = 50)
    private String currentLevel;

    @Column(name = "public_profile_visible", nullable = false)
    @Builder.Default
    private Boolean publicProfileVisible = false;

    @Column(name = "notify_forum_replies", nullable = false)
    @Builder.Default
    private Boolean notifyForumReplies = true;

    @Column(name = "notify_forum_mentions", nullable = false)
    @Builder.Default
    private Boolean notifyForumMentions = true;

    @Column(name = "notify_system_updates", nullable = false)
    @Builder.Default
    private Boolean notifySystemUpdates = true;

    @Column(name = "email_verified", nullable = false)
    @Builder.Default
    private Boolean emailVerified = false;

    @Column(nullable = false, length = 20, columnDefinition = "varchar(20) default 'LOCAL'")
    @Builder.Default
    private String provider = "LOCAL";

    @Column(name = "provider_id", length = 255)
    private String providerId;

    @Column(nullable = false, length = 10)
    @Builder.Default
    private String status = "ACTIVE";

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private Role role;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
