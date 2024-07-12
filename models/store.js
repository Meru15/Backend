const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema({
  name: String,
  website: String,
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Store', storeSchema);
