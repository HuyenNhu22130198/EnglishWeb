package com.englishweb.be.controller;

import com.englishweb.be.dto.ApiResponse;
import com.englishweb.be.dto.UpdateRoleRequest;
import com.englishweb.be.entity.User;
import com.englishweb.be.service.AuthService;
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

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<User>> getCurrentUser(Authentication authentication) {
        String email = authentication.getName();
        User user = authService.getUserByEmail(email);
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin thành công", user));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<User>> getUserById(@PathVariable Integer id) {
        User user = authService.getUserById(id);
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin thành công", user));
    }

    // Admin Endpoints
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
