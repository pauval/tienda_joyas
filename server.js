const express = require('express');
const app = express();
const { Pool } = require('pg');
const format = require('pg-format');
require('dotenv').config();

const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
});

app.use(express.json());

app.get('/joyas', async (req, res) => {
    try {
      const { limits = 5, page = 1, order_by = 'id_ASC' } = req.query;
      const [campo, direccion] = order_by.split('_');
      const offset = (page - 1) * limits;
  
      const query = format('SELECT * FROM inventario ORDER BY %I %s LIMIT %L OFFSET %L', campo, direccion, limits, offset);
      const result = await pool.query(query);
  
      const totalJoyas = await pool.query('SELECT COUNT(*) FROM inventario');
      const totalPages = Math.ceil(totalJoyas.rows[0].count / limits);
  
      const HATEOAS = {
        total: totalJoyas.rows[0].count,
        page,
        totalPages,
        next: page < totalPages ? `/joyas?limits=${limits}&page=${parseInt(page) + 1}&order_by=${order_by}` : null,
        previous: page > 1 ? `/joyas?limits=${limits}&page=${parseInt(page) - 1}&order_by=${order_by}` : null,
        results: result.rows.map(joya => ({
          ...joya,
          href: `/joyas/${joya.id}`,
        })),
      };
  
      res.json(HATEOAS);
    } catch (error) {
      console.error('Error al obtener las joyas desde bd:', error);
      res.status(500).json({ message: 'Hay un error en el servidor al obtener las joyas.' });
    }
  });
  
  app.get('/joyas/filtros', async (req, res) => {
    try {
      const { precio_min, precio_max, categoria, metal } = req.query;
      let filtros = [];
      let values = [];
      let index = 1;
      if (precio_min) {
        filtros.push(`precio >= $${index}`);
        values.push(precio_min);
        index++;
      }
      if (precio_max) {
        filtros.push(`precio <= $${index}`);
        values.push(precio_max);
        index++;
      }
      if (categoria) {
        filtros.push(`categoria = $${index}`);
        values.push(categoria);
        index++;
      }
      if (metal) {
        filtros.push(`metal = $${index}`);
        values.push(metal);
        index++;
      }
      
  
      const query = `SELECT * FROM inventario ${filtros.length ? 'WHERE ' + filtros.join(' AND ') : ''}`;
      const result = await pool.query(query, values);
  
      res.json(result.rows);
    } catch (error) {
      console.error('Error al filtrar las joyas en la BD:', error);
      res.status(500).json({ message: 'Hay un error en el servidor al filtrar las joyas.' });
    }
  });
  
app.use((req, res, next) => {
  console.log(`Ruta: ${req.path}, Método: ${req.method}, Fecha: ${new Date()}`);
  next();
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
