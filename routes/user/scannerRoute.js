const express = require('express');
const scannerRouter = express.Router();
const scannerController = require('../../controller/userController/scanner/scannerController');

scannerRouter.post('/request-vehicle-return', scannerController.requestVehicleReturn);

module.exports = scannerRouter;