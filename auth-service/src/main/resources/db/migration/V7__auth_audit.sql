-- Denetim kaydi: hesaplarla ilgili olaylari KIM, KIME, NE ZAMAN yapti (giris, cikis, kullanici olusturma,
-- rol ve parola degisikligi, silme). Yalnizca eklenir; mevcut tablolara dokunmaz.
-- Parola, token veya parola ipucu ASLA yazilmaz; details alani yalnizca olay turunu aciklar.
CREATE TABLE auth_audit (
    id          BIGSERIAL PRIMARY KEY,
    action      VARCHAR(30)  NOT NULL,
    actor       VARCHAR(100) NOT NULL,
    target      VARCHAR(100),
    details     VARCHAR(500),
    created_at  TIMESTAMP    NOT NULL
);
CREATE INDEX idx_auth_audit_target ON auth_audit (target, id);
