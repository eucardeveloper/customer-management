package com.enesucar.auth_service.config;

import com.enesucar.auth_service.entity.User;
import com.enesucar.auth_service.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * The migrations seed two demo accounts with published passwords. A hosted deployment should not keep
 * them, and "change it after the first login" is a step people forget. With these settings the first
 * start replaces the admin password and can remove the demo user, so the published passwords never
 * work on that deployment:
 *
 *   AUTH_BOOTSTRAP_ADMIN_PASSWORD   (min. 12 characters) sets the admin password at every start
 *   AUTH_BOOTSTRAP_REMOVE_DEMO_USER (true) deletes the seeded "user1" account
 *
 * Nothing happens when they are unset, so the local docker compose demo is unchanged.
 */
@Component
public class HostedBootstrap implements ApplicationRunner {

    static final int MIN_LENGTH = 12;
    private static final Logger log = LoggerFactory.getLogger(HostedBootstrap.class);

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final String adminPassword;
    private final boolean removeDemoUser;

    public HostedBootstrap(UserRepository users, PasswordEncoder encoder,
                           @Value("${auth.bootstrap.admin-password:}") String adminPassword,
                           @Value("${auth.bootstrap.remove-demo-user:false}") boolean removeDemoUser) {
        this.users = users;
        this.encoder = encoder;
        this.adminPassword = adminPassword;
        this.removeDemoUser = removeDemoUser;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!adminPassword.isBlank()) {
            if (adminPassword.length() < MIN_LENGTH) {
                throw new IllegalStateException("AUTH_BOOTSTRAP_ADMIN_PASSWORD must be at least " + MIN_LENGTH + " characters");
            }
            users.findByUsername("admin").ifPresent(admin -> {
                if (!encoder.matches(adminPassword, admin.getPassword())) {
                    admin.setPassword(encoder.encode(adminPassword));
                    admin.setTokenVersion(admin.getTokenVersion() + 1); // old sessions end
                    users.save(admin);
                    log.info("Admin password replaced from AUTH_BOOTSTRAP_ADMIN_PASSWORD");
                }
            });
        }
        if (removeDemoUser) {
            users.findByUsername("user1").ifPresent(u -> {
                users.delete(u);
                log.info("Seeded demo user removed");
            });
        }
    }
}
