package com.englishweb.be.admin.dictionary.controller;

import com.englishweb.be.admin.dictionary.dto.AdminDictionaryEntryResponse;
import com.englishweb.be.admin.dictionary.dto.AdminDictionaryGenerateRequest;
import com.englishweb.be.admin.dictionary.dto.AdminDictionaryUpdateRequest;
import com.englishweb.be.admin.dictionary.service.AdminDictionaryService;
import org.springframework.data.domain.Page;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/dictionary")
@CrossOrigin(origins = "http://localhost:5173")
@PreAuthorize("hasRole('ADMIN')")
public class AdminDictionaryController {
    
    private final AdminDictionaryService adminDictionaryService;

    public AdminDictionaryController(AdminDictionaryService adminDictionaryService) {
        this.adminDictionaryService = adminDictionaryService;
    }

    @GetMapping
    public Page<AdminDictionaryEntryResponse> getEntries(
            @RequestParam(defaultValue = "") String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return adminDictionaryService.getEntries(keyword, page, size);
    }

    @GetMapping("/{id}")
    public AdminDictionaryEntryResponse getEntry(@PathVariable Long id) {
        return adminDictionaryService.getEntry(id);
    }

    @PostMapping("/generate")
    public AdminDictionaryEntryResponse generateEntry(
            @RequestBody AdminDictionaryGenerateRequest request
    ) {
        return adminDictionaryService.generateEntry(request);
    }

    @PutMapping("/{id}")
    public AdminDictionaryEntryResponse updateEntry(
            @PathVariable Long id,
            @RequestBody AdminDictionaryUpdateRequest request
    ) {
        return adminDictionaryService.updateEntry(id, request);
    }

    @DeleteMapping("/{id}")
    public void deleteEntry(@PathVariable Long id) {
        adminDictionaryService.deleteEntry(id);
    }
}