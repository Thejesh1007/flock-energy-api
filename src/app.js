const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const openapiSpec = require('../openapi.json');
const apiRoutes = require('./routes');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/v1', apiRoutes);

// Interactive API docs at /docs, raw spec at /openapi.json
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));
app.get('/openapi.json', (req, res) => res.json(openapiSpec));

// Unknown route
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Central error handler — every route's catch(next(err)) ends up here
app.use((err, req, res, next) => {
  console.error(err.message);
  const status = err.status || 500;
  res.status(status).json({ error: err.message });
});

module.exports = app;