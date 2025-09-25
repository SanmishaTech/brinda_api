module.exports = {
  //users
  "users.read": ["admin", "member"],
  "users.write": ["admin", "member"],
  "users.delete": ["admin", "member"],
  "users.export": ["admin", "member"],
  //states
  "states.read": ["admin", "member"],
  //products
  "products.read": ["admin", "member"],
  "products.write": ["admin", "member"],
  "products.delete": ["admin", "member"],
  "products.export": ["admin", "member"],
  //members
  "members.read": ["admin", "member"],
  "members.write": ["admin", "member"],
  "members.delete": ["admin", "member"],
  //walletTransactions
  "walletTransactions.read": ["admin", "member"],
  "walletTransactions.write": ["admin", "member"],
  "walletTransactions.delete": ["admin", "member"],
  "walletTransactions.export": ["admin", "member"],
  //purchases
  "purchases.read": ["admin", "member"],
  "purchases.write": ["admin", "member"],
  "purchases.delete": ["admin", "member"],
  //repurchases
  "repurchases.read": ["admin", "member"],
  "repurchases.write": ["admin", "member"],
  "repurchases.delete": ["admin", "member"],

  //dashboards
  "dashboards.read": ["admin", "member"],
  "dashboards.write": ["admin", "member"],
  "dashboards.delete": ["admin", "member"],

  //commissions
  "commissions.read": ["admin"],
  "commissions.write": ["admin"],
  //virtual Power
  "virtualPower.read": ["admin"],
  "virtualPower.write": ["admin"],
  //rewards
  "rewards.read": ["admin", "member"],

  "auth.backToAdmin": ["member"],
  "auth.impersonate": ["admin"],

  //adminPurchases
  "adminPurchases.read": ["admin"],
  "adminPurchases.write": ["admin"],

  //adminPurchases
  "stock.read": ["admin", "member"],
  "stock.write": ["admin"],
  //franchise
  "franchise.read": ["admin", "member"],
  "franchise.write": ["admin", "member"],

  //loan
  "loan.write": ["admin", "member"],

  // free-products
  "free-products.read": ["admin", "member"],
  "free-products.write": ["admin", "member"],

  // free-purchases
  "free-purchases.read": ["admin", "member"],
  "free-purchases.write": ["admin", "member"],
};
