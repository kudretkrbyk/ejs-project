const express = require("express");
const path = require("path");
const session = require("express-session");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");

const app = express();
const port = 3000;

// Middleware'ler
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(
  session({
    secret: "çok-gizli-bir-anahtar", // Gerçek bir projede .env dosyasında saklanmalıdır
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }, // HTTPS kullanılmıyorsa false olmalı
  })
);

// EJS'i view engine olarak ayarla
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Oturum durumunu tüm view'lara göndermek için bir middleware
app.use((req, res, next) => {
  res.locals.user = req.session.user;
  next();
});

// Veritabanı simülasyonu (başlangıç için)
const users = [
  {
    id: "admin001",
    firstName: "Admin",
    lastName: "Kullanıcı",
    email: "deneme@gmail.com",
    password: "123123123",
    isAdmin: true,
  },
  {
    id: "user001",
    firstName: "Normal",
    lastName: "Kullanıcı",
    email: "kullanici@gmail.com",
    password: "sifre123",
    isAdmin: false,
  },
];
const products = [
  {
    id: "p1",
    name: "Temel Veritabanı Paketi",
    price: "50 TL/ay",
    features: ["1 GB SSD Depolama", "10 GB Trafik", "Haftalık Yedekleme"],
  },
  {
    id: "p2",
    name: "Gelişmiş Veritabanı Paketi",
    price: "100 TL/ay",
    features: [
      "5 GB SSD Depolama",
      "50 GB Trafik",
      "Günlük Yedekleme",
      "Öncelikli Destek",
    ],
  },
  {
    id: "p3",
    name: "Profesyonel Veritabanı Paketi",
    price: "250 TL/ay",
    features: [
      "20 GB SSD Depolama",
      "Limitsiz Trafik",
      "Saatlik Yedekleme",
      "7/24 Telefon Desteği",
    ],
  },
];
// Kullanıcıların sahip olduğu ürünleri simüle eden yapı: { userId: ['p1', 'p3'] }
const userProducts = {};
const supportTickets = [];

// --- KİMLİK DOĞRULAMA (Authentication) ROTALARI ---

// [POST] Yeni kullanıcı kaydı
app.post("/kayit", (req, res) => {
  try {
    const {
      "first-name": firstName,
      "last-name": lastName,
      email,
      password,
    } = req.body;
    const existingUser = users.find((u) => u.email === email);
    if (existingUser) {
      return res.status(400).send("Bu e-posta adresi zaten kullanılıyor.");
    }

    // Güvenlik kaldırıldı: Şifre artık hash'lenmiyor.
    const newUser = {
      id: Date.now().toString(),
      firstName,
      lastName,
      email,
      password: password,
      isAdmin: false,
    };
    users.push(newUser);
    console.log("Yeni kullanıcı eklendi:", users);
    res.redirect("/giris");
  } catch (error) {
    console.error(error);
    res.redirect("/kayit");
  }
});

// [POST] Kullanıcı girişi
app.post("/giris", (req, res) => {
  try {
    const { email, password } = req.body;
    const user = users.find((u) => u.email === email);

    // Güvenlik kaldırıldı: Şifreler düz metin olarak karşılaştırılıyor.
    if (user && user.password === password) {
      req.session.user = {
        id: user.id,
        firstName: user.firstName,
        email: user.email,
        isAdmin: user.isAdmin || false,
      };
      if (user.isAdmin) {
        return res.redirect("/admin");
      }
      return res.redirect("/panel");
    } else {
      res.send("Geçersiz e-posta veya şifre.");
    }
  } catch (error) {
    console.error(error);
    res.redirect("/giris");
  }
});

// [GET] Kullanıcı çıkışı
app.get("/cikis", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.redirect("/");
    }
    res.clearCookie("connect.sid"); // Oturum cookie'sini temizle
    res.redirect("/");
  });
});

// --- KORUMALI ROTA MİDDLEWARE'İ ---
const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    // Kullanıcı giriş yapmış, devam et
    return next();
  }
  // Kullanıcı giriş yapmamış, giriş sayfasına yönlendir
  res.redirect("/giris");
};

