package com.englishweb.be.dto.ielts;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IeltsSpeakingFreeTranscribeResponse {
    private Integer freeAnswerId;
    private String audioUrl;
    private String transcriptText;
    private String whisperStatus;
    private String whisperError;
    private String question;
    private Integer partNo;
    private String topicTitle;
    private String instruction;
}
