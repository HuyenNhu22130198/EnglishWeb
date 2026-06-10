package com.englishweb.be.dictionary;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DictionaryEntryRepository extends JpaRepository<DictionaryEntry, Long> {

    Optional<DictionaryEntry> findByKeywordNormalized(String keywordNormalized);

    Page<DictionaryEntry> findByKeywordNormalizedContainingIgnoreCaseOrWordContainingIgnoreCase(
            String keywordNormalized,
            String word,
            Pageable pageable
    );

    boolean existsByKeywordNormalizedAndIdNot(String keywordNormalized, Long id);
}