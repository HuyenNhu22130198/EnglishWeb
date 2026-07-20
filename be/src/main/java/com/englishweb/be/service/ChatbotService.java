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
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Pattern;

@Service
@Slf4j
@RequiredArgsConstructor
public class ChatbotService {

    private static final double MIN_MATCH_SCORE = 0.58;
    private static final Pattern DIACRITICS = Pattern.compile("\\p{M}+");
    private static final Pattern NON_ALNUM = Pattern.compile("[^\\p{IsAlphabetic}\\p{IsDigit}]+");
    private static final Pattern QUESTION_PREFIX = Pattern.compile("^(cau|question|q)\\s*\\d+\\s*[:.)-]*\\s*");
    private static final Pattern OPTION_PREFIX = Pattern.compile("(?m)^\\s*[a-d]\\s*[:.)-]\\s*");

    private final ToeicQuestionRepository toeicQuestionRepository;
    private final ToeicQuestionOptionRepository toeicQuestionOptionRepository;
    private final IeltsQuestionRepository ieltsQuestionRepository;
    private final IeltsQuestionAnswerRepository ieltsQuestionAnswerRepository;

    @Transactional(readOnly = true)
    public ChatbotResponse ask(ChatbotRequest request) {
        String userMessage = request.getMessage() == null ? "" : request.getMessage().trim();
        List<QueryVariant> queryVariants = buildQueryVariants(userMessage);
        List<ToeicQuestion> toeicQuestions = toeicQuestionRepository.findAllForChatbot();
        Map<Integer, List<ToeicQuestionOption>> toeicOptionsByQuestionId = loadToeicOptions(toeicQuestions);

        Match<ToeicQuestion> toeicMatch = toeicQuestions
                .stream()
                .map(question -> new Match<>(
                        question,
                        score(queryVariants,
                                toeicSearchText(question, toeicOptionsByQuestionId.getOrDefault(question.getId(), List.of())))))
                .max(Comparator.comparingDouble(Match::score))
                .orElse(null);

        Match<IeltsQuestion> ieltsMatch = ieltsQuestionRepository.findAllForChatbot()
                .stream()
                .map(question -> new Match<>(question, score(queryVariants, ieltsSearchText(question))))
                .max(Comparator.comparingDouble(Match::score))
                .orElse(null);

        double toeicScore = toeicMatch == null ? 0 : toeicMatch.score();
        double ieltsScore = ieltsMatch == null ? 0 : ieltsMatch.score();
        String normalizedMessage = queryVariants.isEmpty() ? "" : queryVariants.getFirst().normalizedQuery();

        log.info(
                "Chatbot lookup raw='{}' normalized='{}' variants={} toeicScore={} toeicQuestionNo={} ieltsScore={} ieltsQuestionNo={}",
                userMessage,
                normalizedMessage,
                queryVariants.stream().map(QueryVariant::normalizedQuery).toList(),
                round(toeicScore),
                toeicMatch == null || toeicMatch.value() == null ? null : toeicMatch.value().getQuestionNo(),
                round(ieltsScore),
                ieltsMatch == null || ieltsMatch.value() == null ? null : ieltsMatch.value().getQuestionNo()
        );

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
                .answers(List.of(ChatbotResponse.AnswerResponse.builder()
                        .key(correctLabel)
                        .text(correctOption == null ? null : correctOption.getOptionText())
                        .build()))
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
        List<ChatbotResponse.AnswerResponse> answerResponses = answers.stream()
                .map(answer -> ChatbotResponse.AnswerResponse.builder()
                        .key(blankToNull(answer.getAnswerKey()))
                        .text(blankToNull(answer.getAnswerText()))
                        .build())
                .filter(answer -> answer.getKey() != null || answer.getText() != null)
                .toList();
        String answer = answerResponses.stream()
                .map(ChatbotResponse.AnswerResponse::getKey)
                .filter(Objects::nonNull)
                .findFirst()
                .orElse(null);
        String answerText = answerResponses.stream()
                .map(ChatbotResponse.AnswerResponse::getText)
                .filter(Objects::nonNull)
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
                .answers(answerResponses)
                .build();
    }