// --- ADMİN ROTA MİDDLEWARE'İ ---
const isAdmin = (req, res, next) => {
  if (req.session.user && req.session.user.isAdmin) {
    return next();
  }
  res
    .status(403)
    .send(
      "<h1>Erişim Reddedildi</h1><p>Bu sayfayı görüntüleme yetkiniz yok.</p>"
    );
};

// --- ADMİN (YÖNETİCİ) ROTALARI ---
app.get("/admin", isAuthenticated, isAdmin, (req, res) => {
  const stats = {
    userCount: users.length,
    productCount: products.length,
    ticketCount: supportTickets.length,
  };
  const data = {
    pageTitle: "Gösterge Paneli",
    stats: stats,
  };
  res.render("pages/admin/panel", { data });
});

app.get("/admin/kullanicilar", isAuthenticated, isAdmin, (req, res) => {
  const data = {
    pageTitle: "Kullanıcı Yönetimi",
    users: users, // Sistemdeki tüm kullanıcıları gönder
  };
  res.render("pages/admin/kullanicilar", { data });
});

// --- KULLANICI (GİRİŞ GEREKTİREN) ROTALARI ---

app.get("/panel", isAuthenticated, (req, res) => {
  const data = {
    pageTitle: "Kullanıcı Paneli",
    // user nesnesi zaten res.locals üzerinden tüm view'lara gidiyor
  };
  res.render("pages/user/panel", { data });
});

app.get("/urunlerim", isAuthenticated, (req, res) => {
  // Test için, giriş yapan kullanıcının p1 ve p3 ürünlerine sahip olduğunu varsayalım
  if (!userProducts[req.session.user.id]) {
    userProducts[req.session.user.id] = ["p1", "p3"];
  }

  const currentUserProductIds = userProducts[req.session.user.id] || [];
  const currentUserProducts = products.filter((p) =>
    currentUserProductIds.includes(p.id)
  );

  const data = {
    pageTitle: "Hizmetlerim",
    products: currentUserProducts,
  };
  res.render("pages/user/urunlerim", { data });
});

app.get("/destek", isAuthenticated, (req, res) => {
  const userTickets = supportTickets.filter(
    (t) => t.userId === req.session.user.id
  );
  const data = {
    pageTitle: "Destek Taleplerim",
    tickets: userTickets,
  };
  res.render("pages/user/destek", { data });
});

app.get("/urun-detay/:id", isAuthenticated, (req, res) => {
  const { id } = req.params;
  const product = products.find((p) => p.id === id);

  // Kullanıcının bu ürüne sahip olup olmadığını kontrol et
  const userOwnsProduct = userProducts[req.session.user.id]?.includes(id);

  if (!product || !userOwnsProduct) {
    // Ürün bulunamadı veya kullanıcı sahip değilse
    return res
      .status(404)
      .send(
        '<h1>404 - Sayfa Bulunamadı</h1><p>Aradığınız ürün bulunamadı veya bu ürünü görüntüleme yetkiniz yok.</p><a href="/panel">Panele Geri Dön</a>'
      );
  }

  const data = {
    pageTitle: `Detay: ${product.name}`,
    product: product,
  };
  res.render("pages/user/urun-detay", { data });
});

app.post("/destek/yeni", isAuthenticated, (req, res) => {
  const { subject, message } = req.body;
  const newTicket = {
    id: `T${Date.now()}`,
    userId: req.session.user.id,
    subject: subject,
    message: message,
    status: "Açık",
    createdAt: new Date(),
  };
  supportTickets.push(newTicket);
  console.log("Yeni destek talebi:", supportTickets); // Geliştirme için log
  res.redirect("/destek");
});

// --- SEPET ROTALARI ---

