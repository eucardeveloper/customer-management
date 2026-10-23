package com.enesucar.orderservice.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.module.SimpleModule;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class BigDecimalSerializerTest {

    private final ObjectMapper mapper = new ObjectMapper()
            .registerModule(new SimpleModule().addSerializer(BigDecimal.class, new BigDecimalSerializer()));

    @Test
    void moneyIsWrittenWithTwoDecimals() throws Exception {
        assertThat(mapper.writeValueAsString(new BigDecimal("12.5"))).isEqualTo("12.50");
        assertThat(mapper.writeValueAsString(new BigDecimal("1"))).isEqualTo("1.00");
        assertThat(mapper.writeValueAsString(new BigDecimal("1500.0000000000"))).isEqualTo("1500.00");
    }

    @Test
    void valuesStoredWithMoreDecimalsAreRoundedForDisplay() throws Exception {
        assertThat(mapper.writeValueAsString(new BigDecimal("0.125"))).isEqualTo("0.13");
    }

    @Test
    void nullStaysNull() throws Exception {
        assertThat(mapper.writeValueAsString((BigDecimal) null)).isEqualTo("null");
    }
}
