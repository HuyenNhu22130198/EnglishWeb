package com.englishweb.be.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateAccountSettingsRequest {

    private Boolean publicProfileVisible;
    private Boolean notifyForumReplies;
    private Boolean notifyForumMentions;
    private Boolean notifySystemUpdates;
}
