package com.enesucar.apigateway;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

/** CORS is configured in CorsConfig (and tested in CorsConfigTest); a second, ineffective copy would only mislead. */
class GatewayPropertiesTest {

    @Test
    void noInertGlobalCorsSettingsRemainInTheApplicationProperties() throws IOException {
        String properties = Files.readString(Path.of("src/main/resources/application.properties"));
        assertThat(properties).doesNotContain("globalcors");
    }
}
