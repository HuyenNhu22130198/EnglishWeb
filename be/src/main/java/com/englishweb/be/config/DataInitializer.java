package com.englishweb.be.config;

import com.englishweb.be.entity.Role;
import com.englishweb.be.entity.User;
import com.englishweb.be.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        // Tạo admin user mặc định nếu chưa tồn tại
        if (!userRepository.existsByEmail("admin@englishweb.com")) {
            User adminUser = User.builder()
                    .email("admin@englishweb.com")
                    .username("admin")
                    .password(passwordEncoder.encode("admin@123"))
                    .fullName("Admin User")
                    .role(Role.ADMIN)
                    .status("ACTIVE")
                    .emailVerified(true)
                    .build();
            userRepository.save(adminUser);
            System.out.println("Admin user tạo thành công!");
            System.out.println("Email: admin@englishweb.com");
            System.out.println("Username: admin");
            System.out.println("Password: admin@123");
        }

        // Tạo user mặc định để test
        if (!userRepository.existsByEmail("user@englishweb.com")) {
            User normalUser = User.builder()
                    .email("user@englishweb.com")
                    .username("user")
                    .password(passwordEncoder.encode("user@123"))
                    .fullName("Normal User")
                    .role(Role.USER)
                    .status("ACTIVE")
                    .emailVerified(false)
                    .build();
            userRepository.save(normalUser);
            System.out.println("User mặc định tạo thành công!");
            System.out.println("Email: user@englishweb.com");
            System.out.println("Username: user");
            System.out.println("Password: user@123");
        }
    }
}
