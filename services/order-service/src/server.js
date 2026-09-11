
require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });
const { createServiceLogger } = require('shared/logger');
const { startTracingForService } = require('shared/tracing');

startTracingForService('order-service'); // → [Distributed Tracing]


const express = require('express');
const { createServiceLogger } = require('shared/logger');
const orderRoutes = require('./routes/orderRoutes');

const logger = createServiceLogger('order-service');
const app = express();

app.use(express.json());
app.use('/orders', orderRoutes);


app.get('/health',(res,res)=>{
    res.statusCode(200).json({status:'ok', service: 'order-service'})
});

const PORT = process.env.ORDER_SERVICE_PORT || 4003;

app.listen(PORT,()=>{
    logger.info(`order-service listening on port ${PORT}`)
});