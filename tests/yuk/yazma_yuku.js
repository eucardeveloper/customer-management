// Customer YAZMA yük testi + YARIŞ DURUMU + YETKİ/FİYAT GİZLEME denetimi (k6), API Gateway üzerinden.
//
// !! BU TEST VERİ YAZAR !!  Yalnızca yerel/demo veritabanında çalıştırın, production'da ASLA.
// Test kayıtları "YUKTEST-" önekiyle işaretlenir; akış kendi yazdığını siler, yarışta kalan kayıtlar için
// test sonunda demo veriyi yedekten geri yükleyin (docs/BACKUP-RESTORE.md; restore.bat).
//
// Neyi sınar?
//  A) Yönetici akışı: müşteri oluştur -> sipariş oluştur -> durum değiştir (PROCESSING, SHIPPED) -> oku -> sil.
//  B) Yetki: USER rolü yük altında (1) siparişlerde fiyat GÖRMEMELİ (price=null), (2) yazma isteklerinde 403 almalı.
//  C) Yarış: AYNI ANDA "müşteri sil" + "o müşteriye sipariş oluştur". Kayıp (öksüz) sipariş kalmamalı:
//     sipariş 201 ve silme 204 birlikte OLMAMALI; silme 204 ise o müşterinin siparişi kalmamalı.
//  D) Sunucu hatası (5xx) %1 altı, p95 süre eşiği.
//  E) (PROFIL=buyuk) veri büyütme: çok sipariş yazıldıktan sonra GET /api/orders süresi (liste sayfalanmıyor).
//
// Çalıştırma (PowerShell, Customer proje klasöründe; Customer açık, diğer projeler durmuş, ÖNCE YEDEK ALIN).
// Parolaları kendiniz yazın; sohbete veya koda yazmayın. Docker ağı içinden (host.docker.internal ~%2 bağlantı kopması yapabiliyor):
//   $env:CM_PAROLA = "<admin parolası>" ; $env:CM_PAROLA_USER = "<user1 parolası>"
//   Get-Content tests\yuk\yazma_yuku.js | docker run --rm -i --network customer-management_default -e CM_PAROLA -e CM_PAROLA_USER -e CM_URL=http://api-gateway:8080 grafana/k6 run -
//   (ağ adı farklıysa:  docker network ls   ; geçidin adı:  api-gateway)
// Profiller: -e PROFIL=normal (varsayılan, ~50 sanal kullanıcı) | spike (~100) | buyuk (normal + 3000 sipariş ön yükü)
import http from "k6/http";
import { check, sleep } from "k6";
import { Counter } from "k6/metrics";

const URL = __ENV.CM_URL || "http://localhost:8080";
const ADMIN = __ENV.CM_KULLANICI || "admin";
const USER = __ENV.CM_KULLANICI_USER || "user1";
const PAROLA = __ENV.CM_PAROLA;
const PAROLA_USER = __ENV.CM_PAROLA_USER;
const PROFIL = __ENV.PROFIL || "normal";
const BUYUK_N = parseInt(__ENV.BUYUK_SIPARIS || "3000", 10);

const akis_hata = new Counter("akis_hata"); // yönetici akışında beklenmeyen durum kodu
const fiyat_sizinti = new Counter("fiyat_sizinti"); // USER rolünün fiyat görmesi
const user_yazma_deligi = new Counter("user_yazma_deligi"); // USER yazma isteği 403 dışında
const yaris_ihlal = new Counter("yaris_ihlal"); // müşteri silme / sipariş yarışında tutarsızlık

http.setResponseCallback(http.expectedStatuses(200, 201, 204, 403, 404, 409));

const AYARLAR = {
  normal: { admin: 10, user: 30, yaris: 5, okuyan_admin: 5 }, // 50
  spike: { admin: 20, user: 60, yaris: 10, okuyan_admin: 10 }, // 100
  buyuk: { admin: 10, user: 30, yaris: 5, okuyan_admin: 5 },
};
const a = AYARLAR[PROFIL] || AYARLAR.normal;

