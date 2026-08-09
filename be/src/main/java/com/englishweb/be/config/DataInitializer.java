package com.englishweb.be.config;

import com.englishweb.be.entity.Role;
import com.englishweb.be.entity.User;
import com.englishweb.be.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) {
        // ensureUserColumns();

        if (!userRepository.existsByEmail("admin@englishweb.com")) {
            User adminUser = User.builder()
                    .email("admin@englishweb.com")
                    .username("admin")
                    .password(passwordEncoder.encode("admin@123"))
                    .fullName("Admin User")
                    .role(Role.ADMIN)
                    .status("ACTIVE")
                    .emailVerified(true)
                    .provider("LOCAL")
                    .build();
            userRepository.save(adminUser);
            System.out.println("Admin user created successfully");
            System.out.println("Email: admin@englishweb.com");
            System.out.println("Username: admin");
            System.out.println("Password: admin@123");
        }

        if (!userRepository.existsByEmail("user@englishweb.com")) {
            User normalUser = User.builder()
                    .email("user@englishweb.com")
                    .username("user")
                    .password(passwordEncoder.encode("user@123"))
                    .fullName("Normal User")
                    .role(Role.USER)
                    .status("ACTIVE")
                    .emailVerified(true)
                    .provider("LOCAL")
                    .build();
            userRepository.save(normalUser);
            System.out.println("Default user created successfully");
            System.out.println("Email: user@englishweb.com");
            System.out.println("Username: user");
            System.out.println("Password: user@123");
        }
    }

//     private void ensureUserColumns() {
//         jdbcTemplate.execute("""
//                 ALTER TABLE users
//                 ADD COLUMN IF NOT EXISTS public_profile_visible boolean NOT NULL DEFAULT false
//                 """);

//         jdbcTemplate.execute("""
//                 ALTER TABLE users
//                 ADD COLUMN IF NOT EXISTS notify_forum_replies boolean NOT NULL DEFAULT true
//                 """);

//         jdbcTemplate.execute("""
//                 ALTER TABLE users
//                 ADD COLUMN IF NOT EXISTS notify_forum_mentions boolean NOT NULL DEFAULT true
//                 """);

//         jdbcTemplate.execute("""
//                 ALTER TABLE users
//                 ADD COLUMN IF NOT EXISTS notify_system_updates boolean NOT NULL DEFAULT true
//                 """);
//     }
}
