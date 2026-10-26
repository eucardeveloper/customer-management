// Customer okuma yük testi (k6), API Gateway üzerinden. SADECE GET; müşteri/sipariş verisi yazmaz veya silmez.
// Yalnızca yerel/test ortamında çalıştırın, production'da ASLA.
//
// Çalıştırma (Windows PowerShell, Customer proje klasöründe; önce Customer'ı açın, diğer projeleri durdurun):
//   $env:CM_PAROLA = "<admin demo parolası>"
//   Get-Content tests\yuk\okuma_yuku.js | docker run --rm -i -e CM_PAROLA -e CM_URL=http://host.docker.internal:8080 grafana/k6 run -
// Linux/macOS (bash):
//   docker run --rm -i -e CM_PAROLA -e CM_URL=http://host.docker.internal:8080 grafana/k6 run - < tests/yuk/okuma_yuku.js
// (k6 kuruluysa:  k6 run -e CM_PAROLA=... tests/yuk/okuma_yuku.js)
// Sonuçta bakılacaklar: http_req_duration p(95), http_req_failed, thresholds satırlarındaki ✓/✗.
import http from "k6/http";
import { check, sleep } from "k6";

const URL = __ENV.CM_URL || "http://localhost:8080";
const KULLANICI = __ENV.CM_KULLANICI || "admin";
const PAROLA = __ENV.CM_PAROLA;

export const options = {
  stages: [
    { duration: "30s", target: 10 }, // ısınma
    { duration: "2m", target: 25 }, // eşzamanlı 25 kullanıcı
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.01"], // hata < %1
    http_req_duration: ["p(95)<800"], // p95 < 800 ms (gateway + servis + veritabanı)
  },
};

const UCLAR = ["/api/customers", "/api/orders", "/api/auth/session"];

// Giriş sınırı olduğu için TEK kez giriş yapılır, jeton herkesle paylaşılır.
export function setup() {
  if (!PAROLA) throw new Error("CM_PAROLA ortam değişkeni verilmedi");
  const r = http.post(
    `${URL}/api/auth/login`,
    JSON.stringify({ username: KULLANICI, password: PAROLA }),
    { headers: { "Content-Type": "application/json" } },
  );
  if (r.status !== 200) throw new Error(`Giriş başarısız: ${r.status}`);
  const c = r.cookies["customer_session"];
  if (!c || !c[0]) throw new Error("customer_session çerezi dönmedi");
  return { token: c[0].value };
}

export default function (veri) {
  const basliklar = { headers: { Authorization: `Bearer ${veri.token}` } };
  for (const uc of UCLAR) {
    const r = http.get(`${URL}${uc}`, basliklar);
    check(r, { [`${uc} 200`]: (x) => x.status === 200 });
    sleep(0.5);
  }
}
