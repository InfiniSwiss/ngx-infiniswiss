import { async } from '@angular/core/testing';
import { AppLoggerService } from '../logging/app-logger.service';
import { ComponentLoader } from './component-loader';
import * as TypeMoq from 'typemoq';

describe('ComponentLoader', () => {
    let loggerMock: TypeMoq.IMock<AppLoggerService>;
    let sut: ComponentLoader;

    beforeEach(async(() => {
        loggerMock = TypeMoq.Mock.ofType(AppLoggerService);
        sut = new ComponentLoader(loggerMock.object);
    }));

    it('should be created', () => {
        expect(sut).toBeTruthy();
    });

    describe('markLoading', () => {
        it(`should be loading when it's marked as loading`, () => {
            sut.markLoading('SOME_COMPONENT');

            expect(sut.isLoading).toBe(true);
        });

        it(`should be loading and blocked when it's marked as loading and blocked`, () => {
            sut.markLoading('SOME_COMPONENT', true);

            expect(sut.isLoading).toBe(true);
            expect(sut.isBlocked).toBe(true);
        });
    });

    describe('markNotLoading', () => {
        it('should be able to mark a component as loading after it was markedAsNotLoading', () => {
            sut.markNotLoading('SOME_COMPONENT');

            sut.markLoading('SOME_COMPONENT');

            expect(sut.isLoading).toBe(true);
        });

        it('should be able to mark a component as not loading after it was marked: notLoading -> loading -> notLoading', () => {
            sut.markNotLoading('SOME_COMPONENT');
            sut.markLoading('SOME_COMPONENT');

            sut.markNotLoading('SOME_COMPONENT');

            expect(sut.isLoading).toBe(false);
        });

        it(`should be loading if there is at least one component loading`, () => {
            sut.markLoading('SOME_COMPONENT');
            sut.markLoading('SOME_COMPONENT_2');

            sut.markNotLoading('SOME_COMPONENT');

            expect(sut.isLoading).toBe(true);
        });

        it(`should be loading and blocked if there is at least one component loading and blocked`, () => {
            sut.markLoading('SOME_COMPONENT', true);
            sut.markLoading('SOME_COMPONENT_2', true);

            sut.markNotLoading('SOME_COMPONENT');

            expect(sut.isLoading).toBe(true);
            expect(sut.isBlocked).toBe(true);
        });

        it(`should be not loading and not blocked if all components are not loading`, () => {
            sut.markLoading('SOME_COMPONENT', true);
            sut.markLoading('SOME_COMPONENT_2', true);

            sut.markNotLoading('SOME_COMPONENT');
            sut.markNotLoading('SOME_COMPONENT_2');

            expect(sut.isLoading).toBe(false);
            expect(sut.isBlocked).toBe(false);
        });
    });
});
