# 0004 Transactional outbox for order events

Status: accepted

## Context
After an order is saved, an `ORDER_*` event must reach Kafka. Saving and then sending can lose the event
(crash or broker down after the commit); sending and then saving can announce an order that was rolled back.

## Decision
- The event row is written to `outbox_event` in the same transaction as the order change.
- A relay (`OutboxRelay`, every second) locks pending rows with `FOR UPDATE SKIP LOCKED`, publishes them keyed
  by order id, and marks them published only after the broker acknowledged. A failure stops the batch, so
  later events do not overtake an earlier one.
- Delivery is therefore at-least-once. The consumer stores each event's business id in `processed_event` in
  the same transaction as its handling, so a redelivery is skipped; failures go to `order-events.DLT` after 3 tries.
- The backlog is measured: `outbox_events_pending` and `outbox_oldest_pending_age_seconds`, with the alert
  `OrderEventsNotReachingKafka` (age > 60 s for 2 min). The outbox prevents loss, the gauge shows delay.

## Alternatives rejected
- **Kafka transactions / exactly-once.** Covers Kafka-to-Kafka, not "database commit and Kafka send" together.
- **Change data capture (Debezium).** The robust production option; another moving part (Kafka Connect) for one table.
- **Publish in an `afterCommit` hook.** Still loses the event if the process dies between commit and send.

## Consequences
- Duplicates are possible and tolerated by the consumer.
- Events can be delayed while Kafka is down; the alert makes that visible instead of silent.
- The order-service's consumer only logs. The customer-service consumer maintains an order projection (customer to orders) used as a fallback hint when a delete cannot reach the order-service; it is idempotent by nature (upsert/delete) and can lag.