    private Map<Integer, List<ToeicQuestionOption>> loadToeicOptions(List<ToeicQuestion> toeicQuestions) {
        List<Integer> questionIds = toeicQuestions.stream()
                .map(ToeicQuestion::getId)
                .filter(Objects::nonNull)
                .toList();

        if (questionIds.isEmpty()) {
            return Map.of();
        }

        Map<Integer, List<ToeicQuestionOption>> optionsByQuestionId = new HashMap<>();
        toeicQuestionOptionRepository.findByQuestion_IdInOrderByQuestion_IdAscDisplayOrderAsc(questionIds)
                .forEach(option -> optionsByQuestionId
                        .computeIfAbsent(option.getQuestion().getId(), ignored -> new ArrayList<>())
                        .add(option));
        return optionsByQuestionId;
    }

    private String toeicSearchText(ToeicQuestion question, List<ToeicQuestionOption> options) {
        String optionsText = options.stream()
                .map(option -> String.join(" ",
                        safe(option.getOptionLabel()),
                        safe(option.getOptionText())))
                .collect(java.util.stream.Collectors.joining(" "));

        return normalize(String.join(" ",
                "question " + Objects.toString(question.getQuestionNo(), ""),
                safe(question.getQuestionText()),
                question.getGroup() == null ? "" : safe(question.getGroup().getSharedText()),
                safe(question.getTranscriptText()),
                optionsText));
    }

    private String ieltsSearchText(IeltsQuestion question) {
        return normalize(String.join(" ",
                safe(question.getPromptText()),
                question.getBlock() == null || question.getBlock().getGroup() == null ? "" : safe(question.getBlock().getGroup().getSharedText()),
                question.getBlock() == null ? "" : safe(question.getBlock().getInstructionText())));
    }

    private double score(List<QueryVariant> queryVariants, String normalizedTarget) {
        return queryVariants.stream()
                .mapToDouble(variant -> scoreVariant(
                        variant.normalizedQuery(),
                        variant.queryTokens(),
                        variant.queryTokenList(),
                        normalizedTarget))
                .max()
                .orElse(0);
    }

    private double scoreVariant(String normalizedQuery, Set<String> queryTokens, List<String> queryTokenList, String normalizedTarget) {
        if (normalizedQuery.isBlank() || normalizedTarget.isBlank() || queryTokens.isEmpty()) {
            return 0;
        }

        if (normalizedTarget.contains(normalizedQuery)) {
            return 1;
        }

        Set<String> targetTokens = tokenize(normalizedTarget);
        List<String> targetTokenList = List.copyOf(targetTokens);
        long matchedTokens = queryTokens.stream().filter(targetTokens::contains).count();
        if (matchedTokens == 0) {
            return 0;
        }

        double tokenRecall = (double) matchedTokens / queryTokens.size();
        double tokenPrecision = (double) matchedTokens / targetTokens.size();
        double tokenF1 = f1(tokenRecall, tokenPrecision);
        double phraseScore = overlapScore(toBigrams(queryTokenList), toBigrams(targetTokenList));
        double charScore = diceCoefficient(toCharacterNgrams(normalizedQuery, 3), toCharacterNgrams(normalizedTarget, 3));
        double sequenceScore = longestOrderedRunScore(queryTokenList, targetTokenList);
        double exactTokenOrderBonus = normalizedTarget.contains(String.join(" ", queryTokenList)) ? 0.08 : 0;

        return Math.min(1, (tokenF1 * 0.45) + (tokenRecall * 0.2) + (phraseScore * 0.15) + (charScore * 0.12)
                + (sequenceScore * 0.08) + exactTokenOrderBonus);
    }

