// archivo: test.js
console.log("El motor de Node.js funciona correctamente");
const http = require('http');
const server = http.createServer((req, res) => {
  res.end('Prueba exitosa');
});
server.listen(3000, () => console.log('Servidor de prueba corriendo'));