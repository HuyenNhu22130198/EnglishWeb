package com.englishweb.be.controller;

import com.englishweb.be.dto.AccountActionRequest;
import com.englishweb.be.dto.ApiResponse;
import com.englishweb.be.dto.ChangePasswordRequest;
import com.englishweb.be.dto.UpdateAccountSettingsRequest;
import com.englishweb.be.dto.UpdateProfileRequest;
import com.englishweb.be.dto.UpdateRoleRequest;
import com.englishweb.be.dto.ielts.IeltsAttemptHistoryResponse;
import com.englishweb.be.dto.toeic.ToeicAttemptHistoryResponse;
import com.englishweb.be.entity.User;
import com.englishweb.be.service.AuthService;
import com.englishweb.be.service.IeltsSubmitService;
import com.englishweb.be.service.ToeicSubmitService;
import com.englishweb.be.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "http://localhost:5173")
@RequiredArgsConstructor
public class UserController {

    private final AuthService authService;
    private final UserService userService;
    private final ToeicSubmitService toeicSubmitService;
    private final IeltsSubmitService ieltsSubmitService;

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<User>> getCurrentUser(Authentication authentication) {
        String email = authentication.getName();
        User user = authService.getUserByEmail(email);
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin thành công", user));
    }

    @PutMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<User>> updateCurrentUser(
            Authentication authentication,
            @Valid @RequestBody UpdateProfileRequest request
    ) {
        String email = authentication.getName();
        User user = userService.updateProfile(email, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật thông tin thành công", user));
    }

    @PutMapping("/me/settings")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<User>> updateAccountSettings(
            Authentication authentication,
            @RequestBody UpdateAccountSettingsRequest request
    ) {
        String email = authentication.getName();
        User user = userService.updateAccountSettings(email, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật cài đặt tài khoản thành công", user));
    }

    @PutMapping("/me/change-password")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<String>> changePassword(
            Authentication authentication,
            @Valid @RequestBody ChangePasswordRequest request
    ) {
        String email = authentication.getName();
        userService.changePassword(email, request);
        return ResponseEntity.ok(ApiResponse.success("Đổi mật khẩu thành công", null));
    }

    @PutMapping("/me/delete")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<String>> deleteOwnAccount(
            Authentication authentication,
            @Valid @RequestBody AccountActionRequest request
    ) {
        String email = authentication.getName();
        userService.deleteOwnAccount(email, request);
        return ResponseEntity.ok(ApiResponse.success("Tài khoản đã được xóa", null));
    }

    @GetMapping("/me/toeic-history")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<ToeicAttemptHistoryResponse>>> getMyToeicHistory(
            Authentication authentication
    ) {
        String email = authentication.getName();
        List<ToeicAttemptHistoryResponse> history = toeicSubmitService.getMyAttemptHistory(email);
        return ResponseEntity.ok(ApiResponse.success("Lấy lịch sử TOEIC thành công", history));
    }

    @GetMapping("/me/ielts-history")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<IeltsAttemptHistoryResponse>>> getMyIeltsHistory(
            Authentication authentication
    ) {
        String email = authentication.getName();
        List<IeltsAttemptHistoryResponse> history = ieltsSubmitService.getMyAttemptHistory(email);
        return ResponseEntity.ok(ApiResponse.success("Lấy lịch sử IELTS thành công", history));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<User>> getUserById(@PathVariable Integer id) {
        User user = authService.getUserById(id);
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin thành công", user));
    }

    @GetMapping("/admin/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<User>>> getAllUsers() {
        List<User> users = userService.getAllUsers();
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách user thành công", users));
    }

    @PutMapping("/admin/update-role")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<User>> updateUserRole(@Valid @RequestBody UpdateRoleRequest request) {
        User user = userService.updateUserRole(request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật role thành công", user));
    }

    @PutMapping("/admin/disable/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<User>> disableUser(@PathVariable Integer userId) {
        User user = userService.disableUser(userId);
        return ResponseEntity.ok(ApiResponse.success("Vô hiệu hóa user thành công", user));
    }

    @PutMapping("/admin/enable/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<User>> enableUser(@PathVariable Integer userId) {
        User user = userService.enableUser(userId);
        return ResponseEntity.ok(ApiResponse.success("Kích hoạt user thành công", user));
    }
}
