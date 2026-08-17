package com.englishweb.be.dto.forum;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class ForumPageResponse<T> {
    private List<T> items;
    private int page;
    private int size;
    private long totalItems;
    private int totalPages;
    private boolean hasMore;
}
