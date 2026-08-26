package com.enesucar.orderservice;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import com.enesucar.orderservice.kafka.OrderProducer;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class OrderServiceApplicationTests {

    @MockitoBean
    private OrderProducer orderProducer;

    @Test
    void contextLoads() {
    }

}



