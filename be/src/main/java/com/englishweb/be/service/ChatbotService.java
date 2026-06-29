package com.englishweb.be.service;

import com.englishweb.be.dto.chatbot.ChatbotRequest;
import com.englishweb.be.dto.chatbot.ChatbotResponse;
import com.englishweb.be.entity.ielts.IeltsQuestion;
import com.englishweb.be.entity.ielts.IeltsQuestionAnswer;
import com.englishweb.be.entity.toeic.ToeicQuestion;
import com.englishweb.be.entity.toeic.ToeicQuestionOption;
import com.englishweb.be.repository.ielts.IeltsQuestionAnswerRepository;
import com.englishweb.be.repository.ielts.IeltsQuestionRepository;
import com.englishweb.be.repository.toeic.ToeicQuestionOptionRepository;
import com.englishweb.be.repository.toeic.ToeicQuestionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class ChatbotService {

    private static final double MIN_MATCH_SCORE = 0.45;
    private static final Pattern DIACRITICS = Pattern.compile("\\p{M}+");
    private static final Pattern NON_ALNUM = Pattern.compile("[^\\p{IsAlphabetic}\\p{IsDigit}]+");

    private final ToeicQuestionRepository toeicQuestionRepository;
    private final ToeicQuestionOptionRepository toeicQuestionOptionRepository;
    private final IeltsQuestionRepository ieltsQuestionRepository;
    private final IeltsQuestionAnswerRepository ieltsQuestionAnswerRepository;

    @Transactional(readOnly = true)
    public ChatbotResponse ask(ChatbotRequest request) {
        String userMessage = request.getMessage() == null ? "" : request.getMessage().trim();
        String normalizedMessage = normalize(userMessage);
        Set<String> queryTokens = tokenize(normalizedMessage);

        Match<ToeicQuestion> toeicMatch = toeicQuestionRepository.findAllForChatbot()
                .stream()
                .map(question -> new Match<>(question, score(normalizedMessage, queryTokens, toeicSearchText(question))))
                .max(Comparator.comparingDouble(Match::score))
                .orElse(null);

        Match<IeltsQuestion> ieltsMatch = ieltsQuestionRepository.findAllForChatbot()
                .stream()
                .map(question -> new Match<>(question, score(normalizedMessage, queryTokens, ieltsSearchText(question))))
                .max(Comparator.comparingDouble(Match::score))
                .orElse(null);

        double toeicScore = toeicMatch == null ? 0 : toeicMatch.score();
        double ieltsScore = ieltsMatch == null ? 0 : ieltsMatch.score();

        if (toeicScore < MIN_MATCH_SCORE && ieltsScore < MIN_MATCH_SCORE) {
            return ChatbotResponse.builder()
                    .found(false)
                    .message("Chưa tìm thấy câu hỏi phù hợp. Hãy copy nguyên câu hỏi trong đề bài để mình đối chiếu chính xác hơn.")
                    .matchScore(Math.max(toeicScore, ieltsScore))
                    .build();
        }

        if (toeicScore >= ieltsScore) {
            return buildToeicResponse(toeicMatch.value(), toeicScore);
        }

        return buildIeltsResponse(ieltsMatch.value(), ieltsScore);
    }

    private ChatbotResponse buildToeicResponse(ToeicQuestion question, double matchScore) {
        String correctLabel = safe(question.getCorrectOption()).toUpperCase(Locale.ROOT);
        List<ToeicQuestionOption> options = toeicQuestionOptionRepository.findByQuestion_IdOrderByDisplayOrderAsc(question.getId());
        ToeicQuestionOption correctOption = options.stream()
                .filter(option -> safe(option.getOptionLabel()).equalsIgnoreCase(correctLabel))
                .findFirst()
                .orElse(null);

        return ChatbotResponse.builder()
                .found(true)
                .message("Đã tìm thấy câu hỏi TOEIC phù hợp.")
                .examType("TOEIC")
                .examId(question.getExam().getId())
                .examCode(question.getExam().getExamCode())
                .examName(question.getExam().getExamName())
                .questionId(question.getId())
                .questionNo(question.getQuestionNo())
                .partNo(question.getGroup().getPartNo())
                .questionText(question.getQuestionText())
                .sharedText(question.getGroup().getSharedText())
                .answer(correctLabel)
                .answerText(correctOption == null ? null : correctOption.getOptionText())
                .explanation(question.getExplanation())
                .transcriptText(question.getTranscriptText())
                .matchScore(round(matchScore))
                .options(options.stream()
                        .map(option -> ChatbotResponse.OptionResponse.builder()
                                .label(option.getOptionLabel())
                                .text(option.getOptionText())
                                .correct(safe(option.getOptionLabel()).equalsIgnoreCase(correctLabel))
                                .build())
                        .toList())
                .build();
    }

    private ChatbotResponse buildIeltsResponse(IeltsQuestion question, double matchScore) {
        List<IeltsQuestionAnswer> answers = ieltsQuestionAnswerRepository.findByQuestion_QuestionIdOrderByIdAsc(question.getQuestionId());
        String answer = answers.stream()
                .map(IeltsQuestionAnswer::getAnswerKey)
                .filter(value -> !safe(value).isBlank())
                .findFirst()
                .orElse(null);
        String answerText = answers.stream()
                .map(IeltsQuestionAnswer::getAnswerText)
                .filter(value -> !safe(value).isBlank())
                .findFirst()
                .orElse(null);

        return ChatbotResponse.builder()
                .found(true)
                .message("Đã tìm thấy câu hỏi IELTS phù hợp.")
                .examType("IELTS")
                .examId(question.getExam().getId())
                .examCode(question.getExam().getExamCode())
                .examName(question.getExam().getExamName())
                .questionId(question.getQuestionId())
                .questionNo(question.getQuestionNo())
                .partNo(question.getBlock().getGroup().getPartNo())
                .skill(question.getBlock().getGroup().getSkill())
                .questionText(question.getPromptText())
                .sharedText(question.getBlock().getGroup().getSharedText())
                .answer(answer)
                .answerText(answerText)
                .explanation(question.getExplanationText())
                .matchScore(round(matchScore))
                .build();
    }

    private String toeicSearchText(ToeicQuestion question) {
        return normalize(String.join(" ",
                safe(question.getQuestionText()),
                question.getGroup() == null ? "" : safe(question.getGroup().getSharedText()),
                safe(question.getTranscriptText())));
    }

    private String ieltsSearchText(IeltsQuestion question) {
        return normalize(String.join(" ",
                safe(question.getPromptText()),
                question.getBlock() == null || question.getBlock().getGroup() == null ? "" : safe(question.getBlock().getGroup().getSharedText()),
                question.getBlock() == null ? "" : safe(question.getBlock().getInstructionText())));
    }

    private double score(String normalizedQuery, Set<String> queryTokens, String normalizedTarget) {
        if (normalizedQuery.isBlank() || normalizedTarget.isBlank() || queryTokens.isEmpty()) {
            return 0;
        }

        if (normalizedTarget.contains(normalizedQuery)) {
            return 1;
        }

        Set<String> targetTokens = tokenize(normalizedTarget);
        long matchedTokens = queryTokens.stream().filter(targetTokens::contains).count();
        double tokenScore = (double) matchedTokens / queryTokens.size();

        long orderedHits = queryTokens.stream()
                .filter(token -> normalizedTarget.contains(token))
                .count();
        double containmentScore = (double) orderedHits / queryTokens.size();

        return (tokenScore * 0.75) + (containmentScore * 0.25);
    }

    private Set<String> tokenize(String value) {
        Set<String> tokens = new LinkedHashSet<>();
        Arrays.stream(value.split("\\s+"))
                .map(String::trim)
                .filter(token -> token.length() >= 2)
                .filter(token -> !isStopWord(token))
                .forEach(tokens::add);
        return tokens;
    }

    private boolean isStopWord(String token) {
        return Set.of("the", "and", "you", "your", "are", "for", "with", "that", "this", "what", "which", "where", "when", "who", "why", "how")
                .contains(token);
    }

    private String normalize(String value) {
        String decomposed = Normalizer.normalize(safe(value), Normalizer.Form.NFD);
        String withoutDiacritics = DIACRITICS.matcher(decomposed).replaceAll("");
        return NON_ALNUM.matcher(withoutDiacritics.toLowerCase(Locale.ROOT))
                .replaceAll(" ")
                .trim()
                .replaceAll("\\s+", " ");
    }

    private String safe(String value) {
        return Objects.toString(value, "");
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private record Match<T>(T value, double score) {
    }
}
