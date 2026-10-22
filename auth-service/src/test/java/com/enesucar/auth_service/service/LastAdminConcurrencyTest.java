package com.enesucar.auth_service.service;

import com.enesucar.auth_service.entity.Role;
import com.enesucar.auth_service.entity.User;
import com.enesucar.auth_service.exception.LastAdminException;
import com.enesucar.auth_service.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * "The last ADMIN can neither be demoted nor deleted" must also hold when two admins act at the same
 * moment. Two admins demote (or delete) each other in parallel, many times over, on a real PostgreSQL:
 * every round exactly one change wins and one administrator is left. Without the row lock in
 * UserService both changes see "2 admins" and the system ends up with none.
 * Needs Docker; fails with a clear error when it is not running (never skipped silently).
 */
@Testcontainers
@SpringBootTest(properties = {
        "spring.jpa.hibernate.ddl-auto=validate",
        "spring.datasource.driver-class-name=org.postgresql.Driver",
        "spring.flyway.enabled=true",
        "spring.flyway.target=latest"
})
class LastAdminConcurrencyTest {

    private static final int ROUNDS = 25;

    @Container
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:16");

    @DynamicPropertySource
    static void datasource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @Autowired UserService userService;
    @Autowired UserRepository users;

    @BeforeEach
    void onlyOurAdmins() {
        // the seeded "admin" would be a third administrator and hide the race
        users.findAll().forEach(u -> {
            u.setRole(Role.USER);
            users.save(u);
        });
    }

    @Test
    void twoAdminsDemotingEachOtherLeaveOneAdmin() throws Exception {
        for (int round = 0; round < ROUNDS; round++) {
            List<User> pair = twoAdmins("demote" + round);
            int refused = race(
                    () -> userService.updateRole(pair.get(1).getId(), "USER"),
                    () -> userService.updateRole(pair.get(0).getId(), "USER"));
            assertThat(users.countByRole(Role.ADMIN)).as("admins left after round %d", round).isEqualTo(1);
            assertThat(refused).as("refused changes in round %d", round).isEqualTo(1);
            reset(pair);
        }
    }

    @Test
    void twoAdminsDeletingEachOtherLeaveOneAdmin() throws Exception {
        for (int round = 0; round < ROUNDS; round++) {
            List<User> pair = twoAdmins("delete" + round);
            int refused = race(
                    () -> userService.deleteUser(pair.get(1).getId()),
                    () -> userService.deleteUser(pair.get(0).getId()));
            assertThat(users.countByRole(Role.ADMIN)).as("admins left after round %d", round).isEqualTo(1);
            assertThat(refused).as("refused changes in round %d", round).isEqualTo(1);
            reset(pair);
        }
    }

    private List<User> twoAdmins(String prefix) {
        List<User> pair = new ArrayList<>();
        for (String name : List.of(prefix + "_a", prefix + "_b")) {
            pair.add(users.save(User.builder().username(name).email(name + "@example.com")
                    .password("x").role(Role.ADMIN).build()));
        }
        return pair;
    }

    private void reset(List<User> pair) {
        pair.forEach(u -> users.findById(u.getId()).ifPresent(users::delete));
    }

    /** Runs both actions at the same instant; returns how many were refused with LastAdminException. */
    private static int race(Runnable first, Runnable second) throws Exception {
        CyclicBarrier start = new CyclicBarrier(2);
        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            List<Future<Boolean>> results = new ArrayList<>();
            for (Runnable action : List.of(first, second)) {
                results.add(pool.submit(() -> {
                    start.await(5, TimeUnit.SECONDS);
                    try {
                        action.run();
                        return false;
                    } catch (LastAdminException e) {
                        return true;
                    }
                }));
            }
            int refused = 0;
            for (Future<Boolean> r : results) {
                if (r.get(30, TimeUnit.SECONDS)) refused++;
            }
            return refused;
        } finally {
            pool.shutdownNow();
        }
    }
}
