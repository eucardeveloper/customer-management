# 0004 Transactional outbox for order events

Status: accepted

## Context
After an order is saved, an `ORDER_*` event must reach Kafka. Saving and then sending can lose the event
(crash or broker down after the commit); sending and then saving can announce an order that was rolled back.

## Decision
- The event row is written to `outbox_event` in the same transaction as the order change.
- A relay (`OutboxRelay`, every second) locks pending rows with `FOR UPDATE SKIP LOCKED`, publishes them keyed
  by order id, and marks them published only after the broker acknowledged. A failure stops the batch, so
  later events do not overtake an earlier one **within that instance**. With several relay instances this is
  not guaranteed: `SKIP LOCKED` lets one hold rows 1-50 while another publishes 51-100 first. Strict order
  would need a single active relay (for example an advisory lock); it was not added because both consumers
  apply each event as an idempotent "set the state" step and do not depend on order.
- Delivery is therefore at-least-once. The consumer stores each event's business id in `processed_event` in
  the same transaction as its handling, so a redelivery is skipped; failures go to `order-events.DLT` after 3 tries.
- The backlog is measured: `outbox_events_pending` and `outbox_oldest_pending_age_seconds`, with the alert
  `OrderEventsNotReachingKafka` (age > 60 s for 2 min). The outbox prevents loss, the gauge shows delay.

- The relay publishes while holding its database transaction, so the producer's waits are bounded
  (`max.block.ms` 3 s, `delivery.timeout.ms` 5 s, plus the 5 s acknowledgement wait). The batch stops at the
  first failure, so with the broker down the transaction stays open about 8 s, not 8 s per event.
- The customer-service consumer retries a failing event three more times and then dead-letters it
  (`order-events.DLT`, counted in `customer_projection_dlt_total`); without that, Kafka's default would drop it silently.
- Both consumers start from the earliest offset when a group has no committed position.

## Alternatives rejected
- **Kafka transactions / exactly-once.** Covers Kafka-to-Kafka, not "database commit and Kafka send" together.
- **Change data capture (Debezium).** The robust production option; another moving part (Kafka Connect) for one table.
- **Publish in an `afterCommit` hook.** Still loses the event if the process dies between commit and send.

## Consequences
- Duplicates are possible and tolerated by the consumer.
- Events can be delayed while Kafka is down; the alert makes that visible instead of silent.
- The order-service's consumer only logs. The customer-service consumer maintains an order projection (customer to orders) used as a fallback hint when a delete cannot reach the order-service; it is idempotent by nature (upsert/delete) and can lag.
