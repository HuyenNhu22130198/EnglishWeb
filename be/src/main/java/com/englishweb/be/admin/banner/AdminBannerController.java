package com.englishweb.be.admin.banner;

import com.englishweb.be.banner.BannerService;
import com.englishweb.be.banner.dto.BannerRequest;
import com.englishweb.be.banner.dto.BannerResponse;
import com.englishweb.be.banner.dto.BannerUploadResponse;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/admin/banners")
@CrossOrigin(origins = "http://localhost:5173")
@PreAuthorize("hasRole('ADMIN')")
public class AdminBannerController {

    private final BannerService bannerService;

    public AdminBannerController(BannerService bannerService) {
        this.bannerService = bannerService;
    }

    @GetMapping
    public List<BannerResponse> getBanners() {
        return bannerService.getAllBanners();
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public BannerUploadResponse uploadBannerImage(@RequestParam("file") MultipartFile file) {
        return new BannerUploadResponse(bannerService.uploadBannerImage(file));
    }

    @PostMapping
    public BannerResponse createBanner(@RequestBody BannerRequest request) {
        return bannerService.create(request);
    }

    @PutMapping("/{id}")
    public BannerResponse updateBanner(@PathVariable Long id, @RequestBody BannerRequest request) {
        return bannerService.update(id, request);
    }

    @DeleteMapping("/{id}")
    public void deleteBanner(@PathVariable Long id) {
        bannerService.delete(id);
    }
}
