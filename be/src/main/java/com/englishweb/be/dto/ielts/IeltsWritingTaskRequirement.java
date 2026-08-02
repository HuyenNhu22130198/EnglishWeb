package com.englishweb.be.dto.ielts;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IeltsWritingTaskRequirement {
    private String requirement;
    private Boolean addressed;
    private String candidateEvidence;
    private String explanation;
}