function asamalar(hedef) {
  if (PROFIL === "spike") {
    return [
      { duration: "30s", target: Math.ceil(hedef / 5) },
      { duration: "10s", target: hedef },
      { duration: "1m", target: hedef },
      { duration: "10s", target: Math.ceil(hedef / 5) },
      { duration: "30s", target: 0 },
    ];
  }
  return [
    { duration: "30s", target: hedef },
    { duration: "2m", target: hedef },
    { duration: "30s", target: 0 },
  ];
}

export const options = {
  setupTimeout: "10m",
  scenarios: {
    admin_akis: { executor: "ramping-vus", startVUs: 0, stages: asamalar(a.admin), exec: "adminAkis" },
    user_okuma: { executor: "ramping-vus", startVUs: 0, stages: asamalar(a.user), exec: "userOkuma" },
    admin_okuma: { executor: "ramping-vus", startVUs: 0, stages: asamalar(a.okuyan_admin), exec: "adminOkuma" },
    yaris: { executor: "ramping-vus", startVUs: 0, stages: asamalar(a.yaris), exec: "yaris" },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"], // 5xx / ağ hatası < %1
    http_req_duration: ["p(95)<1500"],
    akis_hata: ["count==0"],
    fiyat_sizinti: ["count==0"],
    user_yazma_deligi: ["count==0"],
    yaris_ihlal: ["count==0"],
  },
};

function giris(kullanici, parola) {
  if (!parola) throw new Error(`${kullanici} için parola verilmedi (CM_PAROLA / CM_PAROLA_USER)`);
  const r = http.post(`${URL}/api/auth/login`, JSON.stringify({ username: kullanici, password: parola }), {
    headers: { "Content-Type": "application/json" },
  });
  if (r.status !== 200) throw new Error(`${kullanici} girişi başarısız: ${r.status}`);
  const c = r.cookies["customer_session"];
  if (!c || !c[0]) throw new Error("customer_session çerezi dönmedi");
  return c[0].value;
}

function bas(token) {
  return { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } };
}

function musteriGovde(etiket) {
  return JSON.stringify({
    firstName: `YUKTEST-${etiket}`,
    lastName: "Yuk",
    email: `yuktest-${etiket}@example.com`,
    phone: "+90 555 000 0000",
    customerType: "COMPANY",
  });
}

function siparisGovde(musteriId, durum) {
  const g = { customerId: musteriId, productName: "YUKTEST-Urun", price: 99.5, quantity: 2 };
  if (durum) g.status = durum;
  return JSON.stringify(g);
}

// Giriş sınırı olduğu için her rol için TEK giriş yapılır (2 giriş), jeton paylaşılır.
export function setup() {
  const veri = { admin: giris(ADMIN, PAROLA), user: giris(USER, PAROLA_USER), buyukMusteri: null };
  if (PROFIL === "buyuk") {
    const m = http.post(`${URL}/api/customers`, musteriGovde(`buyuk-${Date.now()}`), bas(veri.admin));
    if (m.status !== 200) throw new Error(`büyük veri müşterisi oluşmadı: ${m.status}`);
    const id = m.json("id");
    veri.buyukMusteri = id;
    for (let i = 0; i < BUYUK_N; i += 50) {
      const istekler = [];
      for (let j = 0; j < 50 && i + j < BUYUK_N; j++) {
        istekler.push(["POST", `${URL}/api/orders`, siparisGovde(id, "PENDING"), bas(veri.admin)]);
      }
      http.batch(istekler);
    }
  }
  return veri;
}

