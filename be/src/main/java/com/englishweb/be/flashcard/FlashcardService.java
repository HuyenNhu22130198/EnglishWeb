package com.englishweb.be.flashcard;

import com.englishweb.be.entity.FlashcardCard;
import com.englishweb.be.entity.FlashcardDeck;
import com.englishweb.be.exception.FlashcardImportException;
import com.englishweb.be.flashcard.dto.FlashcardCardRequest;
import com.englishweb.be.flashcard.dto.FlashcardCardResponse;
import com.englishweb.be.flashcard.dto.FlashcardDeckRequest;
import com.englishweb.be.flashcard.dto.FlashcardDeckResponse;
import com.englishweb.be.flashcard.dto.FlashcardImportRowError;
import com.englishweb.be.repository.FlashcardCardRepository;
import com.englishweb.be.repository.FlashcardDeckRepository;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

@Service
public class FlashcardService {

    private final FlashcardDeckRepository flashcardDeckRepository;
    private final FlashcardCardRepository flashcardCardRepository;

    public FlashcardService(
            FlashcardDeckRepository flashcardDeckRepository,
            FlashcardCardRepository flashcardCardRepository
    ) {
        this.flashcardDeckRepository = flashcardDeckRepository;
        this.flashcardCardRepository = flashcardCardRepository;
    }

    public List<FlashcardDeckResponse> getPublicDecks() {
        return flashcardDeckRepository.findByActiveTrueOrderByDisplayOrderAscIdAsc()
                .stream()
                .map(deck -> FlashcardDeckResponse.fromEntity(deck, flashcardCardRepository.countByDeckId(deck.getId())))
                .toList();
    }

    public List<FlashcardCardResponse> getPublicDeckCards(Long deckId) {
        FlashcardDeck deck = findActiveDeckById(deckId);
        return flashcardCardRepository.findByDeckIdOrderByDisplayOrderAscIdAsc(deck.getId())
                .stream()
                .map(FlashcardCardResponse::fromEntity)
                .toList();
    }

    public List<FlashcardDeckResponse> getAllDecks() {
        return flashcardDeckRepository.findAllByOrderByDisplayOrderAscIdAsc()
                .stream()
                .map(deck -> FlashcardDeckResponse.fromEntity(deck, flashcardCardRepository.countByDeckId(deck.getId())))
                .toList();
    }

    public FlashcardDeckResponse createDeck(FlashcardDeckRequest request) {
        FlashcardDeck deck = new FlashcardDeck();
        applyDeckRequest(deck, request);
        flashcardDeckRepository.save(deck);
        return FlashcardDeckResponse.fromEntity(deck, 0);
    }

    public FlashcardDeckResponse updateDeck(Long id, FlashcardDeckRequest request) {
        FlashcardDeck deck = findDeckById(id);
        applyDeckRequest(deck, request);
        flashcardDeckRepository.save(deck);
        return FlashcardDeckResponse.fromEntity(deck, flashcardCardRepository.countByDeckId(deck.getId()));
    }

    public void deleteDeck(Long id) {
        flashcardDeckRepository.delete(findDeckById(id));
    }

    public List<FlashcardCardResponse> getDeckCardsAdmin(Long deckId) {
        FlashcardDeck deck = findDeckById(deckId);
        return flashcardCardRepository.findByDeckIdOrderByDisplayOrderAscIdAsc(deck.getId())
                .stream()
                .map(FlashcardCardResponse::fromEntity)
                .toList();
    }

    public FlashcardCardResponse createCard(Long deckId, FlashcardCardRequest request) {
        FlashcardDeck deck = findDeckById(deckId);
        FlashcardCard card = new FlashcardCard();
        card.setDeck(deck);
        applyCardRequest(card, request);
        flashcardCardRepository.save(card);
        return FlashcardCardResponse.fromEntity(card);
    }

    public FlashcardCardResponse updateCard(Long cardId, FlashcardCardRequest request) {
        FlashcardCard card = findCardById(cardId);
        applyCardRequest(card, request);
        flashcardCardRepository.save(card);
        return FlashcardCardResponse.fromEntity(card);
    }

    public void deleteCard(Long cardId) {
        flashcardCardRepository.delete(findCardById(cardId));
    }

    private static final String[] IMPORT_HEADERS = {
            "Từ vựng", "Phiên âm", "Từ loại", "Nghĩa tiếng Việt", "Ví dụ", "Thứ tự hiển thị"
    };
    private static final String[] IMPORT_EXAMPLE = {
            "environment", "/ɪnˈvaɪrənmənt/", "noun", "môi trường", "We must protect the environment.", "1"
    };

