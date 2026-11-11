-- Denetim kaydi: bir siparisi KIM, NE ZAMAN, NASIL degistirdi (eski -> yeni durum dahil).
-- Yalnizca eklenir; mevcut tablolara ve verilere dokunmaz. Siparis ile ayni islemde yazilir.
CREATE TABLE order_audit (
    id          BIGSERIAL PRIMARY KEY,
    order_id    BIGINT       NOT NULL,
    action      VARCHAR(30)  NOT NULL,
    actor       VARCHAR(100) NOT NULL,
    old_status  VARCHAR(50),
    new_status  VARCHAR(50),
    details     VARCHAR(500),
    created_at  TIMESTAMP    NOT NULL
);
CREATE INDEX idx_order_audit_order ON order_audit (order_id, id);
