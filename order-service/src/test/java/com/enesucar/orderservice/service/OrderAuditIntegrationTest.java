package com.enesucar.orderservice.service;

import com.enesucar.orderservice.client.CustomerClient;
import com.enesucar.orderservice.dto.OrderRequestDTO;
import com.enesucar.orderservice.entity.OrderAudit;
import com.enesucar.orderservice.kafka.OrderProducer;
import com.enesucar.orderservice.repository.OrderAuditRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

/**
 * Proves the audit trail on a real PostgreSQL with the real migrations (V12): every create, update
 * and delete leaves a row saying who did it and the old and new status.
 * Needs Docker; fails with a clear error when it is not running (never skipped silently).
 */
@Testcontainers
@SpringBootTest(properties = {
        "spring.jpa.hibernate.ddl-auto=validate",
        "spring.datasource.driver-class-name=org.postgresql.Driver",
        "spring.flyway.enabled=true",
        "app.kafka.enabled=false"
})
class OrderAuditIntegrationTest {

    @Container
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:16");

    @DynamicPropertySource
    static void datasource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @MockitoBean OrderProducer orderProducer;
    @MockitoBean CustomerClient customerClient;

    @Autowired OrderService orderService;
    @Autowired OrderAuditRepository audits;

    @AfterEach
    void clearUser() {
        SecurityContextHolder.clearContext();
    }

    private static void signInAs(String username) {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                username, null, List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))));
    }

    private static OrderRequestDTO request(String status, String price) {
        OrderRequestDTO r = new OrderRequestDTO();
        r.setCustomerId(1L);
        r.setProductName("Audit test item");
        r.setPrice(new BigDecimal(price));
        r.setQuantity(1);
        r.setStatus(status);
        return r;
    }

    @Test
    void createUpdateAndDeleteEachLeaveARowWithWhoAndOldAndNewStatus() {
        when(customerClient.exists(1L)).thenReturn(true);
        signInAs("alice");

        long id = orderService.createOrder(request("PENDING", "10.00")).getId();
        signInAs("bob");
        orderService.updateOrder(id, request("DELIVERED", "10.00"));
        orderService.deleteOrder(id);

        List<OrderAudit> trail = audits.findByOrderIdOrderByIdAsc(id);
        assertThat(trail).extracting(OrderAudit::getAction).containsExactly("CREATE", "UPDATE", "DELETE");
        assertThat(trail).extracting(OrderAudit::getActor).containsExactly("alice", "bob", "bob");
        assertThat(trail.get(0).getOldStatus()).isNull();
        assertThat(trail.get(0).getNewStatus()).isEqualTo("PENDING");
        assertThat(trail.get(1).getOldStatus()).isEqualTo("PENDING");
        assertThat(trail.get(1).getNewStatus()).isEqualTo("DELIVERED");
        assertThat(trail.get(1).getDetails()).isEqualTo("status PENDING->DELIVERED");
        assertThat(trail.get(2).getOldStatus()).isEqualTo("DELIVERED");
        assertThat(trail).allSatisfy(a -> assertThat(a.getCreatedAt()).isNotNull());
    }

    @Test
    void aSaveThatChangesNothingIsRecordedAsSuch() {
        when(customerClient.exists(1L)).thenReturn(true);
        signInAs("alice");
        long id = orderService.createOrder(request("PENDING", "10.00")).getId();

        orderService.updateOrder(id, request("PENDING", "10.0"));

        List<OrderAudit> trail = audits.findByOrderIdOrderByIdAsc(id);
        assertThat(trail.get(1).getDetails()).isEqualTo("no field changed");
    }

    @Test
    void workDoneWithoutASignedInUserIsRecordedAsSystem() {
        when(customerClient.exists(1L)).thenReturn(true);
        long id = orderService.createOrder(request("PENDING", "10.00")).getId();

        assertThat(audits.findByOrderIdOrderByIdAsc(id)).extracting(OrderAudit::getActor).containsExactly("system");
    }

    @Test
    void anOrderMayBeCorrectedBackToAnEarlierStatusAndTheTrailShowsIt() {
        // Decision: the CRM allows free status corrections (a mis-click must be fixable); the audit trail is the safeguard.
        when(customerClient.exists(1L)).thenReturn(true);
        signInAs("alice");
        long id = orderService.createOrder(request("DELIVERED", "10.00")).getId();

        orderService.updateOrder(id, request("PENDING", "10.00"));

        List<OrderAudit> trail = audits.findByOrderIdOrderByIdAsc(id);
        assertThat(trail.get(1).getOldStatus()).isEqualTo("DELIVERED");
        assertThat(trail.get(1).getNewStatus()).isEqualTo("PENDING");
    }

    @Test
    void anOrderUndoneBecauseItsCustomerVanishedIsRecordedUnderTheUserWhoseRequestWasUndone() {
        // First lookup (before saving) finds the customer, the re-check after the commit does not.
        when(customerClient.exists(1L)).thenReturn(true, false);
        signInAs("alice");

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> orderService.createOrder(request("PENDING", "10.00")))
                .isInstanceOf(com.enesucar.orderservice.exception.UnknownCustomerException.class);

        List<OrderAudit> undone = audits.findAll().stream().filter(a -> "UNDO_CREATE".equals(a.getAction())).toList();
        assertThat(undone).isNotEmpty();
        assertThat(undone.get(undone.size() - 1).getActor()).isEqualTo("alice");
    }
}