    public byte[] generateCardImportTemplate() {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            CellStyle header = headerStyle(workbook);
            CellStyle example = exampleStyle(workbook);

            Sheet sheet = workbook.createSheet("Flashcards");
            Row headerRow = sheet.createRow(0);
            Row exampleRow = sheet.createRow(1);
            for (int i = 0; i < IMPORT_HEADERS.length; i++) {
                Cell headerCell = headerRow.createCell(i);
                headerCell.setCellValue(IMPORT_HEADERS[i]);
                headerCell.setCellStyle(header);

                Cell exampleCell = exampleRow.createCell(i);
                exampleCell.setCellValue(IMPORT_EXAMPLE[i]);
                exampleCell.setCellStyle(example);

                sheet.setColumnWidth(i, Math.min(50, Math.max(14, IMPORT_HEADERS[i].length() + 4)) * 256);
            }
            sheet.createFreezePane(0, 1);

            Sheet guide = workbook.createSheet("HuongDan");
            String[] lines = {
                    "HƯỚNG DẪN IMPORT FLASHCARD",
                    "Sheet Flashcards đã có một dòng ví dụ. Hãy sửa hoặc xóa dòng ví dụ trước khi import.",
                    "Cột 'Từ vựng' và 'Nghĩa tiếng Việt' là bắt buộc, các cột còn lại có thể để trống.",
                    "Để trống 'Thứ tự hiển thị' nếu muốn hệ thống tự đánh số theo thứ tự trong file.",
                    "Nếu có lỗi, toàn bộ import sẽ bị hủy và hệ thống trả về danh sách dòng lỗi để sửa cùng lúc."
            };
            for (int i = 0; i < lines.length; i++) {
                Row row = guide.createRow(i);
                Cell cell = row.createCell(0);
                cell.setCellValue(lines[i]);
                if (i == 0) cell.setCellStyle(header);
            }
            guide.setColumnWidth(0, 120 * 256);

            workbook.setActiveSheet(0);
            workbook.write(output);
            return output.toByteArray();
        } catch (Exception exception) {
            throw new RuntimeException("Không thể tạo file mẫu Excel.", exception);
        }
    }

    public List<FlashcardCardResponse> importCards(Long deckId, MultipartFile file) {
        FlashcardDeck deck = findDeckById(deckId);

        if (file == null || file.isEmpty()) {
            throw new FlashcardImportException(List.of(new FlashcardImportRowError(0, "Vui lòng chọn file .xlsx để import.")));
        }
        String filename = Objects.toString(file.getOriginalFilename(), "").toLowerCase(Locale.ROOT);
        if (!filename.endsWith(".xlsx")) {
            throw new FlashcardImportException(List.of(new FlashcardImportRowError(0, "Chỉ hỗ trợ file Excel định dạng .xlsx.")));
        }

        List<FlashcardImportRowError> errors = new ArrayList<>();
        List<Map<String, String>> rows = new ArrayList<>();

        try (Workbook workbook = new XSSFWorkbook(file.getInputStream())) {
            Sheet sheet = workbook.getSheet("Flashcards");
            if (sheet == null) {
                throw new FlashcardImportException(List.of(new FlashcardImportRowError(0, "Không tìm thấy sheet 'Flashcards' trong file.")));
            }

            Row headerRow = sheet.getRow(0);
            Map<String, Integer> indexes = new HashMap<>();
            DataFormatter formatter = new DataFormatter(Locale.ROOT);
            if (headerRow != null) {
                for (Cell cell : headerRow) {
                    indexes.put(formatter.formatCellValue(cell).trim().toLowerCase(Locale.ROOT), cell.getColumnIndex());
                }
            }
            for (String column : IMPORT_HEADERS) {
                if (!indexes.containsKey(column.toLowerCase(Locale.ROOT))) {
                    errors.add(new FlashcardImportRowError(1, "Thiếu cột " + column + "."));
                }
            }

            if (errors.isEmpty()) {
                for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                    Row sourceRow = sheet.getRow(i);
                    if (sourceRow == null) continue;

                    Map<String, String> values = new LinkedHashMap<>();
                    boolean any = false;
                    for (String column : IMPORT_HEADERS) {
                        Integer index = indexes.get(column.toLowerCase(Locale.ROOT));
                        String value = index == null ? "" : formatter.formatCellValue(
                                sourceRow.getCell(index, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL)).trim();
                        values.put(column, value);
                        any = any || !value.isBlank();
                    }
                    if (!any) continue;

                    int rowNumber = i + 1;
                    String term = values.get("Từ vựng");
                    String meaning = values.get("Nghĩa tiếng Việt");
                    if (term.isBlank()) errors.add(new FlashcardImportRowError(rowNumber, "Từ vựng không được để trống."));
                    if (meaning.isBlank()) errors.add(new FlashcardImportRowError(rowNumber, "Nghĩa tiếng Việt không được để trống."));

                    String displayOrderText = values.get("Thứ tự hiển thị");
                    if (!displayOrderText.isBlank()) {
                        try {
                            Integer.parseInt(displayOrderText);
                        } catch (NumberFormatException exception) {
                            errors.add(new FlashcardImportRowError(rowNumber, "Thứ tự hiển thị phải là số nguyên hoặc để trống."));
                        }
                    }

                    values.put("__row", String.valueOf(rowNumber));
                    rows.add(values);
                }
            }
        } catch (FlashcardImportException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new FlashcardImportException(List.of(new FlashcardImportRowError(0,
                    "Không thể đọc file Excel: " + (exception.getMessage() == null ? exception.getClass().getSimpleName() : exception.getMessage()))));
        }

        if (!errors.isEmpty()) {
            throw new FlashcardImportException(errors);
        }

        List<FlashcardCardResponse> imported = new ArrayList<>();
        int nextDisplayOrder = 1;
        for (Map<String, String> values : rows) {
            FlashcardCard card = new FlashcardCard();
            card.setDeck(deck);
            card.setTerm(values.get("Từ vựng").trim());
            card.setPronunciation(values.get("Phiên âm").trim());
            card.setWordType(values.get("Từ loại").trim());
            card.setMeaning(values.get("Nghĩa tiếng Việt").trim());
            card.setExample(values.get("Ví dụ").trim());

            String displayOrderText = values.get("Thứ tự hiển thị");
            card.setDisplayOrder(displayOrderText.isBlank() ? nextDisplayOrder : Integer.parseInt(displayOrderText));
            nextDisplayOrder++;

            flashcardCardRepository.save(card);
            imported.add(FlashcardCardResponse.fromEntity(card));
        }

        return imported;
    }

    private CellStyle headerStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        font.setColor(IndexedColors.WHITE.getIndex());
        style.setFont(font);
        style.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setWrapText(true);
        return style;
    }

    private CellStyle exampleStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        style.setFillForegroundColor(IndexedColors.LIGHT_YELLOW.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setWrapText(true);
        return style;
    }

    private FlashcardDeck findDeckById(Long id) {
        return flashcardDeckRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Khong tim thay bo flashcard id = " + id));
    }

    private FlashcardDeck findActiveDeckById(Long id) {
        FlashcardDeck deck = findDeckById(id);
        if (deck.getActive() == null || !deck.getActive()) {
            throw new RuntimeException("Khong tim thay bo flashcard id = " + id);
        }
        return deck;
    }

    private FlashcardCard findCardById(Long id) {
        return flashcardCardRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Khong tim thay flashcard id = " + id));
    }

    private void applyDeckRequest(FlashcardDeck deck, FlashcardDeckRequest request) {
        String name = safe(request.getName()).trim();

        if (name.isBlank()) {
            throw new RuntimeException("Ten bo flashcard khong duoc de trong.");
        }

        deck.setName(name);
        deck.setDescription(safe(request.getDescription()).trim());
        deck.setLevel(safe(request.getLevel()).trim());
        deck.setDisplayOrder(request.getDisplayOrder() == null ? 0 : request.getDisplayOrder());
        deck.setActive(request.getActive() == null || request.getActive());
    }

    private void applyCardRequest(FlashcardCard card, FlashcardCardRequest request) {
        String term = safe(request.getTerm()).trim();
        String meaning = safe(request.getMeaning()).trim();

        if (term.isBlank() || meaning.isBlank()) {
            throw new RuntimeException("Tu vung va nghia khong duoc de trong.");
        }

        card.setTerm(term);
        card.setPronunciation(safe(request.getPronunciation()).trim());
        card.setWordType(safe(request.getWordType()).trim());
        card.setMeaning(meaning);
        card.setExample(safe(request.getExample()).trim());
        card.setDisplayOrder(request.getDisplayOrder() == null ? 0 : request.getDisplayOrder());
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }
}
