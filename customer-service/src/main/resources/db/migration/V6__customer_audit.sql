-- Denetim kaydi: bir musteriyi KIM, NE ZAMAN olusturdu, degistirdi veya sildi.
-- Yalnizca eklenir; mevcut tablolara ve verilere dokunmaz. Musteri ile ayni islemde yazilir.
-- Kisisel veri azaltma: ad, e-posta ve telefon DEGERLERI saklanmaz; degisen alanlarin yalnizca ADI yazilir.
CREATE TABLE customer_audit (
    id           BIGSERIAL PRIMARY KEY,
    customer_id  BIGINT       NOT NULL,
    action       VARCHAR(30)  NOT NULL,
    actor        VARCHAR(100) NOT NULL,
    details      VARCHAR(500),
    created_at   TIMESTAMP    NOT NULL
);
CREATE INDEX idx_customer_audit_customer ON customer_audit (customer_id, id);
