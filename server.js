const express = require("express");
const session = require("express-session");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "store.json");

function initialData() {
  return {
    users: [{ id: 1, name: "Admin", email: "admin@shop.com", password: "admin123", role: "admin" }],
    products: [
      { id: 1, name: "Wireless Headphones", description: "Comfortable Bluetooth headphones", price: 1499, stock: 20 },
      { id: 2, name: "Smart Watch", description: "Fitness and notification smartwatch", price: 2499, stock: 15 },
      { id: 3, name: "Laptop Backpack", description: "Water-resistant everyday backpack", price: 999, stock: 30 },
      { id: 4, name: "USB-C Charger", description: "Fast charging adapter", price: 599, stock: 40 }
    ],
    orders: [],
    nextUserId: 2,
    nextProductId: 5,
    nextOrderId: 1
  };
}
function readDB() {
  if (!fs.existsSync(DB_FILE)) return initialData();
  try { return JSON.parse(fs.readFileSync(DB_FILE, "utf8")); }
  catch { return initialData(); }
}
function writeDB(db) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}
if (!fs.existsSync(DB_FILE)) writeDB(initialData());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || "replace-this-session-secret",
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "lax" }
}));
app.use(express.static(path.join(__dirname, "public")));

function auth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: "Please login first" });
  next();
}
function admin(req, res, next) {
  if (!req.session.user || req.session.user.role !== "admin")
    return res.status(403).json({ error: "Admin access required" });
  next();
}
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.post("/api/register", (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password || password.length < 6)
    return res.status(400).json({ error: "Name, email and password (6+ chars) are required" });
  const db = readDB();
  if (db.users.some(u => u.email.toLowerCase() === email.toLowerCase()))
    return res.status(409).json({ error: "Email already registered" });
  const user = { id: db.nextUserId++, name, email, password, role: "customer" };
  db.users.push(user); writeDB(db);
  req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
  res.status(201).json({ user: req.session.user });
});
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  const db = readDB();
  const user = db.users.find(u => u.email.toLowerCase() === String(email || "").toLowerCase() && u.password === password);
  if (!user) return res.status(401).json({ error: "Invalid email or password" });
  req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
  res.json({ user: req.session.user });
});
app.post("/api/logout", (req, res) => req.session.destroy(() => res.json({ message: "Logged out" })));
app.get("/api/me", (req, res) => res.json({ user: req.session.user || null }));

app.get("/api/products", (req, res) => {
  const db = readDB();
  const q = String(req.query.q || "").toLowerCase();
  res.json(db.products.filter(p => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)));
});
app.get("/api/cart", auth, (req, res) => res.json(req.session.cart || []));
app.post("/api/cart", auth, (req, res) => {
  const productId = Number(req.body.productId), quantity = Number(req.body.quantity || 1);
  if (!Number.isInteger(quantity) || quantity < 1) return res.status(400).json({ error: "Quantity must be at least 1" });
  const db = readDB(), product = db.products.find(p => p.id === productId);
  if (!product) return res.status(404).json({ error: "Product not found" });
  const cart = req.session.cart || [];
  const item = cart.find(i => i.productId === productId);
  const newQty = (item ? item.quantity : 0) + quantity;
  if (newQty > product.stock) return res.status(400).json({ error: "Not enough stock" });
  if (item) item.quantity = newQty;
  else cart.push({ productId, name: product.name, price: product.price, quantity });
  req.session.cart = cart;
  res.json(cart);
});
app.patch("/api/cart/:productId", auth, (req, res) => {
  const id = Number(req.params.productId), quantity = Number(req.body.quantity);
  const cart = req.session.cart || [], item = cart.find(i => i.productId === id);
  if (!item) return res.status(404).json({ error: "Cart item not found" });
  if (!Number.isInteger(quantity) || quantity < 0) return res.status(400).json({ error: "Quantity must be zero or more" });
  if (quantity === 0) req.session.cart = cart.filter(i => i.productId !== id);
  else {
    const db = readDB(), p = db.products.find(p => p.id === id);
    if (!p || quantity > p.stock) return res.status(400).json({ error: "Not enough stock" });
    item.quantity = quantity;
  }
  res.json(req.session.cart);
});
app.post("/api/checkout", auth, (req, res) => {
  const cart = req.session.cart || [];
  if (!cart.length) return res.status(400).json({ error: "Cart is empty" });
  const db = readDB();
  for (const item of cart) {
    const p = db.products.find(p => p.id === item.productId);
    if (!p || p.stock < item.quantity) return res.status(400).json({ error: `Insufficient stock for ${item.name}` });
  }
  const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  cart.forEach(i => { db.products.find(p => p.id === i.productId).stock -= i.quantity; });
  const order = { id: db.nextOrderId++, userId: req.session.user.id, items: cart, total, createdAt: new Date().toISOString(), status: "Placed" };
  db.orders.push(order); writeDB(db); req.session.cart = [];
  res.status(201).json({ order });
});
app.get("/api/orders", auth, (req, res) => {
  const db = readDB();
  res.json(db.orders.filter(o => o.userId === req.session.user.id));
});

app.post("/api/admin/products", admin, (req, res) => {
  const { name, description = "", price, stock } = req.body;
  if (!name || Number(price) <= 0 || !Number.isInteger(Number(stock)) || Number(stock) < 0)
    return res.status(400).json({ error: "Valid name, positive price and nonnegative stock are required" });
  const db = readDB(), product = { id: db.nextProductId++, name, description, price: Number(price), stock: Number(stock) };
  db.products.push(product); writeDB(db); res.status(201).json(product);
});
app.put("/api/admin/products/:id", admin, (req, res) => {
  const db = readDB(), p = db.products.find(p => p.id === Number(req.params.id));
  if (!p) return res.status(404).json({ error: "Product not found" });
  const { name, description, price, stock } = req.body;
  if (name !== undefined) p.name = name;
  if (description !== undefined) p.description = description;
  if (price !== undefined && Number(price) > 0) p.price = Number(price);
  if (stock !== undefined && Number.isInteger(Number(stock)) && Number(stock) >= 0) p.stock = Number(stock);
  writeDB(db); res.json(p);
});
app.delete("/api/admin/products/:id", admin, (req, res) => {
  const db = readDB(), id = Number(req.params.id);
  if (!db.products.some(p => p.id === id)) return res.status(404).json({ error: "Product not found" });
  db.products = db.products.filter(p => p.id !== id); writeDB(db); res.json({ message: "Product deleted" });
});

if (require.main === module) app.listen(PORT, () => console.log(`Shopping app running on port ${PORT}`));
module.exports = app;
