const Price = require('../models/price');

exports.getAllPrices = async (req, res) => {
  const prices = await Price.find().populate('product_id store_id');
  res.json(prices);
};

exports.createPrice = async (req, res) => {
  const price = new Price(req.body);
  await price.save();
  res.json(price);
};

exports.updatePrice = async (req, res) => {
  const price = await Price.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(price);
};

exports.deletePrice = async (req, res) => {
  await Price.findByIdAndDelete(req.params.id);
  res.json({ message: 'Precio eliminado' });
};
