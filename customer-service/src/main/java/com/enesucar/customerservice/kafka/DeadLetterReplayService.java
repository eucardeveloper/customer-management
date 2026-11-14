package com.enesucar.customerservice.kafka;

import com.enesucar.customerservice.exception.ReplayInProgressException;
import com.enesucar.customerservice.exception.ReplayUnavailableException;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.clients.consumer.ConsumerRecords;
import org.apache.kafka.clients.consumer.KafkaConsumer;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.locks.ReentrantLock;

/**
 * Sends events parked on "order-events.DLT" back to "order-events" so the projection gets another chance
 * (an admin does this after fixing whatever made them fail).
 *
 * <p>A dedicated consumer group remembers how far the dead-letter topic has been replayed, and the position is
 * committed only after the broker confirmed the republished events, so a crash in between replays some events
 * twice but never loses one; the projection applies each event idempotently, so a repeat is harmless. An event that
 * fails again goes back to the dead-letter topic through the normal error handling; it does not loop here.
 */
@Service
public class DeadLetterReplayService {

    static final String SOURCE_TOPIC = "order-events";
    static final String DEAD_LETTER_TOPIC = "order-events.DLT";
    static final String GROUP = "customer-dlt-replay";
    /** One call replays at most this many events; call again for more. */
    static final int MAX_PER_CALL = 500;
    private static final Duration IDLE_POLL = Duration.ofSeconds(2);
    private static final Logger log = LoggerFactory.getLogger(DeadLetterReplayService.class);

    private final KafkaTemplate<String, String> template;
    private final String bootstrapServers;
    private final Counter replayed;
    private final ReentrantLock running = new ReentrantLock();

    public DeadLetterReplayService(KafkaTemplate<String, String> template,
                                   @Value("${spring.kafka.bootstrap-servers:localhost:9092}") String bootstrapServers,
                                   MeterRegistry registry) {
        this.template = template;
        this.bootstrapServers = bootstrapServers;
        this.replayed = Counter.builder("customer.projection.dlt.replayed")
                .description("Dead-lettered order events an admin sent back to the order-events topic")
                .register(registry);
    }

    /** Returns how many events were sent back (0 when the dead-letter topic is empty or already replayed). */
    public int replay() {
        if (!running.tryLock()) {
            throw new ReplayInProgressException();
        }
        try (KafkaConsumer<String, String> dead = new KafkaConsumer<>(consumerConfig())) {
            dead.subscribe(List.of(DEAD_LETTER_TOPIC));
            int total = 0;
            int emptyPolls = 0;
            // the first polls only join the group; two empty polls in a row mean the topic is drained
            while (total < MAX_PER_CALL && emptyPolls < 2) {
                ConsumerRecords<String, String> batch = dead.poll(IDLE_POLL);
                if (batch.isEmpty()) {
                    emptyPolls++;
                    continue;
                }
                emptyPolls = 0;
                List<CompletableFuture<?>> sent = new ArrayList<>();
                for (ConsumerRecord<String, String> record : batch) {
                    sent.add(template.send(SOURCE_TOPIC, record.key(), record.value()));
                }
                for (CompletableFuture<?> f : sent) {
                    f.get(15, TimeUnit.SECONDS);
                }
                dead.commitSync();
                total += batch.count();
                replayed.increment(batch.count());
            }
            if (total > 0) {
                log.warn("Replayed {} dead-lettered order event(s) to {}", total, SOURCE_TOPIC);
            }
            return total;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new ReplayUnavailableException("Replay was interrupted", e);
        } catch (Exception e) {
            throw new ReplayUnavailableException("The broker could not be read or written; unconfirmed events stay on the dead-letter topic", e);
        } finally {
            running.unlock();
        }
    }

    private Map<String, Object> consumerConfig() {
        return Map.of(
                ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers,
                ConsumerConfig.GROUP_ID_CONFIG, GROUP,
                ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, false,
                ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest",
                ConsumerConfig.MAX_POLL_RECORDS_CONFIG, 100,
                // the dead-letter topic is created by the broker on its first publish; notice it quickly
                ConsumerConfig.METADATA_MAX_AGE_CONFIG, 1000,
                ConsumerConfig.REQUEST_TIMEOUT_MS_CONFIG, 10_000,
                ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class,
                ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
    }
}
