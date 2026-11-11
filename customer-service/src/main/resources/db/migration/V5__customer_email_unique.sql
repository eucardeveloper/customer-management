-- E-posta tekilligi artik veritabani seviyesinde de garanti: servisteki existsBy... kontrolu
-- (kontrol-sonra-yaz) iki es zamanli istekte ikisini de gecirebiliyordu.
-- Buyuk/kucuk harf duyarsiz, bos (NULL) e-postalar birden fazla olabilir.
-- NOT: tabloda ayni e-postali kayitlar varsa bu migration bilincli olarak HATA verir;
-- once mukerrer kayitlar elle temizlenmelidir (otomatik silme yapilmaz).
CREATE UNIQUE INDEX uq_customer_email_lower ON customer (lower(email)) WHERE email IS NOT NULL;
