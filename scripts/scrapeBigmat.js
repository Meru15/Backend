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
  await page.goto("https://www.bigmat.es/es/b2c/f/tienda-de-la-construccion/puertas-49");
  
  // Extraer datos de la página
  const result = await page.evaluate(() => {
    const productGrid = document.querySelector("#product-rows > div.product-rows");
    return productGrid ? productGrid.innerText : "No data";
  });

  // Función para procesar los datos extraídos
  function processRawData(rawData) {
    if (typeof rawData !== "string") {
      console.log("No se recibió una cadena válida:", rawData);
      return [];
    }

    // Dividir los datos en bloques de productos usando el texto "+" como separador
    const productBlocks = rawData.split("+");

    const products = productBlocks.map((block, index) => {
      const lines = block.split("\n").filter(line => line.trim() !== "");

      if (lines.length < 4) return null; // Si no hay suficiente información, descartar este bloque
   
      const name = lines[0];
      const description = lines[1];
      const price = parseFloat(lines[2].replace('€', '').trim());

      return {
        id: index + 1,
        name,
        description,
        price,
      };
    }).filter(product => product !== null); // Eliminar los bloques no válidos

    return products;
  }

  // Procesar los datos extraídos
  const processedData = processRawData(result);
  console.log(processedData);

  // Buscar o crear la tienda
  let store = await Store.findOne({ name: 'Bigmat' });
  if (!store) {
    store = new Store({ name: 'Bigmat', website: 'https://www.bigmat.es' });
    await store.save();
  }

  // Insertar productos en la base de datos
  for (let productData of processedData) {
    let product = await Product.findOne({ name: productData.name, description: productData.description });
    if (!product) {
      product = new Product({ name: productData.name, description: productData.description, category_id: null });
      await product.save();
    }

    const priceEntry = new Price({
      product_id: product._id,
      store_id: store._id,
      price: productData.price,
      currency: 'EUR',
      scraped_at: new Date(),
      url: 'https://www.bigmat.es'
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








