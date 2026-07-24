const app = require('./app');
const { port } = require('./config');

app.listen(port, () => {
  console.log(`Flock Energy API running on http://localhost:${port}`);
});