app.get("/sepet", isAuthenticated, (req, res) => {
  const cart = req.session.cart || [];
  let total = 0;

  // Sepetteki ürünlerin tam bilgilerini ve toplam tutarı hesapla
  const cartProducts = cart.map((item) => {
    const product = products.find((p) => p.id === item.id);
    // Fiyatı sayıya çevirerek toplama ekle (örn: "50 TL/ay" -> 50)
    total += parseFloat(product.price.split(" ")[0]);
    return product;
  });

  const data = {
    pageTitle: "Alışveriş Sepeti",
    cart: cartProducts,
    total: total.toFixed(2),
  };
  res.render("pages/user/sepet", { data });
});

app.get("/odeme", isAuthenticated, (req, res) => {
  // Bu bölümde normalde PayTR API'sine istek atılıp bir token alınır.
  // Şimdilik bu kısmı simüle ediyoruz ve doğrudan iframe'i render edeceğiz.
  // Gerçek token, PayTR'dan gelen cevaba göre dinamik olarak atanmalıdır.
  const paytrToken = "HENUZ_ALINMADI"; // Bu kısım dinamik olacak

  const data = {
    pageTitle: "Ödeme Yap",
    paytrToken: paytrToken,
  };
  res.render("pages/user/odeme", { data });
});

app.get("/sepet/ekle/:id", isAuthenticated, (req, res) => {
  const { id } = req.params;
  const product = products.find((p) => p.id === id);

  if (product) {
    if (!req.session.cart) {
      req.session.cart = [];
    }
    // Şimdilik her ürün sadece bir kez eklenebilir. Miktar yönetimi sonra eklenebilir.
    if (!req.session.cart.find((item) => item.id === id)) {
      req.session.cart.push({ id: id, quantity: 1 });
    }
  }
  res.redirect("/sepet");
});

app.get("/sepet/kaldir/:id", isAuthenticated, (req, res) => {
  const { id } = req.params;
  if (req.session.cart) {
    req.session.cart = req.session.cart.filter((item) => item.id !== id);
  }
  res.redirect("/sepet");
});

// --- GENEL (PUBLIC) SAYFA ROTALARI ---

// Ürünler sayfası
app.get("/cozumlerimiz", (req, res) => {
  const data = {
    pageTitle: "Çözümlerimiz",
    products: products,
  };
  res.render("pages/public/cozumlerimiz", { data });
});

// Ana sayfa rotası
app.get("/", (req, res) => {
  const data = {
    pageTitle: "Ana Sayfa",
    products: products.slice(0, 3), // Sadece ilk 3 ürünü ana sayfada göster
  };
  res.render("pages/public/welcome", { data });
});

// Genel Sayfa Rotaları
app.get("/sss", (req, res) => {
  const data = { pageTitle: "Sıkça Sorulan Sorular" };
  res.render("pages/public/sss", { data });
});

app.get("/bilgi-bankasi", (req, res) => {
  const data = { pageTitle: "Bilgi Bankası" };
  res.render("pages/public/bilgi-bankasi", { data });
});

app.get("/biz-kimiz", (req, res) => {
  const data = { pageTitle: "Biz Kimiz?" };
  res.render("pages/public/biz-kimiz", { data });
});

app.get("/giris", (req, res) => {
  const data = { pageTitle: "Giriş Yap" };
  res.render("pages/public/giris", { data });
});
app.get("/sifremi-unuttum", (req, res) => {
  const data = { pageTitle: "Şifremi Unuttum" };
  res.render("pages/public/sifremi-unuttum", { data });
});

app.get("/kayit", (req, res) => {
  const data = { pageTitle: "Kayıt Ol" };
  res.render("pages/public/kayit", { data });
});

// Hakkımızda sayfası
app.get("/hakkimizda", (req, res) => {
  const data = { pageTitle: "Hakkımızda" };
  res.render("pages/public/hakkimizda", data);
});
// iletişim sayfası
app.get("/iletisim", (req, res) => {
  const data = { pageTitle: "Hakkımızda" };
  res.render("pages/public/iletisim", data);
});

app.listen(port, () => {
  console.log(`Sunucu http://localhost:${port} adresinde çalışıyor`);
});