export function adminAkis(veri) {
  const h = bas(veri.admin);
  const etiket = `A${__VU}-${__ITER}-${Date.now()}`;
  const musteri = http.post(`${URL}/api/customers`, musteriGovde(etiket), h);
  if (musteri.status !== 200) {
    akis_hata.add(1);
    return;
  }
  const mid = musteri.json("id");
  const siparis = http.post(`${URL}/api/orders`, siparisGovde(mid), h);
  if (siparis.status !== 201) {
    akis_hata.add(1);
    http.del(`${URL}/api/customers/${mid}`, null, h);
    return;
  }
  const sid = siparis.json("id");
  for (const durum of ["PROCESSING", "SHIPPED"]) {
    const g = JSON.parse(siparisGovde(mid));
    g.status = durum;
    const u = http.put(`${URL}/api/orders/${sid}`, JSON.stringify(g), h);
    if (u.status !== 200) akis_hata.add(1);
    sleep(0.2);
  }
  const oku = http.get(`${URL}/api/orders/${sid}`, h);
  if (oku.status !== 200 || oku.json("status") !== "SHIPPED" || oku.json("price") === null) akis_hata.add(1);
  const ds = http.del(`${URL}/api/orders/${sid}`, null, h);
  if (ds.status !== 204) akis_hata.add(1);
  const dm = http.del(`${URL}/api/customers/${mid}`, null, h);
  if (dm.status !== 204) akis_hata.add(1);
  sleep(0.5);
}

export function userOkuma(veri) {
  const h = bas(veri.user);
  const mus = http.get(`${URL}/api/customers`, h);
  check(mus, { "user müşteri listesi 200": (x) => x.status === 200 });
  const sip = http.get(`${URL}/api/orders`, h);
  check(sip, { "user sipariş listesi 200": (x) => x.status === 200 });
  if (sip.status === 200) {
    let liste = [];
    try {
      liste = sip.json();
    } catch (e) {
      liste = [];
    }
    for (const s of liste) {
      if (s.price !== null && s.price !== undefined) {
        fiyat_sizinti.add(1);
        break; // yanıt başına en fazla 1 say
      }
    }
  }
  // USER yazamamalı: hepsi 403 dönmeli (id 0: gerçek kayıt etkilenmesin)
  const yazma = [
    http.post(`${URL}/api/customers`, musteriGovde(`user-${__VU}-${__ITER}`), h),
    http.put(`${URL}/api/orders/0`, siparisGovde(1), h),
    http.del(`${URL}/api/orders/0`, null, h),
    http.del(`${URL}/api/customers/0`, null, h),
  ];
  for (const r of yazma) if (r.status !== 403) user_yazma_deligi.add(1);
  sleep(0.5);
}

export function adminOkuma(veri) {
  const h = bas(veri.admin);
  for (const uc of ["/api/customers", "/api/orders", "/api/auth/session"]) {
    const r = http.get(`${URL}${uc}`, h);
    check(r, { [`admin ${uc} 200`]: (x) => x.status === 200 });
    sleep(0.5);
  }
}

// Aynı anda "müşteri sil" + "o müşteriye sipariş oluştur": öksüz sipariş kalmamalı.
export function yaris(veri) {
  const h = bas(veri.admin);
  const etiket = `Y${__VU}-${__ITER}-${Date.now()}`;
  const musteri = http.post(`${URL}/api/customers`, musteriGovde(etiket), h);
  if (musteri.status !== 200) return;
  const mid = musteri.json("id");
  const [siparis, silme] = http.batch([
    ["POST", `${URL}/api/orders`, siparisGovde(mid), h],
    ["DELETE", `${URL}/api/customers/${mid}`, null, h],
  ]);
  // İkisi birden başarılı olamaz: sipariş kaydedildiyse müşteri silinemez (409), silindiyse sipariş geri alınır (404).
  if (siparis.status === 201 && silme.status === 204) yaris_ihlal.add(1);
  sleep(0.3); // siparişin geri alınması (undo) için kısa bekleme
  const kalan = http.get(`${URL}/api/orders/customer/${mid}`, h);
  if (silme.status === 204 && kalan.status === 200 && kalan.json().length > 0) yaris_ihlal.add(1);
  // Temizlik: müşteri durduysa siparişleri ve müşteriyi sil
  if (silme.status !== 204) {
    if (kalan.status === 200) {
      for (const s of kalan.json()) http.del(`${URL}/api/orders/${s.id}`, null, h);
    }
    http.del(`${URL}/api/customers/${mid}`, null, h);
  }
  sleep(0.3);
}
