const mongoose = require('mongoose');

const priceSchema = new mongoose.Schema({
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  store_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Store' },
  price: Number,
  currency: String,
  scraped_at: { type: Date, default: Date.now },
  url: String
});

module.exports = mongoose.model('Price', priceSchema);
