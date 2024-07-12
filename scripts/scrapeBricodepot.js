const puppeteer = require('puppeteer');
const mongoose = require('mongoose');
const express = require('express');
const Product = require('../models/product');
const Store = require('../models/store');
const Price = require('../models/price');

const app = express();
const port = 3001;  // Cambia el puerto aquí

(async () => {
  // Conectar a MongoDB
  try {
    await mongoose.connect('mongodb://localhost:27017/comparador', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log("Conectado a MongoDB");
  } catch (error) {
    console.error("Error conectando a MongoDB:", error);
    process.exit(1); // Salir del script en caso de error de conexión
  }

  // Iniciar el navegador
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Navegar a la URL deseada
  await page.goto("https://www.bricodepot.es/puertas-ventanas/puertas/de-interior/puertas-en-block");
  
  // Extraer datos de la página
  const result = await page.evaluate(() => {
    const productGrid = document.querySelector("#content > div:nth-child(6) > div > div.columns.grid.grid--resp-full-large.grid--pb-none-resp-large > div > div.u-mb-xxlarge.amscroll-page > ul");
    return productGrid ? productGrid.innerText : "No data";
  });

  // Función para procesar los datos extraídos
  function processRawData(rawData) {
    if (typeof rawData !== "string") {
      console.log("No se recibió una cadena válida:", rawData);
      return [];
    }

     // Dividir los datos en bloques de productos usando el texto "Añadir al carrito" como separador
     const productBlocks = rawData.split("Añadir al carrito");

     const products = productBlocks.map((block, index) => {
       const lines = block.split("\n").filter(line => line.trim() !== "");
 
       if (lines.length < 4) return null; // Si no hay suficiente información, descartar este bloque
 
       const name = lines[0];
       const ratingMatch = lines[1].match(/([\d.]+) star rating/);
       const rating = ratingMatch ? ratingMatch[1] : "N/A";
       const reviewsMatch = lines[2].match(/(\d+) Opiniones/);
       const reviews = reviewsMatch ? reviewsMatch[1] : "N/A";
       const price = lines[3].replace("€", "").trim();
 
       return {
         id: index + 1,
         name,
         price,
         rating,
         reviews
       };
     }).filter(product => product !== null); // Eliminar los bloques no válidos
 
     return products;
   }

  // Procesar los datos extraídos
  const processedData = processRawData(result);
  console.log(processedData);

  // Buscar o crear la tienda
  let store = await Store.findOne({ name: 'Bricodepot' });
  if (!store) {
    store = new Store({ name: 'Bricodepot', website: 'https://www.bricodepot.es/' });
    await store.save();
  }

  // Insertar productos en la base de datos
  for (let productData of processedData) {
    let product = await Product.findOne({ name: productData.name, rating: productData.rating, reviews: productData.reviews });
    if (!product) {
      product = new Product({ name: productData.name, rating: productData.rating, reviews: productData.reviews, category_id: null });
      await product.save();
    }

    const priceEntry = new Price({
      product_id: product._id,
      store_id: store._id,
      price: productData.price,
      currency: 'EUR',
      scraped_at: new Date(),
      url: 'https://www.bricodepot.es/'
    });

    await priceEntry.save();
  }

  console.log('Datos guardados en la base de datos:', processedData);

  // Cerrar el navegador
  await browser.close();

  // Rutas para la API
  app.get('/', (req, res) => {
    res.send('Servidor de scraping en funcionamiento');
  });

  app.get('/products', async (req, res) => {
    const products = await Product.find();
    res.json(products);
  });

  app.get('/products/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const product = await Product.findById(id);
      if (!product) {
        return res.status(404).json({ message: 'Producto no encontrado' });
      }
      res.json(product);
    } catch (error) {
      res.status(500).json({ message: 'Error al obtener el producto' });
    }
  });

  // Iniciar el servidor
  app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
  });

  // Desconectar de MongoDB al cerrar la aplicación
  process.on('SIGINT', async () => {
    await mongoose.disconnect();
    console.log('Desconectado de MongoDB');
    process.exit(0);
  });
})();