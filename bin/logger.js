import winston from 'winston';
import chalk from 'chalk';

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message }) => {
            let color;
            if (level === 'info' && /^- .+: .+/.test(message)) {
                color = chalk.green;
            } else {
                switch (level) {
                    case 'error': color = chalk.red; break;
                    case 'warn': color = chalk.yellow; break;
                    case 'info': color = chalk.cyan; break;
                    case 'debug': color = chalk.green; break;
                    default: color = chalk.white; break;
                }
            }
            return color(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
        })
    ),
    transports: [
        new winston.transports.Console()
    ]
});

logger.comment = function (message) {
    const now = new Date();
    const pad = n => n.toString().padStart(2, '0');
    const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    console.log(chalk.green(`[${timestamp}] [COMMENT] ${message}`));
};

export default logger;