    private List<QueryVariant> buildQueryVariants(String rawMessage) {
        List<String> candidates = new ArrayList<>();
        candidates.add(rawMessage);

        String normalizedBase = normalize(rawMessage);
        String withoutQuestionPrefix = QUESTION_PREFIX.matcher(normalizedBase).replaceFirst("").trim();
        if (!withoutQuestionPrefix.isBlank()) {
            candidates.add(withoutQuestionPrefix);
        }

        String withoutOptionPrefix = OPTION_PREFIX.matcher(rawMessage).replaceAll("").trim();
        if (!withoutOptionPrefix.isBlank()) {
            candidates.add(withoutOptionPrefix);
        }

        String normalizedWithoutOptionPrefix = normalize(withoutOptionPrefix);
        String cleaned = QUESTION_PREFIX.matcher(normalizedWithoutOptionPrefix).replaceFirst("").trim();
        if (!cleaned.isBlank()) {
            candidates.add(cleaned);
        }

        return candidates.stream()
                .map(this::normalize)
                .filter(value -> !value.isBlank())
                .distinct()
                .map(value -> new QueryVariant(value, tokenize(value)))
                .toList();
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
        return Set.of(
                        "the", "and", "you", "your", "are", "for", "with", "that", "this", "what", "which",
                        "where", "when", "who", "why", "how", "cau", "hoi", "dap", "an", "part", "question"
                )
                .contains(token);
    }

    private List<String> toBigrams(List<String> tokens) {
        if (tokens.size() < 2) {
            return List.of();
        }

        List<String> bigrams = new ArrayList<>();
        for (int index = 0; index < tokens.size() - 1; index++) {
            bigrams.add(tokens.get(index) + " " + tokens.get(index + 1));
        }
        return bigrams;
    }

    private Set<String> toCharacterNgrams(String value, int size) {
        String compact = value.replace(" ", "");
        if (compact.isBlank()) {
            return Set.of();
        }
        if (compact.length() <= size) {
            return Set.of(compact);
        }

        Set<String> ngrams = new LinkedHashSet<>();
        for (int index = 0; index <= compact.length() - size; index++) {
            ngrams.add(compact.substring(index, index + size));
        }
        return ngrams;
    }

    private double overlapScore(List<String> queryUnits, List<String> targetUnits) {
        if (queryUnits.isEmpty() || targetUnits.isEmpty()) {
            return 0;
        }

        Set<String> targetSet = new LinkedHashSet<>(targetUnits);
        long matches = queryUnits.stream().filter(targetSet::contains).count();
        return (double) matches / queryUnits.size();
    }

    private double diceCoefficient(Set<String> left, Set<String> right) {
        if (left.isEmpty() || right.isEmpty()) {
            return 0;
        }

        long intersection = left.stream().filter(right::contains).count();
        return (2.0 * intersection) / (left.size() + right.size());
    }

    private double longestOrderedRunScore(List<String> queryTokens, List<String> targetTokens) {
        if (queryTokens.isEmpty() || targetTokens.isEmpty()) {
            return 0;
        }

        int longestRun = 0;
        for (int queryIndex = 0; queryIndex < queryTokens.size(); queryIndex++) {
            for (int targetIndex = 0; targetIndex < targetTokens.size(); targetIndex++) {
                int run = 0;
                while (queryIndex + run < queryTokens.size()
                        && targetIndex + run < targetTokens.size()
                        && queryTokens.get(queryIndex + run).equals(targetTokens.get(targetIndex + run))) {
                    run++;
                }
                longestRun = Math.max(longestRun, run);
            }
        }

        return (double) longestRun / queryTokens.size();
    }

    private double f1(double recall, double precision) {
        if (recall <= 0 || precision <= 0) {
            return 0;
        }
        return 2 * recall * precision / (recall + precision);
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

    private String blankToNull(String value) {
        String normalized = safe(value).trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private record Match<T>(T value, double score) {
    }

    private record QueryVariant(String normalizedQuery, Set<String> queryTokens) {
        private List<String> queryTokenList() {
            return List.copyOf(queryTokens);
        }
    }
}
