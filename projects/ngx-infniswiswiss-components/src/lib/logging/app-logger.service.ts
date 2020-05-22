import {NgZone, Optional} from '@angular/core';
import {convertToArray} from '../util/convert-to-array';
import {generateUuid} from '../util/generate-uuid';
import {AppLogTypes} from './log-levels';

type TypeRef<T> = new (...args: any[]) => T;

export class AppLoggerService {
    appSessionId = generateUuid();

    ngZoneImpl: { runOutsideAngular: <T>(fn: (...args: any[]) => T) => T };

    constructor(@Optional() ngZone: NgZone) {
        this.ngZoneImpl = ngZone ?? {
            runOutsideAngular<T>(fn: (...args: any[]) => T): T {
                return fn();
            }
        };
    }

    info<T>(message: string | Error | any | any[], params?: any[], context?: string | TypeRef<T>) {
        this.logMessageAsync(AppLogTypes.info, message, params, context);
    }

    error<T>(message: string | Error | any | any[], params?: any[], context?: string | TypeRef<T>) {
        this.logMessageAsync(AppLogTypes.error, message, params, context);
    }

    warn<T>(message: string | Error | any | any[], params?: any[], context?: string | TypeRef<T>) {
        this.logMessageAsync(AppLogTypes.warn, message, params, context);
    }

    debug<T>(message: string | string[], params?: any[], context?: string | TypeRef<T>) {
        this.logMessageAsync(AppLogTypes.debug, message, params, context);
    }

    log<T>(message: string | string[], params?: any[], context?: string | TypeRef<T>) {
        this.logMessageAsync(AppLogTypes.log, message, params, context);
    }

    private logMessageAsync<T>(method: string, message: string | string[] | Error | Error[], logParams?: any[], context?: string | TypeRef<T>) {
        this.ngZoneImpl.runOutsideAngular(() => {
            setTimeout(() => {
                let formattedMessage = this.parseString(message, logParams);

                const contextString = context ? ` Context: ${typeof context === 'string' ? context : context.name}, ` : ` `;
                formattedMessage = `[Eppione web app] SessionId: ${this.appSessionId},${contextString}${method}: ${formattedMessage}`;

                // if (AppLogLevel[method] <= this.envLogLevel) {
                console[method](formattedMessage);
                // }
            });
        });
    }

    private parseString(message: string | Error | any | any[], params?: any[]) {
        let messageAsString = this.getMessageAsString(message);
        params = convertToArray(params);
        if (!params.length) {
            return messageAsString;
        }
        for (let i = 0; i < params.length; i++) {
            messageAsString = messageAsString.replace(new RegExp('\\{' + i + '\\}', 'g'), this.formatUnknownObject(params[i]));
        }

        return messageAsString;
    }

    private formatUnknownObject(object: any) {
        if (object === null) {
            return 'null';
        }
        if (object === undefined) {
            return 'undefined';
        }
        if (typeof object === 'string') {
            return object;
        }
        if (typeof object === 'number' || typeof object === 'boolean' || typeof object === 'function') {
            return object.toString();
        }

        if (object instanceof Error) {
            return `${this.formatErrorAndMessage(object.name, object.message)} ${this.endl()} ${this.formatErrorStack(object.stack)}`;
        }

        if (object instanceof Object) {
            return JSON.stringify(object, null, 4);
        }

        return object.toString();
    }

    private getMessageAsString(message: string | Error | any | any[]) {
        if (typeof message === 'string') {
            return message;
        }

        if (Array.isArray(message)) {
            const messageConcat = message.map(m => this.formatUnknownObject(m));
            return messageConcat.join(this.endl());
        }

        return this.formatUnknownObject(message);
    }

    private formatErrorAndMessage(errorName: string, message: any) {
        return `of type (${errorName}) Message: ${this.formatUnknownObject(message)}`;
    }

    private formatErrorStack(stack: any) {
        return `Stack trace ${this.formatUnknownObject(stack)}`;
    }

    private endl() {
        return '\n';
    }
}
