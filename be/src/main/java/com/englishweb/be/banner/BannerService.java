package com.englishweb.be.banner;

import com.englishweb.be.banner.dto.BannerRequest;
import com.englishweb.be.banner.dto.BannerResponse;
import com.englishweb.be.entity.Banner;
import com.englishweb.be.repository.BannerRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Service
public class BannerService {

    private final BannerRepository bannerRepository;
    private final CloudinaryBannerStorageService cloudinaryBannerStorageService;

    public BannerService(
            BannerRepository bannerRepository,
            CloudinaryBannerStorageService cloudinaryBannerStorageService
    ) {
        this.bannerRepository = bannerRepository;
        this.cloudinaryBannerStorageService = cloudinaryBannerStorageService;
    }

    public List<BannerResponse> getPublicBanners() {
        return bannerRepository.findByActiveTrueOrderByDisplayOrderAscIdAsc()
                .stream()
                .map(BannerResponse::fromEntity)
                .toList();
    }

    public List<BannerResponse> getAllBanners() {
        return bannerRepository.findAllByOrderByDisplayOrderAscIdAsc()
                .stream()
                .map(BannerResponse::fromEntity)
                .toList();
    }

    public BannerResponse create(BannerRequest request) {
        Banner banner = new Banner();
        applyRequest(banner, request);
        return BannerResponse.fromEntity(bannerRepository.save(banner));
    }

    public BannerResponse update(Long id, BannerRequest request) {
        Banner banner = findById(id);
        applyRequest(banner, request);
        return BannerResponse.fromEntity(bannerRepository.save(banner));
    }

    public void delete(Long id) {
        bannerRepository.delete(findById(id));
    }

    public String uploadBannerImage(MultipartFile file) {
        return cloudinaryBannerStorageService.uploadBanner(file);
    }

    private Banner findById(Long id) {
        return bannerRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Khong tim thay banner id = " + id));
    }

    private void applyRequest(Banner banner, BannerRequest request) {
        String imageUrl = safe(request.getImageUrl()).trim();

        if (imageUrl.isBlank()) {
            throw new RuntimeException("URL anh banner khong duoc de trong.");
        }

        banner.setImageUrl(imageUrl);
        banner.setTitle(safe(request.getTitle()).trim());
        banner.setLinkUrl(safe(request.getLinkUrl()).trim());
        banner.setDisplayOrder(request.getDisplayOrder() == null ? 0 : request.getDisplayOrder());
        banner.setActive(request.getActive() == null || request.getActive());
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }
}
