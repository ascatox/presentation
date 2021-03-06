import * as winston from 'winston'
import * as moment from 'moment'

const tsFormat = () => moment().format('DD-MM-YYYY HH:mm:ss').trim();
const level = process.env.LOGGING_LEVEL || 'debug';
const logger = new (winston.Logger)({
    level: level,
    transports: [
        new (winston.transports.Console)({
            timestamp: tsFormat,
            colorize: true
        }),
    ]
});
console.log('Logger level is: ' + logger.level);
logger.exitOnError = false;
export { logger };