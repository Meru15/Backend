const Store = require('../models/Store');

exports.getAllStores = async (req, res) => {
  const stores = await Store.find();
  res.json(stores);
};

exports.createStore = async (req, res) => {
  const store = new Store(req.body);
  await store.save();
  res.json(store);
};

exports.updateStore = async (req, res) => {
  const store = await Store.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(store);
};

exports.deleteStore = async (req, res) => {
  await Store.findByIdAndDelete(req.params.id);
  res.json({ message: 'Tienda eliminada' });
};
