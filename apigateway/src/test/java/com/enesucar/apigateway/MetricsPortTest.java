package com.enesucar.apigateway;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The gateway is the one backend published to the outside, and the actuator would be answered on its port
 * before any route or the JWT filter. So metrics live on a separate management port that is not published,
 * and this test pins both halves: scrapeable there, not reachable on the public port.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {"management.server.port=0", "management.endpoints.web.exposure.include=health,prometheus",
                "management.prometheus.metrics.export.enabled=true"})
class MetricsPortTest {

    @Value("${local.server.port}")
    int publicPort;

    @Value("${local.management.port}")
    int managementPort;

    private static HttpResponse<String> get(int port, String path) throws Exception {
        return HttpClient.newHttpClient().send(
                HttpRequest.newBuilder(URI.create("http://localhost:" + port + path)).build(),
                HttpResponse.BodyHandlers.ofString());
    }

    @Test
    void prometheusScrapesTheManagementPort() throws Exception {
        HttpResponse<String> res = get(managementPort, "/actuator/prometheus");
        assertThat(res.statusCode()).isEqualTo(200);
        assertThat(res.body()).contains("jvm_memory_used_bytes");
    }

    @Test
    void thePublicPortDoesNotServeTheActuator() throws Exception {
        assertThat(managementPort).isNotEqualTo(publicPort);
        assertThat(get(publicPort, "/actuator/prometheus").statusCode()).isIn(401, 404);
        assertThat(get(publicPort, "/actuator/health").statusCode()).isIn(401, 404);
    }
}
