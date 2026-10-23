package com.enesucar.orderservice.config;

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.JsonSerializer;
import com.fasterxml.jackson.databind.SerializerProvider;

import java.io.IOException;
import java.math.BigDecimal;

public class BigDecimalSerializer extends JsonSerializer<BigDecimal> {
    @Override
    public void serialize(BigDecimal value, JsonGenerator gen, SerializerProvider serializers) throws IOException {
        if (value == null) {
            gen.writeNull();
        } else {
            // Money is shown with two decimals, as the request validation accepts (@Digits fraction = 2).
            gen.writeNumber(value.setScale(2, java.math.RoundingMode.HALF_UP).toPlainString());
        }
    }
}
